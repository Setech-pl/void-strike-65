// The game's own display lettering for the GitHub pages: the frontend font of
// assets/graphics/frontend-h31.json (glyphs 1-43, seven rows of eight pixels;
// 1-10 the digits, 11-36 A-Z, then - . / : ? > |). Nothing is redrawn; the one
// addition is the acute accent the Polish badge needs ("WKRÓTCE"), built from
// the font's own O with a two-pixel stroke above it.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const definition = JSON.parse(fs.readFileSync(path.join(root, "assets", "graphics", "frontend-h31.json"), "utf8"));
const glyphRows = definition.fontRowsHex.map((hex) => [...Buffer.from(hex, "hex")]);

const CHARACTERS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-./:?>|";
export const GLYPH_WIDTH = 8;
export const GLYPH_HEIGHT = 7;
// Rows above the cap height that an accent may use; every line reserves them so
// accented and plain text share one baseline.
export const ACCENT_ROWS = 2;
const ACUTE = [0b00001100, 0b00011000];

function glyph(character) {
  if (character === " ") return new Array(GLYPH_HEIGHT).fill(0);
  if (character === "Ó") return glyph("O");
  const index = CHARACTERS.indexOf(character);
  if (index < 0) throw new Error(`font: no glyph for ${JSON.stringify(character)}`);
  return glyphRows[index];
}

// A bitmap { width, height, bit(x, y) } of the text, ACCENT_ROWS + 7 rows tall.
// The font's last column is its letter spacing; the trailing one is dropped.
export function textBitmap(text, { accentRows = ACCENT_ROWS } = {}) {
  const characters = [...text.toUpperCase()];
  const width = characters.length * GLYPH_WIDTH - 1;
  const height = accentRows + GLYPH_HEIGHT;
  const bits = new Uint8Array(width * height);
  characters.forEach((character, index) => {
    const rows = glyph(character);
    const x0 = index * GLYPH_WIDTH;
    rows.forEach((row, y) => {
      for (let x = 0; x < GLYPH_WIDTH; x += 1) {
        if (x0 + x < width && row & (0x80 >> x)) bits[(y + accentRows) * width + x0 + x] = 1;
      }
    });
    if (character === "Ó") {
      if (accentRows < 2) throw new Error("font: Ó needs two accent rows");
      ACUTE.forEach((row, y) => {
        for (let x = 0; x < GLYPH_WIDTH; x += 1) {
          if (row & (0x80 >> x)) bits[(accentRows - 2 + y) * width + x0 + x] = 1;
        }
      });
    }
  });
  return { width, height, bit: (x, y) => bits[y * width + x] === 1 };
}
