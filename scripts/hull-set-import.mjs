// Converts the reviewed hull-set draft into the capital-hulls v2 asset.
//
//   node scripts/hull-set-import.mjs [--check]
//
// Source of the art:      assets/graphics/hull-drafts/hull-set-v2.json
// Source of the scaffold: assets/graphics/capital-hulls.json (core glyphs,
//                         sector, turretTypes, broadside — read back from
//                         whichever format version is on disk, so the
//                         conversion is idempotent)
// Result:                 assets/graphics/capital-hulls.json, formatVersion 2
//
// The draft is the reviewed source and stays in Git; this script is the
// documented conversion step (AGENTS.md rule 12). Re-running it must reproduce
// the committed asset byte for byte — `--check` asserts exactly that.
//
// What the conversion decides, and why (docs/plans/hull-set-v1.md §3.2, §12,
// owner decisions of 2026-09-22):
//
//   * Every style's rows are rotated so its firing turret's muzzle lands on
//     segment row 9 — local row 1 of the fixed turret module, the convention
//     the allied hull already uses. One fixed set of module windows then
//     serves every style, so module sources, the sequence, the turret record
//     and the prow tables stay style-independent.
//   * A turret is placed only where its muzzle lands on the projection column.
//     Turret positions and profile come from the generator; the approved glyph
//     patterns stay binding. One standard profile is stamped at rows 8/9/10.
//   * One turret module per side, and no decorative turrets, so a style's
//     second drafted emplacement is not carried over. Cells a moved or dropped
//     emplacement vacates are filled from the nearest turret-free row of the
//     same style at the same column.
//
// Draft v2 (owner decision, 2026-09-22, after the step-1 hardware smoke): the
// hull is FULL MASS out to the screen edge and its texture is grooves and
// seams cut into that mass. v1 read as a thin ribbon floating in space because
// the deck interior was black and the frame line and rib stood detached.
// Consequences for this converter, all of them data:
//
//   * there is no blank `deck` glyph any more, so no glyph crosses the faction
//     line: the allied hull owns all seven of its codes 59-65 and every style
//     owns its own codes 70-76;
//   * `line` (59-65 slot) is replaced by `groove` and `seam`;
//   * R3 is the region `R3-heavy-plates`, and R4's mass glyph is `solid` like
//     every other style rather than its own `fill`.
//
// hull-set-v1.json stays in Git as the superseded draft and as the provenance
// of the v1 smoke; it is not a source this converter reads.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const rootDirectory = path.resolve(scriptDirectory, "..");
const draftPath = path.join(
  rootDirectory, "assets", "graphics", "hull-drafts", "hull-set-v2.json");
const DRAFT_FORMAT_VERSION = 2;
const assetPath = path.join(rootDirectory, "assets", "graphics", "capital-hulls.json");

const SEGMENT_ROWS = 32;
const MAP_COLUMNS = 9;
const TURRET_MUZZLE_ROW = 9;

// Slot -> compiled charset index. Nothing here may move: every hull code must
// stay inside 59..89 for the two runtime hull-code scans, and 70 is pinned by
// CAPITAL_HULL_ENEMY_PROW_FILL_CODE at a frozen ABI address.
const ALLIED_SLOTS = [
  ["allied_hull_mass", "solid"],
  ["allied_hull_wall", "wall"],
  ["allied_hull_accent", "wacc"],
  ["allied_hull_chamfer_in", "ch_in"],
  ["allied_hull_chamfer_out", "ch_out"],
  ["allied_hull_groove", "groove"],
  ["allied_hull_seam", "seam"],
];
const ENEMY_SLOTS = [
  "enemy_hull_mass",
  "enemy_hull_wall",
  "enemy_hull_accent",
  "enemy_hull_chamfer_in",
  "enemy_hull_chamfer_out",
  "enemy_hull_detail_a",
  "enemy_hull_detail_b",
];

// Draft glyph name per enemy slot, per style. `null` leaves the slot blank:
// the code stays byte-defined in the charset and no map cell references it.
const ENEMY_STYLES = [
  {
    id: "R1", draft: "R1-slab", levels: [1, 4], muzzleDraftRow: 19,
    slots: ["solid", "wall", "wacc", "ch_in", "ch_out", "groove", null],
  },
  {
    id: "R2", draft: "R2-rib-launchers", levels: [5, 8], muzzleDraftRow: 2,
    slots: ["solid", "wall", "wacc", "ch_in", "ch_out", "groove", "vent"],
  },
  {
    id: "R3", draft: "R3-heavy-plates", levels: [9, 12], muzzleDraftRow: 13,
    slots: ["solid", "wall", "wacc", "ch_in", "ch_out", "groove", null],
  },
  {
    id: "R4", draft: "R4-armour", levels: [13, 16], muzzleDraftRow: 13,
    slots: ["solid", "wall", "wacc", "ch_in", "ch_out", "groove", "seam"],
  },
];

const CORE_GROUPS = {
  alliedTurret: [
    "allied_turret_base", "allied_turret_housing",
    "allied_turret_barrel", "allied_turret_muzzle",
  ],
  enemyTurret: [
    "enemy_turret_base", "enemy_turret_housing",
    "enemy_turret_barrel", "enemy_turret_muzzle",
  ],
  effects: [
    "allied_launch_flash", "enemy_launch_flash",
    "allied_engine_energy", "enemy_engine_energy",
    "allied_prow_edge", "enemy_prow_edge",
    "capital_explosion_core", "capital_explosion_fire", "capital_explosion_ember",
  ],
};

// The fixed module windows of docs/plans/hull-set-v1.md §3.2. combat_1 is the
// only module that may contain a muzzle row; every other pick avoids rows
// 8..10 so no emplacement leaks into the aft, prow or engine bank, and no
// module is silently replaced by the disabled substitute.
const MODULE_SOURCE_ROWS = {
  combat_0: [0, 1, 2, 3, 4, 5, 6, 7],
  combat_1: [8, 9, 10, 11, 12, 13, 14, 15],
  combat_2: [16, 17, 18, 19, 20, 21, 22, 23],
  combat_3: [24, 25, 26, 27, 28, 29, 30, 31],
  prow_0: [12, 12, 15, 14, 13, 15, 14, 13],
  prow_1: [17, 17, 17, 16, 16, 11, 11, 12],
  prow_2: [18, 17, 16, 20, 19, 18, 17, 16],
  prow_3: [25, 24, 23, 22, 21, 11, 6, 5],
  aft_0: [24, 25, 26, 21, 22, 23, 24, 25],
  aft_1: [16, 17, 18, 19, 20, 16, 17, 18],
  aft_2: [11, 12, 13, 14, 15, 27, 28, 29],
  // Every row here carries depth >= 7 in all five hull sets, so the overlay
  // never lights an empty cell (scripts/capital-hulls.mjs "engine energy
  // cannot create collision in an empty hull cell").
  engine_bank: [6, 7, 12, 13, 23, 24, 25, 6],
};

// Allied engine overlay, unchanged from v1. Base columns only reach 6, so
// depth 7 is enough. The enemy bank is its mirror (base column 7 - column).
const ALLIED_ENGINE_COLUMNS = [
  [1, 5], [1, 2, 5, 6], [1, 2, 5, 6], [1, 2, 5, 6],
  [1, 2, 5, 6], [1, 2, 5, 6], [2, 5], [],
];

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

function splitRow(row) {
  const cells = row.trim().split(/\s+/);
  invariant(cells.length === MAP_COLUMNS, `map row must hold ${MAP_COLUMNS} cells: ${row}`);
  return cells;
}

const isTurretCell = (cell) => cell.startsWith("T:");

/**
 * Rotate a 32-row draft map so that `muzzleDraftRow` becomes row 9, then place
 * the one turret this hull set is allowed (owner decisions 3-5, 2026-09-22):
 * every turret cell is first dissolved into the nearest turret-free row of the
 * same style at the same column, and the standard profile is stamped at rows
 * 8/9/10. The stamp is a no-op wherever the draft already drew that profile.
 */
function placeTurret(draftRows, muzzleDraftRow) {
  const shift = TURRET_MUZZLE_ROW - muzzleDraftRow;
  const rotated = Array.from({ length: SEGMENT_ROWS }, (unused, row) =>
    draftRows[((row - shift) % SEGMENT_ROWS + SEGMENT_ROWS) % SEGMENT_ROWS]);
  const turretFree = rotated.map((row) => !row.some(isTurretCell));
  invariant(turretFree.some(Boolean), "a style must leave at least one turret-free row");
  const nearestClean = (column, row) => {
    for (let distance = 1; distance <= SEGMENT_ROWS; distance += 1) {
      const above = (row - distance + SEGMENT_ROWS) % SEGMENT_ROWS;
      if (turretFree[above]) return rotated[above][column];
      const below = (row + distance) % SEGMENT_ROWS;
      if (turretFree[below]) return rotated[below][column];
    }
    throw new Error("unreachable: every row carries a turret cell");
  };
  const rows = rotated.map((row, rowIndex) =>
    row.map((cell, column) => isTurretCell(cell) ? nearestClean(column, rowIndex) : cell));

  for (const ringRow of [TURRET_MUZZLE_ROW - 1, TURRET_MUZZLE_ROW + 1]) {
    rows[ringRow][4] = "T:turret_base";
    rows[ringRow][5] = "T:turret_base";
    rows[ringRow][6] = "T:turret_base";
    rows[ringRow][7] = "wall";
    rows[ringRow][8] = "space";
  }
  rows[TURRET_MUZZLE_ROW][4] = "T:turret_base";
  rows[TURRET_MUZZLE_ROW][5] = "T:turret_housing";
  rows[TURRET_MUZZLE_ROW][6] = "T:turret_barrel";
  rows[TURRET_MUZZLE_ROW][7] = "T:turret_barrel";
  rows[TURRET_MUZZLE_ROW][8] = "T:turret_muzzle";
  return rows;
}

function resolveCells(rows, glyphNames, turretPrefix) {
  return rows.map((row, rowIndex) => row.map((cell, column) => {
    if (cell === "space") return "space";
    if (isTurretCell(cell)) return `${turretPrefix}_${cell.slice("T:turret_".length)}`;
    const resolved = glyphNames.get(cell);
    invariant(resolved, `row ${rowIndex} column ${column} uses undeclared glyph ${cell}`);
    return resolved;
  }).join(" "));
}

function readScaffold() {
  const asset = JSON.parse(fs.readFileSync(assetPath, "utf8"));
  const byName = new Map();
  const collect = (glyphs) => {
    for (const glyph of glyphs ?? []) byName.set(glyph.name, glyph);
  };
  collect(asset.glyphs);
  for (const group of Object.values(asset.core ?? {})) collect(group);
  const core = Object.fromEntries(Object.entries(CORE_GROUPS).map(([group, names]) =>
    [group, names.map((name) => {
      const glyph = byName.get(name);
      invariant(glyph, `scaffold is missing the core glyph ${name}`);
      const { index, ...rest } = glyph;
      return rest;
    })]));
  return { asset, core };
}

function buildSector(scaffoldSector) {
  const modules = (side) => Object.fromEntries(
    Object.entries(MODULE_SOURCE_ROWS).map(([name, sourceRows]) => {
      if (name !== "engine_bank") return [name, { sourceRows: [...sourceRows] }];
      const columnsByRow = ALLIED_ENGINE_COLUMNS.map((columns) => side === "allied"
        ? [...columns]
        // Enemy base column b sits at map column b + 1, and the enemy map is
        // the mirror of the allied one, so base b mirrors allied base 7 - b.
        : columns.map((column) => 8 - column).sort((left, right) => left - right));
      return [name, {
        sourceRows: [...sourceRows],
        engineOverlay: { glyph: `${side}_engine_energy`, columnsByRow },
      }];
    }));
  return {
    ...scaffoldSector,
    modules: { allied: modules("allied"), enemy: modules("enemy") },
    prowProfiles: {
      allied: {
        ...scaffoldSector.prowProfiles.allied,
        edgeGlyph: "allied_prow_edge",
        fillGlyph: "allied_hull_mass",
      },
      enemy: {
        ...scaffoldSector.prowProfiles.enemy,
        edgeGlyph: "enemy_prow_edge",
        fillGlyph: "enemy_hull_mass",
      },
    },
  };
}

export function convertHullSet() {
  const draft = JSON.parse(fs.readFileSync(draftPath, "utf8"));
  invariant(draft.formatVersion === DRAFT_FORMAT_VERSION,
    `the hull draft must be formatVersion ${DRAFT_FORMAT_VERSION}`);
  const { asset: scaffold, core } = readScaffold();

  const alliedGlyphs = ALLIED_SLOTS.map(([name, draftName]) => {
    const pixels = draft.allied.glyphs[draftName];
    invariant(pixels, `the draft's allied hull is missing ${draftName}`);
    return { name, faction: "allied", screenBank: "pf2", tags: ["surface"], pixels };
  });
  const alliedNames = new Map(
    ALLIED_SLOTS.map(([name, draftName]) => [draftName, name]));
  const alliedRows = placeTurret(draft.allied.map.map(splitRow), TURRET_MUZZLE_ROW);

  const enemyStyles = ENEMY_STYLES.map((style) => {
    const region = draft.enemyRegions[style.draft];
    invariant(region, `the draft is missing enemy region ${style.draft}`);
    const glyphs = ENEMY_SLOTS.map((name, slot) => {
      const draftName = style.slots[slot];
      const pixels = draftName
        ? region.glyphs[draftName]
        : Array.from({ length: 8 }, () => "0000");
      invariant(pixels, `${style.id} is missing ${draftName}`);
      return { name, faction: "enemy", screenBank: "pf3", tags: ["surface"], pixels };
    });
    const names = new Map(ENEMY_SLOTS.map((name, slot) => [style.slots[slot], name])
      .filter(([draftName]) => draftName));
    const rows = placeTurret(region.map.map(splitRow), style.muzzleDraftRow);
    return {
      id: style.id,
      levels: style.levels,
      draftRegion: style.draft,
      mirror: true,
      glyphs,
      map: resolveCells(rows, names, "enemy_turret"),
    };
  });

  return {
    formatVersion: 2,
    displayMode: scaffold.displayMode,
    description: "Capital hull set v2 (FULL MASS): one allied hull and four enemy styles " +
      "by region. Generated from assets/graphics/hull-drafts/hull-set-v2.json by " +
      "scripts/hull-set-import.mjs; do not hand-edit the art.",
    charsetBaseIndex: scaffold.charsetBaseIndex,
    segmentRows: scaffold.segmentRows,
    previewStartPhase: scaffold.previewStartPhase,
    paletteRoles: scaffold.paletteRoles,
    core,
    allied: { glyphs: alliedGlyphs, map: resolveCells(alliedRows, alliedNames, "allied_turret") },
    enemyStyles,
    turret: {
      segmentRow: TURRET_MUZZLE_ROW,
      muzzleScanlineOffset: 4,
      type: { allied: "allied_heavy_line", enemy: "enemy_void_lance" },
      footprint: {
        base: [[8, 4], [8, 5], [8, 6], [9, 4], [10, 4], [10, 5], [10, 6]],
        housing: [[9, 5]],
        barrel: [[9, 6], [9, 7]],
      },
    },
    sector: buildSector(scaffold.sector),
    turretTypes: scaffold.turretTypes,
    broadside: scaffold.broadside,
  };
}

function main() {
  const check = process.argv.includes("--check");
  const text = `${JSON.stringify(convertHullSet(), null, 2)}\n`;
  if (check) {
    const current = fs.readFileSync(assetPath, "utf8");
    if (current !== text) {
      process.stderr.write(
        "assets/graphics/capital-hulls.json does not match the draft conversion\n");
      process.exitCode = 1;
      return;
    }
    process.stdout.write("capital-hulls.json matches the draft conversion\n");
    return;
  }
  fs.writeFileSync(assetPath, text);
  process.stdout.write(`wrote ${path.relative(rootDirectory, assetPath)}\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
