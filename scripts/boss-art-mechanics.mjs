// feat/boss-art (docs/plans/boss-art.md §6): the art pass changes pictures and
// colours only. This compares a region's compiled draft against a reference
// draft (main's) on everything the fight reads besides the glyphs' pixels and
// their code numbers: the module records, each column's hull stop, the armour
// columns, the see-through cells, the shown rows, which modules have an open
// look, and which band cells hold a cell in every look (drawn / blank), and the
// region's motion, fire and escort tables.
//
//   node scripts/boss-art-mechanics.mjs --reference=build/boss-art/main [--region=N]
import path from "node:path";
import { fileURLToPath } from "node:url";

import { BOSS_TABLE, bossRegionDirectory, compileBossRegion, loadBossRegionDraft } from "./boss-assets.mjs";
import { looks } from "./boss-art-preview.mjs";

const rootDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// The tables bytes that are mechanics (not palette, not code numbers).
const MECHANIC_TABLES = ["finaleCooldown", "framesPerStep", "travel", "start", "shakeFrames", "shakeAmplitude",
  "chainBlasts", "chainFrames", "moduleCount", "escortAfter", "escortBase", "escortJitter", "cappedHp",
  "fireCooldown", "nozzleFrames", "laserBeam"];

export function mechanicsOf(region) {
  const occupancy = Object.fromEntries(Object.entries(looks(region))
    .filter(([, rows]) => Array.isArray(rows))
    .map(([name, rows]) => [name, rows.map((row) => row.map((code) => ((code & 0x7f) === 0 ? "." : "#")).join(""))]));
  const tables = Object.fromEntries(MECHANIC_TABLES.map((name) => [name, region.tables[BOSS_TABLE[name]]]));
  const armour = [...region.tables.subarray(BOSS_TABLE.armour, BOSS_TABLE.armour + 8)];
  const modules = [...Array(region.tables[BOSS_TABLE.moduleCount]).keys()].map((i) => {
    const record = [...region.tables.subarray(BOSS_TABLE.modules + 12 * i, BOSS_TABLE.modules + 12 * (i + 1))];
    return record;
  });
  return {
    modules, tables, armour,
    hullStop: region.hullStop,
    seeThrough: region.seeThrough,
    shownRows: region.bandShownRows,
    open: region.modules.filter((m) => m.open).map((m) => m.name),
    rails: region.rails, hangar: region.hangar, gravity: region.gravity,
    field: region.field === null ? null : { ...region.field, code: undefined, phases: undefined },
    occupancy,
  };
}

export function compareMechanics(reference, candidate) {
  const a = mechanicsOf(reference);
  const b = mechanicsOf(candidate);
  const differences = [];
  for (const key of Object.keys(a)) {
    if (JSON.stringify(a[key]) !== JSON.stringify(b[key])) differences.push(key);
  }
  return { differences, reference: a, candidate: b };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const reference = process.argv.find((arg) => arg.startsWith("--reference="))?.slice(12);
  if (reference === undefined) throw new Error("--reference=<dir with region-N folders>");
  const only = process.argv.find((arg) => arg.startsWith("--region="));
  const regions = only ? [Number(only.slice(9))] : [1, 2, 3, 4];
  let failed = 0;
  for (const n of regions) {
    const ref = compileBossRegion(loadBossRegionDraft(path.resolve(reference, `region-${n}`)));
    const now = compileBossRegion(loadBossRegionDraft(bossRegionDirectory(rootDirectory, n)));
    const { differences, reference: a, candidate: b } = compareMechanics(ref, now);
    console.log(`R${n} ${now.name}: ${differences.length === 0 ? "identical" : `DIFFERS in ${differences.join(", ")}`}`);
    for (const key of differences) {
      if (key === "occupancy") {
        for (const look of Object.keys(a.occupancy)) {
          a.occupancy[look].forEach((line, r) => {
            if (line !== b.occupancy[look][r]) console.log(`  ${look} row ${r}\n    ref ${line}\n    new ${b.occupancy[look][r]}`);
          });
        }
      } else {
        console.log(`  ${key}\n    ref ${JSON.stringify(a[key])}\n    new ${JSON.stringify(b[key])}`);
      }
    }
    if (differences.length > 0) failed += 1;
  }
  if (failed > 0) process.exitCode = 1;
}
