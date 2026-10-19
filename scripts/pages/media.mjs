// Renders every picture of the Enemies and Bosses pages into docs/media
// (docs/plans/enemies-bosses-pages.md §3, the owner's Phase A choices of
// 2026-10-19): each subject of scripts/pages/stills.json in style b (CRT) at
// x8 -> docs/media/<dir>/<id>.png, each cut of its "gifs" list ->
// docs/media/<dir>/<id>.gif (320 x 240, 50 fps), and the two badges ->
// docs/media/badges/. Budgets: a PNG at most 300 KB, a GIF at most 600 KB;
// over budget is an error. Needs the captures (scripts/pages/capture.mjs).
// These files are not in docs/media/manifest.json (owner decision, Phase A
// question 8): this script and stills.json are their provenance.
//
//   node scripts/pages/media.mjs [--only=png|gif|badge]

import fs from "node:fs";
import path from "node:path";
import { renderArt } from "./art.mjs";
import { BADGES, badgeSvg } from "./badge.mjs";
import { cutGif } from "./gif.mjs";

const PNG_BUDGET = 300 * 1024;
const GIF_BUDGET = 600 * 1024;
const MEDIA = "docs/media";

const spec = JSON.parse(fs.readFileSync("scripts/pages/stills.json", "utf8"));
const only = process.argv.find((a) => a.startsWith("--only="))?.slice(7);
const written = [];
const write = (file, bytes, budget) => {
  if (budget && bytes.length > budget) throw new Error(`${file}: ${bytes.length} B over the ${budget} B budget`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, bytes);
  written.push([file, bytes.length]);
  console.log(`${file} ${bytes.length} B`);
};

if (!only || only === "badge") {
  for (const badge of BADGES) write(path.join(MEDIA, "badges", `${badge.file}.svg`), Buffer.from(badgeSvg(badge)));
}
if (!only || only === "png") {
  for (const subject of spec.subjects) write(path.join(MEDIA, subject.dir, `${subject.id}.png`), renderArt(subject, "b", 8), PNG_BUDGET);
}
if (!only || only === "gif") {
  for (const cut of spec.gifs) write(path.join(MEDIA, cut.dir, `${cut.id}.gif`), cutGif(cut).bytes, GIF_BUDGET);
}
const total = written.reduce((sum, [, bytes]) => sum + bytes, 0);
console.log(`${written.length} files, ${total} B (${(total / 1024 / 1024).toFixed(2)} MB)`);
