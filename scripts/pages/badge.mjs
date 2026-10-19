// The green "not in the shipped release" badge of the Enemies and Bosses pages
// (docs/plans/enemies-bosses-pages.md): COMING SOON on the English pages,
// WKRÓTCE on the Polish ones. The lettering is the game's own font
// (scripts/pages/font.mjs); the fill is Atari PAL $BA as Atari800 shows it,
// the text $00. The SVG is drawn from rectangles only - no font, no network -
// so GitHub and every viewer render it the same.
//
//   node scripts/pages/badge.mjs [--out=DIR] [--preview]   (default build/pages/badges)
//
// Writes coming-soon.svg and wkrotce.svg, plus PNG previews at 2 and 3 pixels
// per font pixel.

import fs from "node:fs";
import path from "node:path";
import { atari800PalRgb } from "../atari800-pal-palette.mjs";
import { textBitmap } from "./font.mjs";
import { createImage, encodePng } from "./png.mjs";
import { draw, textImage } from "./image.mjs";

export const BADGES = [
  { file: "coming-soon", text: "COMING SOON", title: "Coming soon: not in the current release" },
  { file: "wkrotce", text: "WKRÓTCE", title: "Wkrótce: nie ma tego w obecnym wydaniu" },
];
export const BADGE_FILL = 0xba;
export const BADGE_TEXT = 0x00;
const PAD_X = 3;
const PAD_Y = 2;

const hex = (value) => `#${atari800PalRgb(value).map((c) => c.toString(16).padStart(2, "0")).join("")}`;

// The badge as a pixel grid: 0 transparent, 1 fill, 2 text. The two top corner
// and two bottom corner pixels are cut for a slightly rounded plate.
export function badgeGrid(text) {
  const bitmap = textBitmap(text);
  const width = bitmap.width + PAD_X * 2;
  const height = bitmap.height + PAD_Y * 2 - 1; // the accent rows already pad the top
  const grid = new Uint8Array(width * height).fill(1);
  for (const [x, y] of [[0, 0], [width - 1, 0], [0, height - 1], [width - 1, height - 1]]) grid[y * width + x] = 0;
  for (let y = 0; y < bitmap.height; y += 1) {
    for (let x = 0; x < bitmap.width; x += 1) {
      if (bitmap.bit(x, y)) grid[(y + PAD_Y - 1) * width + x + PAD_X] = 2;
    }
  }
  return { width, height, at: (x, y) => grid[y * width + x] };
}

export function badgeSvg(badge) {
  const grid = badgeGrid(badge.text);
  const runs = { 1: [], 2: [] };
  for (let y = 0; y < grid.height; y += 1) {
    let x = 0;
    while (x < grid.width) {
      const value = grid.at(x, y);
      let end = x + 1;
      while (end < grid.width && grid.at(end, y) === value) end += 1;
      if (value) runs[value].push(`M${x} ${y}h${end - x}v1h${x - end}z`);
      x = end;
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${grid.width * 2}" height="${grid.height * 2}" ` +
    `viewBox="0 0 ${grid.width} ${grid.height}" shape-rendering="crispEdges" role="img" aria-label="${badge.text}">` +
    `<title>${badge.title}</title>` +
    `<path fill="${hex(BADGE_FILL)}" d="${runs[1].join("")}${runs[2].join("")}"/>` +
    `<path fill="${hex(BADGE_TEXT)}" d="${runs[2].join("")}"/></svg>\n`;
}

export function badgeImage(badge, scale) {
  const grid = badgeGrid(badge.text);
  const image = createImage(grid.width * scale, grid.height * scale, 4, [0, 0, 0, 0]);
  const colours = { 1: [...atari800PalRgb(BADGE_FILL), 255], 2: [...atari800PalRgb(BADGE_TEXT), 255] };
  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      const value = grid.at(Math.floor(x / scale), Math.floor(y / scale));
      if (value) image.data.set(colours[value], (y * image.width + x) * 4);
    }
  }
  return image;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const out = process.argv.find((a) => a.startsWith("--out="))?.slice(6) ?? "build/pages/badges";
  fs.mkdirSync(out, { recursive: true });
  for (const badge of BADGES) {
    fs.writeFileSync(path.join(out, `${badge.file}.svg`), badgeSvg(badge));
    for (const scale of [2, 3]) {
      fs.writeFileSync(path.join(out, `${badge.file}-x${scale}.png`), encodePng(badgeImage(badge, scale)));
    }
    console.log(`${out}/${badge.file}.svg`);
  }
  if (process.argv.includes("--preview")) writePreviews(out);
}

// Review previews (Phase A): the badge beside a name, at two sizes - a PNG in
// the game's lettering, and an HTML page with GitHub-like headings that shows
// the SVG itself as the pages would (open it in a browser).
export function writePreviews(out) {
  const rows = [["VOID CITADEL", BADGES[0]], ["VOID CITADEL", BADGES[1]], ["INTERCEPTOR HUNTER", BADGES[0]], ["INTERCEPTOR HUNTER", BADGES[1]]];
  for (const scale of [2, 3]) {
    const tiles = rows.map(([name, badge]) => ({ name: textImage(textBitmap(name), atari800PalRgb(0x0e), scale * 2, scale), badge: badgeImage(badge, scale) }));
    const width = Math.max(...tiles.map((t) => t.name.width + t.badge.width)) + 16 * scale;
    const rowHeight = Math.max(...tiles.map((t) => Math.max(t.name.height, t.badge.height))) + 6 * scale;
    const image = createImage(width, rowHeight * tiles.length + 4 * scale, 4, [...atari800PalRgb(0x00), 255]);
    tiles.forEach((tile, i) => {
      const y = 4 * scale + i * rowHeight;
      draw(image, tile.name, 4 * scale, y);
      draw(image, tile.badge, 4 * scale + tile.name.width + 4 * scale, y + tile.name.height - tile.badge.height);
    });
    fs.writeFileSync(path.join(out, `preview-x${scale}.png`), encodePng(image));
  }
  const heading = (tag, name, file, height) =>
    `<${tag}>${name} <img src="${file}.svg" height="${height}" alt="${file === "wkrotce" ? "WKRÓTCE" : "COMING SOON"}"></${tag}>`;
  const html = `<!doctype html><meta charset="utf-8"><title>Badge preview</title>
<style>body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif;max-width:760px;margin:24px auto;padding:0 16px;color:#1f2328;background:#fff}
h2,h3{border-bottom:1px solid #d1d9e0;padding-bottom:.3em}img{vertical-align:middle}
.dark{background:#0d1117;color:#e6edf3;padding:8px 16px;margin-top:24px}.dark h2,.dark h3{border-color:#3d444d}</style>
<p>Size S: height 16 · size M: height 20 (the SVG scales; pixels stay sharp).</p>
${["", "dark"].map((theme) => `<div class="${theme}">
${heading("h2", "Void Citadel", "coming-soon", 16)}
${heading("h3", "Interceptor — hunter", "coming-soon", 16)}
${heading("h2", "Void Citadel", "wkrotce", 16)}
${heading("h2", "Void Citadel", "coming-soon", 20)}
${heading("h3", "Interceptor — hunter", "coming-soon", 20)}
${heading("h2", "Void Citadel", "wkrotce", 20)}
</div>`).join("\n")}
`;
  fs.writeFileSync(path.join(out, "preview.html"), html);
}
