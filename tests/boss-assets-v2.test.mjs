// M5b-S4a-i — the boss art pipeline (docs/plans/m5-loading-boss.md §5.13.4;
// owner answers Q-B1, Q-B2, Q-B5; decisions A, C, F, G): the v2 converter
// (scripts/boss-assets.mjs) from PNG drafts and modules.json, its validation
// with a failing fixture for each rule, the cover masks, the staged block and
// region 1's drafts, and the preview that renders them without the game.
// RE-POINTED (fortress session, owner decision H, plan §5.15): region 1 is the
// layered fortress now; the style-2 core boss of S4a-i stays in the engine as
// the Bastion drafts (assets/graphics/boss-regions/bastion/), and the tests
// that read the core boss read those - every assertion kept. The bay glyphs
// gave way to the gone look of owner decision L (the cavity, no rim).
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  BOSS_BAND_COLUMNS, BOSS_BAND_IMAGE, BOSS_DIVIDER_CODES, BOSS_FIRST_CODE, BOSS_KIND,
  BOSS_MAX_CODES, BOSS_MODULE, BOSS_MODULE_BYTES, BOSS_NO_LOOK, BOSS_TABLE, BossDraftError,
  bossRegionDirectory, bossThresholds, compileBossRegion, decodeBossDraftPng, loadBossRegionDraft,
  resolveBossCovers,
} from "../scripts/boss-assets.mjs";
import { encodePng } from "../scripts/preview.mjs";
import { renderBossPreview } from "../scripts/boss-preview.mjs";
import {
  fixtureDraft, fixtureLayout, imageToPng, layeredDraft, encodeRgbaPng, paintCell, LAYERED_MODULES,
} from "./boss-fixtures.mjs";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const regionDirectory = bossRegionDirectory(root, 1);
const region1 = compileBossRegion(loadBossRegionDraft(regionDirectory));
const bastion = compileBossRegion(loadBossRegionDraft(path.join(root, "assets", "graphics", "boss-regions", "bastion")));
const rejects = (fn, pattern) => assert.throws(fn, (error) =>
  error instanceof BossDraftError && pattern.test(error.message), `expected ${pattern}`);

// ---------------------------------------------------------------------------
// The PNG drafts (Q-B2): the repository's own reader, five fixed colours
// ---------------------------------------------------------------------------

test("region 1 is authored as five PNG drafts and modules.json, formatVersion 2 (Q-B2)", () => {
  for (const file of ["band.png", "cracked.png", "broken.png", "open.png", "extras.png", "modules.json"]) {
    assert.ok(fs.existsSync(path.join(regionDirectory, file)), `${file} is missing`);
  }
  const layout = JSON.parse(fs.readFileSync(path.join(regionDirectory, "modules.json"), "utf8"));
  assert.equal(layout.formatVersion, 2);
  // The S3 JSON form is retired: no second source for region 1.
  assert.ok(!fs.existsSync(path.join(root, "assets/graphics/boss-region-1.json")));
});

test("the PNG format: an RGB, a resized, an off-palette or a translucent draft is refused", () => {
  const band = fixtureDraft(fixtureLayout([{ name: "g", kind: "pulse", x: 10, row: 7, width: 2,
    height: 1, hp: 4, score: 1 }])).images.band;
  const good = imageToPng(band);
  const decoded = decodeBossDraftPng(good, "band.png", BOSS_BAND_IMAGE);
  assert.deepEqual([...decoded.indices], [...band.indices], "the round trip keeps every pixel");
  // RGB (colour type 2) - what many editors save by default.
  const rgb = encodePng(Buffer.alloc(256 * 64 * 3), 256, 64);
  rejects(() => decodeBossDraftPng(rgb, "band.png", BOSS_BAND_IMAGE), /not a non-interlaced 8-bit RGBA PNG/);
  // The wrong size.
  rejects(() => decodeBossDraftPng(encodeRgbaPng(128, 64, () => [0, 0, 0, 255]), "band.png",
    BOSS_BAND_IMAGE), /128 x 64 px; it must be 256 x 64/);
  // A colour that is none of the five.
  rejects(() => decodeBossDraftPng(encodeRgbaPng(256, 64, (x, y) =>
    x === 7 && y === 3 ? [10, 20, 30, 255] : [0, 0, 0, 255]), "band.png", BOSS_BAND_IMAGE),
  /pixel \(7, 3\) is #0a141e, not one of the five draft colours/);
  // Transparency.
  rejects(() => decodeBossDraftPng(encodeRgbaPng(256, 64, (x, y) =>
    x === 0 && y === 0 ? [0, 0, 0, 128] : [0, 0, 0, 255]), "band.png", BOSS_BAND_IMAGE),
  /pixel \(0, 0\) is not opaque/);
});

// ---------------------------------------------------------------------------
// The validation rules, each with its failing fixture
// ---------------------------------------------------------------------------

test("the code count: a region that needs more than 128 codes is refused", () => {
  const draft = fixtureDraft(fixtureLayout([{ name: "g", kind: "pulse", x: 10, row: 7, width: 2,
    height: 1, hp: 4, score: 1 }]));
  // 130 distinct hull glyphs on rows 0-2.
  let seed = 1000;
  for (let row = 0; row < 3; row += 1) {
    for (let column = 4; column < 50; column += 1) paintCell(draft.images.band, column, row, { seed: seed++ });
  }
  rejects(() => compileBossRegion(draft), /needs \d+ codes .*ANTIC 4 has 128/);
  assert.equal(BOSS_MAX_CODES, 128);
});

test("one colour bank per cell: a cell mixing pf2 and pf3, or stages in two banks, is refused", () => {
  const layout = fixtureLayout([{ name: "g", kind: "pulse", x: 10, row: 7, width: 2, height: 1,
    hp: 4, score: 1 }]);
  const mixed = fixtureDraft(layout);
  mixed.images.band.indices[0 * 256 + 20 * 4] = 3;      // cell (20, 0): one pf2 pixel in a pf3 cell
  mixed.images.band.indices[1 * 256 + 20 * 4] = 4;
  rejects(() => compileBossRegion(mixed), /cell \(20, 0\) mixes the pf2 and the pf3 bank/);
  const staged = fixtureDraft(layout);
  paintCell(staged.images.cracked, 10, 7, { seed: 7, bank: 3, solid: true });
  rejects(() => compileBossRegion(staged), /module g cell \(10, 7\).*different colour banks/);
});

test("covers are acyclic: a cycle, a self cover or an unknown name is refused", () => {
  const base = { kind: "pulse", row: 7, width: 2, height: 1, hp: 4, score: 1 };
  const cyclic = [{ ...base, name: "a", x: 10, cover: ["b"] }, { ...base, name: "b", x: 20, cover: ["c"] },
    { ...base, name: "c", x: 30, cover: ["a"] }];
  rejects(() => resolveBossCovers(cyclic), /covers are cyclic/);
  rejects(() => compileBossRegion(fixtureDraft(fixtureLayout(cyclic))), /covers are cyclic/);
  rejects(() => resolveBossCovers([{ ...base, name: "a", x: 10, cover: ["a"] }]), /covers itself/);
  rejects(() => resolveBossCovers([{ ...base, name: "a", x: 10, cover: ["z"] }]), /unknown module "z"/);
});

test("the other layout rules: overlap, 16 modules, emitter slots, a weapon, the open look's cover, nozzles", () => {
  const gun = (name, x, extra = {}) => ({ name, kind: "pulse", x, row: 7, width: 2, height: 1, hp: 4,
    score: 1, ...extra });
  rejects(() => compileBossRegion(fixtureDraft(fixtureLayout([gun("a", 10), gun("b", 11)]))),
    /module b overlaps module a at cell \(11, 7\)/);
  const seventeen = Array.from({ length: 17 }, (_, i) => gun(`g${i}`, 2 + i * 3));
  rejects(() => compileBossRegion(fixtureDraft(fixtureLayout(seventeen))), /17 modules; a boss has 1..16/);
  rejects(() => compileBossRegion(fixtureDraft(fixtureLayout([
    { name: "e", kind: "emitter", x: 10, row: 7, width: 2, height: 1, hp: 4, score: 1, slot: 1 },
    { name: "f", kind: "emitter", x: 20, row: 7, width: 2, height: 1, hp: 4, score: 1, slot: 1 }]))),
  /emitter slot 1 is authored twice/);
  rejects(() => compileBossRegion(fixtureDraft(fixtureLayout([gun("a", 10, { slot: 2 })]))),
    /only an emitter has a slot/);
  rejects(() => compileBossRegion(fixtureDraft(fixtureLayout([{ name: "p", kind: "armour", x: 10,
    row: 7, width: 2, height: 1, hp: 4, score: 1 }]))), /no weapon module/);
  rejects(() => compileBossRegion(fixtureDraft(fixtureLayout([gun("a", 10)]), { openModules: ["a"] })),
    /module a has an open look but no cover/);
  const nozzles = fixtureDraft(fixtureLayout([gun("a", 10)]));
  paintCell(nozzles.images.band, 2, 3, { seed: 5 });
  rejects(() => compileBossRegion(nozzles), /band cell \(2, 3\) is a left nozzle cell/);
  rejects(() => compileBossRegion({ ...fixtureDraft(fixtureLayout([gun("a", 10)])),
    layout: { ...fixtureLayout([gun("a", 10)]), formatVersion: 1 } }), /formatVersion 1 \(expected 2\)/);
});

// ---------------------------------------------------------------------------
// Cover masks (decisions A, F; §5.13.2 item 2)
// ---------------------------------------------------------------------------

test("cover masks from geometry: every nearer module whose columns overlap, front first", () => {
  const region = compileBossRegion(layeredDraft());
  const index = new Map(region.modules.map((module, i) => [module.name, i]));
  const mask = (...names) => names.reduce((value, name) => value | (1 << index.get(name)), 0);
  const cover = (name) => region.modules[index.get(name)].cover;
  assert.equal(cover("gun-a"), 0);
  assert.equal(cover("gun-b"), 0);
  assert.equal(cover("plate"), mask("gun-a"), "the plate sits behind gun-a's columns 10-11");
  assert.equal(cover("beam"), mask("gun-b"));
  assert.equal(cover("salvo"), mask("plate"), "a partial overlap (12-13) still covers");
  assert.equal(cover("core"), mask("salvo", "plate", "gun-b"), "every nearer overlapping module, not only the adjacent");
  // Front first: a module's index is never above a module nearer the player.
  region.modules.forEach((module, i) => region.modules.slice(i + 1).forEach((behind) =>
    assert.ok(module.row + module.height >= behind.row + behind.height)));
  // The record carries the mask.
  const record = BOSS_TABLE.modules + index.get("core") * BOSS_MODULE_BYTES;
  assert.equal(region.tables[record + BOSS_MODULE.coverLo] | (region.tables[record + BOSS_MODULE.coverHi] << 8),
    cover("core"));
  assert.equal(LAYERED_MODULES.length, 9);
});

// RE-POINTED (decision H): the core boss is the Bastion fixture now.
test("cover masks from an explicit group: the core boss's core behind all three guns (style 2)", () => {
  const index = new Map(bastion.modules.map((module, i) => [module.name, i]));
  const group = ["gun-left", "emitter", "gun-right"].reduce((value, name) => value | (1 << index.get(name)), 0);
  assert.equal(bastion.style, 2);
  assert.equal(bastion.modules[index.get("core")].cover, group);
  // Geometry alone would name only the emitter in front of it.
  const geometric = resolveBossCovers(bastion.modules.map((module) => ({ ...module, cover: "auto" })));
  assert.equal(geometric[index.get("core")], 1 << index.get("emitter"));
  for (const name of ["gun-left", "emitter", "gun-right", "plate-left", "plate-right"]) {
    assert.equal(bastion.modules[index.get(name)].cover, 0, `${name} is in front`);
  }
  // Region 1, the fortress (style 1), covers by geometry alone.
  assert.equal(region1.style, 1);
  const auto = resolveBossCovers(region1.modules.map((module) => ({ ...module, cover: "auto" })));
  region1.modules.forEach((module, i) => assert.equal(module.cover, auto[i], `${module.name}'s cover is geometric`));
});

// ---------------------------------------------------------------------------
// The staged block: damage stages by code offset (decision C, §5.13.2 item 4)
// ---------------------------------------------------------------------------

// RE-POINTED 2026-10-07 (M5b-S4b.4, owner decision 1): region 1's emitter
// stages its lens alone - its tower cells are plain glyphs, the same in every
// look until it is destroyed (decision L). Every other module cell, and the
// lens, is staged as before; every assertion below still runs on them.
test("every module cell is staged (a lens-only emitter: its lens): cracked = code + K and broken = code + 2K, read from the drafts", () => {
  const K = region1.stageStep;
  assert.ok(K > 0 && BOSS_FIRST_CODE + 3 * K <= region1.plainBase);
  const draft = loadBossRegionDraft(regionDirectory);
  const glyphOf = (code) => [...region1.glyphs.subarray((code & 0x7f) * 8, (code & 0x7f) * 8 + 8)];
  const cellBytes = (image, c, r) => Array.from({ length: 8 }, (_, line) => {
    let value = 0;
    for (let px = 0; px < 4; px += 1) {
      const index = image.indices[(r * 8 + line) * image.width + c * 4 + px];
      value = (value << 2) | [0, 1, 2, 3, 3][index];
    }
    return value;
  });
  region1.modules.forEach((module, index) => {
    for (let r = module.row; r < module.row + module.height; r += 1) {
      for (let c = module.x; c < module.x + module.width; c += 1) {
        const i = (r - module.row) * module.width + (c - module.x);
        const code = module.open ? region1.openLooks.get(index)[i] : region1.bandRows[r][c];
        const lens = r === module.row + module.height - 1 && c === module.x + (module.width >> 1);
        if (module.stages === "lens" && !lens) {
          assert.ok((code & 0x7f) >= region1.plainBase, `${module.name} (${c}, ${r}): a tower cell is plain`);
          for (const look of [draft.images.band, draft.images.cracked, draft.images.broken]) {
            assert.deepEqual(cellBytes(look, c, r), glyphOf(code), `${module.name} (${c}, ${r}) keeps its look`);
          }
          continue;
        }
        assert.ok((code & 0x7f) >= BOSS_FIRST_CODE && (code & 0x7f) < BOSS_FIRST_CODE + K,
          `${module.name} (${c}, ${r}) code ${code} is not in the staged block`);
        const intact = module.open ? draft.images.open : draft.images.band;
        assert.deepEqual(glyphOf(code), cellBytes(intact, c, r));
        assert.deepEqual(glyphOf(code + K), cellBytes(draft.images.cracked, c, r), "cracked");
        assert.deepEqual(glyphOf(code + 2 * K), cellBytes(draft.images.broken, c, r), "broken");
      }
    }
  });
  // The thresholds: cracked at 2/3, broken at 1/3 (Q-B3's hit points).
  assert.deepEqual(bossThresholds(24), [16, 8]);
  for (const module of region1.modules) {
    const record = BOSS_TABLE.modules + region1.modules.indexOf(module) * BOSS_MODULE_BYTES;
    assert.deepEqual([region1.tables[record + BOSS_MODULE.hpCracked], region1.tables[record + BOSS_MODULE.hpBroken]],
      bossThresholds(module.hp));
  }
});

// RE-POINTED (decisions H, J): the core boss's values are read from the
// Bastion fixture; the five bay glyphs gave way to decision L's cavity.
test("the core boss: Q-B3's hit points, an open core, capped plate and the cavity, the divider's codes left to the install", () => {
  const byName = new Map(bastion.modules.map((module) => [module.name, module]));
  assert.equal(byName.get("core").hp, 24);
  assert.equal(byName.get("gun-left").hp, 8);
  assert.equal(byName.get("emitter").hp, 10);
  assert.equal(byName.get("emitter").slot, 1, "decision 8: one emitter on levels 1-3");
  assert.equal(byName.get("plate-left").hp, 6);
  assert.equal(byName.get("core").open, true, "the S3 shutters open onto the core");
  assert.equal(bastion.capped.hp, 6);
  for (const region of [bastion, region1]) {
    assert.ok(region.codeCount <= BOSS_MAX_CODES);
    assert.equal(region.hole, undefined, "no rim glyphs (decision L)");
    assert.equal(region.tables[BOSS_TABLE.cavity], region.cavity);
    region.modules.forEach((module) => assert.ok(module.cavityRows >= 0 && module.cavityRows <= module.height));
    assert.ok([...region.runs.charset.data.subarray(0, BOSS_DIVIDER_CODES * 8)].every((b) => b === 0));
    // Every band column with hull is armour, open sky elsewhere. Re-pointed in
    // fix/boss-readability (decisions M and O, plan §5.16): "hull" is a cell no
    // module owns and that is not a girder's see-through cell.
    for (let c = 0; c < BOSS_BAND_COLUMNS; c += 1) {
      const owned = (r) => region.modules.some((m) => c >= m.x && c < m.x + m.width && r >= m.row && r < m.row + m.height);
      // RE-POINTED again (decision O): hullRows left the format; only the
      // named seeThrough cells (decision M's girders) are see-through.
      const seen = (r) => region.seeThrough.some(([sc, sr]) => sc === c && sr === r);
      const hull = region.bandRows.some((row, r) => row[c] !== 0 && !owned(r) && !seen(r));
      assert.equal((region.tables[BOSS_TABLE.armour + (c >> 3)] >> (c & 7)) & 1, hull ? 1 : 0, `column ${c}`);
      assert.equal(region.hullStop[c] !== null, hull, `column ${c}: the hull stop`);
    }
  }
  assert.ok(bastion.tables[BOSS_TABLE.open + bastion.modules.findIndex((m) => m.name === "core")] !== BOSS_NO_LOOK);
});

test("the runs: theme 2, band A 3, band B 3 with the 256-B tables, the charset sized to its contents (<= 8)", () => {
  const { theme, bandA, bandB, charset } = region1.runs;
  assert.deepEqual([theme.address, theme.sectors], [0x7990, 2]);
  assert.deepEqual([bandA.address, bandA.sectors], [0xa880, 3]);
  assert.deepEqual([bandB.address, bandB.sectors], [0xac80, 3]);
  assert.deepEqual(Buffer.from(bandB.data.subarray(128)), Buffer.from(region1.tables));
  assert.equal(charset.address, 0x0c00);
  assert.equal(charset.sectors, Math.ceil(region1.charsetBytes / 128));
  assert.ok(charset.sectors <= 8);
  // RE-POINTED 2026-10-07 (M5b-S4b.4, owner decision E4 (b)): the look tail
  // left the charset run for the start of slot D; the charset run is glyphs.
  assert.equal(region1.charsetBytes, region1.codeCount * 8);
  assert.equal(region1.lookTailAddress, 0x1900);
});

test("the preview renders the whole band in every stage and the extras, at the Atari palette and 2:1", () => {
  const { png, width, height } = renderBossPreview(region1);
  assert.equal(png.subarray(1, 4).toString("ascii"), "PNG");
  assert.equal(width, 64 * 4 * 4 + 16, "one ANTIC 4 pixel is four output pixels wide");
  assert.ok(height > 6 * 64 * 2, "six band panels of 8 rows x 8 lines x 2, and the extras");
  const script = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8")).scripts["boss:preview"];
  assert.equal(script, "node scripts/boss-preview.mjs");
});
