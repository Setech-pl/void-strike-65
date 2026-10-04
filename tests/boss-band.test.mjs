// M5b-S3 — the boss band, its phases and the boss-entry transition
// (docs/plans/m5-loading-boss.md §5.1-5.3, §5.6, §5.11; owner answers Q-S1-Q-S6
// and decision 32, §1.5).
//
// This file holds the level, asset and build contracts. The runtime behaviour
// (the entry, the install, the band, the phases, the collision, the win and
// the restore) is driven on the 6502 harness in tests/boss-runtime.test.mjs.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  LevelValidationError,
  compileLevel,
  compileLevelFile,
  defaultHullAsset,
  levelSourcePath,
  PAYLOAD_OFFSET,
  SECTOR_ARRAY_OFFSET,
  LEVEL_PAYLOAD_OFFSET,
  LEVEL_CORE_OFFSET,
} from "../scripts/level-compiler.mjs";
import {
  BOSS_GLYPH_BASE,
  BOSS_GLYPH_COUNT,
  BOSS_BAND_COLUMNS,
  BOSS_KIND,
  BOSS_REGION_SECTORS,
  BOSS_STAGING_THEME_CAPACITY,
  bossBandRowAddress,
  compileBossRegion,
  loadBossRegionDefinition,
} from "../scripts/boss-assets.mjs";
import {
  compileGameplayMusic,
  compileMusic,
  layoutGameplayMusicLike,
  loadMusicDefinition,
} from "../scripts/music.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relative) => fs.readFileSync(path.join(root, relative));
const hullAsset = defaultHullAsset();

function viceLabels(relative) {
  const labels = new Map();
  for (const line of read(relative).toString("utf8").split(/\r?\n/)) {
    const match = /^al\s+([0-9a-f]+)\s+\.?([^\s]+)$/i.exec(line.trim());
    if (match && !labels.has(match[2])) labels.set(match[2], Number.parseInt(match[1], 16));
  }
  return labels;
}

// ---------------------------------------------------------------------------
// The level: level 1 ends in a BOSS sector (plan §5.1, §5.8).
// ---------------------------------------------------------------------------

test("level 1 ends in a boss sector: no Heavy, at most one Light, any escort armed on row 0", () => {
  const compiled = compileLevelFile(levelSourcePath(1), { hullAsset });
  assert.deepEqual(compiled.warnings, []);
  const boss = compiled.sectors.at(-1);
  assert.equal(boss.kindName, "boss");
  assert.equal(boss.heavies, 0, "owner decision: no Heavy in the boss sector");
  assert.ok(boss.lights <= 1, "owner decision: at most one Light");
  assert.equal(boss.effectiveLights, boss.lights, "the runtime ceiling admits the one Light");
  for (const wave of compiled.waves.filter((entry) => entry.sector === compiled.sectors.length)) {
    assert.equal(wave.class, "light", "a boss escort is a Light wave");
    assert.equal(wave.row, 0, "the world stops in the boss sector (Q1): only row 0 ever arms");
  }
  assert.notEqual(compiled.core[7], 0, "the core page names the boss");
  assert.equal(compiled.core[SECTOR_ARRAY_OFFSET.kind + compiled.sectors.length - 1] & 0x83,
    0x82, "the boss sector is kind BOSS and carries the last-sector bit");
});

test("everything before the boss sector is the level that shipped (gameplay up to the boss is main's)", () => {
  const compiled = compileLevelFile(levelSourcePath(1), { hullAsset });
  assert.deepEqual(compiled.sectors.slice(0, 4).map((sector) => sector.kindName),
    ["space", "capital", "space", "space"]);
  assert.deepEqual(compiled.sectors.slice(0, 4).map((sector) => sector.rows), [272, 0, 856, 2040]);
  // The sky rule (budget-1.0 M2 variant S2): sector 4 keeps its yellow; the boss
  // sector, now the last, is yellow too.
  assert.deepEqual(compiled.sectors.map((sector) => sector.starColour), [1, 2, 1, 3, 3]);
});

test("the boss sector's ceiling is one Light in the runtime and the compiler alike", () => {
  const director = read("src/c/director.c").toString("utf8");
  assert.ok(/const uint8_t subtype_ceiling_light\[4\] = \{ 3u, 1u, 0u, 1u \};/.test(director),
    "light[3] 0 -> 1 (plan §5.1, decision 5a)");
  assert.ok(/const uint8_t subtype_ceiling_heavy\[4\] = \{ 0u, 2u, 0u, 0u \};/.test(director),
    "the boss sector admits no Heavy");
});

test("the compiler refuses a boss sector that could not play as it reads", () => {
  const base = JSON.parse(read("assets/levels/level-01.json").toString("utf8"));
  const withBoss = (mutate) => {
    const source = structuredClone(base);
    mutate(source.sectors.at(-1), source);
    return () => compileLevel(source, { hullAsset, file: "level-01.json" });
  };
  // Level 1's core page is full (20 waves), so the escort cases borrow level 2's
  // capacity: a level that authors an escort must arm it on row 0.
  const escort = (row) => (sector) => {
    sector.archetypes = ["wingman"];
    sector.lights = 1;
    sector.waves = [{ row, archetype: "wingman", count: 1, spacing: 120, entry: 124 }];
  };
  const fewerWaves = (mutate) => withBoss((sector, source) => {
    source.sectors[3].waves = source.sectors[3].waves.slice(0, 12);
    mutate(sector, source);
  });
  assert.doesNotThrow(fewerWaves(escort(0)), "a row-0 Light escort is a legal boss sector");
  assert.throws(fewerWaves(escort(8)), LevelValidationError,
    "a boss wave after row 0 never arms: the world stops");
  assert.throws(withBoss((sector) => {
    sector.archetypes = ["raider"];
  }), LevelValidationError, "no Heavy archetype in a boss sector");
  assert.throws(withBoss((sector, source) => { delete source.bossDef; }), LevelValidationError,
    "a level that names a boss carries its boss_def");
});

test("boss_def carries the boss bonus as packed BCD at payload offset 194", () => {
  const compiled = compileLevelFile(levelSourcePath(1), { hullAsset });
  const source = JSON.parse(read("assets/levels/level-01.json").toString("utf8"));
  const bonus = String(source.bossDef.bonus).padStart(4, "0");
  const payload = compiled.payload;
  assert.equal(payload[PAYLOAD_OFFSET.bossDef], Number.parseInt(bonus.slice(2), 16));
  assert.equal(payload[PAYLOAD_OFFSET.bossDef + 1], Number.parseInt(bonus.slice(0, 2), 16));
  // and it is the image the build placed on the disk
  const image = read("build/level-1.bin");
  assert.equal(image[LEVEL_PAYLOAD_OFFSET + PAYLOAD_OFFSET.bossDef],
    payload[PAYLOAD_OFFSET.bossDef]);
  assert.equal(image[LEVEL_CORE_OFFSET + 7], compiled.core[7]);
});

test("the level image still ends before $AC80, where band rows 6-7 and the tables land", () => {
  const image = read("build/level-1.bin");
  assert.ok(0xa600 + image.length <= 0xac80,
    `level 1 is ${image.length} B and would reach band B at $AC80`);
});

// ---------------------------------------------------------------------------
// The region data (plan §5.1, §5.10, Q-S6).
// ---------------------------------------------------------------------------

const region = compileBossRegion(
  loadBossRegionDefinition(path.join(root, "assets/graphics/boss-region-1.json")));

test("region 1: 31 glyphs at the capital hull's codes 59-89, an 8 x 64 band", () => {
  assert.equal(BOSS_GLYPH_BASE, 59);
  assert.equal(BOSS_GLYPH_COUNT, 31);
  assert.equal(region.glyphImage.length, 31 * 8);
  assert.equal(region.bandRows.length, 8);
  assert.ok(region.bandRows.every((row) => row.length === BOSS_BAND_COLUMNS));
  for (const row of region.bandRows) {
    for (const code of row) {
      const glyph = code & 0x7f;
      assert.ok(code === 0 || (glyph >= 59 && glyph <= 89),
        `band code $${code.toString(16)} is outside the region's glyphs`);
    }
  }
});

test("region 1: the guns come first, the core last, no two guns share a column", () => {
  const kinds = region.modules.map((module) => module.kind);
  assert.equal(kinds.at(-1), "core");
  assert.ok(kinds.slice(0, -1).every((kind) => kind === "gun"));
  assert.ok(kinds.length - 1 >= 2 && kinds.length - 1 <= 3, "decision 7: 2-3 guns");
  const columns = new Set();
  for (const module of region.modules.filter((entry) => entry.kind === "gun")) {
    for (let column = module.x; column < module.x + module.width; column += 1) {
      assert.ok(!columns.has(column), `column ${column} holds two guns`);
      columns.add(column);
    }
  }
  assert.equal(BOSS_KIND.gun, 1);
  assert.equal(BOSS_KIND.core, 2);
});

test("region 1 is 9 sectors: staging 4, band A 3, band B 2 (Q-S6)", () => {
  assert.equal(BOSS_REGION_SECTORS, 9);
  assert.equal(region.runs.staging.sectors + region.runs.bandA.sectors + region.runs.bandB.sectors, 9);
  assert.equal(region.runs.staging.address, 0x7990, "behind the install run at $7810 (§5.11.7)");
  assert.ok(region.runs.staging.address + region.runs.staging.sectors * 128 <= 0x7bd0,
    "the staging run stays inside the pause backup, below the arena");
  assert.equal(region.runs.bandA.address, 0xa880);
  assert.equal(region.runs.bandB.address, 0xac80);
});

test("no band row crosses a 4 KB boundary (ANTIC's LMS counter) or a page", () => {
  for (let row = 0; row < 8; row += 1) {
    const first = bossBandRowAddress(row);
    const last = first + BOSS_BAND_COLUMNS - 1;
    assert.equal(first >> 12, last >> 12, `band row ${row} crosses a 4 KB boundary`);
    assert.equal(first >> 8, last >> 8, `band row ${row} crosses a page (the LMS low byte alone moves)`);
  }
});

test("the boss theme is laid out like the level's track and fits the staging run (decision 32)", () => {
  const menu = compileMusic(loadMusicDefinition(path.join(root, "assets/music/menu-theme.json")));
  const level = compileGameplayMusic(
    loadMusicDefinition(path.join(root, "assets/music/gameplay-theme.json")),
    { pitches: menu.pitches });
  const boss = compileGameplayMusic(
    loadMusicDefinition(path.join(root, "assets/music/boss-theme.json")),
    { pitches: menu.pitches });
  const image = layoutGameplayMusicLike(boss, level);
  assert.ok(image.length <= 361, "plan §5.10: the music copy is <= 361 B");
  assert.ok(image.length <= BOSS_STAGING_THEME_CAPACITY);
  // The tables the player addresses absolutely sit at the level track's offsets.
  const tableEnd = (asset) => asset.audcBase.length +
    asset.envelopes.reduce((sum, e) => sum + e.length, 0) +
    asset.dividerMaps.reduce((sum, m) => sum + m.length, 0);
  assert.deepEqual([...image.subarray(tableEnd(level), tableEnd(level) + 32)],
    [...boss.sequenceBytes[0], ...boss.sequenceBytes[1]]);
  // A track the player cannot play is refused, not silently copied.
  assert.throws(() => layoutGameplayMusicLike({ ...boss, framesPerRow: 5 }, level));
  assert.throws(() => layoutGameplayMusicLike({ ...boss, sequence: boss.sequence.slice(1) }, level));
});
