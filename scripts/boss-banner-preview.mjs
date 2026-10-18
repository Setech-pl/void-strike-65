// feat/boss-banners (owner decisions AL 2 and AY): the boss loading screen
// with its banner as the game shows it. `node scripts/boss-banner-preview.mjs`
// reads the built disk (build/manifest.json: each region's boss, its banner
// picture, its runs) and the pictures in assets/graphics/boss-banners/, and
// writes to build/boss-banners/ (not committed):
//
//   r<N>-<picture>-1x.png   the whole screen, one Atari hires pixel a pixel
//   r<N>-<picture>-3x.png   the same, three times
//   pictures-4x.png         the four pictures alone, four times
//   banners.json            what this script prints: each region's picture,
//                           its packed size, its run and the entry's sectors
//
// The screen is drawn line by line from the display list the banner's set-up
// builds (src/hybrid/boss.s boss_banner; the layout is scripts/boss-banner.mjs):
// the narrow playfield (DMACTL $21, 32 bytes a mode F line, 256 hires pixels
// centred); 40 blank lines; the picture's 64 mode F lines - the stored half
// mirrored back, as the 6502 draws it; 10 blank; WARNING in ANTIC 7; 4 blank;
// the name in ANTIC 6; 3 blank; INCOMING in ANTIC 6; 12 blank; the bar's 8
// mode F lines, filled to `--bar=<pixels>` (64 by default). Glyphs from the
// game's frontend charset (scripts/preview.mjs readFrontendGraphicsSource);
// COLPF0 = COLPF1 = $0E (white), COLPF2 = COLBK = $00 (black); HSCROL 4 on the
// odd-length lines. tests/boss-banners.test.mjs checks the same screen in the
// 6502's memory.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { atariPalRegisterToRgb, encodePng, readFrontendGraphicsSource } from "./preview.mjs";
import {
  BANNER_BAR_DASH, BANNER_BAR_LINES, BANNER_BAR_PIXELS, BANNER_BYTES_PER_LINE, BANNER_HEIGHT, BANNER_HSCROL,
  BANNER_WHITE, BANNER_WIDTH, BANNER_TEXT_INCOMING, BANNER_TEXT_WARNING, bannerTextPlacement,
  encodeBannerPicture, expandBannerPayload, loadBannerChoices, readBannerPicture,
} from "./boss-banner.mjs";

const rootDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDirectory = path.join(rootDirectory, "build", "boss-banners");

const FRAME_WIDTH = 336;                          // hires pixels: the 320 window and 8 a side
const WINDOW_LEFT = 8;                            // the normal window's first pixel in the frame
const NARROW_LEFT = WINDOW_LEFT + 32;             // the narrow playfield: 256 pixels centred
const TOP_LINE = 24;                              // the first scanline drawn
const FRAME_LINES = 208;

const GLYPH = (character) => {
  if (character === " ") return 0;
  if (character >= "0" && character <= "9") return 1 + character.charCodeAt(0) - 48;
  if (character >= "A" && character <= "Z") return 11 + character.charCodeAt(0) - 65;
  return { "-": 37, ".": 38, "/": 39, ":": 40 }[character] ?? 41;
};

// The screen's lines, as the banner's display list draws them.
export function bannerScreenLines({ picture, name, barPixels }) {
  const lines = [];
  const blank = (count) => { for (let k = 0; k < count; k += 1) lines.push({ kind: "blank" }); };
  const fLine = (bytes20) => {
    const row = new Uint8Array(32);
    row.set(bytes20, 6);
    return { kind: "F", bytes: row };
  };
  blank(40);
  for (let y = 0; y < BANNER_HEIGHT; y += 1) {
    lines.push(fLine(picture.subarray(y * BANNER_BYTES_PER_LINE, (y + 1) * BANNER_BYTES_PER_LINE)));
  }
  blank(10);
  const text = (mode, string, line) => ({ kind: "text", mode, line, string });
  for (let k = 0; k < 16; k += 1) lines.push(text(7, BANNER_TEXT_WARNING, k));
  blank(4);
  for (let k = 0; k < 8; k += 1) lines.push(text(6, name.toUpperCase(), k));
  blank(3);
  for (let k = 0; k < 8; k += 1) lines.push(text(6, BANNER_TEXT_INCOMING, k));
  blank(12);
  const bar = (dash) => Uint8Array.from({ length: 20 }, (_, byte) => {
    let value = dash ? BANNER_BAR_DASH : 0;
    for (let bit = 0; bit < 8; bit += 1) if (byte * 8 + bit < barPixels) value |= 0x80 >> bit;
    return value;
  });
  for (const row of BANNER_BAR_LINES) lines.push(fLine(bar(row === "B")));
  return lines;
}

export function renderBannerScreen(lines, charset) {
  const on = atariPalRegisterToRgb(BANNER_WHITE);
  const off = atariPalRegisterToRgb(0x00);
  const rgb = Buffer.alloc(FRAME_WIDTH * FRAME_LINES * 3);
  for (let p = 0; p < FRAME_WIDTH * FRAME_LINES; p += 1) rgb.set(off, p * 3);
  const plot = (x, y) => { if (x >= 0 && x < FRAME_WIDTH && y >= 0 && y < FRAME_LINES) rgb.set(on, (y * FRAME_WIDTH + x) * 3); };
  lines.forEach((line, index) => {
    const y = 8 + index - TOP_LINE;               // the list starts at scanline 8
    if (y < 0 || y >= FRAME_LINES || line.kind === "blank") return;
    if (line.kind === "F") {
      line.bytes.forEach((byte, column) => {
        for (let bit = 0; bit < 8; bit += 1) if (byte & (0x80 >> bit)) plot(NARROW_LEFT + column * 8 + bit, y);
      });
      return;
    }
    // ANTIC 6 / 7: a glyph 8 colour clocks (16 hires pixels); byte k at
    // colour clock 48 + 8k + HSCROL on a scrolled line, 64 + 8k otherwise.
    const { scrolled, offset } = bannerTextPlacement(line.string);
    const glyphLine = line.mode === 7 ? line.line >> 1 : line.line;
    [...line.string].forEach((character, index2) => {
      const k = offset + index2;
      const colourClock = scrolled ? 48 + 8 * k + BANNER_HSCROL : 64 + 8 * k;
      const byte = charset[GLYPH(character) * 8 + glyphLine];
      for (let bit = 0; bit < 8; bit += 1) {
        if (!(byte & (0x80 >> bit))) continue;
        const x = NARROW_LEFT + (colourClock - 64) * 2 + bit * 2;
        plot(x, y);
        plot(x + 1, y);
      }
    });
  });
  return { width: FRAME_WIDTH, height: FRAME_LINES, rgb };
}

function scale(image, factor) {
  const rgb = Buffer.alloc(image.width * factor * image.height * factor * 3);
  for (let y = 0; y < image.height * factor; y += 1) {
    for (let x = 0; x < image.width * factor; x += 1) {
      const source = (Math.floor(y / factor) * image.width + Math.floor(x / factor)) * 3;
      image.rgb.copy(rgb, (y * image.width * factor + x) * 3, source, source + 3);
    }
  }
  return { width: image.width * factor, height: image.height * factor, rgb };
}

function picturesSheet(pictures, factor = 4, gap = 6) {
  const width = BANNER_WIDTH * factor + 2 * gap;
  const height = pictures.length * (BANNER_HEIGHT * factor + gap) + gap;
  const rgb = Buffer.alloc(width * height * 3, 0x3c);
  pictures.forEach((picture, index) => {
    for (let y = 0; y < BANNER_HEIGHT * factor; y += 1) {
      for (let x = 0; x < BANNER_WIDTH * factor; x += 1) {
        const px = Math.floor(x / factor);
        const py = Math.floor(y / factor);
        const v = picture[py * BANNER_BYTES_PER_LINE + (px >> 3)] & (0x80 >> (px & 7)) ? 0xeb : 0x08;
        rgb.fill(v, ((gap + index * (BANNER_HEIGHT * factor + gap) + y) * width + gap + x) * 3,
          ((gap + index * (BANNER_HEIGHT * factor + gap) + y) * width + gap + x) * 3 + 3);
      }
    }
  });
  return { width, height, rgb };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const barArgument = process.argv.find((argument) => argument.startsWith("--bar="));
  const barPixels = barArgument === undefined ? 64 : Math.min(BANNER_BAR_PIXELS, Number(barArgument.slice(6)));
  const manifest = JSON.parse(fs.readFileSync(path.join(rootDirectory, "build", "manifest.json"), "utf8"));
  const charset = readFrontendGraphicsSource(fs.readFileSync(path.join(rootDirectory, "src", "main.s"), "utf8")).frontendCharset;
  const { directory } = loadBannerChoices(rootDirectory);
  fs.mkdirSync(outputDirectory, { recursive: true });
  const rows = [];
  const pictures = [];
  manifest.boss.regions.forEach((region) => {
    const id = region.banner.picture;
    const stored = readBannerPicture(path.join(directory, `${id}.png`));
    // What the 6502 draws: the stored half, mirrored back.
    const picture = expandBannerPayload(encodeBannerPicture(stored, id).payload);
    pictures.push(picture);
    const screen = renderBannerScreen(bannerScreenLines({ picture, name: region.name, barPixels }), charset);
    const stem = `r${region.region}-${id}`;
    fs.writeFileSync(path.join(outputDirectory, `${stem}-1x.png`), encodePng(screen.rgb, screen.width, screen.height));
    const big = scale(screen, 3);
    fs.writeFileSync(path.join(outputDirectory, `${stem}-3x.png`), encodePng(big.rgb, big.width, big.height));
    rows.push({ region: region.region, boss: region.name, picture: id, packedBytes: region.banner.packedBytes,
      runBytes: region.banner.runBytes, runSectors: region.banner.runSectors, entrySectors: region.entrySectors,
      bossDataSectors: region.banner.bossDataSectors, barStep: region.banner.barStep });
  });
  const sheet = picturesSheet(pictures);
  fs.writeFileSync(path.join(outputDirectory, "pictures-4x.png"), encodePng(sheet.rgb, sheet.width, sheet.height));
  fs.writeFileSync(path.join(outputDirectory, "banners.json"), `${JSON.stringify(rows, null, 2)}\n`);
  console.log("region boss              picture               packed  run B  sectors  entry sectors  bar step");
  for (const row of rows) {
    console.log(`R${row.region}     ${row.boss.padEnd(17)} ${row.picture.padEnd(21)} ${String(row.packedBytes).padStart(6)}  ` +
      `${String(row.runBytes).padStart(5)}  ${String(row.runSectors).padStart(7)}  ${String(row.entrySectors).padStart(13)}  ` +
      `${String(row.barStep).padStart(8)}`);
  }
  console.log(`\nwrote ${path.relative(rootDirectory, outputDirectory)}/ (the bar at ${barPixels} of ${BANNER_BAR_PIXELS} pixels)`);
}
