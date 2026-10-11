// feat/interceptor-standoff (the owner's smoke of 2026-10-11, plan
// interceptor-standoff §12): in the swarm an Interceptor climbed away off the
// top and never came back. The owner wants it to stop near the top of the
// screen, still visible, and dive back to its standoff instead of leaving.
// Phase A-lite builds the loop as a review variant:
//
//   --interceptor-loops=N  (N = 0..3) after its 100 frames an Interceptor of a
//       level-1 swarm or elite wave climbs (8 lines a frame, as R) to its
//       top-hold row - y 32 for slot 0, two rows lower per slot - holds, then
//       descends to its standoff and flies it again; N times, then it climbs
//       out as R does. The boss escort's wave keeps 0 loops. N = 0 is the
//       loop's code with level 1's data unchanged (R's behaviour), so the
//       code's own cost can be told from the loops'.
//
// The code is scripts/interceptor-loops.patch, applied IN MEMORY while
// scripts/build.mjs reads its inputs (the method of
// scripts/boss-escort-variants.mjs): nothing under src/, cfg/ or assets/
// changes on disk, and the variant owns
// build/interceptor-loops-N[-level-N-sM]/ like every review variant. The
// default build reads none of this. The patch is a plain unified diff, so the
// chosen loop lands later with `git apply scripts/interceptor-loops.patch`.
//
// What the patch does (plan §12 has the bytes):
//   src/c/lifecycle.c       the top phase in the tick; light_loops[] written
//                           at admission from the armed wave's flags (bits 6-7)
//   cfg/encounter-director.cfg  HYBRID_LIGHT_LOOK_RAM 5 -> 9 B (light_loops)
//   src/hybrid/c-asm-abi.s, light-kernel.s, boss-entry-pins.inc
//                           the boss entry's region read and its WARNING
//                           records move behind the HUD booster backup in the
//                           Light kernel link's last segment, so the window's
//                           boot-loaded record keeps its 11 sectors

import fs from "node:fs";
import path from "node:path";

export const INTERCEPTOR_LOOP_PATCH = "scripts/interceptor-loops.patch";
const LEVEL_ONE = "assets/levels/level-01.json";

export function parseInterceptorLoops(argv) {
  const argument = argv.find((value) => value.startsWith("--interceptor-loops="));
  if (argument === undefined) return null;
  const match = /^--interceptor-loops=([0-3])$/.exec(argument);
  if (match === null) {
    throw new Error(`Unknown ${argument}; the form is --interceptor-loops=N with N 0..3`);
  }
  return Number(match[1]);
}

// A unified diff as exact-text edits: each hunk's old lines (context and
// removed) must occur exactly once in the file and become its new lines.
function patchEdits(rootDirectory) {
  const text = fs.readFileSync(path.join(rootDirectory, INTERCEPTOR_LOOP_PATCH), "utf8");
  const edits = [];
  let file = null;
  let hunk = null;
  const close = () => {
    if (hunk !== null) edits.push({ file, from: hunk.from.join(""), to: hunk.to.join("") });
    hunk = null;
  };
  for (const line of text.split(/(?<=\n)/)) {
    if (line.startsWith("+++ b/")) {
      close();
      file = line.slice("+++ b/".length).trimEnd();
    } else if (line.startsWith("--- ") || line.startsWith("diff ") || line.startsWith("index ")) {
      close();
    } else if (line.startsWith("@@")) {
      close();
      hunk = { from: [], to: [] };
    } else if (hunk !== null) {
      const body = line.slice(1);
      if (line.startsWith(" ")) {
        hunk.from.push(body);
        hunk.to.push(body);
      } else if (line.startsWith("-")) {
        hunk.from.push(body);
      } else if (line.startsWith("+")) {
        hunk.to.push(body);
      } else if (!line.startsWith("\\")) {
        throw new Error(`${INTERCEPTOR_LOOP_PATCH}: unexpected line ${JSON.stringify(line)}`);
      }
    }
  }
  close();
  return edits.map((edit) => ({
    file: edit.file,
    transform(source) {
      const at = source.indexOf(edit.from);
      if (at < 0 || source.indexOf(edit.from, at + 1) >= 0) {
        throw new Error(`interceptor loops: a hunk of ${INTERCEPTOR_LOOP_PATCH} does not ` +
          `match ${edit.file} exactly once`);
      }
      return source.slice(0, at) + edit.to + source.slice(at + edit.from.length);
    },
  }));
}

// Level 1's swarm and elite Interceptor waves loop N times; the boss sector's
// escort wave keeps 0.
const levelLoops = (loops) => ({
  file: LEVEL_ONE,
  transform(text) {
    const level = JSON.parse(text);
    let waves = 0;
    for (const sector of level.sectors) {
      if (sector.kind !== "space") continue;
      for (const wave of sector.waves ?? []) {
        const light = wave.members === undefined ? wave.archetype : wave.members[1];
        if (light !== "interceptor") continue;
        wave.loops = loops;
        waves += 1;
      }
    }
    if (waves === 0) throw new Error("interceptor loops: level 1 has no Interceptor wave");
    return JSON.stringify(level, null, 2);
  },
});

// Wraps fs.readFileSync so the variant's files read back edited. Every edit
// must be consumed by the build, or the variant is not what its name says.
export function installInterceptorLoops(rootDirectory, loops) {
  const byFile = new Map();
  for (const edit of [...patchEdits(rootDirectory), levelLoops(loops)]) {
    const absolute = path.resolve(rootDirectory, edit.file);
    if (!byFile.has(absolute)) byFile.set(absolute, []);
    byFile.get(absolute).push(edit);
  }
  const consumed = new Set();
  const original = fs.readFileSync;
  fs.readFileSync = function readFileSyncWithInterceptorLoops(file, options) {
    const result = original.call(fs, file, options);
    if (typeof file !== "string" && !(file instanceof URL)) return result;
    const absolute = path.resolve(file instanceof URL ? file.pathname : file);
    const edits = byFile.get(absolute);
    if (edits === undefined) return result;
    let text = Buffer.isBuffer(result) ? result.toString("utf8") : result;
    for (const edit of edits) text = edit.transform(text);
    consumed.add(absolute);
    return Buffer.isBuffer(result) ? Buffer.from(text, "utf8") : text;
  };
  return {
    summary: `level 1's swarm and elite Interceptors loop ${loops} time(s) through ` +
      "the top-hold row; the boss escort 0",
    assertConsumed() {
      for (const absolute of byFile.keys()) {
        if (!consumed.has(absolute)) {
          throw new Error(`interceptor loops: the build never read ${path.relative(rootDirectory, absolute)}`);
        }
      }
    },
  };
}
