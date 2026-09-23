// Roadmap 4.6 step 1 (docs/plans/director-4.6.md §8, §9): the JSON level
// compiler, the 13-sector level image, and the reproduction gate that says the
// pages the plan marks unchanged really are unchanged.
//
// T1 - the validator rejects every §5 case and warns on a cap above the
//      subtype table.
// T2 - build/level-1.bin is 13 sectors; the magic sits at $AA00; header byte 7
//      is still 9; the geometry page says 480 rows and its sequences equal
//      EMIT_ALLIED_SECTOR_SEQUENCE / EMIT_ENEMY_SECTOR_SEQUENCE.
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
  assert.equal(compiled.sectors.length, 4);
  assert.deepEqual(compiled.sectors.map((sector) => sector.kindName),
    ["space", "capital", "space", "space"]);
  // A capital sector carries no enemy in 1.0 (owner decision, plan §11.1).
  assert.equal(compiled.sectors[1].mask, 0);
  assert.equal(compiled.sectors[1].lights, 0);
  assert.equal(compiled.sectors[1].heavies, 0);
  // Today's level 1 completes at world row 3712 (src/c/director.c,
  // level1_phase_end_* last entry). The authored space sectors sum to it; which
  // row the capital sector itself starts on is step 2's measurement (plan §10
  // departure, §11 item 3), not this step's.
  assert.equal(compiled.sectors.reduce((sum, sector) => sum + sector.rows, 0), 3712);
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

    // Step 1 ships the payload page zeroed: its consumers are steps 5 and 6.
    const payload = levelOneImage.subarray(LEVEL_PAYLOAD_OFFSET,
      LEVEL_PAYLOAD_OFFSET + LEVEL_PAYLOAD_BYTES);
    assert.equal(Buffer.compare(payload, Buffer.alloc(LEVEL_PAYLOAD_BYTES)), 0);
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

test("step 1 leaves the runtime reading nothing new", () => {
  // The Director still runs on LEVEL1_DATA; the resolvers still read the
  // resident BROADSIDE sequences; the capital phase thresholds are still
  // constants. Steps 2 and 4 retire each of those, and each has its own test.
  const directorSource = readText("src/c/director.c");
  assert.match(directorSource, /level1_phase_end_lo/,
    "step 1 does not retire LEVEL1_DATA - that is step 2");
  const mainSource = readText("src/main.s");
  assert.match(mainSource, /allied_sector_sequence/,
    "step 1 does not move the module sequences out of BROADSIDE - that is step 4");
  // No source file may reference the new pages yet.
  for (const relative of ["src/main.s", "src/c/director.c", "src/c/lifecycle.c",
    "src/hybrid/sector-reader.s"]) {
    assert.doesNotMatch(readText(relative), /\$A[AC]00|0xAA00|0xAC00/i,
      `${relative} reads a LevelDef page before its step`);
  }
});
