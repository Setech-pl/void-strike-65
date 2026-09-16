import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  compileFighterWeapons,
  buildInterceptorProjectileGlyphBank,
  hostileProjectileScreenCode,
  createSharedFighterExplosion,
  createPlayerFighterBurstState,
  loadFighterWeaponsDefinition,
  renderSharedFighterExplosionPmg,
  simulatePlayerFighterBurst,
  stepSharedFighterExplosion,
  stepPlayerFighterBurst,
} from "../scripts/fighter-weapons.mjs";
import {
  compileEnemyRoster,
  loadEnemyRosterDefinition,
} from "../scripts/enemy-roster.mjs";
import { Nmos6502 } from "../scripts/nmos6502.mjs";
import { installRuntimeSegments, readRuntimeBytes } from "../scripts/runtime-image.mjs";
import { loadCapitalHullsDefinition } from "../scripts/capital-hulls.mjs";
import { canonicalPlayfield } from "../scripts/playfield.mjs";

const directory = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(directory, "..");
const source = fs.readFileSync(path.join(root, "src", "main.s"), "utf8");
const integrationSource = fs.readFileSync(path.join(root, "src", "integration-glue.s"), "utf8");
const roster = compileEnemyRoster(loadEnemyRosterDefinition(
  path.join(root, "assets", "graphics", "enemy-roster.json")), root);
const weapons = compileFighterWeapons(loadFighterWeaponsDefinition(
  path.join(root, "assets", "graphics", "fighter-weapons.json")), roster);
const hulls = loadCapitalHullsDefinition(
  path.join(root, "assets", "graphics", "capital-hulls.json"));
const labels = new Map(
  fs.readFileSync(path.join(root, "build", "void-strike-65.lbl"), "utf8")
    .split(/\r?\n/)
    .map((line) => /^al\s+([0-9a-f]+)\s+\.?([^\s]+)$/i.exec(line.trim()))
    .filter(Boolean)
    .map((match) => [match[2], Number.parseInt(match[1], 16)]),
);

function xexBytes(address, length) {
  return readRuntimeBytes(root, address, length);
}

test("assembled gameplay display keeps HUD, divider and 27 ring rows distinct", () => {
  assert.match(source, /PLAYFIELD_DLIST_BYTES\s*=\s*3\+3\+PLAYFIELD_RING_ROWS\*3\+3/);
  assert.match(source, /lda #\$C2[\s\S]+lda #\$44[\s\S]+lda #\$C4[\s\S]+lda #\$41/);
  assert.doesNotMatch(source.slice(
    source.indexOf("build_playfield_display_list:"),
    source.indexOf("rotate_playfield_rows:"),
  ), /lda #\$70/);
  assert.deepEqual(weapons.viewport, canonicalPlayfield);
});

test("Interceptor PMG drawing retains the accepted bounded viewport lifecycle", () => {
  const interceptor = roster.implemented[0];
  const visibleCounts = [];
  for (let logicalY = weapons.viewport.gameplayTop - interceptor.height;
    logicalY < weapons.viewport.gameplayTop; logicalY += 1) {
    const p1 = new Uint8Array(256);
    const p2 = new Uint8Array(256);
    for (let row = 0; row < interceptor.height; row += 1) {
      const y = logicalY + row;
      if (y < weapons.viewport.gameplayTop || y >= weapons.viewport.gameplayBottom) continue;
      p1[y] = interceptor.bodyRows[row];
      p2[y] = interceptor.accentFrameBytes[row];
    }
    assert.equal(p1.subarray(0, weapons.viewport.gameplayTop).some(Boolean), false);
    assert.equal(p2.subarray(0, weapons.viewport.gameplayTop).some(Boolean), false);
    visibleCounts.push(p1.subarray(weapons.viewport.gameplayTop).filter(Boolean).length);
  }
  assert.equal(visibleCounts[0], 0);
  assert.ok(visibleCounts.some((count) => count > 0));
  assert.ok(visibleCounts.at(-1) > visibleCounts.find((count) => count > 0),
    "successive occupied body rows enter progressively instead of appearing fully formed");
  const renderer = source.slice(source.indexOf("draw_enemy:"), source.indexOf("reset_enemy:"));
  assert.match(renderer, /cpy #GAMEPLAY_BOTTOM[\s\S]+bcs @body_done/);
  assert.match(renderer,
    /update_enemy_slot_motion:[\s\S]+jsr update_interceptor_soft_pursuit[\s\S]+ENEMY_MANEUVER_STATE,x/);
});

test("held FIRE emits four PairShots / eight visible pulses at nine-frame intervals", () => {
  const simulation = simulatePlayerFighterBurst(weapons, 90);
  const allocations = simulation.trace.filter(({ allocationResult }) =>
    allocationResult === "ALLOCATED");
  assert.deepEqual(allocations.slice(0, 4).map(({ frame }) => frame), [1, 10, 19, 28]);
  assert.equal(allocations[3].burstState, "POST_BURST_COOLDOWN");
  assert.equal(allocations[3].timer, 12);
  assert.equal(allocations[4].frame, 40);
  assert.equal(weapons.player_fighter.visibleBurstPulses, 8);
  assert.ok(Math.max(...simulation.trace.map(({ active }) => active.length)) <= 5);
});

test("Rapid emits five PairShots / ten visible pulses within the five-object limit", () => {
  const simulation = simulatePlayerFighterBurst(weapons, 90, { weaponMode: "RAPID" });
  const allocations = simulation.trace.filter(({ allocationResult }) =>
    allocationResult === "ALLOCATED");
  assert.deepEqual(allocations.slice(0, 5).map(({ frame }) => frame), [1, 7, 13, 19, 25]);
  assert.equal(allocations[4].burstState, "POST_BURST_COOLDOWN");
  assert.equal(allocations[4].timer, 12);
  assert.equal(allocations[5].frame, 37);
  assert.equal(weapons.player_fighter.rapidFireVisiblePulses, 10);
  assert.ok(Math.max(...simulation.trace.map(({ active }) => active.length)) <= 5);
});

test("FIRE release stops new emissions while launched PlayerFighter shots remain independent", () => {
  let state = createPlayerFighterBurstState(weapons);
  state = stepPlayerFighterBurst(weapons, state, { fireHeld: true, playerX: 100 });
  const launchedX = state.pool[0].x;
  state = stepPlayerFighterBurst(weapons, state, { fireHeld: false, playerX: 150 });
  assert.equal(state.shotsEmitted, 1);
  assert.equal(state.pool[0].x, launchedX);
  assert.equal(state.pool[0].y, 176);
  assert.equal(state.burstState, "WAITING");
});

test("PlayerFighter pool rejection neither overwrites shots nor counts a rejected emission", () => {
  let state = createPlayerFighterBurstState(weapons);
  state.pool = state.pool.map((_, index) => index < weapons.player_fighter.activeLimit ?
    { owner: "PLAYER_FIGHTER", x: 80 + index, y: 100,
      previousY: 100, width: 1, height: 2, colour: 0x1e } : null);
  const before = state.pool.map((shot) => shot?.x ?? null);
  state = stepPlayerFighterBurst(weapons, state, { fireHeld: true });
  assert.equal(state.shotsEmitted, 0);
  assert.deepEqual(state.pool.map((shot) => shot?.x ?? null), before);
  assert.equal(state.burstRemaining, 4);
  state.pool[0] = null;
  state = stepPlayerFighterBurst(weapons, state, { fireHeld: true });
  assert.equal(state.shotsEmitted, 1, "one deferred shot uses the newly free slot");
  state = stepPlayerFighterBurst(weapons, state, { fireHeld: true });
  assert.equal(state.shotsEmitted, 1, "rejection does not accumulate a catch-up salvo");
});

test("fighter projectiles use fixed pools and remain independent of DRAIN and M0-M3", () => {
  assert.deepEqual([weapons.player_fighter.poolSlots, weapons.interceptor.poolSlots, weapons.totalSlots],
    [5, 5, 10]);
  assert.deepEqual([weapons.player_fighter.activeLimit, weapons.interceptor.activeLimit], [5, 5]);
  let state = simulatePlayerFighterBurst(weapons, 12).state;
  assert.ok(state.pool.some(Boolean));
  state = stepPlayerFighterBurst(weapons, state, { drain: true });
  assert.equal(state.pool.some(Boolean), true);
  const renderer = source.slice(source.indexOf("render_fighter_projectile_overlays:"),
    source.indexOf("; -----------------------------------------------------------------------------\n; Enemy"));
  assert.doesNotMatch(renderer, /MISSILES|HPOSM|SIZEM|COLPM/);
});

test("PlayerFighter fire remains continuous through DRAIN and COMPLETE", () => {
  let held = simulatePlayerFighterBurst(weapons, 8, { fireHeld: true }).state;
  assert.ok(held.pool.some(Boolean));
  held = stepPlayerFighterBurst(weapons, held, { fireHeld: true, drain: true });
  assert.equal(held.pool.some(Boolean), true);
  assert.notEqual(held.burstState, "WAITING");
  held = stepPlayerFighterBurst(weapons, held, { fireHeld: true, sectorComplete: true });
  assert.equal(held.shotsEmitted, 2,
    "COMPLETE preserves the canonical burst cadence rather than forcing a new shot");
  assert.ok(held.pool.some(Boolean));

  let fresh = createPlayerFighterBurstState(weapons);
  fresh = stepPlayerFighterBurst(weapons, fresh, { fireHeld: false, drain: true });
  fresh = stepPlayerFighterBurst(weapons, fresh, { fireHeld: true, drain: true });
  assert.equal(fresh.shotsEmitted, 1);
  const completion = source.slice(source.indexOf("update_sector_completion:"),
    source.indexOf("apply_broadside_player_damage:"));
  const weapon = source.slice(source.indexOf("update_player_fighter_weapon:"),
    source.indexOf("allocate_player_fighter_projectile:"));
  assert.doesNotMatch(completion, /clear_fighter_projectiles/);
  assert.doesNotMatch(weapon, /CAPITAL_SECTOR_STATE|clear_fighter_projectiles/);
});

test("shared fighter explosion has six distinct expanding and fading native phases", () => {
  const explosion = weapons.sharedFighterExplosion;
  assert.deepEqual([
    explosion.frameCount,
    explosion.frameDurationFrames,
    explosion.totalFrames,
    explosion.widthBits,
    explosion.heightScanlines,
    explosion.slots,
  ], [6, 4, 24, 8, 8, 2]);
  const frames = Array.from({ length: explosion.frameCount }, (_, index) =>
    [...explosion.outerBytes.subarray(index * explosion.heightScanlines,
      (index + 1) * explosion.heightScanlines)]);
  assert.equal(new Set(frames.map((frame) => frame.join(","))).size, 6);
  const occupied = frames.map((frame) => frame.reduce((sum, byte) =>
    sum + byte.toString(2).replaceAll("0", "").length, 0));
  assert.deepEqual(occupied, [4, 18, 44, 22, 14, 7]);
  assert.ok(occupied[0] < occupied[1] && occupied[1] < occupied[2]);
  assert.ok(occupied[3] < occupied[2]);
  assert.ok(occupied[4] < occupied[3] && occupied[5] < occupied[4]);
});

test("shared explosion remains fixed, holds every phase four frames, and clears at frame 24", () => {
  let state = createSharedFighterExplosion(weapons, { x: 120, y: 88, owner: "INTERCEPTOR" });
  const trace = [];
  for (let visibleFrame = 0; visibleFrame < 24; visibleFrame += 1) {
    trace.push({ ...state });
    state = stepSharedFighterExplosion(weapons, state);
  }
  assert.deepEqual(trace.map(({ frame }) => frame),
    [0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2,
      3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5]);
  assert.ok(trace.every(({ x, y }) => x === 120 && y === 88));
  assert.deepEqual([state.active, state.timer, state.frame], [false, 0, 6]);
});

test("explosion adapters keep a stable centre and clear the full eight-row union", () => {
  const player_fighterCollisionLeft = 124;
  const player_fighterOrigin = player_fighterCollisionLeft - 4;
  const player_fighterY = 184 + 4;
  let state = createSharedFighterExplosion(weapons,
    { x: player_fighterOrigin, y: player_fighterY, owner: "PLAYER_FIGHTER" });
  let outer = new Uint8Array(256).fill(0xa5);
  let core = new Uint8Array(256).fill(0x5a);
  const beforeGuard = [outer[player_fighterY - 1], core[player_fighterY - 1]];
  const afterGuard = [outer[player_fighterY + 8], core[player_fighterY + 8]];
  const visibleCentres = [];
  for (let frame = 0; frame < 24; frame += 1) {
    ({ outer, core } = renderSharedFighterExplosionPmg(weapons, state, { outer, core }));
    const rows = outer.subarray(player_fighterY, player_fighterY + 8);
    const occupiedColumns = [];
    for (const value of rows) {
      for (let bit = 0; bit < 8; bit += 1) if (value & (0x80 >> bit)) occupiedColumns.push(bit);
    }
    visibleCentres.push((Math.min(...occupiedColumns) + Math.max(...occupiedColumns)) / 2);
    state = stepSharedFighterExplosion(weapons, state);
  }
  ({ outer, core } = renderSharedFighterExplosionPmg(weapons, state, { outer, core }));
  assert.equal(visibleCentres.every((centre) => centre === 3.5), true,
    "every shared radial phase remains centred on the same 8-bit PMG origin");
  assert.deepEqual([...outer.subarray(player_fighterY, player_fighterY + 8)], Array(8).fill(0));
  assert.deepEqual([...core.subarray(player_fighterY, player_fighterY + 8)], Array(8).fill(0));
  assert.deepEqual([outer[player_fighterY - 1], core[player_fighterY - 1]], beforeGuard);
  assert.deepEqual([outer[player_fighterY + 8], core[player_fighterY + 8]], afterGuard);
  assert.match(source,
    /begin_player_fighter_explosion:[\s\S]+sbc #\(\(SHARED_FIGHTER_EXPLOSION_WIDTH_BITS\*2-PLAYER_COLLISION_WIDTH\)\/2\)/);
});

test("assembled explosion bank stays on PlayerFighter PMGs and cannot commandeer either Raider", () => {
  const explosion = weapons.sharedFighterExplosion;
  assert.deepEqual([...xexBytes(labels.get("shared_fighter_explosion_masks"),
    explosion.outerBytes.length)], [...explosion.outerBytes]);
  assert.deepEqual([...xexBytes(labels.get("shared_fighter_explosion_core_masks"),
    explosion.coreMasks.length)], [...explosion.coreMasks]);
  const renderer = source.slice(source.indexOf("erase_shared_fighter_explosion_slot:"),
    source.indexOf("update_enemy:"));
  assert.match(renderer, /GAMEPLAY_TOP[\s\S]+GAMEPLAY_BOTTOM/);
  assert.match(renderer, /PLAYER0,y[\s\S]+PLAYER3,y/);
  assert.doesNotMatch(renderer, /PLAYER1,y|PLAYER2,y|HPOSP1|HPOSP2/);
  assert.doesNotMatch(renderer, /COLPM|COLPF|SIZEM|SIZEP|MISSILES/);
  assert.match(source,
    /resolve_enemy_damage:[\s\S]+ENEMY_EXPLODING_STATE[\s\S]+spawn_interceptor_breakup_effects/);
  assert.match(source,
    /apply_player_damage:[\s\S]+PLAYER_DYING[\s\S]+begin_player_fighter_explosion/);
  assert.match(source,
    /main_loop:[\s\S]+tick_shared_fighter_explosions[\s\S]+render_shared_fighter_explosions/);
  assert.match(renderer,
    /and #\(SHARED_FIGHTER_EXPLOSION_FRAME_DURATION-1\)[\s\S]+bne @done/);
  assert.match(source,
    /tick_shared_fighter_explosions:[\s\S]+cmp #\$01[\s\S]+erase_shared_fighter_explosion_slot/);
});

test("PlayerFighter glyphs and the assembled Interceptor glyph builder match authoritative runtime masks", () => {
  const memory = new Uint8Array(0x10000);
  const { manifest } = installRuntimeSegments(memory, root);
  const run = (name) => {
    const cpu = new Nmos6502(memory);
    const stop = 0x7fff;
    cpu.push((stop - 1) >> 8);
    cpu.push((stop - 1) & 0xff);
    cpu.pc = labels.get(name);
    for (let steps = 0; steps < 500_000 && cpu.pc !== stop; steps += 1) cpu.step();
    assert.equal(cpu.pc, stop, `${name} did not return`);
  };
  run("copy_charset");
  memory.fill(0xa5, labels.get("FIGHTER_PROJECTILE_ACTIVE"),
    labels.get("FIGHTER_PROJECTILE_STATE_END"));
  run("init_fighter_projectiles");
  assert.equal(memory.subarray(labels.get("FIGHTER_PROJECTILE_ACTIVE"),
    labels.get("FIGHTER_PROJECTILE_STATE_END")).every((byte) => byte === 0), true,
  "the compact reset loop must clear every owned projectile/burst/explosion byte");
  const player_fighterBytes = memory.subarray(0x4400 + weapons.glyphLayout.player_fighterBase * 8,
    0x4400 + (weapons.glyphLayout.player_fighterBase + weapons.glyphs.player_fighter.length) * 8);
  const packed = fs.readFileSync(path.join(root, "build", "broadside-runtime.bin"));
  const runtimeBytes = (label, length) => {
    const offset = labels.get(label) - manifest.broadsideRuntime.runAddress;
    return packed.subarray(offset, offset + length);
  };
  // Hostile weapon visuals: authored class c at glyph 89+c (left phase) and
  // 99+c (right phase, >> 4); the other glyphs of the bank are never written.
  const bank = 0x4400 + weapons.glyphLayout.interceptorBase * 8;
  const bankBytes = weapons.glyphs.interceptor.length * 8;
  memory.fill(0xa5, bank, bank + bankBytes);
  run("build_interceptor_projectile_glyphs");
  const interceptorBytes = buildInterceptorProjectileGlyphBank(weapons,
    new Uint8Array(bankBytes).fill(0xa5));
  assert.deepEqual([...memory.subarray(bank, bank + bankBytes)], [...interceptorBytes],
    "assembled builder matches the authored model");
  assert.deepEqual(weapons.hostileWeaponVisuals.map((rows) => [...rows]), [
    [0x00, 0xa0, 0x50, 0x00, 0x00, 0xa0, 0x50, 0x00],
    [0x20, 0x20, 0x20, 0x10, 0x10, 0x10, 0x10, 0x00],
  ], "PULSE white/steel tracer, LASER thin white/steel bolt");
  for (let glyph = 0; glyph < 20; glyph += 1) {
    const cls = glyph % 10;
    const rows = [...interceptorBytes.subarray(glyph * 8, glyph * 8 + 8)];
    if (cls < weapons.hostileWeaponVisuals.length) {
      const left = [...weapons.hostileWeaponVisuals[cls]];
      assert.deepEqual(rows, glyph < 10 ? left : left.map((value) => value >> 4));
      assert.equal(rows.some((value) => [0, 2, 4, 6].some((shift) =>
        ((value >> shift) & 3) === 3)), false, "no %11 pixels: never red or yellow");
    } else {
      assert.deepEqual(rows, Array(8).fill(0xa5), `glyph ${90 + glyph} untouched`);
    }
  }
  assert.deepEqual([...player_fighterBytes], weapons.glyphs.player_fighter.flat());
  assert.match(source,
    /build_interceptor_projectile_glyphs:\s+ldx #\(HOSTILE_WEAPON_VISUAL_COUNT\*8-1\)[\s\S]+lda hostile_weapon_visual_glyphs,x[\s\S]+lsr\s+lsr\s+lsr\s+lsr[\s\S]+bpl @row/);
  const builder = runtimeBytes("build_interceptor_projectile_glyphs", 19);
  assert.deepEqual([...builder],
    [0xa2, weapons.hostileWeaponVisuals.length * 8 - 1,
      0xbd, labels.get("hostile_weapon_visual_glyphs") & 0xff, labels.get("hostile_weapon_visual_glyphs") >> 8,
      0x9d, 0xd0, 0x46, 0x4a, 0x4a, 0x4a, 0x4a, 0x9d, 0x20, 0x47, 0xca, 0x10, 0xf0, 0x60],
  "assembled builder writes glyphs 90+ and 100+ from the authored table");
  assert.equal(weapons.glyphs.player_fighter.some((glyph) => glyph.includes(0xc0)), true);
});

test("Player PairShot publishes all eight logical vertical phases without changing its 36-glyph ABI", () => {
  assert.equal(weapons.player_fighter.verticalPhases, 8);
  assert.equal(weapons.glyphs.player_fighter.length, 36);
  for (const bank of [0, 18]) {
    for (let phase = 0; phase < 8; phase += 1) {
      const glyph = weapons.glyphs.player_fighter[bank + phase];
      const occupiedRows = glyph.flatMap((value, row) => value === 0 ? [] : [row]);
      assert.deepEqual(occupiedRows,
        [phase, phase + 1, phase + 4, phase + 5].map((row) => row & 7).sort((a, b) => a - b));
    }
    assert.deepEqual(weapons.glyphs.player_fighter[bank + 8],
      weapons.glyphs.player_fighter[bank], "reserved ninth glyph remains phase-zero compatible");
  }
  const renderer = source.slice(source.indexOf("render_fighter_projectile_overlays:"),
    source.indexOf("; -----------------------------------------------------------------------------\n; Enemy"));
  assert.match(renderer,
    /lda FIGHTER_PROJECTILE_Y,x[\s\S]+and #\$07[\s\S]+adc loader_repeat_value[\s\S]+adc #PLAYER_FIGHTER_PROJECTILE_GLYPH_BASE/);
  assert.match(source.slice(source.indexOf("compose_player_fighter_projectile_glyph:"),
    source.indexOf("profile_projectile_compose_end")),
  /@merge_projectile_phase:[\s\S]+lda \(src_ptr\),y[\s\S]+ora \(dst_ptr\),y/);
});

test("hostile screen code follows weapon_class, not the emitter, and keeps the global red bank", () => {
  const CHARSET_BASE_ADDRESS = 0x4400;
  // ACTIVE = owner bits | (weapon_class << 3); X bit 1 selects the right phase.
  for (const [active, x, screenByte] of [
    [0x0a, 96, 0xda], [0x0b, 98, 0xe4],    // Raider P1/P2 PULSE
    [0x0e, 98, 0xe4],                      // Light Wingman PULSE
    [0x16, 98, 0xe5], [0x16, 96, 0xdb],    // Light Interceptor LASER
    [0x1e, 96, 0xdc],                      // reserved Bomber (3)
  ]) {
    assert.equal(hostileProjectileScreenCode(active, x), screenByte);
  }
  const generated = buildInterceptorProjectileGlyphBank(weapons,
    new Uint8Array(weapons.glyphs.interceptor.length * 8));
  const screenByte = hostileProjectileScreenCode(0x16, 98);
  const effectiveGlyph = screenByte & 0x7f;
  assert.deepEqual({ effectiveGlyph, glyphAddress: CHARSET_BASE_ADDRESS + effectiveGlyph * 8 },
    { effectiveGlyph: 101, glyphAddress: 0x4728 });
  assert.deepEqual([...generated.subarray(11 * 8, 12 * 8)],
    [0x02, 0x02, 0x02, 0x01, 0x01, 0x01, 0x01, 0x00]);
  assert.equal(screenByte >>> 7, 1,
    "bit 7 keeps the hostile attribute; the %11-free glyphs stay white/steel under it");
  // Projectile colour is a glyph property: the global COLPF3 is not changed.
  assert.equal(weapons.interceptor.colourRegister, "COLPF3");
  assert.equal(weapons.interceptor.colourValue, 0x46);
  assert.match(source, /GAMEPLAY_COLPF3 = INTERCEPTOR_PROJECTILE_COLOR/);
  const renderer = source.slice(source.indexOf("render_fighter_projectile_overlays:"),
    source.indexOf("; -----------------------------------------------------------------------------\n; Enemy"));
  assert.match(renderer,
    /@interceptor_code:\s+jsr hostile_projectile_screen_code\s+sta loader_repeat_value\s+@code_ready:/);
  assert.match(source,
    /hostile_projectile_screen_code:\s+lda FIGHTER_PROJECTILE_ACTIVE,x\s+lsr\s+lsr\s+lsr\s+sta loader_repeat_value[\s\S]+adc #\(HOSTILE_WEAPON_GLYPH_BASE\|\$80\)\s+adc loader_repeat_value\s+rts/);
  assert.match(source,
    /resolve_effect_backing_below_enemy_pairshot:[\s\S]+?cmp #\(INTERCEPTOR_PROJECTILE_GLYPH_BASE\|\$80\)\s+bcc resolve_effect_pairshot_unchanged\s+cmp #\(\(INTERCEPTOR_PROJECTILE_GLYPH_BASE\+INTERCEPTOR_PROJECTILE_GLYPH_STRIDE\+HOSTILE_WEAPON_VISUAL_COUNT\)\|\$80\)\s+bcs resolve_effect_pairshot_unchanged/);
});

test("actual PlayerFighter projectile bank is Atari yellow without changing PlayerFighter PMG colours", () => {
  assert.deepEqual([weapons.player_fighter.colourRegister, weapons.player_fighter.colourValue], ["COLPF2", 0x1e]);
  assert.match(source, /GAMEPLAY_COLPF2 = PLAYER_FIGHTER_PROJECTILE_COLOR/);
  assert.match(source, /lda #GAMEPLAY_COLPF2\s+sta COLPF2/);
  assert.match(source, /lda #\$0E[^\n]*\n\s*sta COLPM0/);
  assert.match(source, /lda #\$28[^\n]*\n\s*sta COLPM3/);
  assert.equal(hulls.glyphs.find(({ name }) => name === "enemy_engine_energy").screenBank,
    "pf3", "enemy engine energy remains in the red bank rather than inheriting yellow");
  assert.equal(hulls.glyphs.find(({ name }) => name === "enemy_launch_flash").screenBank,
    "pf3", "enemy launch flash remains in the red bank rather than inheriting yellow");
});

test("capital shells remain materially longer than both fighter projectile classes", () => {
  const { player, interceptor, capital } = hulls.broadside.projectileVisuals;
  assert.deepEqual([player.widthHpos, player.height, interceptor.widthHpos, interceptor.height],
    [1, 2, 2, 3]);
  assert.deepEqual([capital.widthHpos, capital.height], [8, 6]);
  assert.ok(capital.widthHpos >= player.widthHpos * 2);
  assert.ok(capital.widthHpos >= interceptor.widthHpos * 2);
  assert.match(integrationSource,
    /render_capital_shell_overlay:[\s\S]+sta \(dst_ptr\),y[\s\S]+iny[\s\S]+sta \(dst_ptr\),y/);
});

test("assembled burst controllers use accepted counts, intervals, speeds and damage", () => {
  assert.deepEqual({
    player_fighterCount: weapons.player_fighter.burstCount,
    player_fighterActiveLimit: weapons.player_fighter.activeLimit,
    player_fighterRapidCount: weapons.player_fighter.rapidFireBurstCount,
    player_fighterSpreadCount: weapons.player_fighter.spreadShotBurstCount,
    player_fighterSpreadCooldown: weapons.player_fighter.spreadShotCooldownFrames,
    player_fighterInterval: weapons.player_fighter.burstIntervalFrames,
    player_fighterSpeed: weapons.player_fighter.speedScanlines,
    player_fighterPost: weapons.player_fighter.postBurstFrames,
    interceptorCount: weapons.interceptor.burstCount,
    interceptorActiveLimit: weapons.interceptor.activeLimit,
    interceptorInterval: weapons.interceptor.burstIntervalFrames,
    interceptorSpeed: weapons.interceptor.speedScanlines,
    interceptorPost: weapons.interceptor.postBurstFrames,
    interceptorDamage: weapons.interceptor.damage,
  }, {
    player_fighterCount: 4, player_fighterActiveLimit: 5, player_fighterRapidCount: 5,
    player_fighterSpreadCount: 4, player_fighterSpreadCooldown: 28,
    player_fighterInterval: 9, player_fighterSpeed: 6, player_fighterPost: 12,
    interceptorCount: 5, interceptorActiveLimit: 5, interceptorInterval: 15, interceptorSpeed: 2,
    interceptorPost: [60, 50, 40], interceptorDamage: 10,
  });
  assert.match(source,
    /update_player_fighter_weapon:[\s\S]+player_fighter_pairshot_burst_counts[\s\S]+player_fighter_fire_intervals/);
  assert.match(source, /update_enemy_weapon_runtime:[\s\S]+INTERCEPTOR_BURST_COUNT[\s\S]+INTERCEPTOR_BURST_INTERVAL/);
  assert.match(source, /update_fighter_projectiles:[\s\S]+interceptor_projectile_hits_player[\s\S]+ENEMY_PULSE_DAMAGE_UNITS[\s\S]+apply_player_damage/);
});
