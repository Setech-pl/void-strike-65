// Dead time per sector — a probe over the committed wall-trace CSVs.
//
// "Dead time" is every fighter frame (CAPITAL_SECTOR_STATE = OPEN, before the
// boss) with NO enemy live: no Heavy member (enemy_live_count = 0) and no Light
// slot occupied (light_state0-3 = 0). The probe splits it by where it falls in
// a Director sector:
//
//   lead-in     from the sector's first frame to its first spawn (an authored
//               wave row above 0, the Heavy admission retry, a Light wave's
//               first admission);
//   intra-wave  an empty gap between two members of the SAME wave (the Heavy
//               retry cadence 48/36/24 frames, a Light wave's spacing);
//   inter-wave  an empty gap whose next spawn belongs to the NEXT wave (a Light
//               wave holds the cursor until its last member is gone; a Heavy
//               wave's last formation must be gone before the next wave's
//               first is admitted; then the next wave's row and the retry);
//   tail        from the sector's last enemy leaving to the sector's end (the
//               row-count end, the W2 drain reserves).
//
// The capital sector's drain wait (Director sector of kind CAPITAL while the
// hull state is still OPEN) and the boss sector's wait before the entry are
// reported on their own rows: they are holds, not sector dead time.
//
// Waves are assigned to spawns by order: the Director arms one wave at a
// time, in authored order, so the k-th non-escort spawn of a sector belongs to
// the wave whose cumulative count reaches k. A Light admitted on the same frame
// as a Heavy formation (or the frame after) is that formation's escort and is
// not a wave member of its own.
//
//   node scripts/measure-dead-time.mjs                 # the director-complete-* replays
//   node scripts/measure-dead-time.mjs --all           # every full-schema CSV
//   node scripts/measure-dead-time.mjs --gaps          # list every gap
//   node scripts/measure-dead-time.mjs --level=assets/levels/level-01.json
//   node scripts/measure-dead-time.mjs build/runtime-wall-trace/director-complete-1-natural-sweep-fire0.csv
//
// Reads only; writes nothing; touches no build output.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const rootDirectory = path.resolve(scriptDirectory, "..");
const NUMERIC = /^-?\d+(\.\d+)?$/;
const FIGHTER_OPEN = 7;
const LIGHT_SLOTS = 4;
const HEAVY_NAMES = new Set(["raider", "bomber"]);

function argument(name, fallback = null) {
  const prefix = `--${name}=`;
  const found = process.argv.find((value) => value.startsWith(prefix));
  return found === undefined ? fallback : found.slice(prefix.length);
}
const flag = (name) => process.argv.includes(`--${name}`);

function parseCsv(file) {
  const text = fs.readFileSync(file, "utf8").trim();
  const lines = text.split(/\r?\n/);
  const headers = lines[0].split(",");
  for (const needed of ["director_sector", "sector_row", "enemy_live_count", "light_state0",
    "sector_state", "boss_state", "difficulty", "frame"]) {
    if (!headers.includes(needed)) return null;
  }
  return lines.slice(1).filter(Boolean).map((line) => {
    const values = line.split(",");
    const row = {};
    for (let index = 0; index < headers.length; index += 1) {
      const value = values[index];
      row[headers[index]] = NUMERIC.test(value) ? Number(value) : value;
    }
    return row;
  });
}

function loadLevel(file) {
  const source = JSON.parse(fs.readFileSync(file, "utf8"));
  return source.sectors.map((sector) => ({
    kind: sector.kind,
    rows: sector.rows ?? null,
    waves: (sector.waves ?? []).map((wave, index) => {
      const lead = wave.archetype ?? wave.members[0];
      return { index, count: wave.count, heavy: HEAVY_NAMES.has(lead), name: wave.archetype ?? wave.members.join("+"), row: wave.row };
    }),
  }));
}

function waveOfSpawn(level, sector, ordinal) {
  const def = level?.[sector];
  if (!def) return null;
  let total = 0;
  for (const wave of def.waves) {
    total += wave.count;
    if (ordinal < total) return wave;
  }
  return null;
}

function analyse(rows, level) {
  const difficulty = rows[0].difficulty;
  const sectors = new Map();
  const sectorOf = (index) => {
    if (!sectors.has(index)) {
      sectors.set(index, { frames: 0, dead: 0, spawns: 0, lead: 0, intra: 0, intraGaps: 0,
        inter: 0, interGaps: 0, tail: 0, holdFrames: 0, holdLive: 0, gaps: [], firstFrame: null, lastFrame: null, firstRow: null, lastRow: null });
    }
    return sectors.get(index);
  };
  let current = null;        // the sector index being walked
  let emptySince = null;     // first fighter frame of the current empty run
  let spawnOrdinal = 0;      // non-escort spawns in the current sector
  let lastSpawnWave = null;
  let seenSpawn = false;
  let lastHeavySpawnFrame = -10;
  let priorHeavy = 0;
  const priorLight = new Array(LIGHT_SLOTS).fill(0);
  let bossEntered = false;

  const closeRun = (sector, endFrame, category, next) => {
    if (emptySince === null) return;
    const length = endFrame - emptySince;
    if (length <= 0) { emptySince = null; return; }
    const entry = sectorOf(sector);
    entry.dead += length;
    entry[category] += length;
    if (category === "intra") entry.intraGaps += 1;
    if (category === "inter") entry.interGaps += 1;
    entry.gaps.push({ from: emptySince, frames: length, category, next });
    emptySince = null;
  };

  for (const row of rows) {
    if (row.boss_state !== 0 || row.boss_entry) bossEntered = true;
    if (bossEntered) break;
    const sector = row.director_sector;
    const kind = level?.[sector]?.kind ?? null;
    const heavy = row.enemy_live_count || 0;
    const lights = [row.light_state0, row.light_state1, row.light_state2, row.light_state3];
    const liveLights = lights.filter((state) => state !== 0).length;
    const fighter = row.sector_state === FIGHTER_OPEN;

    if (sector !== current) {
      // The previous sector ends: an open empty run is its tail.
      if (current !== null) closeRun(current, row.frame, "tail", null);
      current = sector;
      spawnOrdinal = 0;
      seenSpawn = false;
      lastSpawnWave = null;
      emptySince = null;
      const entry = sectorOf(sector);
      entry.firstFrame = row.frame;
      entry.firstRow = row.sector_row;
    }
    const entry = sectorOf(sector);
    entry.lastFrame = row.frame;
    entry.lastRow = row.sector_row;

    if (!fighter) {
      // The capital traversal or a transition: not dead time, not a hold.
      closeRun(sector, row.frame, seenSpawn ? "tail" : "lead", null);
      priorHeavy = heavy;
      for (let slot = 0; slot < LIGHT_SLOTS; slot += 1) priorLight[slot] = lights[slot];
      continue;
    }
    if (kind === "capital" || kind === "boss") {
      // The drain wait before the hull or the boss: a hold.
      entry.holdFrames += 1;
      if (heavy + liveLights > 0) entry.holdLive += 1;
      priorHeavy = heavy;
      for (let slot = 0; slot < LIGHT_SLOTS; slot += 1) priorLight[slot] = lights[slot];
      continue;
    }
    entry.frames += 1;

    // Spawn detection.
    const heavySpawn = priorHeavy === 0 && heavy > 0;
    let lightSpawn = false;
    for (let slot = 0; slot < LIGHT_SLOTS; slot += 1) {
      if (priorLight[slot] === 0 && lights[slot] !== 0) lightSpawn = true;
    }
    if (heavySpawn) lastHeavySpawnFrame = row.frame;
    const escortLight = lightSpawn && !heavySpawn && row.frame - lastHeavySpawnFrame <= 1;
    const waveSpawn = heavySpawn || (lightSpawn && !escortLight);
    if (waveSpawn) {
      const wave = waveOfSpawn(level, sector, spawnOrdinal);
      const sameWave = lastSpawnWave !== null && wave !== null && wave.index === lastSpawnWave.index;
      const category = !seenSpawn ? "lead" : (sameWave ? "intra" : "inter");
      closeRun(sector, row.frame, category, wave ? `${wave.name} (wave ${wave.index + 1})` : null);
      entry.spawns += 1;
      spawnOrdinal += 1;
      seenSpawn = true;
      lastSpawnWave = wave;
    }
    if (heavy + liveLights === 0) {
      if (emptySince === null) emptySince = row.frame;
    } else {
      emptySince = null;
    }
    priorHeavy = heavy;
    for (let slot = 0; slot < LIGHT_SLOTS; slot += 1) priorLight[slot] = lights[slot];
  }
  if (current !== null) closeRun(current, rows.at(-1).frame + 1, seenSpawn ? "tail" : "lead", "end of trace");
  return { difficulty, sectors };
}

function report(name, result, level, showGaps) {
  const diffName = ["EASY", "MEDIUM", "HARD"][result.difficulty] ?? String(result.difficulty);
  console.log(`\n${name} (${diffName})`);
  console.log("sector kind      frames  dead  dead%  lead-in  intra(n)   inter(n)   tail   hold(live)  rows");
  let total = 0; let dead = 0;
  for (const [index, entry] of [...result.sectors.entries()].sort((a, b) => a[0] - b[0])) {
    const kind = level?.[index]?.kind ?? "?";
    const sub = kind === "space" ? (level?.[index]?.waves?.length ? "" : "") : "";
    const pct = entry.frames ? (100 * entry.dead / entry.frames).toFixed(0) : "-";
    total += entry.frames; dead += entry.dead;
    console.log(`${String(index).padStart(6)} ${(kind + sub).padEnd(9)}${String(entry.frames).padStart(7)}${String(entry.dead).padStart(6)}${String(pct).padStart(6)}%${String(entry.lead).padStart(8)}${String(entry.intra).padStart(8)}(${entry.intraGaps})${String(entry.inter).padStart(8)}(${entry.interGaps})${String(entry.tail).padStart(7)}${String(entry.holdFrames).padStart(8)}(${entry.holdLive})  ${entry.firstRow ?? ""}-${entry.lastRow ?? ""}`);
    if (showGaps) {
      for (const gap of entry.gaps) {
        console.log(`         gap f${gap.from} +${gap.frames} ${gap.category}${gap.next ? " -> " + gap.next : ""}`);
      }
    }
  }
  console.log(`   space sectors: ${total} frames, ${dead} dead (${total ? (100 * dead / total).toFixed(0) : "-"} %)`);
}

function main() {
  const directory = path.join(rootDirectory, "build", "runtime-wall-trace");
  const levelFile = argument("level", path.join(rootDirectory, "assets", "levels", "level-01.json"));
  const level = fs.existsSync(levelFile) ? loadLevel(levelFile) : null;
  const explicit = process.argv.slice(2).filter((value) => !value.startsWith("--"));
  let files = explicit;
  if (files.length === 0) {
    files = fs.readdirSync(directory).filter((name) => name.endsWith(".csv") &&
      (flag("all") || name.startsWith("director-complete-"))).sort()
      .map((name) => path.join(directory, name));
  }
  for (const file of files) {
    const rows = parseCsv(file);
    if (!rows || rows.length === 0) continue;
    const result = analyse(rows, level);
    report(path.basename(file, ".csv"), result, level, flag("gaps"));
  }
}

main();
