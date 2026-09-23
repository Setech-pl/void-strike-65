// Roadmap 4.6 step 1 (docs/plans/director-4.6.md §6): read an authored level
// as a table, without booting anything.
//
//   node scripts/level-preview.mjs 1
//
// It prints the level's timeline - world row, sector, kind/subtype, the waves
// that arm inside it, and the caps the runtime will actually honour after the
// subtype clamp - so the author sees what they wrote before they play it.

import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  ARCHETYPE_CLASS, LevelValidationError, compileLevelFile, levelSourcePath,
} from "./level-compiler.mjs";

const rootDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function pad(value, width, align = "left") {
  const text = String(value);
  return align === "right" ? text.padStart(width) : text.padEnd(width);
}

function renderTable(headers, rows, aligns) {
  const widths = headers.map((header, column) => Math.max(header.length,
    ...rows.map((row) => String(row[column]).length)));
  const line = (cells) => cells
    .map((cell, column) => pad(cell, widths[column], aligns[column]))
    .join("  ")
    .trimEnd();
  return [line(headers), line(widths.map((width) => "-".repeat(width))),
    ...rows.map(line)].join("\n");
}

function main() {
  const argument = process.argv[2] ?? "1";
  const file = /\.json$/.test(argument)
    ? path.resolve(argument)
    : levelSourcePath(Number.parseInt(argument, 10));
  let compiled;
  try {
    compiled = compileLevelFile(file);
  } catch (error) {
    if (!(error instanceof LevelValidationError)) throw error;
    console.error(error.message);
    process.exitCode = 1;
    return;
  }

  console.log(`${path.relative(rootDirectory, file)} - level ${compiled.level}, ` +
    `seed ${compiled.seed}, hull ${compiled.geometry.hullRows} rows ` +
    `(length step ${compiled.hull.length}, turret density ${compiled.hull.turrets}), ` +
    `drain at module ${compiled.geometry.drainModule}`);
  for (const warning of compiled.warnings) console.log(`  warning: ${warning}`);
  console.log("");

  const sectorRows = [];
  let worldRow = 0;
  for (const sector of compiled.sectors) {
    const kind = sector.subtypeName ? `${sector.kindName}/${sector.subtypeName}` : sector.kindName;
    sectorRows.push([
      sector.index + 1, kind,
      sector.lenModules === 0 ? "hull" : `${worldRow}..${worldRow + sector.rows - 1}`,
      sector.lenModules === 0 ? "-" : sector.rows,
      sector.archetypes.length === 0 ? "-" : sector.archetypes.join("+"),
      `${sector.effectiveLights}/${sector.lights}`,
      `${sector.effectiveHeavies}/${sector.heavies}`,
      [sector.debris ? `debris ${sector.debris}` : null, sector.pickups ? "pickups" : null,
        sector.broadside ? "broadside" : null].filter(Boolean).join(" ") || "-",
      sector.waveCount,
    ]);
    worldRow += sector.rows;
  }
  console.log(renderTable(
    ["#", "kind", "world rows", "rows", "archetypes", "light", "heavy", "hazards", "waves"],
    sectorRows, ["right", "left", "right", "right", "left", "right", "right", "left", "right"]));
  console.log("");

  const waveRows = compiled.waves.map((wave, index) => [
    index, wave.sector, wave.row, ARCHETYPE_CLASS[wave.archetype], wave.archetype,
    wave.escort ?? "-", wave.count, wave.spacing, wave.entry,
    [wave.mirror ? "mirror" : null, wave.onCleared ? "after-cleared" : null,
      wave.appearance ? `appearance ${wave.appearance}` : null].filter(Boolean).join(" ") || "-",
  ]);
  console.log(renderTable(
    ["wave", "sector", "row", "class", "archetype", "escort", "count", "spacing",
      "entry", "flags"],
    waveRows,
    ["right", "right", "right", "left", "left", "left", "right", "right", "right", "left"]));
  console.log("");
  console.log(`total authored space rows: ${compiled.sectors
    .reduce((sum, sector) => sum + sector.rows, 0)}`);
}

main();
