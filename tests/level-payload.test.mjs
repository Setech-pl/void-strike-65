// T13 (docs/plans/director-4.6.md §9, §8.3): roadmap 4.6 step 5, the payload.
//
// The level image's payload page and two core-page fields become live:
//   * a wave's appearance slot (`wave_flags` bits 0-1) chooses which 16-byte
//     Light bitmap its Lights wear - the archetype's own art (0) or one of the
//     three payload looks (decision AD: a variant is a re-skin, never code). A
//     Heavy wave's appearance re-skins its Light escort;
//   * the payload's two weapon looks are laid over the PULSE/LASER glyphs at
//     level start, by the builder that already publishes the defaults;
//   * the sector's sky (`sector_look` bits 0-3) is the near-star pixel value,
//     patched into the star publish operand at sector entry and only there
//     (budget-1.0 M2 variant S2: white, allied steel or yellow).

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { Nmos6502 } from "../scripts/nmos6502.mjs";
import { installRuntimeSegments } from "../scripts/runtime-image.mjs";
import {
  LEVEL_CORE_ADDRESS,
  LEVEL_PAYLOAD_ADDRESS,
  LEVEL_GEOMETRY_ADDRESS,
  LevelValidationError,
  PAYLOAD_OFFSET,
  SECTOR_ARRAY_OFFSET,
  WAVE_ARRAY_OFFSET,
  compileLevel,
  compileLevelFile,
  defaultHullAsset,
  levelSourcePath,
} from "../scripts/level-compiler.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const hullAsset = defaultHullAsset();

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

const CHARSET = 0x4400;
const LIGHT_SCREEN_CODE = 120 | 0x80;
const OFFSET_WINGMAN = 12;
const OFFSET_INTERCEPTOR = 24;
const WINGMAN_ART = [0xf0, 0xfc, 0x3f, 0x0f, 0x0f, 0x03, 0x03, 0x00,
  0x0f, 0x3f, 0xfc, 0xf0, 0xf0, 0xc0, 0xc0, 0x00];
const INTERCEPTOR_ART = [0xf0, 0xe0, 0x28, 0x09, 0x28, 0xe0, 0xf0, 0x00,
  0x0f, 0x0b, 0x28, 0x60, 0x28, 0x0b, 0x0f, 0x00];
// fighter-weapons.json, the shipped defaults (classes 1-3, then the BOMBER phase).
const DEFAULT_PULSE = [0x00, 0xa0, 0x50, 0x00, 0x00, 0xa0, 0x50, 0x00];
const DEFAULT_LASER = [0x20, 0x20, 0x20, 0x10, 0x10, 0x10, 0x10, 0x00];

// Eight characters per row, left cell then right cell: . black, W white
// (COLPF0), S steel (COLPF1), R hostile red (COLPF3 under the hostile bit).
const LOOK_A = ["R......R", "RW....WR", ".RW..WR.", "..RWWR..",
  "..RWWR..", ".RW..WR.", "RW....WR", "........"];
const LOOK_B = ["...RR...", "..RSSR..", ".RS..SR.", "RS.WW.SR",
  "RS.WW.SR", ".RS..SR.", "..RSSR..", "........"];
const PIXEL = { ".": 0, W: 1, S: 2, R: 3 };
function lookBytes(rows) {
  const cell = (row, half) => [...row.slice(half * 4, half * 4 + 4)]
    .reduce((byte, character) => (byte << 2) | PIXEL[character], 0);
  return [...rows.map((row) => cell(row, 0)), ...rows.map((row) => cell(row, 1))];
}
const PULSE_LOOK = ["00000000", "10000000", "01000000", "00000000",
  "00100000", "00010000", "00000000", "00000000"];
const maskBytes = (rows) => rows.map((row) => Number.parseInt(row, 2));

function swarmLevel({ appearance = "beta", skies = ["white", "steel", "yellow"] } = {}) {
  return {
    level: 2, seed: 77, stars: "white", hull: { length: 1, turrets: 3 },
    payload: {
      appearances: [{ name: "alpha", rows: [...LOOK_A] }, { name: "beta", rows: [...LOOK_B] }],
      weapons: [{ class: "pulse", rows: [...PULSE_LOOK] }],
    },
    sectors: [
      { kind: "space", subtype: "swarm", rows: 64, archetypes: ["interceptor", "wingman"],
        lights: 3, look: { stars: skies[0] },
        waves: [{ row: 0, archetype: "interceptor", count: 3, spacing: 24, entry: 88,
          appearance }] },
      { kind: "space", subtype: "elite", rows: 64, archetypes: ["raider", "wingman"],
        lights: 1, heavies: 2, look: { stars: skies[1] },
        waves: [{ row: 0, members: ["raider", "wingman"], count: 2, spacing: 24,
          entry: 124, appearance: "alpha" }] },
      { kind: "space", subtype: "elite", rows: 64, archetypes: ["raider", "wingman"],
        lights: 1, heavies: 2, look: { stars: skies[2] },
        waves: [{ row: 0, members: ["raider", "wingman"], count: 2, spacing: 24,
          entry: 124 }] },
    ],
  };
}
function eliteLevel(appearance) {
  const source = swarmLevel();
  source.sectors = [source.sectors[1], source.sectors[2]];
  source.sectors[0].waves[0].appearance = appearance;
  return source;
}
const compile = (source) => compileLevel(source, { hullAsset, file: "test.json" });
const rejects = (source, pattern, why) => assert.throws(() => compile(source),
  (error) => error instanceof LevelValidationError && pattern.test(error.message), why);

// ---------------------------------------------------------------------------
// The compiler
// ---------------------------------------------------------------------------

test("T13: the sky is resolved per sector into sector_look bits 0-3 and the level default into header byte 5", () => {
  const level = compile(swarmLevel());
  assert.equal(level.core[5], 1, "the level default: white, pixel value 1");
  assert.deepEqual([0, 1, 2].map((s) => level.core[SECTOR_ARRAY_OFFSET.look + s] & 0x0f),
    [1, 2, 3], "white, steel, yellow - the ANTIC pixel values of COLPF0/1/2");
  const inherit = swarmLevel();
  inherit.stars = "steel";
  delete inherit.sectors[1].look;
  const resolved = compile(inherit);
  assert.equal(resolved.core[5], 2);
  assert.equal(resolved.core[SECTOR_ARRAY_OFFSET.look + 1] & 0x0f, 2,
    "a sector without a sky takes the level's: the runtime never sees 0");
});

test("T13: a wave's appearance is wave_flags bits 0-1 and the looks fill the payload page", () => {
  const level = compile(swarmLevel());
  assert.equal(level.core[WAVE_ARRAY_OFFSET.flags + 0] & 0x03, 2, "beta is slot 2");
  assert.equal(level.core[WAVE_ARRAY_OFFSET.flags + 1] & 0x03, 1, "alpha is slot 1");
  assert.equal(level.core[WAVE_ARRAY_OFFSET.flags + 2] & 0x03, 0, "no appearance: the archetype art");
  assert.equal(level.core[WAVE_ARRAY_OFFSET.flags + 1] & 0x08, 0x08, "still a Heavy wave");
  const page = level.pages.payload;
  assert.deepEqual([...page.subarray(PAYLOAD_OFFSET.appearance, PAYLOAD_OFFSET.appearance + 16)],
    lookBytes(LOOK_A));
  assert.deepEqual([...page.subarray(PAYLOAD_OFFSET.appearance + 16, PAYLOAD_OFFSET.appearance + 32)],
    lookBytes(LOOK_B));
  assert.deepEqual([...page.subarray(PAYLOAD_OFFSET.appearance + 32, PAYLOAD_OFFSET.appearance + 48)],
    new Array(16).fill(0), "slot 3 unused");
  // A number still works, and names the slot directly.
  const numbered = swarmLevel({ appearance: 2 });
  assert.equal(compile(numbered).core[WAVE_ARRAY_OFFSET.flags] & 0x03, 2);
});

test("T13: a weapon look is eight glyph rows and its target class, 9 B per record", () => {
  const page = compile(swarmLevel()).pages.payload;
  const base = PAYLOAD_OFFSET.weaponGlyph;
  assert.deepEqual([...page.subarray(base, base + 8)], maskBytes(PULSE_LOOK));
  assert.equal(page[base + 8], 1, "target class 1, PULSE");
  assert.deepEqual([...page.subarray(base + 9, base + 18)], new Array(9).fill(0),
    "the second record is unused: class 0");
  const both = swarmLevel();
  both.payload.weapons.push({ class: "laser", rows: PULSE_LOOK });
  assert.equal(compile(both).pages.payload[base + 17], 2, "target class 2, LASER");
});

test("T13: the compiler refuses every out-of-range payload value", () => {
  const edit = (change) => { const source = swarmLevel(); change(source); return source; };
  rejects(edit((s) => { s.sectors[0].waves[0].appearance = 4; }), /appearance/, "slot 4");
  rejects(edit((s) => { s.sectors[0].waves[0].appearance = "gamma"; }), /appearance/,
    "an unknown look name");
  rejects(edit((s) => { s.sectors[0].waves[0].appearance = 3; }), /appearance/,
    "slot 3 has no authored look");
  rejects(edit((s) => { s.sectors[2].waves[0] = { row: 0, archetype: "raider", count: 2,
    spacing: 24, entry: 124, appearance: "alpha" }; }), /escort/,
  "a Heavy wave with no escort has no Light to re-skin");
  rejects(edit((s) => { s.payload.appearances.push({ name: "c", rows: LOOK_A },
    { name: "d", rows: LOOK_A }); }), /appearances/, "four looks");
  rejects(edit((s) => { s.payload.appearances[0].rows[2] = ".RW..WX."; }), /row/,
    "a pixel outside . W S R");
  rejects(edit((s) => { s.payload.appearances[0].rows = LOOK_A.slice(0, 7); }), /rows/,
    "seven rows");
  rejects(edit((s) => { s.payload.appearances[1].name = "alpha"; }), /alpha/,
    "two looks with one name");
  rejects(edit((s) => { s.payload.weapons[0].class = "bomber"; }), /class/,
    "BOMBER carries a second phase a 9-B record cannot");
  rejects(edit((s) => { s.payload.weapons.push({ class: "pulse", rows: PULSE_LOOK }); }),
    /pulse/, "two looks for one class");
  rejects(edit((s) => { s.payload.weapons[0].rows = ["11000000", ...PULSE_LOOK.slice(1)]; }),
    /%11/, "pixel value %11");
  rejects(edit((s) => { s.payload.weapons[0].rows = ["00001000", ...PULSE_LOOK.slice(1)]; }),
    /high nibble/, "a pixel past the two-colour-clock cell");
  rejects(edit((s) => { s.payload.weapons.push({ class: "laser", rows: PULSE_LOOK },
    { class: "laser", rows: PULSE_LOOK }); }), /weapons/, "three weapon looks");
  rejects(edit((s) => { s.stars = "red"; }), /stars/, "a sky outside the three");
  rejects(edit((s) => { s.sectors[0].look.stars = 4; }), /stars/, "a numeric sky");
  rejects(edit((s) => { s.sectors[0].look.nebula = true; }), /nebula/,
    "the nebula (budget S3) is not built");
  rejects(edit((s) => { s.nebula = 1; }), /nebula/, "nor its level default");
});

test("T13: level 1 shows a sky per sector and one re-skinned escort wave; level 2 the full payload", () => {
  const one = compileLevelFile(levelSourcePath(1));
  const sky = (level) => level.sectors.map((_, s) => level.core[SECTOR_ARRAY_OFFSET.look + s] & 0x0f);
  assert.deepEqual(sky(one), [1, 2, 1, 3],
    "white, steel at the capital, white, yellow on the last sector");
  const variants = one.waves.map((wave, index) => [index, wave.appearance])
    .filter(([, appearance]) => appearance !== 0);
  assert.deepEqual(variants, [[6, 1]],
    "exactly one wave: sector 3's last, the Raider + Wingman wave that always arms");
  assert.equal(one.waves[6].sector, 3);
  assert.equal(one.waves[6].escort, "wingman");
  assert.deepEqual([...one.pages.payload.subarray(PAYLOAD_OFFSET.weaponGlyph,
    PAYLOAD_OFFSET.weaponGlyph + 18)], new Array(18).fill(0), "level 1 keeps level 1's fire");
  // Level 1's waves, rows, counts and spacing are the ones it had before.
  for (const [index, wave] of one.waves.entries()) {
    assert.equal(one.core[WAVE_ARRAY_OFFSET.flags + index] & 0xfc,
      wave.class === "heavy" ? 0x08 : 0x00, `wave ${index + 1} flags beyond the look`);
  }

  const two = compileLevelFile(levelSourcePath(2));
  assert.deepEqual(new Set(sky(two)), new Set([1, 2, 3]), "all three skies");
  const looks = new Set(two.waves.map((wave) => wave.appearance).filter(Boolean));
  assert.ok(looks.size >= 2, `level 2 uses ${looks.size} Light looks`);
  const page = two.pages.payload;
  const base = PAYLOAD_OFFSET.weaponGlyph;
  const records = [0, 9].map((offset) => ({
    rows: [...page.subarray(base + offset, base + offset + 8)], target: page[base + offset + 8],
  })).filter((record) => record.target !== 0);
  assert.ok(records.length >= 1, "a hostile weapon look");
  for (const record of records) {
    const defaults = record.target === 1 ? DEFAULT_PULSE : DEFAULT_LASER;
    assert.notDeepEqual(record.rows, defaults, `class ${record.target} differs from level 1`);
  }
});

// ---------------------------------------------------------------------------
// The runtime
// ---------------------------------------------------------------------------

const FRAME_ENTRIES = new Set(["light_update", "enemy_spawn_raiders"]);
function run(image, name, { a = 0, x = 0, y = 0 } = {}) {
  if (FRAME_ENTRIES.has(name)) image[L("frame_counter")] = (image[L("frame_counter")] + 1) & 0xff;
  const cpu = new Nmos6502(image);
  const stop = 0x7fff;
  cpu.push((stop - 1) >> 8); cpu.push((stop - 1) & 0xff);
  cpu.pc = L(name); cpu.a = a; cpu.x = x; cpu.y = y;
  for (let steps = 0; steps < 400_000 && cpu.pc !== stop; steps += 1) {
    assert.notEqual(image[cpu.pc], 0, `${name} reached BRK at $${cpu.pc.toString(16)}`);
    cpu.step();
  }
  assert.equal(cpu.pc, stop, `${name} did not return`);
  return cpu;
}

function imageWithLevel(level) {
  const image = new Uint8Array(0x10000);
  installRuntimeSegments(image, root);
  image.set(level.pages.core, LEVEL_CORE_ADDRESS);
  image.set(level.pages.payload, LEVEL_PAYLOAD_ADDRESS);
  image.set(level.pages.geometry, LEVEL_GEOMETRY_ADDRESS);
  for (let row = 0; row < 27; row += 1) {
    const address = 0x8140 + row * 40;
    image[L("PLAYFIELD_ROW_LO") + row] = address & 0xff;
    image[L("PLAYFIELD_ROW_HI") + row] = address >> 8;
  }
  image[L("DIFFICULTY_SETTING")] = 1;
  return image;
}
const pairGlyphs = (image, slot) => {
  const pair = (image[L("light_code") + slot] - LIGHT_SCREEN_CODE) >> 1;
  const first = CHARSET + (120 + pair * 2) * 8;
  return [...image.subarray(first, first + 16)];
};
function setLeader(image, x, y) {
  image[L("ENEMY_MEMBER_STATE")] = 1;
  image[L("ENEMY_X")] = x;
  image[L("ENEMY_Y")] = y;
}

test("T13: a Light wave's appearance installs its payload look into the admitted slot's pair", () => {
  for (const [appearance, expected] of [["beta", lookBytes(LOOK_B)], ["alpha", lookBytes(LOOK_A)],
    [0, INTERCEPTOR_ART]]) {
    const image = imageWithLevel(compile(swarmLevel({ appearance })));
    run(image, "director_init", { a: 0x6d });
    assert.equal(image[L("_light_wave_lock")], 1, "the swarm wave is armed at row 0");
    for (let frame = 0; frame < 4; frame += 1) run(image, "light_update");
    assert.notEqual(image[L("light_state")], 0, "slot 0 admitted");
    assert.equal(image[L("light_archetype_offset")], OFFSET_INTERCEPTOR,
      "the variant is still an Interceptor: behaviour comes from the archetype");
    assert.deepEqual(pairGlyphs(image, 0), expected, `appearance ${appearance}`);
  }
});

test("T13: a Heavy wave's appearance re-skins its Light escort", () => {
  for (const [appearance, expected] of [["alpha", lookBytes(LOOK_A)], [0, WINGMAN_ART]]) {
    const image = imageWithLevel(compile(eliteLevel(appearance)));
    run(image, "director_init", { a: 0x6d });
    assert.equal(image[L("_heavy_escort_offset")], OFFSET_WINGMAN);
    run(image, "enemy_spawn_raiders");
    setLeader(image, 80, 112);
    for (let frame = 0; frame < 3; frame += 1) run(image, "light_update");
    assert.equal(image[L("light_archetype_offset")], OFFSET_WINGMAN);
    assert.deepEqual(pairGlyphs(image, 0), expected, `escort appearance ${appearance}`);
  }
});

test("T13: a plain and a variant Wingman never share an appearance pair", () => {
  const image = imageWithLevel(compile(eliteLevel(0)));
  run(image, "director_init", { a: 0x6d });
  // Room for two Lights in this ELITE sector, in both halves of the ceiling.
  for (let row = 0; row < 4; row += 1) image[L("_subtype_ceiling_light") + row] = 2;
  image[L("_sector_caps")] = (image[L("_sector_caps")] & 0xf0) | 2;
  run(image, "enemy_spawn_raiders");
  setLeader(image, 80, 112);
  for (let frame = 0; frame < 3; frame += 1) run(image, "light_update");
  assert.deepEqual(pairGlyphs(image, 0), WINGMAN_ART);
  image[L("light_screen_hi")] = 0x81;     // slot 0 is on screen
  // The next wave names look 1, exactly as director_c_try_event publishes it.
  image[L("_light_wave_look")] = 0x90;
  run(image, "enemy_spawn_raiders");
  for (let frame = 0; frame < 3; frame += 1) run(image, "light_update");
  assert.notEqual(image[L("light_state") + 1], 0, "slot 1 admitted");
  assert.notEqual(image[L("light_code") + 1], image[L("light_code")],
    "the variant takes its own pair");
  assert.deepEqual(pairGlyphs(image, 1), lookBytes(LOOK_A));
  assert.deepEqual(pairGlyphs(image, 0), WINGMAN_ART, "the plain Wingman keeps its art");
});

test("T13: the level's weapon looks are laid over the defaults at level start", () => {
  const glyph = (image, code) => [...image.subarray(CHARSET + code * 8, CHARSET + code * 8 + 8)];
  const fresh = (source) => {
    const image = imageWithLevel(compile(source));
    image.fill(0x55, CHARSET + 90 * 8, CHARSET + 110 * 8);
    return image;
  };
  const image = fresh(swarmLevel());
  run(image, "build_hostile_weapon_glyphs");
  assert.deepEqual(glyph(image, 90), maskBytes(PULSE_LOOK), "PULSE, left phase");
  assert.deepEqual(glyph(image, 100), maskBytes(PULSE_LOOK).map((v) => v >> 4), "right phase");
  assert.deepEqual(glyph(image, 91), DEFAULT_LASER, "LASER keeps its default");
  assert.deepEqual(glyph(image, 101), DEFAULT_LASER.map((v) => v >> 4));

  const plain = swarmLevel();
  delete plain.payload.weapons;
  const none = fresh(plain);
  run(none, "build_hostile_weapon_glyphs");
  assert.deepEqual(glyph(none, 90), DEFAULT_PULSE, "no look: the default");

  // A target the 9-B record cannot carry, and a page that failed its magic,
  // are both ignored rather than drawn.
  const bomber = fresh(swarmLevel());
  bomber[LEVEL_PAYLOAD_ADDRESS + PAYLOAD_OFFSET.weaponGlyph + 8] = 3;
  const bomberDefault = glyph(bomber, 92);
  run(bomber, "build_hostile_weapon_glyphs");
  assert.deepEqual(glyph(bomber, 90), DEFAULT_PULSE);
  assert.notDeepEqual(glyph(bomber, 92), bomberDefault, "the BOMBER default was rebuilt");
  assert.notDeepEqual(glyph(bomber, 92), maskBytes(PULSE_LOOK));
  const unsigned = fresh(swarmLevel());
  unsigned[LEVEL_CORE_ADDRESS] = 0;
  run(unsigned, "build_hostile_weapon_glyphs");
  assert.deepEqual(glyph(unsigned, 90), DEFAULT_PULSE, "a page without its magic is not read");
});

test("T13: the star pixel changes at sector entry and only there", () => {
  const operand = L("near_star_pixel_load") + 1;
  const publish = L("publish_dynamic_near_star_phase");
  assert.equal(operand - 1 > publish && operand - publish < 24, true,
    "the operand is inside the near-star publish");
  const image = imageWithLevel(compile(swarmLevel()));
  assert.equal(image[operand - 1], 0xa9, "it is the immediate of an lda #");
  image[operand] = 0x00;
  run(image, "director_init", { a: 0x6d });
  assert.equal(image[operand], 0x10, "sector 1: white, pixel value 1 in pixel 1");
  const expected = [0x10, 0x20, 0x30];
  let sector = 0;
  for (let row = 1; row <= 64 * 2 + 1; row += 1) {
    run(image, "director_world_row_tick");
    if (image[L("_sector_row_lo")] === 0 && image[L("_sector_row_hi")] === 0) sector += 1;
    assert.equal(image[operand], expected[Math.min(sector, 2)], `row ${row}`);
  }
  assert.equal(sector, 2, "two sector entries");
  // What the publish then draws.
  image[L("STAR_NEAR_FINE_PHASE")] = 3;
  run(image, "publish_dynamic_near_star_phase");
  assert.equal(image[CHARSET + 8 + 3], 0x30, "the yellow star");
  assert.equal(image[CHARSET + 8 + 2], 0x00, "the previous row cleared");
});

test("T13: only the Director's sector entry writes the star operand", () => {
  const sources = ["src/main.s", "src/hybrid/c-asm-abi.s", "src/hybrid/light-kernel.s",
    "src/integration-glue.s", "src/c/director.c", "src/c/lifecycle.c"]
    .map((file) => fs.readFileSync(path.join(root, file), "utf8")).join("\n");
  const writes = sources.match(/sta\s+NEAR_STAR_PIXEL_OPERAND\b/g) ?? [];
  assert.equal(writes.length, 1, "one store, in the veneer");
  const director = fs.readFileSync(path.join(root, "src/c/director.c"), "utf8");
  assert.equal((director.match(/asm_publish_star_pixel\(/g) ?? []).length, 2,
    "declared once, called once - from enter_sector");
  const enter = /static void enter_sector\(void\)\s*\{([\s\S]*?)\n\}/.exec(director);
  assert.ok(enter && /asm_publish_star_pixel\(/.test(enter[1]), "the call is in enter_sector");
});

test("T13: the byte rules - light_pair_for_record size-neutral, record 5 not grown, initial block under the STOP line", () => {
  const listing = fs.readFileSync(path.join(root, "build/encounter-director-lifecycle.lst"), "utf8");
  const span = (name) => {
    const open = new RegExp(`^([0-9A-F]{6})r 1\\s+\\.proc\\s+_${name}: near`, "m").exec(listing);
    const close = new RegExp(`\\.proc\\s+_${name}: near[\\s\\S]*?^([0-9A-F]{6})r 1\\s+\\.endproc`, "m")
      .exec(listing);
    return Number.parseInt(close[1], 16) - Number.parseInt(open[1], 16);
  };
  assert.equal(span("light_pair_for_record"), 124);
  const manifest = JSON.parse(fs.readFileSync(path.join(root, "build/manifest.json"), "utf8"));
  const extension = manifest.directorCodeRuntimes.find((runtime) => runtime.name === "extension");
  assert.ok(extension.packedBytes <= 747, `record 5 is ${extension.packedBytes} B packed`);
  assert.equal(extension.externalChunk.sectors, 6);
  assert.ok(manifest.transportCapacity.initialBootContentBytes <= 13652);
  assert.equal(manifest.transportCapacity.initialBootSectors, 107);
});
