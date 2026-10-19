// The pictures of the Enemies and Bosses pages
// (docs/plans/enemies-bosses-pages.md §3): an in-game still in a house style.
//   a  clean pixels on a dark gradient card, the name in the game's lettering;
//   b  CRT: scanline gaps, a slight bloom, a phosphor tint - THE PAGES' STYLE
//      (the owner's choice of 2026-10-19);
//   c  clean pixels with a thin outline glow and a vignette.
// The subject is the emulator's own crop (scripts/pages/stills.mjs) enlarged to
// `scale` pixels per scanline at the PAL pixel aspect; nothing is drawn by hand.
// A "card" subject gets its name under it (and a skin's name in amber); a
// "plain" subject (scenes, boss stages) is the shot alone. No descriptive text
// is ever drawn, so one image serves the English and the Polish page. The
// output is quantised to a 256-colour palette (scripts/pages/png.mjs).
//
//   node scripts/pages/art.mjs --ids=raider,breaker [--styles=a,b,c] [--scale=8]
//        [--spec=scripts/pages/stills.json] [--out=build/pages/art]

import fs from "node:fs";
import path from "node:path";
import { atari800PalRgb } from "../atari800-pal-palette.mjs";
import { textBitmap } from "./font.mjs";
import { createImage, encodeIndexedPng, quantise } from "./png.mjs";
import {
  PAL_HIRES_PIXEL_ASPECT, addLight, blur, draw, keyOut, pad, scaleToPalAspect,
  textImage, tint, verticalGradient, vignette,
} from "./image.mjs";
import { loadStill } from "./stills.mjs";

const BLACK = atari800PalRgb(0x00);           // the playfield's background
const CARD_TOP = atari800PalRgb(0x00);
const CARD_BOTTOM = atari800PalRgb(0x82);     // the allied steel's hue, darkest
const NAME = atari800PalRgb(0x0e);            // the frontend's white
const LABEL = atari800PalRgb(0x1e);           // the frontend's amber
const GLOW = atari800PalRgb(0x8c);            // a light allied steel

// The card layout: the subject centred above its name (the game font as ANTIC
// mode 7 draws it: a font pixel is one colour clock by two scanlines) and, for
// a skin, the skin's name. A plain subject: the shot with a black border.
function layout(subject, sprite, scale) {
  if (!subject.card) {
    const margin = scale * 4;
    return { width: sprite.width + margin * 2, height: sprite.height + margin * 2, sprite: { x: margin, y: margin }, text: [] };
  }
  const margin = Math.round(Math.max(8 * scale, sprite.height * 0.35));
  const width = Math.max(sprite.width + margin * 2, 90 * scale);
  const clock = 2 * PAL_HIRES_PIXEL_ASPECT; // one colour clock, in scanline heights
  const name = textBitmap(subject.name, { accentRows: 0 });
  const nameUnit = Math.max(2, Math.min(Math.round(scale * 0.625), Math.floor((width * 0.8) / (name.width * clock))));
  const lines = [textImage(name, NAME, nameUnit * clock, nameUnit * 2)];
  if (subject.label) {
    const labelUnit = Math.max(1, Math.round(nameUnit * 0.6));
    lines.push(textImage(textBitmap(subject.label, { accentRows: 0 }), LABEL, labelUnit * clock, labelUnit * 2));
  }
  const gap = Math.round(nameUnit * 8);
  let y = margin + sprite.height + gap;
  const text = lines.map((image) => {
    const at = { image, x: Math.round((width - image.width) / 2), y };
    y += image.height + Math.round(gap * 0.75);
    return at;
  });
  return { width, height: y - Math.round(gap * 0.75) + margin, sprite: { x: Math.round((width - sprite.width) / 2), y: margin }, text };
}

function compose(base, l, sprite) {
  draw(base, sprite, l.sprite.x, l.sprite.y);
  for (const t of l.text) draw(base, t.image, t.x, t.y);
  return base;
}

function styleA(subject, sprite, scale) {
  const l = layout(subject, sprite, scale);
  return compose(verticalGradient(l.width, l.height, CARD_TOP, CARD_BOTTOM), l, sprite);
}

// CRT: black, the image's light bloomed, every scanline's last quarter of
// output rows dimmed to a gap, a faint RGB aperture mask, a slight
// green-white phosphor tint and a vignette.
function styleB(subject, sprite, scale) {
  const l = layout(subject, sprite, scale);
  const card = compose(createImage(l.width, l.height, 4, [...CARD_TOP, 255]), l, sprite);
  addLight(card, blur(card, Math.round(scale * 1.5)), 0, 0, 0.55);
  const gapRows = Math.max(1, Math.round(scale / 4));
  for (let y = 0; y < card.height; y += 1) {
    const phase = (((y - l.sprite.y) % scale) + scale) % scale;
    const rowGain = phase >= scale - gapRows ? 0.45 : phase === 0 ? 0.9 : 1;
    for (let x = 0; x < card.width; x += 1) {
      const o = (y * card.width + x) * 4;
      const mask = [[1, 0.88, 0.88], [0.88, 1, 0.88], [0.88, 0.88, 1]][x % 3];
      const phosphor = [0.94, 1, 0.9];
      for (let c = 0; c < 3; c += 1) card.data[o + c] = Math.min(255, Math.round(card.data[o + c] * rowGain * mask[c] * phosphor[c]));
    }
  }
  return vignette(card, 0.35);
}

// Clean pixels, a thin steel glow around the silhouette, a vignette.
function styleC(subject, sprite, scale) {
  const l = layout(subject, sprite, scale);
  const card = verticalGradient(l.width, l.height, CARD_TOP, CARD_BOTTOM);
  const margin = scale * 3;
  addLight(card, blur(pad(tint(sprite, GLOW), margin), Math.round(scale * 0.75), 2), l.sprite.x - margin, l.sprite.y - margin, 1.1);
  return vignette(compose(card, l, sprite), 0.55);
}

export const STYLES = { a: styleA, b: styleB, c: styleC };

// The subject's picture in one style, as PNG bytes (256-colour palette).
export function renderArt(subject, style = "b", scale = 8) {
  const sprite = scaleToPalAspect(subject.card ? keyOut(loadStill(subject), BLACK) : loadStill(subject), scale);
  return encodeIndexedPng(quantise(STYLES[style](subject, sprite, scale), 256));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const arg = (name, fallback) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=")[1] ?? fallback;
  const spec = JSON.parse(fs.readFileSync(arg("spec", "scripts/pages/stills.json"), "utf8"));
  const out = arg("out", "build/pages/art");
  const ids = arg("ids", "").split(",").filter(Boolean);
  const styles = arg("styles", "a,b,c").split(",");
  const scale = Number(arg("scale", "8"));
  fs.mkdirSync(out, { recursive: true });
  for (const id of ids) {
    const subject = spec.subjects.find((s) => s.id === id);
    if (!subject) throw new Error(`art: no subject ${id}`);
    for (const style of styles) {
      const file = path.join(out, `${id}-${style}.png`);
      const bytes = renderArt(subject, style, scale);
      fs.writeFileSync(file, bytes);
      console.log(`${file} ${bytes.length} B`);
    }
  }
}
