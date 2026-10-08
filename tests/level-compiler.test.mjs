// Roadmap 4.6 step 1 (docs/plans/director-4.6.md §8, §9): the JSON level
// compiler, the 13-sector level image, and the reproduction gate that says the
// pages the plan marks unchanged really are unchanged.
//
// T1 - the validator rejects every §5 case and warns on a cap above the
//      subtype table.
// T2 - build/level-1.bin is 13 sectors; the magic sits at $AA00; header byte 7
//      is still 9; the geometry page says 480 rows and its sequences equal
//      EMIT_ALLIED_SECTOR_SEQUENCE / EMIT_ENEMY_SECTOR_SEQUENCE.
// T12 - (step 3) level-02.json compiles and differs from level 1 in sector
//      count, waves and masks; it is the level the owner approved on
//      2026-09-30 (plan §11 items 15-17).
//
// Nothing resident reads any of it at this step: the Director still runs on
// LEVEL1_DATA (step 2), the payload consumers land at step 5 and the hull
// geometry consumers at step 4.

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

import {
  ARCHETYPE_RECORD_BYTES,
  CORE_HEADER_BYTES,
  ENTRY_COLUMN_MAX,
  GEOMETRY_OFFSET,
  HULL_ROW_STEPS,
  HULL_SEQUENCE_BYTES,
  LEVEL_CORE_ADDRESS,
  LEVEL_CORE_BYTES,
  LEVEL_CORE_MAGIC,
  LEVEL_CORE_OFFSET,
  LEVEL_GEOMETRY_ADDRESS,
  LEVEL_GEOMETRY_BYTES,
  LEVEL_GEOMETRY_OFFSET,
  LEVEL_IMAGE_SECTORS,
  LEVEL_PAYLOAD_ADDRESS,
  LEVEL_PAYLOAD_BYTES,
  LEVEL_PAYLOAD_OFFSET,
  LevelValidationError,
  MAX_SECTORS,
  MAX_WAVES,
  SECTOR_ARRAY_OFFSET,
  WAVE_ARRAY_OFFSET,
  compileLevel,
  compileLevelFile,
  defaultHullAsset,
  levelSourcePath,
  validateHullGeometry,
} from "../scripts/level-compiler.mjs";

const rootDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relative) => fs.readFileSync(path.join(rootDirectory, relative));
const readText = (relative) => fs.readFileSync(path.join(rootDirectory, relative), "utf8");

const hullAsset = defaultHullAsset();
const levelOneImage = read("build/level-1.bin");
const manifest = JSON.parse(readText("build/manifest.json"));

// A minimal legal level every rejection case starts from, so each test changes
// exactly the one thing it is about.
function baseSource(overrides = {}) {
  return {
    level: 1,
    seed: 1,
    hull: { length: 3, turrets: 3 },
    sectors: [
      {
        kind: "space", subtype: "swarm", rows: 512,
        archetypes: ["wingman", "interceptor"], lights: 3,
        hazards: { debris: 1, pickups: true },
        waves: [{ row: 64, archetype: "interceptor", count: 2, spacing: 48, entry: 124 }],
      },
    ],
    ...overrides,
  };
}

function compile(source) {
  return compileLevel(source, { hullAsset, file: "test.json" });
}

function rejection(source) {
  try {
    compile(source);
  } catch (error) {
    assert.ok(error instanceof LevelValidationError,
      `expected a LevelValidationError, got ${error}`);
    return error.message;
  }
  assert.fail("the compiler accepted a level it must reject");
}

// ---------------------------------------------------------------------------
// T1 - the validator
// ---------------------------------------------------------------------------

test("T1: the validator rejects every §5 case and warns on a cap above the subtype table", () => {
  // The baseline itself compiles, so every rejection below is about the one
  // field it changes and nothing else.
  assert.equal(compile(baseSource()).warnings.length, 0);

  // Limit class: sector count.
  assert.match(rejection(baseSource({
    sectors: Array.from({ length: MAX_SECTORS + 1 }, () => ({
      kind: "space", subtype: "swarm", rows: 64, archetypes: [], waves: [],
    })),
  })), /there are 11; the core page holds 10/);

  // Limit class: wave count.
  assert.match(rejection(baseSource({
    sectors: [{
      kind: "space", subtype: "swarm", rows: 2040, archetypes: ["interceptor"],
      waves: Array.from({ length: MAX_WAVES + 1 }, (_, index) => ({
        row: index * 8, archetype: "interceptor", count: 1, spacing: 16, entry: 124,
      })),
    }],
  })), /past 20 waves; the core page holds 20/);

  // Limit class: a Heavy archetype in a SWARM sector.
  assert.match(rejection(baseSource({
    sectors: [{
      kind: "space", subtype: "swarm", rows: 512, archetypes: ["raider"],
      waves: [{ row: 0, archetype: "raider", count: 1, spacing: 48, entry: 124 }],
    }],
  })), /swarm sector and names the Heavy archetype "raider"/);

  // Limit class: any enemy in a CAPITAL sector (owner decision, plan §11.1).
  assert.match(rejection(baseSource({
    sectors: [{ kind: "capital", archetypes: ["interceptor"], waves: [] }],
  })), /capital sectors carry no Light and no Heavy in 1\.0/);

  // Limit class: a wave whose archetype is outside the sector's mask.
  assert.match(rejection(baseSource({
    sectors: [{
      kind: "space", subtype: "swarm", rows: 512, archetypes: ["wingman"],
      waves: [{ row: 0, archetype: "interceptor", count: 1, spacing: 16, entry: 124 }],
    }],
  })), /outside the sector's archetype mask/);

  // Limit class: rule 10, one dominant archetype and at most one supporting.
  assert.match(rejection(baseSource({
    sectors: [{
      kind: "space", subtype: "elite", rows: 512,
      archetypes: ["raider", "wingman", "interceptor"],
      waves: [{
        row: 0, members: ["raider", "wingman", "interceptor"], count: 1,
        spacing: 48, entry: 124,
      }],
    }],
  })), /names 3 distinct archetypes .*at most one supporting escort/);

  // Limit class: a BOSS sector that is not last.
  assert.match(rejection(baseSource({
    sectors: [
      { kind: "boss", archetypes: [], waves: [] },
      { kind: "space", subtype: "swarm", rows: 64, archetypes: [], waves: [] },
    ],
  })), /boss sector but not the last one/);

  // Limit class: a boss id with no BOSS sector.
  assert.match(rejection(baseSource({ boss: 2 })), /names boss 2 but no sector has kind "boss"/);

  // Limit class: a hull length outside the four authored steps.
  assert.match(rejection(baseSource({ hull: { rows: 400, turrets: 3 } })),
    /rows is 400; the four authored hull lengths are 288, 352, 416, 480/);

  // Limit class: non-monotonic phase thresholds. The thresholds are derived
  // from the hull asset's sections, so this one is pinned on the validator
  // directly - a hull asset whose sections stopped increasing would reach it.
  assert.throws(() => validateHullGeometry({ hullRows: 480, phaseStarts: [4, 14, 14, 56] }),
    /the forward phase starts at module 14, which does not follow 14/);
  assert.throws(() => validateHullGeometry({ hullRows: 480, phaseStarts: [4, 14, 46, 60] }),
    /at or past the hull end/);

  // Limit class: spacing below the class floor (Light 16, Heavy 24 frames).
  assert.match(rejection(baseSource({
    sectors: [{
      kind: "space", subtype: "swarm", rows: 512, archetypes: ["interceptor"],
      waves: [{ row: 0, archetype: "interceptor", count: 2, spacing: 8, entry: 124 }],
    }],
  })), /asks for 8 frames between members; the light class floor is 16/);
  assert.match(rejection(baseSource({
    sectors: [{
      kind: "space", subtype: "elite", rows: 512, archetypes: ["raider"],
      waves: [{ row: 0, archetype: "raider", count: 2, spacing: 20, entry: 124 }],
    }],
  })), /asks for 20 frames between members; the heavy class floor is 24/);

  // Limit class: entry columns outside the playfield.
  assert.match(rejection(baseSource({
    sectors: [{
      kind: "space", subtype: "swarm", rows: 512, archetypes: ["interceptor"],
      waves: [{
        row: 0, archetype: "interceptor", count: 1, spacing: 16,
        entry: ENTRY_COLUMN_MAX + 1,
      }],
    }],
  })), /entry column is 201; the playfield admits 48\.\.200/);

  // Limit class: the packed caps. The nibbles hold 0-4 Light and 0-2 Heavy.
  assert.match(rejection(baseSource({
    sectors: [{
      kind: "space", subtype: "swarm", rows: 512, archetypes: ["interceptor"],
      lights: 5, waves: [],
    }],
  })), /lights is 5; it must be an integer in 0\.\.4/);
  assert.match(rejection(baseSource({
    sectors: [{
      kind: "space", subtype: "elite", rows: 512, archetypes: ["raider"],
      heavies: 3, waves: [],
    }],
  })), /heavies is 3; it must be an integer in 0\.\.2/);

  // Limit class: paths are step 6, and a level file may not name one yet.
  assert.match(rejection(baseSource({
    sectors: [{
      kind: "space", subtype: "swarm", rows: 512, archetypes: ["interceptor"],
      waves: [{ row: 0, archetype: "interceptor", count: 1, spacing: 16, path: 2 }],
    }],
  })), /names a path; the path evaluator and its library are plan step 6/);

  // WARNS, does not reject: an ELITE sector asking for more Lights than the
  // subtype table admits. The file is legal and the runtime clamps to 1.
  const warned = compile(baseSource({
    sectors: [{
      kind: "space", subtype: "elite", rows: 512, archetypes: ["raider", "interceptor"],
      lights: 4, heavies: 2,
      waves: [{ row: 0, archetype: "interceptor", count: 1, spacing: 16, entry: 124 }],
    }],
  }));
  assert.equal(warned.warnings.length, 1);
  assert.match(warned.warnings[0],
    /asks for 4 Lights; a space\/elite sector admits 1 and the runtime clamps/);
  assert.equal(warned.sectors[0].effectiveLights, 1, "the preview shows the clamped cap");
  // The byte the runtime reads still carries what the author asked for: the
  // clamp is min(requested, subtype table) at admission, not at build.
  assert.equal(warned.core[SECTOR_ARRAY_OFFSET.caps] & 0x0f, 4);
});

test("the authored level 1 compiles clean and reads back as the level it says", () => {
  const compiled = compileLevelFile(levelSourcePath(1), { hullAsset });
  assert.deepEqual(compiled.warnings, []);
  assert.equal(compiled.level, 1);
  // RE-POINTED 2026-10-04 (M5b-S3, plan §5.1): a fifth sector, the BOSS;
  // sectors 1-4 below are unchanged (tests/boss-band.test.mjs pins them too).
  assert.equal(compiled.sectors.length, 5);
  assert.deepEqual(compiled.sectors.map((sector) => sector.kindName),
    ["space", "capital", "space", "space", "boss"]);
  // A capital sector carries no enemy in 1.0 (owner decision, plan §11.1).
  assert.equal(compiled.sectors[1].mask, 0);
  assert.equal(compiled.sectors[1].lights, 0);
  assert.equal(compiled.sectors[1].heavies, 0);
  // RE-PINNED at step 2, to the rows step 2 MEASURED (plan §11 item 3, and
  // docs/diagnostics/level-1-baseline-timeline-probe.json). The capital became
  // due at active gameplay frame 600, which on MEDIUM is world row 270 -> 272
  // on the 8-row module grid; the traversal itself is 542 rows on every
  // difficulty; the level used to end at row 3712. So the space sectors run
  // 3,168 rows in all and the level ends two rows short of 3,712, which is the
  // whole of what the module grid cannot express.
  //
  // RE-PINNED AGAIN under owner decision 8 (plan §11 item 8): the 3,168 rows
  // are still 272 + 2,896 and the capital row is untouched, but the 2,896
  // behind it are 856 + 2,040 rather than 1,448 + 1,448. The Director arms one
  // wave at a time and a sector entry restarts the cursor, so a wave list cut
  // short by the row clock is abandoned wherever the cut falls - and when the
  // cut falls before a sector's LAST wave, the next sector's first wave can
  // repeat the archetype the player just saw. 856 rows is short enough that
  // every difficulty reaches the last of its five waves, so the cut can only
  // fall inside it; 2,040 is the format's maximum for one byte of modules and
  // is the LAST sector, whose cut has no successor to collide with. The sum,
  // and therefore the level-complete row, is what it was.
  // RE-POINTED 2026-10-04 (M5b-S3): the boss sector has no authored rows -
  // the world stops in it and it ends at the boss's death - so the sum below,
  // and the row on which the level leaves its space sectors, are unchanged.
  // RE-POINTED 2026-10-07 (M5b-S4b.4, owner decision W1): from the capital's
  // end to the boss, one wave of each kind that was there, in the order of
  // its first appearance: the Raider + Wingman wave in a 144-row sector (the
  // old spacing between waves), then one Bomber wave in a 312-row sector (the
  // rows the old last wave had before the boss). W1 shortens the level on
  // purpose, so the 2,896-row total and the 3,710-row end are no longer
  // invariants; the capital's row (272) and its traversal are untouched.
  // RE-POINTED (fix/smoke-2026-10-07 P2, owner decision of 2026-10-08): the
  // post-capital sectors carry one wave of each Light kind, one Raider wave
  // and one Bomber pair; sector 3 grows 144 -> 232 rows (three waves in turn)
  // and sector 4 shrinks 312 -> 224 (one pair), so the post-capital rows stay
  // 456 and the 1,270-row total - the boss on the row it was - is unchanged.
  assert.deepEqual(compiled.sectors.map((sector) => sector.rows), [272, 0, 232, 224, 0]);
  assert.equal(compiled.sectors.reduce((sum, sector) => sum + sector.rows, 0) + 542, 1270);
  // Every wave names an archetype offset in the frozen four-record roster.
  for (const wave of compiled.waves) {
    assert.equal(wave.archetypeOffset % ARCHETYPE_RECORD_BYTES, 0);
    assert.ok(wave.archetypeOffset <= 3 * ARCHETYPE_RECORD_BYTES);
  }
});

// ---------------------------------------------------------------------------
// T2 - the image
// ---------------------------------------------------------------------------

test("T2: build/level-1.bin is 13 sectors with the three LevelDef pages where the plan puts them",
  () => {
    assert.equal(LEVEL_IMAGE_SECTORS, 13);
    assert.equal(levelOneImage.length, LEVEL_IMAGE_SECTORS * 128, "13 sectors of 128 B");
    const [levelOne] = manifest.sectorReader.levels;
    assert.deepEqual([levelOne.id, levelOne.sectors, levelOne.bytes],
      [1, LEVEL_IMAGE_SECTORS, LEVEL_IMAGE_SECTORS * 128]);
    assert.ok(levelOne.sectors <= manifest.sectorReader.levelBuffer.sectors,
      "a 13-sector image fits the 16-sector buffer with 3 sectors spare");

    // The eight-byte header sector_reader_validate checks.
    assert.equal(levelOneImage.subarray(0, 2).toString("latin1"), "VS");
    assert.equal(levelOneImage[2], 1, "format version");
    assert.equal(levelOneImage[3], 1, "level id");
    assert.equal(levelOneImage[4], LEVEL_IMAGE_SECTORS, "sector count");
    assert.equal(levelOneImage.readUInt16LE(5), LEVEL_IMAGE_SECTORS * 128 - 8, "payload length");
    assert.equal(levelOneImage[7], 9,
      "header byte 7 stays 9: LevelDef starts in the ninth sector (plan §2.1)");

    // The pages land at $AA00 / $AB00 / $AC00.
    assert.deepEqual([LEVEL_CORE_ADDRESS, LEVEL_PAYLOAD_ADDRESS, LEVEL_GEOMETRY_ADDRESS],
      [0xaa00, 0xab00, 0xac00]);
    assert.deepEqual([LEVEL_CORE_OFFSET, LEVEL_PAYLOAD_OFFSET, LEVEL_GEOMETRY_OFFSET],
      [0x400, 0x500, 0x600]);
    assert.equal(LEVEL_GEOMETRY_OFFSET + LEVEL_GEOMETRY_BYTES, levelOneImage.length,
      "the geometry page ends the image at $AC7F");

    // The magic at $AA00 - director_c_init's fail-closed check at step 2.
    assert.equal(levelOneImage[LEVEL_CORE_OFFSET], LEVEL_CORE_MAGIC);
    assert.equal(levelOneImage[LEVEL_CORE_OFFSET] & 0xf0, 0x50, "'V' in the high nibble");
    assert.equal(levelOneImage[LEVEL_CORE_OFFSET] & 0x0f, 1, "format 1 in the low nibble");

    // The core page agrees with the authored file.
    const compiled = compileLevelFile(levelSourcePath(1), { hullAsset });
    const core = levelOneImage.subarray(LEVEL_CORE_OFFSET, LEVEL_CORE_OFFSET + LEVEL_CORE_BYTES);
    assert.equal(Buffer.compare(core, compiled.core), 0, "the image carries the compiled core");
    assert.equal(core[1], 1, "level_number");
    assert.equal(core[2], compiled.sectors.length, "sector_count");
    assert.equal(core[3], compiled.waves.length, "wave_count");
    // The last sector carries bit 7 of sector_kind and no other does.
    for (const [index, sector] of compiled.sectors.entries()) {
      const last = index === compiled.sectors.length - 1;
      assert.equal((core[SECTOR_ARRAY_OFFSET.kind + index] & 0x80) !== 0, last,
        `sector ${index + 1} last-sector bit`);
      assert.equal(core[SECTOR_ARRAY_OFFSET.waveFirst + index], sector.waveFirst);
      assert.equal(core[SECTOR_ARRAY_OFFSET.waveCount + index], sector.waveCount);
    }
    // Every array is page-bounded and the two SoA blocks do not overlap.
    assert.equal(SECTOR_ARRAY_OFFSET.kind, CORE_HEADER_BYTES);
    assert.equal(WAVE_ARRAY_OFFSET.row, CORE_HEADER_BYTES + 8 * MAX_SECTORS);
    assert.equal(WAVE_ARRAY_OFFSET.memberOffset + MAX_WAVES, LEVEL_CORE_BYTES,
      "the wave SoA ends exactly at the page boundary");

    // Step 1 shipped the payload page zeroed. RE-POINTED 2026-10-01, roadmap
    // 4.6 step 5 (plan §8.3): level 1 now authors one Light look, so the page
    // is the compiler's own payload page byte for byte - and every block a
    // later step owns (paths, hull_params, boss_def) and the weapon looks
    // level 1 does not author are still zero.
    const payload = levelOneImage.subarray(LEVEL_PAYLOAD_OFFSET,
      LEVEL_PAYLOAD_OFFSET + LEVEL_PAYLOAD_BYTES);
    assert.equal(Buffer.compare(payload, compiled.pages.payload), 0);
    // RE-POINTED 2026-10-03 (M5a-S2, decision 28): the grade's ten bytes at
    // payload offset 184 are level data now; everything else beyond the look
    // is still zero.
    // RE-POINTED 2026-10-04 (M5b-S3, plan §5.6): boss_def at 194 carries the
    // boss bonus in its first two bytes; the rest of boss_def is still zero.
    // RE-POINTED M5b-S4a-i (owner answer Q-B3): boss_def's bytes 2-4 are the
    // hit points' scale per difficulty; the rest of boss_def is still zero.
    // RE-POINTED M5b-S4b (owner decision Q5, 2026-10-06): boss_def's bytes
    // 5-7 are the laser's damage per difficulty (EASY 5, MEDIUM 10, HARD 10);
    // the rest of boss_def is still zero.
    // RE-POINTED M5b-S4b.1 (owner decision D3, 2026-10-06): bytes 8-16 are
    // the laser's warning (EASY 40, MEDIUM 32, HARD 25) and its 16-bit reload
    // (300, 225, 150 frames) per difficulty; the rest of boss_def is zero.
    const outside = Buffer.concat([payload.subarray(16, 184), payload.subarray(211)]);
    assert.equal(Buffer.compare(outside, Buffer.alloc(outside.length)), 0,
      "one 16-B look, the grade block, the boss bonus, HP scale, laser damage, warning and reload and nothing else");
    assert.deepEqual([...payload.subarray(202, 205)], [40, 32, 25], "the laser's warning, EASY / MEDIUM / HARD");
    assert.deepEqual([...payload.subarray(205, 211)], [300 & 0xff, 225, 150, 300 >> 8, 0, 0], "the laser's reload, low then high");
    assert.deepEqual([...payload.subarray(199, 202)], [5, 10, 10], "the laser's damage, EASY / MEDIUM / HARD");
    assert.deepEqual([...payload.subarray(196, 199)], [0xff, 0x00, 0x01], "x 3/4, x 1, x 5/4");
    assert.deepEqual([...payload.subarray(194, 196)], [0x00, 0x20], "level 1's boss bonus, 2,000 BCD");
    assert.ok(payload.subarray(184, 194).some((byte) => byte !== 0), "level 1 grades");
  });

test("T2: the geometry page says 480 rows and carries today's two module sequences", () => {
  const geometry = levelOneImage.subarray(LEVEL_GEOMETRY_OFFSET,
    LEVEL_GEOMETRY_OFFSET + LEVEL_GEOMETRY_BYTES);
  assert.equal(geometry.readUInt16LE(GEOMETRY_OFFSET.hullRowsLo), 480,
    "level 1 keeps today's 480-row hull");
  assert.ok(HULL_ROW_STEPS.includes(480));
  // Phase starts in modules: aft 4, combat 14, forward 46, prow 56; drain 61.
  // The constants sector_c_update_capital_phase holds today (rows 32 / 112 /
  // 368 / 448, drain 488) divided by the 8-row module.
  assert.deepEqual([...geometry.subarray(GEOMETRY_OFFSET.phaseStarts,
    GEOMETRY_OFFSET.phaseStarts + 4)], [4, 14, 46, 56]);
  assert.equal(geometry[GEOMETRY_OFFSET.turretDensityStep], 3);
  assert.equal(geometry[GEOMETRY_OFFSET.reserved], 0);

  // The reproduction that matters for step 4: the two 60-byte sequences the
  // page carries are the bytes BROADSIDE assembles today, read straight out of
  // the generated include's macros.
  const include = readText("build/capital-hulls.inc");
  const sequenceFromMacro = (name) => {
    const body = include.match(
      new RegExp(`\\.macro ${name}\\n([\\s\\S]*?)\\.endmacro`))?.[1];
    assert.ok(body, `${name} is missing from build/capital-hulls.inc`);
    return Buffer.from([...body.matchAll(/\$([0-9A-Fa-f]{2})/g)]
      .map(([, hex]) => Number.parseInt(hex, 16)));
  };
  for (const [name, offset] of [["EMIT_ALLIED_SECTOR_SEQUENCE", GEOMETRY_OFFSET.alliedSequence],
    ["EMIT_ENEMY_SECTOR_SEQUENCE", GEOMETRY_OFFSET.enemySequence]]) {
    const expected = sequenceFromMacro(name);
    assert.equal(expected.length, HULL_SEQUENCE_BYTES, `${name} is 60 bytes`);
    assert.equal(Buffer.compare(
      geometry.subarray(offset, offset + HULL_SEQUENCE_BYTES), expected), 0,
    `the geometry page does not carry ${name} byte for byte`);
  }
  assert.equal(GEOMETRY_OFFSET.enemySequence + HULL_SEQUENCE_BYTES, LEVEL_GEOMETRY_BYTES,
    "the two sequences end the 128-byte page");
});

// ---------------------------------------------------------------------------
// The reproduction gate
// ---------------------------------------------------------------------------

test("the pages the plan marks unchanged are byte-identical to the image that shipped before", () => {
  // The image the build produced at 2577352 (plan step 0), the commit this
  // step branched from: sectors 1-5 header + gameplay music, sectors 6-8 the
  // hull block and its pad. Only the three bytes that STATE the image's own
  // length may move - byte 4 (sector count, 8 -> 13) and bytes 5-6 (payload
  // length, 1,016 -> 1,656). Everything else in the first 1,024 bytes is the
  // same byte, so the hash below is taken over bytes 0-3 and 7-1023.
  //
  // A mismatch here is a STOP, not something to reconcile by editing the old
  // data (plan §8 step 1; the session brief's reproduction gate).
  const UNCHANGED_PAGES_SHA256 =
    "109dc323e6cbc40dabfce5448656348428bea6e17b508923d90b5642bad4ab8f";
  const unchanged = Buffer.concat([
    levelOneImage.subarray(0, 4), levelOneImage.subarray(7, 1024)]);
  assert.equal(crypto.createHash("sha256").update(unchanged).digest("hex"),
    UNCHANGED_PAGES_SHA256,
    "sectors 1-8 of the level image moved; the LevelDef pages may only be written " +
    "over the inert pattern in sectors 9-13");

  // Independently of the hash: the music block and the hull block are still
  // exactly the artifacts the build writes for them, at their frozen offsets.
  const music = read("build/gameplay-music.bin");
  assert.equal(Buffer.compare(levelOneImage.subarray(8, 8 + music.length), music), 0,
    "the gameplay music player moved inside the image");
  const hullBlock = read("build/level-hull-block.bin");
  assert.equal(Buffer.compare(
    levelOneImage.subarray(0x280, 0x280 + hullBlock.length), hullBlock), 0,
  "the hull block moved inside the image");
});

test("levels:check runs the validator alone and the build compiles the authored file", () => {
  const packageJson = JSON.parse(readText("package.json"));
  assert.equal(packageJson.scripts["levels:check"], "node scripts/level-compiler.mjs");
  assert.ok(fs.existsSync(path.join(rootDirectory, "scripts/level-preview.mjs")),
    "the preview tool the plan §6 asks for");
  assert.ok(fs.existsSync(path.join(rootDirectory, "docs/level-authoring.md")),
    "the authoring vocabulary the plan §6 asks for");
  const buildSource = readText("scripts/build.mjs");
  assert.match(buildSource, /compileLevelFile\(levelSourcePath\(run\.id\)/,
    "the build must compile the authored JSON, not carry the bytes");
});

// RE-PINNED at step 2. The step-1 version of this test asserted the OPPOSITE -
// that nothing resident read the new pages yet - and named step 2 as the one
// that would change it. This is that change, and the pin the brief asks for:
// the Director's schedule comes from the level IMAGE, not from constants the
// build compiled into the runtime.
test("step 2: the Director's schedule is the level image, and the geometry page still waits", () => {
  const directorSource = readText("src/c/director.c");
  // The retired half. Nothing in the Director names a level any more.
  assert.doesNotMatch(directorSource, /level1_phase|level1_event|LEVEL1_DATA/,
    "step 2 retires LEVEL1_DATA outright");
  assert.doesNotMatch(directorSource, /PHASE_COUNT|EVENT_COUNT/,
    "and the phase machinery that walked it");
  // The arrived half: one C array per column of the core page, placed at the
  // page by the link config and asserted onto the compiler's own offsets.
  assert.match(directorSource, /#pragma bss-name \("LEVEL_CORE"\)/);
  assert.match(readText("cfg/encounter-director.cfg"),
    /LEVEL_CORE_RAM: start = \$AA00/);
  assert.match(readText("src/hybrid/c-asm-abi.s"),
    /\.assert _wave_row = LEVEL_CORE_WAVE_ROW_ADDRESS, lderror/);
  // The Director reads the SectorDef by index; there is no second copy of it
  // to fall out of step, so poking the sector index selects a sector whole.
  for (const column of ["sector_kind", "sector_caps", "sector_archetypes", "sector_hazards",
    "wave_row", "wave_archetype", "wave_count", "wave_spacing", "wave_member_offset"]) {
    assert.match(directorSource, new RegExp(`uint8_t ${column}\\[`));
  }
  // RE-PINNED at roadmap 4.6 step 4, which is the step this half was waiting
  // for: the resolvers read the level's HullGeometry page and the resident
  // BROADSIDE sequences are a zero pin. The Director's own C still reads only
  // the core page - the geometry page belongs to the capital code.
  const mainSource = readText("src/main.s");
  assert.doesNotMatch(mainSource, /EMIT_(ALLIED|ENEMY)_SECTOR_SEQUENCE/,
    "step 4 moves the module sequences out of BROADSIDE");
  assert.match(mainSource, /lda LEVEL_GEOMETRY_ALLIED_SEQUENCE,y/);
  assert.match(mainSource, /lda LEVEL_GEOMETRY_ENEMY_SEQUENCE,y/);
  assert.match(readText("src/c/lifecycle.c"), /#pragma bss-name \("LEVEL_GEOMETRY"\)/);
  assert.doesNotMatch(directorSource, /LEVEL_GEOMETRY|level_hull/,
    "the Director reads the core page only");
});

// ---------------------------------------------------------------------------
// T12 - step 3: the authored level 2
// ---------------------------------------------------------------------------

test("T12: level-02.json compiles and differs from level 1 in sector count, waves and masks",
  () => {
    const one = compileLevelFile(levelSourcePath(1), { hullAsset });
    const two = compileLevelFile(levelSourcePath(2), { hullAsset });
    assert.deepEqual(two.warnings, [], "level 2 asks for nothing the runtime clamps");
    assert.equal(two.level, 2);
    assert.equal(two.pages.core[1], 2, "level_number in the core page");

    // Sector count: six against level 1's four (R4). RE-POINTED 2026-10-04
    // (M5b-S3): level 1 gained its boss, a fifth; the two still differ.
    assert.equal(one.sectors.length, 5);
    assert.equal(two.sectors.length, 6);
    assert.deepEqual(two.sectors.map((sector) =>
      sector.subtypeName === null ? sector.kindName : `${sector.kindName}/${sector.subtypeName}`),
    ["space/swarm", "space/elite", "capital", "space/swarm", "space/elite", "space/elite"]);
    assert.equal(two.pages.core[2], 6, "sector_count in the core page");

    // Masks (R3): no sector of level 2 carries the mask level 1's sector in the
    // same position carries, and the two swarm sectors are Light-only.
    const bit = (name) => 1 << ["raider", "wingman", "interceptor", "bomber"].indexOf(name);
    const mask = (...names) => names.reduce((sum, name) => sum | bit(name), 0);
    assert.deepEqual(two.sectors.map((sector) => sector.mask), [
      mask("interceptor", "wingman"),
      mask("bomber", "wingman"),
      0,
      mask("interceptor"),
      mask("raider", "wingman", "bomber"),
      mask("raider", "wingman", "interceptor", "bomber"),
    ]);
    for (const [index, sector] of one.sectors.entries()) {
      if (sector.kindName === "capital") continue;
      assert.notEqual(two.sectors[index].mask, sector.mask, `sector ${index + 1}'s mask`);
    }
    for (const index of [0, 3]) {
      assert.equal(two.sectors[index].effectiveLights, 3, "a swarm sector's Light ceiling");
      assert.equal(two.sectors[index].effectiveHeavies, 0, "and it has no Heavy slot");
    }

    // Waves (R2): level 2 opens on a Light-dominant wave and has seven.
    // RE-POINTED (fix/smoke-2026-10-07 P2): level 1 now has two after its
    // capital - one Interceptor, one Wingman - where it had none; it still
    // never opens on one (its first wave is the Raider + Wingman formation).
    assert.equal(one.waves.filter((wave) => wave.class === "light").length, 2);
    assert.notEqual(one.waves[0].class, "light");
    assert.equal(two.waves.filter((wave) => wave.class === "light").length, 7);
    assert.equal(two.waves[0].archetype, "interceptor");
    assert.equal(two.waves.length, 19);

    // Owner decision, 2026-09-30 (plan §11 item 15): sector 4 is three
    // Interceptor waves of eight at spacing 20 - NOT four at the 16-frame
    // class floor, which is kept for later levels so level 2 leaves room to
    // escalate.
    const sectorFour = two.waves.filter((wave) => wave.sector === 4);
    assert.deepEqual(sectorFour.map((wave) => [wave.archetype, wave.count, wave.spacing]),
      [["interceptor", 8, 20], ["interceptor", 8, 20], ["interceptor", 8, 20]]);
    // ... and no wave anywhere in level 2 sits on the Light class floor.
    for (const wave of two.waves.filter((candidate) => candidate.class === "light")) {
      assert.ok(wave.spacing > 16, `a level-2 Light wave at spacing ${wave.spacing}`);
    }

    // Owner decision, 2026-09-30: debris 1 wherever the draft said 2. The
    // runtime reads the field as a nonzero test (HAZARD_DEBRIS_MASK) and no
    // plan step makes the count live, so 2 would have said something the game
    // does not do.
    assert.deepEqual(two.sectors.map((sector) => sector.debris), [1, 1, 1, 1, 1, 1]);

    // Owner decision, 2026-09-30: everything else as drafted - the capital on
    // authored row 1,120 (level 1: 272) and sector 6 at 1,152 rows.
    assert.equal(two.sectors[0].rows + two.sectors[1].rows, 1120);
    assert.equal(one.sectors[0].rows, 272);
    assert.equal(two.sectors[5].rows, 1152);
    assert.deepEqual(two.sectors.map((sector) => sector.rows), [480, 640, 0, 768, 800, 1152]);
    // RE-PINNED at roadmap 4.6 step 4 (plan §8 step 4, owner 2026-09-30):
    // level 2 flies a 352-row hull, level 1 keeps 480 (T7,
    // tests/hull-length.test.mjs).
    assert.equal(two.geometry.hullRows, 352);
    assert.equal(one.geometry.hullRows, 480);
  });
