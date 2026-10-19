// "Artistic" high-resolution cards of in-game stills, three house-style
// candidates for the Enemies and Bosses pages
// (docs/plans/enemies-bosses-pages.md §3):
//   a  clean pixels on a dark gradient card, the name in the game's lettering;
//   b  CRT: scanline gaps, a slight bloom, a phosphor tint;
//   c  clean pixels with a thin outline glow and a vignette.
// The subject is the emulator's own crop (scripts/pages/stills.mjs) enlarged to
// eight pixels per scanline at the PAL pixel aspect; nothing is drawn by hand.
// The card's colours are Atari PAL values as Atari800 shows them.
//
//   node scripts/pages/art.mjs --ids=raider,breaker [--spec=scripts/pages/stills.json] [--out=build/pages/art]

import fs from "node:fs";
import path from "node:path";
import { atari800PalRgb } from "../atari800-pal-palette.mjs";
import { textBitmap } from "./font.mjs";
import { createImage, encodePng } from "./png.mjs";
import {
  PAL_HIRES_PIXEL_ASPECT, addLight, blur, draw, keyOut, pad, scaleToPalAspect,
  textImage, tint, verticalGradient, vignette,
} from "./image.mjs";
import { loadStill } from "./stills.mjs";

const SCALE = 8;
const BLACK = atari800PalRgb(0x00);           // the playfield's background, keyed out
const CARD_TOP = atari800PalRgb(0x00);
const CARD_BOTTOM = atari800PalRgb(0x82);     // the allied steel's hue, darkest
const NAME = atari800PalRgb(0x0e);            // the frontend's white
const LABEL = atari800PalRgb(0x1e);           // the frontend's amber
const GLOW = atari800PalRgb(0x8c);            // a light allied steel
const BADGE_GREEN = atari800PalRgb(0xba);

// The card layout shared by all three styles: the subject centred above its
// name (the game font as ANTIC mode 7 draws it: a font pixel is one colour
// clock by two scanlines, here 2 x aspect x unit by 2 x unit) and a label.
function layout(subject, sprite) {
  const name = textBitmap(subject.name, { accentRows: 0 });
  const label = textBitmap(subject.label, { accentRows: 0 });
  const margin = Math.round(Math.max(64, sprite.height * 0.35));
  const width = Math.max(sprite.width + margin * 2, 720);
  const clock = 2 * PAL_HIRES_PIXEL_ASPECT; // one colour clock, in scanline heights
  const nameUnit = Math.max(2, Math.min(5, Math.floor((width * 0.8) / (name.width * clock))));
  const labelUnit = Math.max(1, Math.round(nameUnit * 0.6));
  const nameImage = textImage(name, NAME, nameUnit * clock, nameUnit * 2);
  const labelImage = textImage(label, LABEL, labelUnit * clock, labelUnit * 2);
  const gap = Math.round(nameUnit * 8);
  const height = margin + sprite.height + gap + nameImage.height + gap * 0.75 + labelImage.height + margin;
  return {
    width, height, nameImage, labelImage,
    sprite: { x: Math.round((width - sprite.width) / 2), y: margin },
    name: { x: Math.round((width - nameImage.width) / 2), y: margin + sprite.height + gap },
    label: { x: Math.round((width - labelImage.width) / 2), y: Math.round(margin + sprite.height + gap + nameImage.height + gap * 0.75) },
  };
}

function badge(card, subject, at) {
  if (!subject.comingSoon) return;
  const text = textBitmap("COMING SOON", { accentRows: 0 });
  const unit = Math.max(2, Math.round(at.unit));
  const plate = createImage(Math.round(text.width * unit + unit * 6), text.height * unit + unit * 4, 4, [...BADGE_GREEN, 255]);
  draw(plate, textImage(text, BLACK, unit, unit), unit * 3, unit * 2);
  draw(card, plate, at.x, at.y);
}

function cardBase(l) {
  return verticalGradient(l.width, l.height, CARD_TOP, CARD_BOTTOM);
}

function styleA(subject, sprite) {
  const l = layout(subject, sprite);
  const card = cardBase(l);
  draw(card, sprite, l.sprite.x, l.sprite.y);
  draw(card, l.nameImage, l.name.x, l.name.y);
  draw(card, l.labelImage, l.label.x, l.label.y);
  badge(card, subject, { x: l.name.x + l.nameImage.width + 24, y: l.name.y, unit: l.nameImage.height / 14 });
  return card;
}

// CRT: the card in black, the image's light bloomed, every scanline's last two
// output rows dimmed to a gap, a slight green-white phosphor tint and a faint
// RGB aperture mask.
function styleB(subject, sprite) {
  const l = layout(subject, sprite);
  const card = createImage(l.width, l.height, 4, [...CARD_TOP, 255]);
  draw(card, sprite, l.sprite.x, l.sprite.y);
  draw(card, l.nameImage, l.name.x, l.name.y);
  draw(card, l.labelImage, l.label.x, l.label.y);
  badge(card, subject, { x: l.name.x + l.nameImage.width + 24, y: l.name.y, unit: l.nameImage.height / 14 });
  const bloom = blur(card, Math.round(SCALE * 1.5));
  addLight(card, bloom, 0, 0, 0.55);
  for (let y = 0; y < card.height; y += 1) {
    const phase = (y - l.sprite.y) & (SCALE - 1);
    const rowGain = phase >= SCALE - 2 ? 0.45 : phase === 0 ? 0.9 : 1;
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
function styleC(subject, sprite) {
  const l = layout(subject, sprite);
  const card = cardBase(l);
  const margin = SCALE * 3;
  const halo = blur(pad(tint(sprite, GLOW), margin), Math.round(SCALE * 0.75), 2);
  addLight(card, halo, l.sprite.x - margin, l.sprite.y - margin, 1.1);
  draw(card, sprite, l.sprite.x, l.sprite.y);
  draw(card, l.nameImage, l.name.x, l.name.y);
  draw(card, l.labelImage, l.label.x, l.label.y);
  badge(card, subject, { x: l.name.x + l.nameImage.width + 24, y: l.name.y, unit: l.nameImage.height / 14 });
  return vignette(card, 0.55);
}

export const STYLES = { a: styleA, b: styleB, c: styleC };

if (import.meta.url === `file://${process.argv[1]}`) {
  const arg = (name, fallback) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=")[1] ?? fallback;
  const spec = JSON.parse(fs.readFileSync(arg("spec", "scripts/pages/stills.json"), "utf8"));
  const out = arg("out", "build/pages/art");
  const ids = arg("ids", "").split(",").filter(Boolean);
  fs.mkdirSync(out, { recursive: true });
  for (const id of ids) {
    const subject = spec.subjects.find((s) => s.id === id);
    if (!subject) throw new Error(`art: no subject ${id}`);
    const sprite = scaleToPalAspect(keyOut(loadStill(subject), BLACK), SCALE);
    for (const [style, render] of Object.entries(STYLES)) {
      const file = path.join(out, `${id}-${style}.png`);
      fs.writeFileSync(file, encodePng(render(subject, sprite)));
      console.log(file);
    }
  }
}
