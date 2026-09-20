// MEASUREMENT ONLY (uncommitted). Runs one runtime-wall-trace session of the
// build in <root> with the measurement emulator (scripts/measure-frame-profile.h)
// and optional forced stress, then copies the CSV/logs to <outDir>.
// usage: node scripts/measure-stress-run.mjs <root> <atari800-src> <session> <outDir> [--stress] [--mode=--debris-gate-only]
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
const [root, source, session, outDir, ...rest] = process.argv.slice(2);
const stress = rest.includes("--stress");
const mode = rest.find((a) => a.startsWith("--mode="))?.slice(7);
fs.mkdirSync(outDir, { recursive: true });
const labels = new Map();
for (const line of fs.readFileSync(path.join(root, "build", "void-strike-65.lbl"), "utf8").split("\n")) {
  const m = /^al ([0-9A-Fa-f]+) \.(\S+)/.exec(line);
  if (m) (labels.get(m[2]) ?? labels.set(m[2], []).get(m[2])).push(parseInt(m[1], 16));
}
const director = new Map();
for (const line of fs.readFileSync(path.join(root, "build", "encounter-director.lbl"), "utf8").split("\n")) {
  const m = /^al ([0-9A-Fa-f]+) \.(\S+)/.exec(line);
  if (m) director.set(m[2], parseInt(m[1], 16));
}
const one = (name) => { const v = [...new Set(labels.get(name) ?? [])]; if (v.length !== 1) throw new Error(`label ${name}: ${v}`); return v[0]; };
const lightUpdate = one("light_update");
const alive = labels.get("@alive").filter((a) => a > lightUpdate).sort((a, b) => a - b)[0];
const tag = `${session}${stress ? "-stress" : ""}`;
const env = { ...process.env };
if (stress) Object.assign(env, {
  DFSTRESS_LOG: path.join(outDir, `${tag}-stress.log`),
  DFSTRESS_PC_ALIVE: String(alive),
  DFSTRESS_PC_COPY: String(one("copy_engine_animation_phase")),
  DFSTRESS_PC_ROTATE: String(one("rotate_playfield_rows")),
  DFSTRESS_LIGHT: String(director.get("_light_state")),
  DFSTRESS_FP_X: String(one("FIGHTER_PROJECTILE_X")),
  DFSTRESS_FP_Y: String(one("FIGHTER_PROJECTILE_Y")),
  DFSTRESS_FP_PREV_Y: String(one("FIGHTER_PROJECTILE_PREV_Y")),
  DFSTRESS_FP_LIFETIME: String(one("FIGHTER_PROJECTILE_LIFETIME")),
  DFPROF_OUTPUT: path.join(outDir, `${tag}-prof.csv`),
  DFPROF_FIRST: "999999", DFPROF_LAST: "0",
});
const args = ["scripts/runtime-wall-trace.mjs", ...(mode ? [mode] : []), `--only-session=${session}`,
  "--skip-boot-smoke", `--atari800-source=${path.resolve(source)}`];
const result = spawnSync("node", args, { cwd: root, env, encoding: "utf8", maxBuffer: 64 << 20 });
fs.writeFileSync(path.join(outDir, `${tag}-runner.log`), `${result.stdout}\n${result.stderr}\nstatus=${result.status}\n`);
for (const suffix of [".csv", "-debris-gate.csv"]) {
  const src = path.join(root, "build", "runtime-wall-trace", `${session}${suffix}`);
  if (fs.existsSync(src)) fs.copyFileSync(src, path.join(outDir, `${tag}${suffix}`));
}
console.log(`${tag}: status ${result.status}; ${result.stdout.trim().split("\n").slice(-2).join(" | ")}`);
