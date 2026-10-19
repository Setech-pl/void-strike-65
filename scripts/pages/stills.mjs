// In-game stills for the Enemies and Bosses pages
// (docs/plans/enemies-bosses-pages.md §2): crops of real Atari800 frames.
//
//   node scripts/pages/stills.mjs [--spec=scripts/pages/stills.json] [--out=build/pages/stills]
//
// Every subject names a capture (a directory of per-frame screenshots that
// scripts/pages/capture.mjs wrote from a trace replay), a frame and a crop
// rectangle in screenshot pixels (336 x 240: one hires pixel by one scanline;
// screenshot x = 2 x HPOS - 88, y = scanline - 8). It writes
//   <id>.png      the crop at native size, Atari800's PAL palette as captured;
//   <id>-x8.png   eight output pixels per scanline, the width corrected to the
//                 PAL pixel aspect (scripts/pages/image.mjs).
// Nothing is retouched: the pixels are the emulator's.

import fs from "node:fs";
import path from "node:path";
import { crop, decodePng, encodePng } from "./png.mjs";
import { scaleToPalAspect } from "./image.mjs";

export const CAPTURE_ROOT = "build/pages/capture";

export function frameFile(capture, frame) {
  return path.join(CAPTURE_ROOT, capture, `f-${String(frame).padStart(3, "0")}.png`);
}

export function loadStill(subject) {
  const frame = decodePng(fs.readFileSync(frameFile(subject.capture, subject.frame)));
  const [x, y, width, height] = subject.crop;
  return crop(frame, x, y, width, height);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const arg = (name, fallback) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=")[1] ?? fallback;
  const spec = JSON.parse(fs.readFileSync(arg("spec", "scripts/pages/stills.json"), "utf8"));
  const out = arg("out", "build/pages/stills");
  fs.mkdirSync(out, { recursive: true });
  for (const subject of spec.subjects) {
    const still = loadStill(subject);
    fs.writeFileSync(path.join(out, `${subject.id}.png`), encodePng(still));
    fs.writeFileSync(path.join(out, `${subject.id}-x8.png`), encodePng(scaleToPalAspect(still, 8)));
    console.log(`${subject.id}: ${subject.capture} frame ${subject.frame}, ${still.width}x${still.height}`);
  }
}
