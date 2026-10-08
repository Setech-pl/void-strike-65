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
  BOSS_BAND_COLUMNS,
  BOSS_FIRST_CODE,
  BOSS_KIND,
  BOSS_REGION_SECTORS,
  BOSS_THEME_CAPACITY,
  bossBandRowAddress,
  bossRegionDirectory,
  compileBossRegion,
  loadBossRegionDraft,
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
  // RE-POINTED (data/w2-lights, owner answers of 2026-10-08): the sectors
  // before the boss are seven-minus-one now - a swarm, elite (a) and (b) join
  // after the capital (docs/plans/w2-lights.md §4.1); the subject stays every
  // sector before the boss.
  assert.deepEqual(compiled.sectors.slice(0, 6).map((sector) => sector.kindName),
    ["space", "capital", "space", "space", "space", "space"]);
  // RE-POINTED 2026-10-07 (M5b-S4b.4, owner decision W1): after the capital,
  // one Raider + Wingman wave (144 rows) and one Bomber wave (312 rows); the
  // sectors before the capital and the capital are main's.
  // RE-POINTED (fix/smoke-2026-10-07 P2, owner decision of 2026-10-08): the
  // post-capital sectors are 232 + 224 rows (one Interceptor, one Wingman, one
  // Raider pair; one Bomber pair), the same 456 rows in all, so the boss
  // sector is entered on the row it was; the sectors before the capital and
  // the capital are main's.
  // RE-POINTED (data/w2-lights): the swarm (280) and elite (a) (120) before
  // P2's 224-row Bomber sector, elite (b) (240) after it; the sectors before the
  // capital and the capital are main's.
  // RE-POINTED (feat/sector-flow, docs/plans/sector-flow.md §2.5): the rows
  // are each space sector's no-kill cut now - the swarm 384 (its chained third
  // wave), elite (b) 200 (the W2 reserve dropped); the sectors before the
  // capital and the capital are main's.
  assert.deepEqual(compiled.sectors.slice(0, 6).map((sector) => sector.rows), [272, 0, 384, 120, 224, 200]);
  // The sky rule (budget-1.0 M2 variant S2): the last space sector - elite (b)
  // now - flies under yellow (mint since plasma FX) and the boss sector too;
  // every other space sector under white.
  assert.deepEqual(compiled.sectors.map((sector) => sector.starColour), [1, 2, 1, 1, 1, 3, 3]);
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

// EXTENDED M5b-S4a-i (owner answer Q-B3): boss_def's bytes 2-4 are the hit
// points' scale per difficulty, in quarters (-1, 0, +1: x 3/4, 1, 5/4).
test("boss_def carries the boss bonus as packed BCD at payload offset 194, then the HP scale", () => {
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
  assert.deepEqual([...payload.subarray(PAYLOAD_OFFSET.bossDef + 2, PAYLOAD_OFFSET.bossDef + 5)],
    [0xff, 0x00, 0x01], "EASY x 3/4, MEDIUM x 1, HARD x 5/4");
  assert.throws(() => compileLevel({ ...source, bossDef: { ...source.bossDef, hpScale: { hard: 2 } } },
    { hullAsset, file: "level-01.json" }), LevelValidationError, "a scale outside the quarters");
});

test("the level image still ends before $AC80, where band rows 6-7 and the tables land", () => {
  const image = read("build/level-1.bin");
  assert.ok(0xa600 + image.length <= 0xac80,
    `level 1 is ${image.length} B and would reach band B at $AC80`);
});

// ---------------------------------------------------------------------------
// The region data (plan §5.1, §5.10, Q-S6).
// ---------------------------------------------------------------------------

const region = compileBossRegion(loadBossRegionDraft(bossRegionDirectory(root, 1)));
// RE-POINTED (fortress session, owner decision H): the core boss's layout is
// the Bastion fixture now, kept in the engine for a later region (S5).
const coreBoss = compileBossRegion(loadBossRegionDraft(path.join(root, "assets", "graphics", "boss-regions", "bastion")));

// RE-POINTED M5b-S4a-i (§5.13.4, Q-B5): the band is drawn in the region's own
// charset at $0C00 (codes 7..), not over the capital hull's codes 59-89.
test("region 1: an 8 x 64 band in its own charset's codes, the divider's 0-6 left alone", () => {
  assert.equal(region.bandRows.length, 8);
  assert.ok(region.bandRows.every((row) => row.length === BOSS_BAND_COLUMNS));
  for (const row of region.bandRows) {
    for (const code of row) {
      const glyph = code & 0x7f;
      assert.ok(code === 0 || (glyph >= BOSS_FIRST_CODE && glyph < region.codeCount),
        `band code $${code.toString(16)} is outside the region's glyphs`);
    }
  }
});

// RE-POINTED M5b-S4a-i (owner answer Q-B1, decision F), and again in the
// fortress session (decision H: region 1 is the fortress; this layout is the
// Bastion fixture now): the S3 core boss as style 2 - the guns (two pulse
// cannons and the tier's emitter)
// in front, the core last and covered by all three, two armour plates; no
// two front modules share a column (decision 7's "guns then core" is this
// layout's cover group).
test("the core boss: the gun group in front, the core last behind all of it, no two guns share a column", () => {
  const kinds = coreBoss.modules.map((module) => module.kind);
  assert.equal(kinds.at(-1), "core");
  const guns = coreBoss.modules.filter((module) => module.kind === "pulse" || module.kind === "emitter");
  assert.equal(guns.length, 3, "decision 7: three guns in front of the core");
  const core = coreBoss.modules.at(-1);
  assert.equal(core.cover, guns.reduce((mask, gun) => mask | (1 << coreBoss.modules.indexOf(gun)), 0));
  const columns = new Set();
  for (const module of guns) {
    for (let column = module.x; column < module.x + module.width; column += 1) {
      assert.ok(!columns.has(column), `column ${column} holds two guns`);
      columns.add(column);
    }
  }
  for (const layout of [coreBoss, region]) {
    assert.ok(layout.modules.filter((module) => module.kind === "armour").length >= 1,
      "armour the player may leave standing (decision A)");
  }
  assert.deepEqual(Object.keys(BOSS_KIND), ["armour", "pulse", "emitter", "salvo", "core"]);
});

// RE-POINTED M5b-S4a-i (§5.13.4): a region is 16 reserved sectors - theme 2,
// band A 3, band B 3, the charset sized to its contents (<= 8); S3's was 9.
test("region 1 fits its 16 sectors: theme 2, band A 3, band B 3, charset <= 8", () => {
  assert.equal(BOSS_REGION_SECTORS, 16);
  const { theme, bandA, bandB, charset } = region.runs;
  assert.ok(theme.sectors + bandA.sectors + bandB.sectors + charset.sectors <= 16);
  assert.equal(theme.address, 0x7990, "behind the install run at $7810 (§5.11.7)");
  assert.ok(theme.address + theme.sectors * 128 <= 0x7bd0,
    "the theme run stays inside the pause backup, below the arena");
  assert.equal(bandA.address, 0xa880);
  assert.equal(bandB.address, 0xac80);
  assert.equal(charset.address, 0x0c00);
});

test("no band row crosses a 4 KB boundary (ANTIC's LMS counter) or a page", () => {
  for (let row = 0; row < 8; row += 1) {
    const first = bossBandRowAddress(row);
    const last = first + BOSS_BAND_COLUMNS - 1;
    assert.equal(first >> 12, last >> 12, `band row ${row} crosses a 4 KB boundary`);
    assert.equal(first >> 8, last >> 8, `band row ${row} crosses a page (the LMS low byte alone moves)`);
  }
});

test("the boss theme is laid out like the level's track and fits its run (decision 32)", () => {
  const menu = compileMusic(loadMusicDefinition(path.join(root, "assets/music/menu-theme.json")));
  const level = compileGameplayMusic(
    loadMusicDefinition(path.join(root, "assets/music/gameplay-theme.json")),
    { pitches: menu.pitches });
  const boss = compileGameplayMusic(
    loadMusicDefinition(path.join(root, "assets/music/boss-theme.json")),
    { pitches: menu.pitches });
  const image = layoutGameplayMusicLike(boss, level);
  assert.ok(image.length <= 361, "plan §5.10: the music copy is <= 361 B");
  assert.ok(image.length <= BOSS_THEME_CAPACITY, "the theme run's 2 sectors (S3: behind the glyphs)");
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
