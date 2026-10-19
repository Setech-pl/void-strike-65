// Frame captures for the Enemies and Bosses pages
// (docs/plans/enemies-bosses-pages.md §2): build a debug route, then replay one
// trace session on it with Atari800 saving every gameplay frame.
//
//   node scripts/pages/capture.mjs [--ids=l1-complete-1,...] [--spec=scripts/pages/stills.json]
//
// Each capture in the spec names its build arguments (scripts/build.mjs - the
// route lands in build/<variant>/, never dist/), its artifacts directory and a
// session of scripts/runtime-wall-trace.mjs. The frames go to
// build/pages/capture/<id>/f-NNN.png (336 x 240, one hires pixel by one
// scanline, Atari800's PAL palette; SDL's cocoa driver on macOS, because the
// harness's default dummy driver saves only the 256 x 192 centre). The trace
// CSV the frames are picked from stays in build/<variant>/runtime-wall-trace/.
// A capture with `hosts: [first, last]` also saves those host frames as
// h-host<n>.png (the boss banner and load; limit 0 skips the per-frame shots).
// An Atari800 window opens while a capture runs. Captures run in parallel.

import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { CAPTURE_ROOT } from "./stills.mjs";

const arg = (name, fallback) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=")[1] ?? fallback;
const spec = JSON.parse(fs.readFileSync(arg("spec", "scripts/pages/stills.json"), "utf8"));
const ids = arg("ids", "").split(",").filter(Boolean);
const hostList = ([first, last]) => Array.from({ length: last - first + 1 }, (_, i) => first + i).join(",");
const captures = spec.captures.filter((c) => ids.length === 0 || ids.includes(c.id));

for (const capture of captures) {
  const build = spawnSync(process.execPath, ["scripts/build.mjs", ...capture.build, "--quiet"], { stdio: "inherit" });
  if (build.status !== 0) throw new Error(`capture ${capture.id}: build failed`);
}

const runs = captures.map((capture) => new Promise((resolve, reject) => {
  const directory = path.join(CAPTURE_ROOT, capture.id);
  fs.rmSync(directory, { recursive: true, force: true });
  fs.mkdirSync(directory, { recursive: true });
  const log = fs.openSync(path.join(CAPTURE_ROOT, `${capture.id}.log`), "w");
  const child = spawn(process.execPath, [
    "scripts/runtime-wall-trace.mjs",
    `--artifacts=build/${capture.artifacts}`,
    `--only-session=${capture.session}`,
    "--atari800-source=build/atari800-trace",
  ], {
    stdio: ["ignore", log, log],
    env: {
      ...process.env,
      SDL_VIDEODRIVER: process.platform === "darwin" ? "cocoa" : (process.env.SDL_VIDEODRIVER ?? "x11"),
      ...(capture.limit > 0 ? {
        DFTRACE_ENGINE_SCREENSHOT_PREFIX: path.join(directory, "f"),
        DFTRACE_ENGINE_SCREENSHOT_LIMIT: String(capture.limit),
      } : {}),
      // Host frames (the loading screen between gameplay frames, which the
      // per-frame capture never sees): scripts/atari800-wall-trace.h
      // dfshot_observe saves <dir>/h-host<n>.png at line 248 of each listed one.
      ...(capture.hosts ? {
        DFTRACE_SHOT_PREFIX: path.join(directory, "h"),
        DFTRACE_SHOT_HOSTS: hostList(capture.hosts),
      } : {}),
    },
  });
  child.on("exit", (code) => {
    const frames = fs.readdirSync(directory).length;
    console.log(`${capture.id}: exit ${code}, ${frames} frames`);
    (code === 0 ? resolve : reject)(new Error(`capture ${capture.id}: exit ${code}`));
  });
}));
await Promise.all(runs);
