// MEASUREMENT. feat/boss-order-scale Phase B (the owner's decision AX 2-6,
// docs/plans/boss-order-scale.md): the difficulty curve across the four boss
// regions, measured on the emulator (the trace harness) and written as
// evidence, docs/boss-curve.json, which tests/boss-order-scale.test.mjs holds
// to the owner's targets.
//
//   node scripts/measure-boss-curve.mjs --run [--jobs=10] [--only=<route>]   build the routes, run the sessions
//   node scripts/measure-boss-curve.mjs --report [--write]                  the table (and docs/boss-curve.json)
//
// A cell is a region (its boss at its first level's laser tier; regions 2 and
// 3 also at their later tier: levels 5-6 tier 2, level 9 tier 4) x a
// difficulty. Each cell is measured three times - level 1's road entered at
// sectors 0, 3 and 5 (three different arrivals at the boss: the same
// production code, different states; sector 6 is the boss sector itself, where
// the aiming bot's road-to-boss switch never fires) - with two bots:
//   boss-aim                 the fight's length (the owner's rule, journal
//                            §AH: frames x main's plain sweep / main's aiming
//                            bot, per difficulty, / 50) and its hits a minute;
//   boss-aim-careful-dodge   the same bot leaving every warned beam.
// The bots read the game's memory and press the joystick; they never write
// memory. The cell's figures are the three replays' means (and their range).
// The evidence names its inputs' SHA-256 (the boss data and the level's
// bossDef): a change to them leaves it stale until this is run again.
// --run resumes: a session already measured on the same data (its route's
// stamp, the shown boss's data) is kept; --fresh measures everything again.
import { spawn } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { bossDanger } from "./measure-boss-danger.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = new Map(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, "").split("="); return [k, v ?? true]; }));
const STARTS = [0, 3, 5];
const BOTS = ["boss-aim", "boss-aim-careful-dodge"];
const DIFFICULTIES = [0, 1, 2];
export const CELLS = [
  { region: 1, levels: "1-3", tier: 1, flags: [] },
  { region: 2, levels: "4", tier: 1, flags: ["--boss-region=2"] },
  { region: 2, levels: "5-6", tier: 2, flags: ["--boss-region=2", "--laser-tier=2"] },
  { region: 3, levels: "7-8", tier: 2, flags: ["--boss-region=3"] },
  { region: 3, levels: "9", tier: 4, flags: ["--boss-region=3", "--laser-tier=4"] },
  { region: 4, levels: "10-12", tier: 4, flags: ["--boss-region=4"] },
];
const routeName = (cell, start) => [
  ...(cell.flags.includes("--laser-tier=2") ? ["laser-tier-2"] : cell.flags.includes("--laser-tier=4") ? ["laser-tier-4"] : []),
  ...(cell.region === 1 ? [] : [`boss-region-${cell.region}`]), `level-1-s${start}`].join("-");
const OUT = path.join(root, "build", "boss-curve");

// The curve's inputs: the order, each boss's data, the level's bossDef.
export function curveInputsHash() {
  const files = ["assets/graphics/boss-regions/order.json", "assets/levels/level-01.json",
    ...[1, 2, 3, 4].map((n) => `assets/graphics/boss-regions/region-${n}/modules.json`)];
  const hash = crypto.createHash("sha256");
  for (const file of files) hash.update(file).update(fs.readFileSync(path.join(root, file)));
  return hash.digest("hex");
}

// A route's stamp: the data its boss fight reads (the order, the level, the
// shown boss's draft).
const order = () => JSON.parse(fs.readFileSync(path.join(root, "assets/graphics/boss-regions/order.json"), "utf8")).order;
function routeStamp(cell) {
  const hash = crypto.createHash("sha256");
  for (const file of ["assets/graphics/boss-regions/order.json", "assets/levels/level-01.json",
    `assets/graphics/boss-regions/region-${order()[cell.region - 1]}/modules.json`]) {
    hash.update(fs.readFileSync(path.join(root, file)));
  }
  return hash.update(JSON.stringify(cell.flags)).digest("hex");
}
const measured = (route, id) => {
  const log = path.join(OUT, route, `${id}.log`);
  return fs.existsSync(log) && fs.readFileSync(log, "utf8").includes("Focused report:");
};

async function runAll() {
  const jobs = Number(args.get("jobs") ?? 10);
  const only = args.get("only");
  if (args.get("fresh")) fs.rmSync(OUT, { recursive: true, force: true });
  const all = CELLS.flatMap((cell) => STARTS.map((start) => ({ cell, start, route: routeName(cell, start) })))
    .filter((b) => only === undefined || b.route === only);
  // A route measured on other data starts again.
  for (const { cell, route } of all) {
    const stamp = path.join(OUT, route, "stamp");
    if (fs.existsSync(stamp) && fs.readFileSync(stamp, "utf8") !== routeStamp(cell)) {
      fs.rmSync(path.join(OUT, route), { recursive: true, force: true });
    }
  }
  const pending = (route) => BOTS.flatMap((bot) => DIFFICULTIES.map((d) => `${bot}-${d}`)).filter((id) => !measured(route, id));
  const builds = all.filter(({ route }) => pending(route).length > 0);
  // The builds, a few at a time.
  for (let i = 0; i < builds.length; i += 4) {
    await Promise.all(builds.slice(i, i + 4).map(({ cell, start }) => new Promise((resolve, reject) => {
      const child = spawn("node", ["scripts/build.mjs", `--level=1:sector=${start}`, ...cell.flags, "--quiet"],
        { cwd: root, stdio: "ignore" });
      child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`build ${cell.flags} s${start}: ${code}`))));
    })));
  }
  for (const { cell, route } of builds) {
    fs.mkdirSync(path.join(OUT, route), { recursive: true });
    fs.writeFileSync(path.join(OUT, route, "stamp"), routeStamp(cell));
  }
  const sessions = builds.flatMap(({ route }) => pending(route).map((id) => ({ route, id })));
  let next = 0, done = 0, failed = 0;
  await new Promise((resolve) => {
    const launch = () => {
      if (next >= sessions.length) { if (done === sessions.length) resolve(); return; }
      const { route, id } = sessions[next++];
      const dir = path.join(root, "build", route, "runtime-wall-trace");
      fs.mkdirSync(dir, { recursive: true });
      const log = fs.openSync(path.join(dir, `${id}.log`), "w");
      const child = spawn("node", ["scripts/runtime-wall-trace.mjs", `--artifacts=build/${route}`, `--only-session=${id}`,
        "--hit-trace", "--atari800-source=build/atari800-trace"], { cwd: root, stdio: ["ignore", log, log] });
      child.on("exit", (code) => {
        fs.closeSync(log);
        const keep = path.join(OUT, route);
        fs.mkdirSync(keep, { recursive: true });
        for (const f of fs.readdirSync(dir).filter((f) => f.startsWith(`${id}.`) || f.startsWith(`${id}-`))) {
          fs.copyFileSync(path.join(dir, f), path.join(keep, f));
        }
        done += 1;
        if (code !== 0) failed += 1;
        console.log(`${done}/${sessions.length} ${route} ${id} exit ${code}`);
        launch();
      });
    };
    for (let j = 0; j < jobs; j += 1) launch();
  });
  console.log(`done: ${sessions.length} sessions, ${failed} exited non-zero`);
}

const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
const round1 = (x) => Math.round(x * 10) / 10;
export function report() {
  const cells = [];
  for (const cell of CELLS) {
    for (const d of DIFFICULTIES) {
      const aim = [], dodge = [];
      for (const start of STARTS) {
        const dir = path.join(OUT, routeName(cell, start));
        const a = path.join(dir, `boss-aim-${d}.csv`), b = path.join(dir, `boss-aim-careful-dodge-${d}.csv`);
        if (fs.existsSync(a)) aim.push(bossDanger(a));
        if (fs.existsSync(b)) dodge.push(bossDanger(b));
      }
      if (aim.length === 0) continue;
      const perMin = (r) => r.boss.hits / (r.fightFrames / 3000);
      const seconds = aim.map((r) => r.fightSeconds);
      cells.push({
        region: cell.region, levels: cell.levels, tier: cell.tier, difficulty: d, replays: aim.length,
        seconds: round1(mean(seconds)), secondsRange: [Math.min(...seconds), Math.max(...seconds)],
        aimHitsPerMinute: round1(mean(aim.map(perMin))), aimDeaths: round1(mean(aim.map((r) => r.boss.deaths))),
        dodgeHitsPerMinute: dodge.length ? round1(mean(dodge.map(perMin))) : null,
        dodgeDeaths: dodge.length ? round1(mean(dodge.map((r) => r.boss.deaths))) : null,
        finished: aim.every((r) => r.finished), entryHostFrames: Math.max(...aim.map((r) => r.entryHostFrames ?? 0)),
      });
    }
  }
  return cells;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  if (args.get("run")) await runAll();
  if (args.get("report")) {
    const cells = report();
    for (const c of cells) {
      console.log(`R${c.region} L${c.levels.padEnd(5)} t${c.tier} ${"EMH"[c.difficulty]} ${String(c.seconds).padStart(6)} s ` +
        `[${c.secondsRange.join("-")}] aim ${c.aimHitsPerMinute}/min d${c.aimDeaths} | dodge ${c.dodgeHitsPerMinute}/min ` +
        `d${c.dodgeDeaths} | entry ${c.entryHostFrames}${c.finished ? "" : " UNFINISHED"}`);
    }
    if (args.get("write")) {
      const evidence = { generated: "scripts/measure-boss-curve.mjs --run --fresh --report --write", order: order(),
        inputsSha256: curveInputsHash(), starts: STARTS, bots: BOTS, cells };
      fs.writeFileSync(path.join(root, "docs", "boss-curve.json"), `${JSON.stringify(evidence, null, 1)}\n`);
      console.log("wrote docs/boss-curve.json");
    }
  }
}
