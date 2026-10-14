// fix/r4-immobile (the owner's smoke of the Void Citadel): region 4's
// comparison variants, written as drafts the build's --boss-variant=NAME reads
// (build/boss-variants/NAME/region-4/). The committed draft is the still
// citadel with G1+ (2 colour clocks every 6 frames); each variant is a data
// edit of it. Nothing under assets/ is written.
//
//   node scripts/boss-r4-variants.mjs        every variant into build/boss-variants/
//
//   g1p the committed draft unchanged (G1+), so its full game and the native
//       harness build into build/boss-variant-g1p/, never dist/
//   g2  the pull at 2 colour clocks every 4 frames (G2), for comparison
//   g1pt, g2t  the same with a first hit-point trim towards MEDIUM ~105 s (the
//       still band keeps every module in reach: the fight ran 60 s untuned)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = path.join(rootDirectory, "assets", "graphics", "boss-regions", "region-4");

// The first trim: every module's hit points x 1.75 (the untuned fight's
// MEDIUM 60.4 s against the aimed 105 s).
const TRIM_HP = Object.freeze({ "spire-l": 11, "spire-r": 11, core: 21, "core-lens": 18, "cannon-l": 18,
  "cannon-r": 18, "gun-1": 12, "gun-5": 12, "gun-2": 12, "gun-3": 12, "gun-6": 12, "gun-4": 12,
  "plate-a": 10, "plate-b": 10, "plate-d": 10, "plate-e": 10 });
function trim(layout) {
  for (const module of layout.modules) module.hp = TRIM_HP[module.name];
}

export const R4_VARIANTS = Object.freeze({
  g1p: () => {},
  g2: (layout) => { layout.gravity.framesPerStep = 4; },
  g1pt: (layout) => { trim(layout); },
  g2t: (layout) => { layout.gravity.framesPerStep = 4; trim(layout); },
});

export function writeRegion4Variant(name) {
  const target = path.join(rootDirectory, "build", "boss-variants", name, "region-4");
  fs.rmSync(target, { recursive: true, force: true });
  fs.mkdirSync(target, { recursive: true });
  for (const file of fs.readdirSync(source)) {
    fs.copyFileSync(path.join(source, file), path.join(target, file));
  }
  const modulesPath = path.join(target, "modules.json");
  const layout = JSON.parse(fs.readFileSync(modulesPath, "utf8"));
  R4_VARIANTS[name](layout);
  fs.writeFileSync(modulesPath, `${JSON.stringify(layout, null, 2)}\n`);
  return target;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  for (const name of Object.keys(R4_VARIANTS)) {
    console.log(`wrote ${path.relative(rootDirectory, writeRegion4Variant(name))}`);
  }
}
