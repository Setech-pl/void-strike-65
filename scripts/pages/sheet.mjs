// A review contact sheet of the stills (docs/plans/enemies-bosses-pages.md §2):
// every subject at a common scale with its id in the game's lettering.
//
//   node scripts/pages/sheet.mjs [--ids=a,b] [--scale=2] [--out=build/pages/stills/sheet.png]

import fs from "node:fs";
import { atari800PalRgb } from "../atari800-pal-palette.mjs";
import { textBitmap } from "./font.mjs";
import { createImage, encodePng } from "./png.mjs";
import { draw, scaleToPalAspect, textImage } from "./image.mjs";
import { loadStill } from "./stills.mjs";

const arg = (name, fallback) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=")[1] ?? fallback;
const spec = JSON.parse(fs.readFileSync(arg("spec", "scripts/pages/stills.json"), "utf8"));
const scale = Number(arg("scale", "2"));
const ids = arg("ids", "").split(",").filter(Boolean);
const subjects = spec.subjects.filter((s) => ids.length === 0 || ids.includes(s.id));
const tiles = subjects.map((subject) => {
  const image = scaleToPalAspect(loadStill(subject), scale);
  const label = textImage(textBitmap(`${subject.id} F${subject.frame}`.replace(/[^A-Z0-9 \-.]/gi, "-"), { accentRows: 0 }),
    atari800PalRgb(subject.comingSoon ? 0xba : 0x1e), 1, 1);
  return { image, label };
});
const gap = 10;
const width = Math.max(...tiles.map((t) => Math.max(t.image.width, t.label.width))) + gap * 2;
const height = tiles.reduce((sum, t) => sum + t.image.height + t.label.height + gap * 2, gap);
const sheet = createImage(width, height, 4, [...atari800PalRgb(0x04), 255]);
let y = gap;
for (const tile of tiles) {
  draw(sheet, tile.label, gap, y);
  y += tile.label.height + 4;
  draw(sheet, tile.image, gap, y);
  y += tile.image.height + gap * 2 - 4;
}
const out = arg("out", "build/pages/stills/sheet.png");
fs.writeFileSync(out, encodePng(sheet));
console.log(out, `${width}x${height}`);
