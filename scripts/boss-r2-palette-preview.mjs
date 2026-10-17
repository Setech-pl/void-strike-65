// REVIEW ONLY. Not part of the build or the test suite.
// feat/boss-order-scale (the owner's look at the Bastion's L, 2026-10-17: the
// one-row rail-gun wreck and the palette variants V (violet) and O (orange +
// red)): the Bastion as the RUNNING GAME draws it - each build's boss entry
// in the 6502 harness (tests/boss-harness.mjs; the build's own disk, its own
// slot F block), modules destroyed through the game's own shot path, the band's
// cells read back from memory and drawn with that build's row palettes at
// Atari800's PAL palette, 2:1 pixels, the screen's 40 columns (12-51 at the
// still position):
//
//   build/boss-r2-palette/states.png   (not committed)
//     one column per build (left to right as given), one row per state:
//       1 intact
//       2 one bay open (the left rail's front gun destroyed: the cannon amber)
//       3 a covered cannon behind the L (the left rail's second gun destroyed
//         with its cannon standing)
//       4 destroyed rail guns (both rails' front guns and the right rail's
//         second: the wrecks on the rails)
//       5 the doors down, the core exposed
//       6 a hit-flash frame (state 5's core and the left rail's last gun hit,
//         the b3 flash on)
//
//   node scripts/boss-r2-palette-preview.mjs --level=10 BUILD:DRAFT [BUILD:DRAFT ...]
//     [--reuse] (the last capture) [--first=C --count=N --scale=K --name=FILE] (a zoom)
//     BUILD a full build's directory under build/ ("default": build/ itself;
//     a review variant: boss-variant-NAME), DRAFT the Bastion's draft
//     directory that build was made from
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { BOSS_BAND_A_ADDRESS, compileBossRegion, loadBossRegionDraft } from "./boss-assets.mjs";
import { bandRegisters, toPng } from "./boss-art-preview.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const level = Number(process.argv.find((a) => a.startsWith("--level="))?.slice(8) ?? 10);
const argument = (name) => process.argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);

// The child: one build's states, the band's shown rows of codes each.
if (process.argv.includes("--capture")) {
  const { call, label, manifest, nmi, bandDliSwitches, runBossEntry, shootAt } = await import("../tests/boss-harness.mjs");
  const region = compileBossRegion(loadBossRegionDraft(path.resolve(root, argument("draft"))));
  const lbl = (name) => label("boss", name);
  const main = (name) => label("main", name);
  const index = (name) => region.modules.findIndex((m) => m.name === name);
  const entry = runBossEntry({ prepare: (memory) => { memory[0xa603] = level; } });
  if (entry.end !== "main_loop") throw new Error(`the boss entry ended at ${entry.end}`);
  // The boss's pulse fire held (its shots would cross the band's cells); the
  // lasers run as they do.
  const frame = (m) => {
    m[lbl("_boss_countdown")] = 200;
    m[main("PLAYER_LIFECYCLE")] = 0;
    m[main("PLAYER_LIFECYCLE") + 1] = 3;
    m[main("BROAD_DAMAGE_COOLDOWN")] = 25;
    m[main("loader_dli_phase")] = 0;
    nmi(m, lbl("boss_dli"));
    bandDliSwitches(m);
    call(m, lbl("boss_update"));
    call(m, manifest.overlays.capitalVectors.address + 8 * 3);
    call(m, lbl("boss_motion"));
    nmi(m, lbl("boss_dli"));
    nmi(m, lbl("boss_dli"));
  };
  const run = (m, n) => { for (let f = 0; f < n; f += 1) frame(m); };
  const columnsOf = (m, name) => {
    const r = lbl("_boss_module_table") + 12 * index(name);
    return [...Array(m[r + 2]).keys()].map((k) => m[r] + k);
  };
  // (a shot may be absorbed by the module's own running beam: shoot again on
  // later frames, at each of its columns)
  const destroy = (m, name) => {
    const cols = columnsOf(m, name);
    for (let attempt = 0; attempt < 40 && m[lbl("_boss_hp") + index(name)] !== 0; attempt += 1) {
      m[lbl("_boss_hp") + index(name)] = 1;
      shootAt(m, cols[attempt % cols.length], 0);
      run(m, attempt < cols.length ? 1 : 8);
    }
    if (m[lbl("_boss_hp") + index(name)] !== 0) throw new Error(`${name} did not fall`);
    run(m, 120);
  };
  const rows = (m) => Array.from({ length: region.bandShownRows }, (_, r) =>
    [...m.subarray(BOSS_BAND_A_ADDRESS + r * 64, BOSS_BAND_A_ADDRESS + r * 64 + 64)]);
  const m = Uint8Array.from(entry.memory);
  run(m, 8);
  const states = [rows(m)];
  const open = Uint8Array.from(m);
  destroy(open, "rail-l-1");
  states.push(rows(open));
  const covered = Uint8Array.from(open);
  destroy(covered, "rail-l-2");
  states.push(rows(covered));
  const wrecks = Uint8Array.from(m);
  for (const name of ["rail-l-1", "rail-r-1", "rail-r-2"]) destroy(wrecks, name);
  states.push(rows(wrecks));
  const core = Uint8Array.from(m);
  for (const name of ["rail-l-1", "cannon-l", "rail-l-2", "rail-l-3", "rail-r-1", "cannon-r", "rail-r-2", "rail-r-3",
    "doors"]) destroy(core, name);
  states.push(rows(core));
  // The hit flash: one shot into the core (not its last hit point), captured
  // while its b3 flash is on.
  const flash = Uint8Array.from(core);
  shootAt(flash, columnsOf(flash, "core")[1], 0);
  let flashed = false;
  for (let f = 0; f < 6 && !flashed; f += 1) {
    frame(flash);
    flashed = flash[lbl("boss_mflash_timer")] !== 0;
  }
  if (!flashed) throw new Error("no hit flash on the core");
  states.push(rows(flash));
  fs.writeFileSync(argument("out"), JSON.stringify(states));
  process.exit(0);
}

const pairs = process.argv.slice(2).filter((a) => !a.startsWith("--")).map((a) => a.split(":"));
if (pairs.length === 0) throw new Error("pass BUILD:DRAFT pairs");

const FIRST = Number(argument("first") ?? 12), COUNT = Number(argument("count") ?? 40);
const SCALE = Number(argument("scale") ?? 1);
const columns = [];
for (const [build, draft] of pairs) {
  // The harness reads its build from the environment at import: one process a build.
  const { execFileSync } = await import("node:child_process");
  const out = path.join(root, "build", "boss-r2-palette", `${build}.json`);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  if (!process.argv.includes("--reuse")) execFileSync(process.execPath, [fileURLToPath(import.meta.url), "--capture", `--level=${level}`, `--out=${out}`,
    `--draft=${draft}`],
    { env: build === "default" ? process.env : { ...process.env, VS65_HARNESS_BUILD: build }, stdio: "inherit" });
  const states = JSON.parse(fs.readFileSync(out, "utf8"));
  const region = compileBossRegion(loadBossRegionDraft(path.resolve(root, draft)));
  columns.push(states.map((rows) => bandRegisters(region, rows, true, FIRST, COUNT)));
}

const GAP = 8, SX = 4 * SCALE, SY = 2 * SCALE;
const pw = columns[0][0].width, ph = columns[0][0].height;
const width = columns.length * (pw * SX + GAP) + GAP;
const height = columns[0].length * (ph * SY + GAP) + GAP;
const image = new Uint8Array(width * height).fill(0x02);
columns.forEach((states, ci) => states.forEach((p, ri) => {
  for (let y = 0; y < ph * SY; y += 1) for (let x = 0; x < pw * SX; x += 1) {
    image[(GAP + ri * (ph * SY + GAP) + y) * width + GAP + ci * (pw * SX + GAP) + x] =
      p.registers[Math.floor(y / SY) * pw + Math.floor(x / SX)];
  }
}));
const file = path.join(root, "build", "boss-r2-palette", argument("name") ?? "states.png");
fs.writeFileSync(file, toPng({ registers: image, width, height }));
console.log(`${path.relative(root, file)} (${width} x ${height}): ${pairs.map(([b]) => b).join(" | ")}`);
