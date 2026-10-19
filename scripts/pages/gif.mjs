// GIF cuts for the Enemies and Bosses pages (docs/plans/enemies-bosses-pages.md
// §4): a window of a capture (scripts/pages/capture.mjs) through the
// repository's own GIF writer (scripts/showcase-gif.mjs encodeGif) and
// screenshot reader (scripts/github-showcase.mjs readIndexedPng). The README's
// GIF is untouched: this writes only where --out says, and no manifest.
//
//   node scripts/pages/gif.mjs --capture=l1-complete-1 --start=3990 --frames=450
//        [--step=1] [--crop=8,0,320,240] [--out=build/pages/gif/sample.gif]
//
// --step=1 keeps every PAL frame (50 fps, 2 cs a frame, the README GIF's rate);
// --step=2 keeps every second (25 fps, 4 cs). Native pixels, no scaling: the
// page scales the image (the README shows its 320 x 240 GIF at width 640).

import fs from "node:fs";
import path from "node:path";
import { encodeGif } from "../showcase-gif.mjs";
import { readIndexedPng } from "../github-showcase.mjs";
import { frameFile } from "./stills.mjs";

export function cutGif({ capture, start, frames, step = 1, crop = [8, 0, 320, 240] }) {
  const [cx, cy, width, height] = crop;
  const colourIndex = new Map();
  const colours = [];
  const out = [];
  for (let frame = start; frame < start + frames; frame += step) {
    const image = readIndexedPng(fs.readFileSync(frameFile(capture, frame)));
    if (image.width !== 336 || image.height !== 240) throw new Error(`${capture} f${frame}: not a 336x240 capture`);
    const pixels = new Uint8Array(width * height);
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const source = image.indices[(y + cy) * image.width + x + cx] * 3;
        const key = (image.palette[source] << 16) | (image.palette[source + 1] << 8) | image.palette[source + 2];
        let index = colourIndex.get(key);
        if (index === undefined) {
          index = colours.length;
          colourIndex.set(key, index);
          colours.push([image.palette[source], image.palette[source + 1], image.palette[source + 2]]);
        }
        pixels[y * width + x] = index;
      }
    }
    out.push({ pixels, delay: 2 * step });
  }
  if (colours.length > 255) throw new Error(`${colours.length} colours do not fit a GIF table`);
  return encodeGif({ width, height, colours, frames: out });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const arg = (name, fallback) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=")[1] ?? fallback;
  const options = {
    capture: arg("capture"),
    start: Number(arg("start")),
    frames: Number(arg("frames")),
    step: Number(arg("step", "1")),
    crop: arg("crop", "8,0,320,240").split(",").map(Number),
  };
  const out = arg("out", "build/pages/gif/sample.gif");
  const { bytes, frames } = cutGif(options);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, bytes);
  console.log(`${out}: ${bytes.length} B, ${frames ?? "?"} GIF frames, ` +
    `${(options.frames / 50).toFixed(1)} s at ${50 / options.step} fps, ${options.crop[2]}x${options.crop[3]}`);
}
