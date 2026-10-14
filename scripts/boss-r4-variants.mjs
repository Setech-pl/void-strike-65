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
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = path.join(rootDirectory, "assets", "graphics", "boss-regions", "region-4");

export const R4_VARIANTS = Object.freeze({
  g1p: () => {},
  g2: (layout) => { layout.gravity.framesPerStep = 4; },
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
