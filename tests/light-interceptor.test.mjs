import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { Nmos6502 } from "../scripts/nmos6502.mjs";
import { installRuntimeSegments, readRuntimeBytes } from "../scripts/runtime-image.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "build/manifest.json"), "utf8"));
const lifecycleSource = fs.readFileSync(path.join(root, "src/c/lifecycle.c"), "utf8");
const abiSource = fs.readFileSync(path.join(root, "src/hybrid/c-asm-abi.s"), "utf8");
const lightSource = fs.readFileSync(path.join(root, "src/hybrid/light-kernel.s"), "utf8");
const mainSource = fs.readFileSync(path.join(root, "src/main.s"), "utf8");

const labels = new Map();
for (const file of ["build/void-strike-65.lbl", "build/encounter-director.lbl",
  "build/integration-glue.lbl", "build/light-kernel.lbl"]) {
  for (const line of fs.readFileSync(path.join(root, file), "utf8").split(/\r?\n/)) {
    const match = /^al\s+([0-9a-f]+)\s+\.?([^\s]+)$/i.exec(line.trim());
    if (match) labels.set(match[2], Number.parseInt(match[1], 16));
  }
}
const L = (name) => {
  const address = labels.get(name);
  assert.ok(Number.isInteger(address), `missing label ${name}`);
  return address;
};

// Byte offsets into enemy_archetypes[]: 12 bytes per record.
const OFFSET_WINGMAN = 12;
const OFFSET_INTERCEPTOR = 24;

function memory() {
  const image = new Uint8Array(0x10000);
  installRuntimeSegments(image, root);
  for (let row = 0; row < 27; row += 1) {
    const address = 0x8140 + row * 40;
    image[L("PLAYFIELD_ROW_LO") + row] = address & 0xff;
    image[L("PLAYFIELD_ROW_HI") + row] = address >> 8;
  }
  return image;
}

// Light multiplicity step 4: the one-expensive-event token keys on
// FRAME_COUNTER, so a harness that never advances it would spend the token on
// the first consumer and starve every later one FOREVER - one frame, forever.
// The per-frame entries advance it here, which is what the runtime does.
// light_shot is included because handle_collisions is the FIRST Light entry
// of a runtime frame, before the tick: a kill therefore meets a fresh token,
// which is exactly what these kill tests are about. The frame where a kill
// and a volley SHARE one token is constructed deliberately in
// tests/light-multiplicity.test.mjs, not stumbled into here.
const FRAME_ENTRIES = new Set(["light_update", "enemy_light_tick", "light_shot",
  "enemy_spawn_raiders"]);
function run(image, target, { a = 0, x = 0, y = 0 } = {}) {
  if (typeof target === "string" && FRAME_ENTRIES.has(target)) {
    image[L("frame_counter")] = (image[L("frame_counter")] + 1) & 0xff;
  }
  const address = typeof target === "string" ? L(target) : target;
  const cpu = new Nmos6502(image);
  const stop = 0x7fff;
  cpu.push((stop - 1) >> 8);
  cpu.push((stop - 1) & 0xff);
  cpu.pc = address;
  cpu.a = a;
  cpu.x = x;
  cpu.y = y;
  for (let steps = 0; steps < 200_000 && cpu.pc !== stop; steps += 1) {
    assert.notEqual(image[cpu.pc], 0, `${target} reached BRK at $${cpu.pc.toString(16)}`);
    cpu.step();
  }
  assert.equal(cpu.pc, stop, `${target} did not return`);
  return { a: cpu.a, x: cpu.x, y: cpu.y, carry: (cpu.p & 0x01) !== 0, cycles: cpu.cycles };
}

function game(difficulty = 2) {
  const image = memory();
  image[L("DIFFICULTY_SETTING")] = difficulty;
  run(image, "director_init", { a: 0x6d });
  return image;
}

// REBASELINED for Light multiplicity (plan §2.1). Three changes, all shape:
// the per-Light bytes are four-byte arrays indexed by light_slot (slot 0 here);
// light_leaderless is gone, folded into the light_state VALUE (1 escort, 2
// free); and light_post_burst_slot is gone, recomputed per reload from the
// archetype offset and the difficulty (plan §2.1 "derived and dropped"), so
// the assertion that used to read it now reads the pause it produces.
// Step 2: the appearance install is hoisted onto the admission frame, so a
// freshly admitted Light spends its FIRST tick returning this instead of 0.
// The body still runs in full there, so every frame index below is unchanged.
const LIGHT_RETURN_INSTALL = 0x40;
const SLOT = 0;
const light = (image, slot = SLOT) => ({
  state: image[L("light_state") + slot] === 0 ? 0 : 1,
  hp: image[L("light_hp") + slot],
  x: image[L("light_x") + slot],
  y: image[L("light_y") + slot],
  timer: image[L("light_fire_timer") + slot],
  leaderless: image[L("light_state") + slot] === 2 ? 1 : 0,
  offset: image[L("light_archetype_offset") + slot],
  burstLeft: image[L("_light_burst_left") + slot],
});

// Selects the archetype the next admission will use, via the one legitimate
// knob. Re-pointed 2026-09-28 (owner decision 14): that knob was the
// provisional schedule index, and roadmap 4.6 step 2 retired the schedule.
// WHICH Light escorts a Heavy formation is the armed wave's own
// `wave_member_offset`, published by director_c_try_event as
// `heavy_escort_offset`; encounter_light_admit reads that byte and nothing
// else. It is still not a substitute lifecycle toggle - it is the same byte
// the Director itself writes when it arms the wave.
function selectNextLight(image, offset) {
  image[L("_heavy_escort_offset")] = offset;
}

test("selection contract: the schedule names the archetype, and the reusable admission only reads it", () => {
  for (const offset of [OFFSET_WINGMAN, OFFSET_INTERCEPTOR]) {
    const image = game();
    selectNextLight(image, offset);
    run(image, "enemy_spawn_raiders");
    assert.equal(light(image).offset, offset);
    assert.equal(light(image).state, 1);
    assert.equal(light(image).leaderless, offset === OFFSET_INTERCEPTOR ? 1 : 0);
  }
});

// Re-pointed 2026-09-28 (owner decision 14): "the schedule does not advance"
// is now "the admission does not rewrite the wave's byte" - the same property
// of the same decision, read off `heavy_escort_offset` instead of the retired
// `encounter_light_index`.
test("a second admission while the slot is active changes neither the archetype nor the wave's byte", () => {
  const image = game();
  selectNextLight(image, OFFSET_INTERCEPTOR);
  run(image, "enemy_spawn_raiders");
  const before = light(image);
  const escortBefore = image[L("_heavy_escort_offset")];
  image[L("light_y")] = 50;
  image[L("light_fire_timer")] = 7;
  run(image, "enemy_spawn_raiders");
  assert.equal(light(image).offset, before.offset, "still active, so still the same archetype");
  assert.equal(image[L("light_y")], 50, "an active Light keeps its own lifecycle, untouched");
  assert.equal(image[L("light_fire_timer")], 7);
  assert.equal(image[L("_heavy_escort_offset")], escortBefore,
    "admission reads the armed wave's escort byte and never writes it");
});

test("source contract: the Light admission and tick hold no ordering or toggle logic", () => {
  assert.doesNotMatch(lifecycleSource, /ALTERNATE/i,
    "the rejected per-admission alternation must not return");
  // REBASELINED for Light multiplicity: the selected offset is now the per-slot
  // light_archetype[] array plus the light_record scalar the tick hoists it
  // into, so the single-writer rule is stated against those two names. The
  // contract itself is unchanged: only the schedule names the archetype.
  assert.doesNotMatch(lifecycleSource, /light_archetype\[[^\]]*\]\s*\^=/,
    "no XOR toggle of the selected archetype");
  // Step 3: three writers, all of them the same decision reaching the slot -
  // the wave names the archetype, light_admit copies that name into the slot it
  // takes, and init clears every slot. No fourth path may appear.
  const assignments = [...lifecycleSource.matchAll(/light_archetype\[[^\]]*\]\s*=[^=]/g)];
  assert.equal(assignments.length, 3,
    "light_archetype[] writers: the wave admission, light_admit, and the init clear");
  assert.match(lifecycleSource, /light_archetype\[light_slot\]\s*=\s*light_record;/);
  // Re-pointed 2026-09-28 (owner decision 14). This slice used to be
  // encounter_light_schedule_advance and the two-entry schedule it indexed with
  // encounter_light_index; roadmap 4.6 step 2 retired both. The contract is
  // unchanged - ONE decision names the archetype and everything downstream only
  // reads it - and the decision is now the armed WaveDef, reaching the slot on
  // exactly two paths: the escort of a Heavy wave, and the members of a Light
  // wave. Both take it from a byte director_c_try_event published.
  // Roadmap 4.6 step 5 moved encounter_light_admit to the end of the window's
  // lifecycle code (plan §8.3), so its slice ends at its own closing brace
  // rather than at light_wave_step.
  const escortStart = lifecycleSource.indexOf("static void encounter_light_admit");
  const escortAdmit = lifecycleSource.slice(escortStart,
    lifecycleSource.indexOf("\n}\n", escortStart) + 3);
  assert.match(escortAdmit, /light_record\s*=\s*heavy_escort_offset;/);
  assert.match(escortAdmit, /light_archetype\[light_slot\]\s*=\s*light_record/);
  const waveStep = lifecycleSource.slice(
    lifecycleSource.indexOf("static void light_wave_step"),
    lifecycleSource.indexOf("void enemy_c_light_wave"));
  assert.match(waveStep, /light_record\s*=\s*light_wave_archetype;/);
  assert.doesNotMatch(lifecycleSource,
    /encounter_light_schedule|encounter_light_index|encounter_light_schedule_advance/,
    "no schedule and no counter may come back: the wave names the archetype");
  // The reusable admission and tick only ever read the offset.
  const spawnRaiders = lifecycleSource.slice(
    lifecycleSource.indexOf("void enemy_c_spawn_raiders"),
    lifecycleSource.indexOf("uint8_t enemy_c_retire_member"));
  assert.doesNotMatch(spawnRaiders, /light_archetype\[[^\]]*\]\s*=(?!=)/,
    "enemy_c_spawn_raiders must not itself assign the offset outside the admission call");
  // Step 2: the motion and cadence live in light_tick_body; enemy_c_light_tick
  // wraps it so the appearance install can replace the return without
  // swallowing the body. The offset is hoisted once, in the body, and nowhere
  // else - which is the contract this test is about.
  // Roadmap 4.6 step 5 put encounter_light_admit - an admission, which does
  // write the offset - after the tick functions (plan §8.3), so the slice
  // stops there.
  const lightTick = lifecycleSource.slice(
    lifecycleSource.indexOf("static uint8_t light_tick_body"),
    lifecycleSource.indexOf("static void encounter_light_admit"));
  assert.doesNotMatch(lightTick, /light_archetype\[[^\]]*\]\s*=(?!=)/,
    "enemy_c_light_tick only reads the offset");
  // The tick hoists it once, and only there.
  assert.match(lightTick, /light_record\s*=\s*light_archetype\[light_slot\]/);
});

// Re-pointed 2026-09-28 (owner decision 14). The retired test drove five
// formations off two smoke schedulers at once - the Heavy one cycling
// Raider/Bomber and the two-entry Light one cycling Wingman/Interceptor - and
// pinned the sequence they produced together. Roadmap 4.6 step 2 retired both
// schedulers, so the automatic ROTATION is gone and is not reproduced here:
// which archetype a wave names is authored level data, pinned in
// tests/level-one-equivalence.test.mjs. Every other property the sequence
// encoded still exists, unchanged, and is what this now drives from the bytes
// the Director publishes: a wave naming the Wingman admits it as an ESCORT
// (state 1), a wave naming the Interceptor admits it FREE (state 2), a wave
// carrying NO_ESCORT admits nothing, and each formation wears the archetype
// its own wave named.
test("the armed wave names the escort: Wingman escorts, Interceptor flies free, NO_ESCORT admits none", () => {
  const OFFSET_RAIDER = 0;
  const OFFSET_BOMBER = 36;
  const NO_ESCORT = 0xff;
  const image = game();
  const admit = (heavy, escort) => {
    image[L("_heavy_archetype_offset")] = heavy;
    image[L("_heavy_escort_offset")] = escort;
    run(image, "enemy_spawn_raiders");
    // light(image).state normalises the two alive values (1 escort, 2 free)
    // that replaced the light_leaderless byte.
    // light(image).state is alive/not; `leaderless` is the 1-vs-2 discriminator
    // encounter_light_admit sets from the archetype the wave named - ESCORT for
    // the Wingman, FREE for anything else - and it is carried in the tuple here
    // because "flies free" is half of what this test is about.
    const formation = [image[L("heavy_archetype_offset")], light(image).state,
      light(image).state === 0 ? null : light(image).offset,
      light(image).leaderless];
    image[L("light_state")] = 0;      // retire so the next call re-admits
    return formation;
  };
  assert.deepEqual([
    admit(OFFSET_RAIDER, OFFSET_WINGMAN),
    admit(OFFSET_BOMBER, NO_ESCORT),
    admit(OFFSET_RAIDER, OFFSET_INTERCEPTOR),
    admit(OFFSET_BOMBER, NO_ESCORT),
    admit(OFFSET_RAIDER, OFFSET_WINGMAN),
  ], [
    [OFFSET_RAIDER, 1, OFFSET_WINGMAN, 0],
    [OFFSET_BOMBER, 0, null, 0],
    [OFFSET_RAIDER, 1, OFFSET_INTERCEPTOR, 1],
    [OFFSET_BOMBER, 0, null, 0],
    [OFFSET_RAIDER, 1, OFFSET_WINGMAN, 0],
  ]);
});

test("admission per difficulty: entry x 124, leaderless, and the record's own post-burst pause", () => {
  for (const [difficulty, pause] of [[0, 56], [1, 44], [2, 32]]) {
    const image = game(difficulty);
    selectNextLight(image, OFFSET_INTERCEPTOR);
    run(image, "enemy_spawn_raiders");
    // `timer: pause` IS the post-burst column assertion now that the resolved
    // index is no longer kept as state: 56/44/32 are the Interceptor record's
    // three difficulty columns, so a wrong column shows here.
    assert.deepEqual(light(image), {
      state: 1, hp: 1, x: 124, y: 0, timer: pause, leaderless: 1,
      offset: OFFSET_INTERCEPTOR, burstLeft: 0,
    });
  }
});

test("descent is 2 lines per frame and retires at the recycled bottom ring row (232)", () => {
  const image = game();
  selectNextLight(image, OFFSET_INTERCEPTOR);
  run(image, "enemy_spawn_raiders");
  image[L("player_x")] = 124;         // no horizontal drift to isolate descent
  for (let frame = 1; frame <= 115; frame += 1) {
    run(image, "enemy_light_tick");
    assert.equal(light(image).y, frame * 2, `frame ${frame}`);
    assert.equal(light(image).state, 1);
  }
  run(image, "enemy_light_tick");     // 116th frame: y reaches 232
  assert.equal(light(image).state, 0, "retired before the recycled bottom ring row");
});

test("pursuit closes on the player one 4-HPOS cell every other frame, clamped to 48-200", () => {
  // Independent reference model of the spec, not a copy of the C source.
  function reference(playerX) {
    let x = 124;
    let y = 0;
    const trace = [];
    for (let frame = 0; frame < 40; frame += 1) {
      y += 2;
      if ((y & 2) === 0) {
        const target = Math.min(playerX & 0xfc, 200);
        if (x < target) x += 4;
        else if (x > target) x -= 4;
      }
      trace.push({ x, y });
    }
    return trace;
  }

  for (const playerX of [252, 0x30, 124]) {
    const image = game();
    selectNextLight(image, OFFSET_INTERCEPTOR);
    run(image, "enemy_spawn_raiders");
    image[L("player_x")] = playerX;
    const expected = reference(playerX);
    for (const { x, y } of expected) {
      run(image, "enemy_light_tick");
      assert.equal(light(image).y, y);
      assert.equal(light(image).x, x, `player_x ${playerX} at y ${y}`);
      assert.equal(light(image).x & 3, 0, "stays 4-aligned");
      assert.ok(light(image).x >= 48 && light(image).x <= 200, "stays within the ring");
    }
  }
});

test("pursuit ignores Heavy slot 0 entirely: an alive P1 formation does not switch it to follow mode", () => {
  const image = game();
  selectNextLight(image, OFFSET_INTERCEPTOR);
  run(image, "enemy_spawn_raiders");
  image[L("ENEMY_MEMBER_STATE")] = 1;   // Heavy slot 0 reported alive
  image[L("ENEMY_X")] = 40;
  image[L("ENEMY_Y")] = 40;
  image[L("player_x")] = 200;
  run(image, "enemy_light_tick");
  // A follow-mode Light would centre on ENEMY_X (40); the Interceptor stays
  // on its own pursuit track instead.
  assert.equal(light(image).leaderless, 1);
  assert.notEqual(light(image).x, (40 + 4 + 2) & 0xfc);
  assert.equal(light(image).y, 2);
});

test("single laser bolt cadence: burst 1, post 56/44/32, 1/2/3 shots per pass, tick returns LASER", () => {
  // 4.4c owner decision: one deliberate bolt per burst. Zero-based frame
  // indices; the pass fires on ticks 57 / 45, 90 / 33, 66, 99.
  const LASER = 2;
  for (const [difficulty, fires] of [
    [0, [56]],
    [1, [44, 89]],
    [2, [32, 65, 98]],
  ]) {
    const image = game(difficulty);
    selectNextLight(image, OFFSET_INTERCEPTOR);
    run(image, "enemy_spawn_raiders");
    image[L("player_x")] = 124;
    const observed = [];
    for (let frame = 0; frame < 200 && light(image).state !== 0; frame += 1) {
      const { a } = run(image, "enemy_light_tick");
      if (a === LIGHT_RETURN_INSTALL) {
        assert.equal(frame, 0, "only the admission frame installs an appearance");
      } else if (a) {
        observed.push(frame);
        assert.equal(a, LASER, "a firing tick returns the record's weapon_class");
      }
    }
    assert.deepEqual(observed, fires, `difficulty ${difficulty}`);
  }
});

test("fire is gated by visibility and by the player dying, exactly like the Wingman", () => {
  const image = game();
  selectNextLight(image, OFFSET_INTERCEPTOR);
  run(image, "enemy_spawn_raiders");
  // Spend the admission frame's appearance install before poking the cadence.
  assert.equal(run(image, "enemy_light_tick").a, LIGHT_RETURN_INSTALL);
  image[L("light_fire_timer")] = 0;
  image[L("light_y")] = 10;           // below LIGHT_FIRE_TOP (24)
  assert.equal(run(image, "enemy_light_tick").a, 0);
  assert.equal(light(image).timer, 0, "an invisible Interceptor retries next frame");
  image[L("light_y")] = 100;
  image[L("PLAYER_LIFECYCLE")] = 1;
  assert.equal(run(image, "enemy_light_tick").a, 0, "no fire while the player is dying");
  image[L("PLAYER_LIFECYCLE")] = 0;
  assert.equal(run(image, "enemy_light_tick").a, 2, "fires, returning weapon_class LASER");
});

test("a player PairShot kills the Interceptor, scores 0x15 BCD, and only the fighter lifecycle retires it", () => {
  const image = game();
  selectNextLight(image, OFFSET_INTERCEPTOR);
  run(image, "enemy_spawn_raiders");
  image[L("light_x")] = 100;
  image[L("light_y")] = 99;
  const active = L("FIGHTER_PROJECTILE_ACTIVE");
  image[active] = 1;
  image[L("FIGHTER_PROJECTILE_X")] = 102;
  image[L("FIGHTER_PROJECTILE_Y")] = 100;
  image[L("score_bcd_lo")] = 0x00;
  image[L("score_bcd_hi")] = 0x00;
  const hit = run(image, "light_shot", { x: 0 });
  assert.equal(hit.carry, false);
  assert.equal(image[active], 0);
  assert.equal(light(image).state, 0);
  assert.deepEqual([image[L("score_bcd_lo")], image[L("score_bcd_hi")]], [0x15, 0x00]);
  const member = L("ENEMY_MEMBER_STATE");
  assert.deepEqual([...image.subarray(member, member + 2), image[L("ENEMY_LIVE_COUNT")]],
    [1, 1, 2], "both Heavies are untouched");

  // Fighter-only lifecycle: any non-fighter sector retires it at once, the
  // same contract the Wingman uses.
  const image2 = game();
  selectNextLight(image2, OFFSET_INTERCEPTOR);
  run(image2, "enemy_spawn_raiders");
  image2[L("CAPITAL_SECTOR_STATE")] = 1;
  run(image2, "enemy_light_tick");
  assert.equal(light(image2).state, 0);
});

test("placement contract: legal composite and packed size, state inside its reserved windows, no C stack", () => {
  const extension = manifest.directorCodeRuntimes.find(({ name }) => name === "extension");
  assert.ok(extension.runAddress + extension.bytes <= 0x9000,
    `extension composite ends at $${(extension.runAddress + extension.bytes).toString(16)}`);
  assert.ok(extension.packedBytes <= 960, "late-compressed extension cold staging limit");
  // Scarce: the owner floor is 16 B; below it the next change needs a decision.
  assert.ok(manifest.residentCapacity.tails.hybridCExtension >= 16,
    `free HYBRID_C_EXT tail ${manifest.residentCapacity.tails.hybridCExtension} B`);
  // Step 1b: LIGHT_RESIDENT is gone from the main link - the whole kernel is
  // its own link in the code window - so the pickup stream starts $8776 itself.
  assert.equal(manifest.lightWingman.residentBytes, 0);
  // Emitter-independent hostile shots (2026-09-17): the 27-B Raider-kill
  // projectile cleanup left ENTITY_CODE, so the art tables moved down 27 B.
  // Death-frame deferral (2026-09-17): player_dying_tick (+18 B) is the new
  // ENTITY_CODE tail behind the unmoved art tables.
  // REBASELINED. The first three numbers below were ALREADY stale at 82c155b -
  // ENTITY_CODE measured 3,165 B with a 1-B tail there, not 3,144 / 22 - which
  // is why this test is in the pre-existing failure set; they are corrected
  // here rather than left red under a placement change.
  // 3,161 / 5 after music v2 §10.2: the v1 gameplay player's four-byte
  // self-modified read tail `game_music_read_token_tail` was deleted with the
  // v1 player, because the format-2 encoding addresses a column through a
  // one-byte offset and modifies nothing. ENTITY_CODE shrank by exactly those
  // four bytes and its free tail grew 1 -> 5 B.
  // 3,140 / 26 since 2026-09-28 (owner decision, docs/plans/pickup-colour.md
  // §7 items 2-3 and 8): the pickup capsule's move to PLAYER3 RETURNS 21 B of
  // ENTITY_CODE -- the ship stops publishing a P3 image nothing could see, the
  // shield pulse stops writing COLPM3, and the release stops restoring a
  // fifth-player PRIOR/SIZEM that no longer exists. Nothing moved into the
  // segment and no segment start changed; the free tail grew 5 -> 26 B.
  // 3,156 / 10 since 2026-10-05 (plasma FX): the break-up's two growth glyphs (16 B of source, codes 108-109, plasma FX decisions 2-3, docs/plans/plasma-fx.md) lead the ENTITY_CODE glyph bank; the free tail 26 -> 10 B.
  assert.equal(manifest.entityEffects.codeBytes, 3156);
  assert.equal(manifest.residentCapacity.tails.entityCode, 10);
  // Step 1b: LIGHT_RESIDENT's 229 B left the pickup stream with the kernel.
  // Re-recorded 2026-09-22: the Heavy break-up (plan-4.6-placement.md §7.4
  // variant 2) spends 122 B of that fill and the debris reward's
  // debris_shot_reward another 25, 236 -> 89. Both are owner decisions, and
  // this fill is exactly where §7.5 put them: contiguous, already reserved,
  // already transported, neighbour already asserted.
  // Re-recorded 2026-09-23 for owner decision A', which named this window as
  // one of the three it authorised: the main-menu star tick, its twelve-byte
  // twinkle cycle table and its frame counter take 84 of the remaining 89 B,
  // 89 -> 5. That cost is fixed code and does not move with the star count.
  // Same reasoning as the two entries above - contiguous, already reserved,
  // already transported, neighbour already asserted at $8B67.
  // Re-recorded 2026-09-23, second pass: owner smoke called the twinkle too
  // fast, so the tick now divides its frame counter by four (a step lasts four
  // menu frames, a cycle 48). The divider is two LSRs and reuses the one
  // counter byte rather than adding a second, and a 48-entry cycle table was
  // ruled out precisely because this window has no room for 36 more bytes:
  // 5 -> 3. Three bytes is the whole remaining fill; the next session to want
  // this window must free some first.
  // Re-recorded 2026-09-28, roadmap 4.6 step 2: 3 -> 49. No byte was spent for
  // this - the Heavy smoke scheduler, the Light escort schedule, its
  // entry-column cycle and its per-difficulty spacing table were retired into
  // WaveDef fields, and what they used to occupy in this window came back as
  // fill. It is the largest this tail has been; the figure is recorded, not
  // budgeted, and the next session to want the window should read it as room
  // step 2 released rather than room that was always there.
  // Re-recorded 2026-09-28, the pickup capsule on PLAYER3 (owner decision,
  // docs/plans/pickup-colour.md §7 item 2): 49 -> 75. Again nothing was spent.
  // PICKUP_CODE gave back 26 B: the renderer writes one HPOSP3 where it wrote
  // four HPOSM, and the release has no fifth-player PRIOR/SIZEM to restore
  // because PRIOR is $00 for the whole of gameplay now. Recorded, not budgeted.
  // Re-recorded 2026-10-01, the all-or-nothing Spread volley (owner decision
  // 2026-09-30, docs/plans/spread-volley-fix.md): 75 -> 65. The 10-B
  // player_fighter_spread_volley_sides is appended here because MAIN is full and
  // its LZ image is the capped initial block; extension record 2 stays at 9
  // sectors (1,128 of 1,131 B).
  // Re-recorded 2026-10-05, plasma FX B1.1 (docs/plans/plasma-fx.md): 65 ->
  // 64. heavy_spawn_breakup reads each fragment's first code from a table
  // (lda abs,x for lda #), one byte.
  assert.equal(manifest.residentCapacity.tails.pickupStreamFill, 64);
  // Owner decision X + Light multiplicity steps 1a-3. The Light C left the
  // extension for the code window and the kernel left for its own link, which
  // took the scarce 19-B tail to 451; step 3's multi-slot ASM then overran the
  // 1,536-B window by 143 B, so the COLD admission path came back here and
  // spent most of it. 34 B is above the 16-B owner floor asserted at the top
  // of this test. Step 4 took it to 10 B - BELOW that floor - and the token
  // primitive, the ceiling and the live count moved to the window with the hot
  // path that asks them, which brought it back to 70. Owner fix (a) then took
  // 19 B in the kernel against a 17-B window tail, so the coldest thing in the
  // window - encounter_light_schedule_advance - moved to HYBRID_C_ARENA and
  // lifecycle_c_init grew by the new bound's clear: extension 874 -> 877 B,
  // tail 25 -> 22 B, and the code window tail 17 -> 32 B. Both are tight; the
  // next Light-class growth needs a placement decision rather than a spare
  // byte.
  // Plan §4.6, 2026-09-21: the rotate gate confirms that. Its 1 B of state
  // took $8127 rather than either full Light area, its compare cost the code
  // window 5 B net (the new claim wrapper, less the token test the forcing
  // rule removed from the deferred-breakup retry), and lifecycle_c_init's
  // clear cost this composite 3: extension 877 -> 880 B, tail 22 -> 19 B, and
  // the code window tail 32 -> 27 B.
  // Heavy break-up, 2026-09-22 (plan-4.6-placement.md §7.4 variant 2): the same
  // shape a third time - its deferred-once bit took $8128 rather than either
  // full Light area, its claim went to HYBRID_C_ARENA with the rest of the
  // Heavy's C, and lifecycle_c_init's clear cost this composite 3 again:
  // extension 880 -> 883 B. The tail this manifest reports is the extension
  // window's, 19 -> 16 B.
  // Re-recorded 2026-09-28, roadmap 4.6 step 2: 16 -> 25. Like the fill above,
  // no byte was spent for it - the two retired schedulers and their tables gave
  // 9 B of this window back.
  // Re-recorded 2026-10-01, roadmap 4.6 step 5: 25 -> 39. light_admit took
  // 26 B for the look key and encounter_light_admit's 40 B left for the code
  // window (plan §8.3), so the composite shrank by 14.
  assert.equal(manifest.residentCapacity.tails.hybridCExtension, 39);
  // Both moved down 4 B in music v2 §10.2: the v1 gameplay player's
  // self-modified read tail was at $9D21, ahead of the art tables, and went
  // with the v1 player. Nothing about the tables themselves changed.
  // Both moved down a further 21 B on 2026-09-28, for the same kind of reason
  // (owner decision, docs/plans/pickup-colour.md §7): the pickup capsule's move
  // to PLAYER3 returned 21 B of ENTITY_CODE ahead of the tables. The tables
  // themselves are byte-identical; only their address fell, and the segment's
  // free tail grew by exactly the same 21 B.
  // Both moved up 16 B on 2026-10-05 (plasma FX, docs/plans/plasma-fx.md): the
  // break-up's two growth glyphs (codes 108-109) lead the ENTITY_CODE glyph
  // bank, ahead of the tables; the tables are byte-identical.
  assert.equal(L("light_glyph"), 0x9d22);
  assert.equal(L("light_interceptor_glyph"), 0x9d32);
  // REBASELINED for Light multiplicity: HYBRID_LIGHT_STATE keeps only the
  // SHARED scalars; the per-slot state is 48 B of SoA arrays at $7FC4-$7FF3,
  // in the 60 unassigned bytes above the A2 display lists.
  assert.equal(L("light_slot"), 0x8100);
  assert.equal(L("_light_scratch"), 0x8101);
  assert.equal(L("_light_slot_save"), 0x8102);
  // The AREA is still exactly $8100-$810F; the shared scalars now use 8 of it,
  // and the 8 free bytes are what the token and wave state of plan §2.4/§2.5
  // will occupy.
  assert.deepEqual([L("__HYBRID_LIGHT_STATE_RAM_START__"), L("__HYBRID_LIGHT_STATE_RAM_SIZE__")],
    [0x8100, 0x10], "HYBRID_LIGHT_STATE is exactly $8100-$810F");
  // Step 4 spent seven of the eight free bytes (the three token bytes of plan
  // §2.5 and the four admission/pair statics the C-stack contract forces), and
  // owner fix (a) the eighth, for light_slot_limit. The area is now FULL: the
  // next shared Light byte needs somewhere else to live.
  assert.equal(L("__HYBRID_LIGHT_STATE_SIZE__"), 16, "shared Light scalars fill the 16 B");
  assert.equal(L("__HYBRID_LIGHT_STATE_RAM_SIZE__"), 16);
  // REBASELINED at step 5: 48 B is the ten per-slot arrays plus the cell-major
  // backing, and it was the whole segment only at step 1a. Steps 2-4 added the
  // resolver's two scratch bytes, the appearance-pair table and the ceilings,
  // live count and wave state beside them, so the SEGMENT filled the 60 B the
  // cfg reserves - which was half the reason owner fix (a)'s byte had to go to
  // $8126.
  // Re-recorded 2026-09-28, roadmap 4.6 step 2: 60 -> 59. The Light escort
  // schedule's entry-column cycle left this area for a WaveDef field, so the
  // segment is one byte short of its reservation for the first time since step
  // 1a. ONE byte is not room for a design: the placement decision the next
  // Light-class growth needs still stands.
  assert.deepEqual([L("__HYBRID_LIGHT_SLOTS_RUN__"), L("__HYBRID_LIGHT_SLOTS_SIZE__")],
    [0x7fc4, 59], "the Light slot segment fills $7FC4-$7FFE, 1 B short of its 60");
  assert.ok(L("__HYBRID_LIGHT_SLOTS_RAM_LAST__") <= 0x8000,
    "the slot arrays must stop before ENTITY_STATE at $8000");
  // Re-recorded 2026-09-28, roadmap 4.6 step 2: the per-slot arrays start at
  // $7FCA, not at the segment's own $7FC4. The six bytes now ahead of them are
  // the armed LIGHT wave - light_wave_lock, _remaining, _timer, _entry,
  // _archetype, _spacing_frames - which is the schedule's replacement and was
  // declared into this segment. The arrays themselves and their order are
  // unchanged; only the base moved.
  assert.equal(L("light_state"), 0x7fca);
  assert.equal(L("_light_wave_lock"), 0x7fc4, "the armed wave heads the segment");
  // Cell-major backing: LIGHT_SLOT_COUNT * LIGHT_CELL_COUNT = 8 B, so the two
  // cells of a slot are adjacent and the erase/render loops index by cell.
  assert.equal(L("light_backing0") - L("light_state"), 4 * 7);
  // cc65 emits the HYBRID_ENCOUNTER_STATE bytes in reverse declaration order.
  // Re-pointed 2026-09-28 (owner decision 14): the segment is unmoved and still
  // exactly two bytes, but roadmap 4.6 step 2 retired the two provisional
  // schedule counters that lived in it and put the armed wave's Heavy half
  // there instead - src/c/director.c heavy_escort_offset and heavy_wave_flags,
  // as src/c/lifecycle.c's own comment records. What this pins is what it
  // always pinned: the segment's address, its size, and that nothing else got
  // in.
  assert.equal(L("_heavy_escort_offset"), 0x8119);
  assert.equal(L("_heavy_wave_flags"), 0x811a);
  assert.deepEqual([L("__HYBRID_ENCOUNTER_STATE_RUN__"), L("__HYBRID_ENCOUNTER_STATE_SIZE__")],
    [0x8119, 2], "the armed wave's two Heavy bytes are the only bytes of their segment");
  assert.equal(manifest.encounterDirector.director.footprint.cStackBytes, 0);
  assert.equal(manifest.encounterDirector.director.footprint.zeroPageBytes, 0);
});

test("no PMG: no P1/P2 or PMG register touched by the ASM files this task changed", () => {
  const pmgPattern = /\b(?:PLAYER0|PLAYER1|PLAYER2|PLAYER3|MISSILE0|MISSILE1|MISSILE2|MISSILE3|HPOSP\d|SIZEP\d|GRACTL|PMBASE)\b/;
  assert.doesNotMatch(lightSource, pmgPattern);
  assert.doesNotMatch(abiSource, pmgPattern);
  // ASM is limited to the ABI equate, the read before the score add and the
  // adc,x in the 17-byte pad; it must not introduce a second archetype field.
  // Step 3: the archetype is per-slot, so the two reads are indexed by slot -
  // one to score a kill, one to pick the art the install copies.
  // RE-POINTED 2026-10-01, roadmap 4.6 step 5 (plan §8.3): the install picks
  // its art from the look C admitted the PAIR for (LIGHT_PAIR_KEY), which for
  // appearance 0 is this same archetype offset - so the archetype field is
  // read once now, for the score, and the look once, for the install.
  assert.equal((mainSource.match(/adc LIGHT_SCORE_BCD,x/g) ?? []).length, 1);
  assert.equal((lightSource.match(/lda LIGHT_ARCHETYPE_OFFSET,x/g) ?? []).length, 1);
  assert.equal((lightSource.match(/lda LIGHT_PAIR_KEY,y/g) ?? []).length, 1);
  // Only the comment on the LIGHT_SCORE_BCD equate names it unindexed.
  assert.equal((lightSource.match(/^\s+\S+\s+LIGHT_ARCHETYPE_OFFSET(?!,x)/gm) ?? []).length, 0,
    "the archetype is never read as a scalar now that it is per-slot");
});

test("weapon_class visuals: Raider PULSE publishes $DA/$E4, the Interceptor LASER bolt $E5, and the resolver restores both", () => {
  const CHARSET = 0x4400;
  const PULSE = 1;
  const LASER = 2;
  const base = 5;
  const image = game(2);
  run(image, "init_fighter_projectiles");
  run(image, "build_hostile_weapon_glyphs");
  // Authored per class: left phase at 89+c, right phase (>> 4) at 99+c.
  const pulse = [0x00, 0xa0, 0x50, 0x00, 0x00, 0xa0, 0x50, 0x00];
  const laser = [0x20, 0x20, 0x20, 0x10, 0x10, 0x10, 0x10, 0x00];
  const glyph = (index) => [...image.subarray(CHARSET + index * 8, CHARSET + (index + 1) * 8)];
  assert.deepEqual(glyph(90), pulse);
  assert.deepEqual(glyph(91), laser);
  assert.deepEqual(glyph(100), pulse.map((value) => value >> 4));
  assert.deepEqual(glyph(101), laser.map((value) => value >> 4));

  // Interceptor: the real Light emit tags the shot with the C-returned class.
  selectNextLight(image, OFFSET_INTERCEPTOR);
  run(image, "enemy_spawn_raiders");
  image[L("light_x")] = 100;
  image[L("light_y")] = 100;
  // Spend the admission frame's appearance install first: it is the one return
  // that outranks a fire, and this test pokes the cadence to zero.
  run(image, "light_update");
  image[L("light_x")] = 100;
  image[L("light_y")] = 100;
  image[L("light_fire_timer")] = 0;
  const active = L("FIGHTER_PROJECTILE_ACTIVE");
  image.fill(0, active, active + 10);
  run(image, "light_update");
  assert.equal(image[active + base], 0x06 | (LASER << 3));

  // Raider: the real Heavy emitter tags its shot PULSE and keeps the 0/1 cursor.
  // Since 4.5c the caller passes the record's weapon_class in A (generic emission).
  for (const member of [0, 1]) {
    image[L("ENEMY_MEMBER_STATE") + member] = 1;
    image[L("ENEMY_X") + member] = 80 + member * 40;
    image[L("ENEMY_Y") + member] = 60;
  }
  image[L("ENEMY_TARGET_SLOT")] = 1;
  assert.equal(run(image, "allocate_interceptor_projectile", { a: PULSE }).carry, true);
  assert.equal(image[active + base + 1], 0x02 | 0x01 | (PULSE << 3));
  assert.equal(image[L("ENEMY_WEAPON_CURSOR")], 0);
  image[L("ENEMY_TARGET_SLOT")] = 0;
  assert.equal(run(image, "allocate_interceptor_projectile", { a: PULSE }).carry, true);
  assert.equal(image[active + base + 2], 0x02 | (PULSE << 3));
  assert.equal(image[L("ENEMY_WEAPON_CURSOR")], 1);
  // Pin the two Raider shots to the left and right horizontal phases.
  image[L("FIGHTER_PROJECTILE_X") + base + 1] = 96;
  image[L("FIGHTER_PROJECTILE_X") + base + 2] = 130;
  image[L("FIGHTER_PROJECTILE_Y") + base + 1] = 120;
  image[L("FIGHTER_PROJECTILE_Y") + base + 2] = 140;

  run(image, "render_fighter_projectile_overlays");
  const cell = (slot) => image[L("FIGHTER_PROJECTILE_SCREEN_LO") + slot] |
    (image[L("FIGHTER_PROJECTILE_SCREEN_HI") + slot] << 8);
  assert.deepEqual([base, base + 1, base + 2].map((slot) => image[cell(slot)]),
    [0xe5, 0xda, 0xe4]);

  const dst = L("dst_ptr");
  for (const slot of [base, base + 1, base + 2]) {
    const address = cell(slot);
    image[dst] = address & 0xff;
    image[dst + 1] = address >> 8;
    const backing = image[L("FIGHTER_PROJECTILE_BACKUP_TOP") + slot];
    assert.ok(backing < 0xda || backing > 0xe7, "the saved underlay is not a hostile shot");
    assert.equal(run(image, "resolve_effect_backing_below_enemy_pairshot",
      { a: image[address] }).a, backing, `slot ${slot} restores its backing`);
    // 4.5b: the BOMBER class (3) extends the hostile range through $E6.
    // 4.5d: the BOMBER exhaust phase (visual 4) extends it through $E7.
    for (const bomber of [0xdc, 0xe6, 0xdd, 0xe7]) {
      assert.equal(run(image, "resolve_effect_backing_below_enemy_pairshot",
        { a: bomber }).a, backing, `BOMBER code $${bomber.toString(16)} is a hostile shot`);
    }
    for (const outside of [0xd9, 0xe8]) {
      assert.equal(run(image, "resolve_effect_backing_below_enemy_pairshot",
        { a: outside }).a, outside, `code $${outside.toString(16)} is not a hostile shot`);
    }
  }
});
