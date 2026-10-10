// feat/boss-escort-flow (docs/plans/boss-escort-flow.md): the boss escort's
// review variants. Phase A built T, TW, T1 and TS here as in-memory source
// edits (the plan's §3; this file's history at a54388d); the owner chose T1 -
// the escort from the first weapon kill - and it is the source now. What stays
// is one data-only variant, the regression guard's negative control:
//
//   n2  region 1's escort starts at the SECOND weapon kill (Phase A's T). A
//       fighter parked at the left edge reaches one weapon only (gun-5), so
//       under n2 its escort never comes and the edge is a refuge again
//       (MEASURED in Phase A: 0 escorts, 0 hits in 80 s). The trace's
//       left-edge clause must fail on it (owner answer 6, 2026-10-10).
//
// A variant is the default build plus edits applied IN MEMORY while
// scripts/build.mjs reads its inputs (the method of the retired
// scripts/audio-probe.mjs): nothing under src/ or assets/ changes on disk, and
// the variant owns build/escort-variant-<id>[-level-N-sM]/ like every review
// variant. The default build reads none of this.

import fs from "node:fs";
import path from "node:path";

const regionEscortAfter = (afterWeapons) => ({
  file: "assets/graphics/boss-regions/region-1/modules.json",
  transform(text) {
    const layout = JSON.parse(text);
    if (layout.escort === undefined) throw new Error("escort variant: region 1 has no escort block");
    layout.escort = { ...layout.escort, afterWeapons };
    return JSON.stringify(layout, null, 2);
  },
});

export const ESCORT_VARIANTS = Object.freeze({
  n2: {
    summary: "region 1's escort from the second weapon kill (the left-edge guard's negative control)",
    edits: [regionEscortAfter(2)],
  },
});

export function parseEscortVariant(argv) {
  const argument = argv.find((value) => value.startsWith("--escort-variant="));
  if (argument === undefined) return null;
  const id = argument.slice("--escort-variant=".length).toLowerCase();
  if (!Object.hasOwn(ESCORT_VARIANTS, id)) {
    throw new Error(`Unknown escort variant ${id}; expected one of ${Object.keys(ESCORT_VARIANTS).join(", ")}`);
  }
  return id;
}

// Wraps fs.readFileSync so the variant's files read back edited. Every edit
// must be consumed by the build, or the variant is not what its name says.
export function installEscortVariant(rootDirectory, id) {
  const variant = ESCORT_VARIANTS[id];
  const byFile = new Map();
  for (const edit of variant.edits) {
    const absolute = path.resolve(rootDirectory, edit.file);
    if (!byFile.has(absolute)) byFile.set(absolute, []);
    byFile.get(absolute).push(edit);
  }
  const consumed = new Set();
  const original = fs.readFileSync;
  fs.readFileSync = function readFileSyncWithEscortVariant(file, options) {
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
    summary: variant.summary,
    assertConsumed() {
      for (const absolute of byFile.keys()) {
        if (!consumed.has(absolute)) {
          throw new Error(`escort variant ${id}: the build never read ${path.relative(rootDirectory, absolute)}`);
        }
      }
    },
  };
}
