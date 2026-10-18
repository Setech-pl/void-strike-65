// feat/boss-banners, Phase A (owner decision AL 2): the boss loading screen
// with its banner as the game would show it, and what each banner costs the
// boss entry. `node scripts/boss-banner-preview.mjs` reads the pictures in
// assets/graphics/boss-banners/ (drawn by scripts/boss-banner-art.mjs) and the
// built disk's boss order and names (build/manifest.json), and writes to
// build/boss-banners/ (not committed):
//
//   r<N>-<picture>-1x.png   the whole screen, one Atari hires pixel a pixel
//   r<N>-<picture>-3x.png   the same, three times
//   pictures-4x.png         every picture alone, four times
//   cost.json               the cost table this script prints
//
// The screen is modelled line by line as the proposed display list draws it:
// the narrow playfield (DMACTL $21, 32 bytes a mode F line, 256 hires pixels
// centred); 64 mode F lines with the picture's 20 bytes in the middle of
// each; WARNING in ANTIC 7, the boss's name and INCOMING in ANTIC 6, the
// loading bar in ANTIC 2 - every glyph from the game's frontend charset
// (scripts/preview.mjs readFrontendGraphicsSource); COLPF0 = COLPF1 = $0E
// (white), COLPF2 = COLBK = $00 (black). No DLI: one set of colours.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { packBroadsideLzss, unpackBroadsideLzss } from "./broadside-lzss.mjs";
import {
  atariPalRegisterToRgb, decodeRgbaReferencePng, encodePng, readFrontendGraphicsSource,
} from "./preview.mjs";
import { BANNER_DIRECTORY, BANNER_HEIGHT, BANNER_WIDTH, BANNERS } from "./boss-banner-art.mjs";

const rootDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDirectory = path.join(rootDirectory, "build", "boss-banners");

const BYTES_PER_LINE = BANNER_WIDTH / 8;          // 20
const SECTOR_BYTES = 128;

// ---------------------------------------------------------------------------
// The cost model (docs/plans/boss-banners.md §3)
// ---------------------------------------------------------------------------

// MEASURED on main f8557e3 (STATUS, boss-order-scale table; the routes):
// each region's boss entry today, host frames and sectors.
export const ENTRY_NOW = Object.freeze({
  1: { frames: 257, sectors: 67 },
  2: { frames: 272, sectors: 71 },
  3: { frames: 268, sectors: 70 },
  4: { frames: 272, sectors: 71 },
});
export const ENTRY_LIMIT_FRAMES = 300;            // owner decision AV
// MEASURED: one more sector at the boss entry costs 3.67-4.0 host frames
// (boss-art -> boss-order-scale: 65 -> 67 sectors 249 -> 257; 67 / 70 / 71
// sectors 257 / 268 / 272). The model uses 3.75.
export const FRAMES_PER_SECTOR = 3.75;
// The region's theme run today: 2 sectors - the theme (at most 184 B, copied
// over the level's track), the cold tail (32 B) and the title records (40 B).
export const THEME_RUN_SECTORS_NOW = 2;
export const THEME_BYTES = 184;
// ESTIMATE (instruction counts, not assembled; +-50 B): the banner code the
// region run carries, 350 B -
//   the cold tail's part (the theme's start, the jump)                    6
//   the screen: the rows' clear, the display list (its header, the 64
//     LMS lines by a loop, the text tail), colours, HSCROL, the switch
//     on a frame edge                                                   110
//   the picture: the resident decoder's operands, the mirror into the
//     screen rows, a 16-B nibble-reverse table                            83
//   the title's records drawn (the records are counted per region)         7
//   the boss data one sector at a time: a run reader, the bar's step,
//     the boss code's run checked as today (guard_begin / guard_check),
//     the head's region index, its eight runs and its fold               131
//   the hand-over: the display off, the PMG area cleared, the jump to
//     boss_head_check                                                     13
export const BANNER_CODE_BYTES = 350;
// ESTIMATE: the part of that code option L moves into the level image's
// padding, which the level read already carries (13 sectors, unchanged):
// the run reader, the bar's step and the hand-over (~76 B) into the music
// block's free tail $A817-$A87F (105 B; the theme's copy ends at $A816), and
// the picture's unpack, mirror and table and the title's call (~90 B) into
// $A998-$A9FF after the hull block (104 B; band A lands there later).
export const LEVEL_IMAGE_CODE_BYTES = 165;
// MEASURED (the resident LZ-10/5 decoder, broadside_unpack_command, on the
// 6502 core over these pictures): 57.6-63.6 cycles an output byte; 60 used.
export const DECODE_CYCLES_PER_BYTE = 60;
// ESTIMATE: CPU cycles a PAL frame while the banner screen shows (35,568
// less refresh 2,808, the picture's 2,048 and the text's ~850 DMA cycles).
export const CPU_CYCLES_PER_FRAME = 29_800;
// ESTIMATE: the rest of the screen's fixed time - the mirror into the screen
// rows (~25,000 cycles), the display list, text and clears (~10,000), the
// wait for a frame edge (0.5 frame on average).
export const SETUP_FRAMES_BEYOND_DECODE = 1.7;
export const setupFrames = (payloadBytes) =>
  (payloadBytes * DECODE_CYCLES_PER_BYTE) / CPU_CYCLES_PER_FRAME + SETUP_FRAMES_BEYOND_DECODE;
// The title records: {lo, hi, text, $00} for WARNING, the name, INCOMING; $FF.
export const titleRecordBytes = (name) => (2 + 7 + 1) + (2 + name.length + 1) + (2 + 8 + 1) + 1;

// Option P (MEASURED sizes, ESTIMATE time): each region's band A, band B,
// charset and block runs LZ-10/5-packed on the disk, read to a landing area
// and unpacked by the resident decoder - the sectors that saves, less the
// decode's frames. +30 B of code (ESTIMATE) for the landing and the call.
export const PACKED_RUN_CODE_BYTES = 30;
export function packedRegionRuns(manifest, region, readRun) {
  let saved = 0;
  let decodeBytes = 0;
  for (const kind of ["band-a", "band-b", "charset", "block"]) {
    const run = manifest.boss.runs.find((entry) => entry.name === `boss-region-${region}-${kind}`);
    const bytes = readRun(run.file);
    saved += run.sectors - Math.ceil(packBroadsideLzss(bytes).length / SECTOR_BYTES);
    decodeBytes += bytes.length;
  }
  const decodeFrames = (decodeBytes * DECODE_CYCLES_PER_BYTE) / CPU_CYCLES_PER_FRAME;
  return { sectorsSaved: saved, decodeFrames, netFrames: -saved * FRAMES_PER_SECTOR + decodeFrames };
}

// ---------------------------------------------------------------------------
// Pictures
// ---------------------------------------------------------------------------

export function readBannerPicture(id) {
  const file = path.join(BANNER_DIRECTORY, `${id}.png`);
  const image = decodeRgbaReferencePng(fs.readFileSync(file));
  if (image.width !== BANNER_WIDTH || image.height !== BANNER_HEIGHT) {
    throw new Error(`${file} is ${image.width} x ${image.height}; a banner is ${BANNER_WIDTH} x ${BANNER_HEIGHT}`);
  }
  const bytes = new Uint8Array(BYTES_PER_LINE * BANNER_HEIGHT);
  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      const [r, g, b, a] = image.rgba.subarray((y * image.width + x) * 4, (y * image.width + x) * 4 + 4);
      const white = a === 255 && r === 255 && g === 255 && b === 255;
      const black = a === 255 && r === 0 && g === 0 && b === 0;
      if (!white && !black) throw new Error(`${file} pixel (${x}, ${y}) is neither black nor white`);
      if (white) bytes[y * BYTES_PER_LINE + (x >> 3)] |= 0x80 >> (x & 7);
    }
  }
  return bytes;
}

const reverseBits = (byte) => {
  let out = 0;
  for (let bit = 0; bit < 8; bit += 1) if (byte & (1 << bit)) out |= 0x80 >> bit;
  return out;
};

// The proposed encoding: a picture whose outer 64 pixels a side mirror each
// other keeps only the left 12 bytes of a line (the left half and the centre
// 32 pixels, which may differ - a core's shine); the unpack mirrors bytes 0-7
// into 19-12. Any other picture is kept whole.
export function encodeBanner(bytes) {
  let mirrored = true;
  for (let y = 0; y < BANNER_HEIGHT && mirrored; y += 1) {
    for (let k = 0; k < 8; k += 1) {
      if (bytes[y * BYTES_PER_LINE + 12 + k] !== reverseBits(bytes[y * BYTES_PER_LINE + 7 - k])) {
        mirrored = false;
        break;
      }
    }
  }
  const keep = mirrored ? 12 : BYTES_PER_LINE;
  const payload = new Uint8Array(keep * BANNER_HEIGHT);
  for (let y = 0; y < BANNER_HEIGHT; y += 1) payload.set(bytes.subarray(y * BYTES_PER_LINE, y * BYTES_PER_LINE + keep), y * keep);
  const packed = packBroadsideLzss(payload);
  const check = unpackBroadsideLzss(packed, payload.length);
  if (!Buffer.from(check).equals(Buffer.from(payload))) throw new Error("the banner's LZ stream does not unpack to its payload");
  return { format: mirrored ? "mirror-12" : "whole", payloadBytes: payload.length, packedBytes: packed.length,
    wholePackedBytes: packBroadsideLzss(bytes).length };
}

export function bannerCost({ region, name, packedBytes, payloadBytes, codeBytes = BANNER_CODE_BYTES }) {
  const runBytes = THEME_BYTES + codeBytes + titleRecordBytes(name) + packedBytes;
  const runSectors = Math.ceil(runBytes / SECTOR_BYTES);
  const addedSectors = runSectors - THEME_RUN_SECTORS_NOW;
  const addedFrames = addedSectors * FRAMES_PER_SECTOR + setupFrames(payloadBytes);
  const now = ENTRY_NOW[region];
  const entryFrames = now.frames + addedFrames;
  return { runBytes, runSectors, addedSectors, addedFrames, entrySectors: now.sectors + addedSectors,
    entryFrames, headroom: ENTRY_LIMIT_FRAMES - entryFrames };
}

// ---------------------------------------------------------------------------
// The screen
// ---------------------------------------------------------------------------

const FRAME_WIDTH = 336;                          // hires pixels: the 320 window and 8 a side
const WINDOW_LEFT = 8;                            // the normal window's first pixel in the frame
const NARROW_LEFT = WINDOW_LEFT + 32;             // the narrow playfield: 256 pixels centred
const TOP_LINE = 24;                              // the first scanline drawn
const FRAME_LINES = 208;

const ASCII_TO_GLYPH = (character) => {
  if (character === " ") return 0;
  if (character >= "0" && character <= "9") return 1 + character.charCodeAt(0) - 48;
  if (character >= "A" && character <= "Z") return 11 + character.charCodeAt(0) - 65;
  return { "-": 37, ".": 38, "/": 39, ":": 40 }[character] ?? 41;
};
export const BAR_CELLS = 20;
const GLYPH_BAR_FULL = 48;                        // CH_FRONT_LINE: the solid cell
const GLYPH_BAR_EMPTY = 37;                       // CH_FRONT_DASH

// The display list as lines: blank runs, the 64 picture lines, the text rows.
export function bannerScreenLines({ picture, name, filled }) {
  const lines = [];
  const blank = (count) => { for (let k = 0; k < count; k += 1) lines.push({ kind: "blank" }); };
  blank(8 + 24 + 8);                              // DL start, 3 x $70, one more $70
  for (let y = 0; y < BANNER_HEIGHT; y += 1) {
    const row = new Uint8Array(32);
    row.set(picture.subarray(y * BYTES_PER_LINE, (y + 1) * BYTES_PER_LINE), 6);
    lines.push({ kind: "F", bytes: row });
  }
  blank(10);
  const text = (mode, string) => ({ kind: "text", mode, codes: [...string].map(ASCII_TO_GLYPH) });
  for (let k = 0; k < 16; k += 1) lines.push({ ...text(7, "WARNING"), line: k });
  blank(4);
  for (let k = 0; k < 8; k += 1) lines.push({ ...text(6, name.toUpperCase()), line: k });
  blank(3);
  for (let k = 0; k < 8; k += 1) lines.push({ ...text(6, "INCOMING"), line: k });
  blank(12);
  const bar = Array.from({ length: BAR_CELLS }, (_, cell) => (cell < filled ? GLYPH_BAR_FULL : GLYPH_BAR_EMPTY));
  for (let k = 0; k < 8; k += 1) lines.push({ kind: "text", mode: 2, codes: bar, line: k });
  return lines;
}

export function renderBannerScreen(lines, charset, { white = 0x0e, black = 0x00 } = {}) {
  const on = atariPalRegisterToRgb(white);
  const off = atariPalRegisterToRgb(black);
  const rgb = Buffer.alloc(FRAME_WIDTH * FRAME_LINES * 3);
  for (let p = 0; p < FRAME_WIDTH * FRAME_LINES; p += 1) rgb.set(off, p * 3);
  const plot = (x, y) => { if (x >= 0 && x < FRAME_WIDTH && y >= 0 && y < FRAME_LINES) rgb.set(on, (y * FRAME_WIDTH + x) * 3); };
  lines.forEach((line, scanline) => {
    const y = scanline - TOP_LINE;
    if (y < 0 || y >= FRAME_LINES || line.kind === "blank") return;
    if (line.kind === "F") {
      line.bytes.forEach((byte, index) => {
        for (let bit = 0; bit < 8; bit += 1) if (byte & (0x80 >> bit)) plot(NARROW_LEFT + index * 8 + bit, y);
      });
      return;
    }
    // ANTIC 2: 8 hires pixels a glyph, one glyph line a scanline; ANTIC 6:
    // 16 pixels (a bit a colour clock), one glyph line a scanline; ANTIC 7:
    // as 6, each glyph line two scanlines. Centred in the narrow window (an
    // odd count of wide glyphs is the HSCROL line's half-glyph shift).
    const width = line.mode === 2 ? 8 : 16;
    const glyphLine = line.mode === 7 ? line.line >> 1 : line.line;
    const left = NARROW_LEFT + (256 - line.codes.length * width) / 2;
    line.codes.forEach((code, index) => {
      const byte = charset[code * 8 + glyphLine];
      for (let bit = 0; bit < 8; bit += 1) {
        if (!(byte & (0x80 >> bit))) continue;
        if (width === 8) plot(left + index * 8 + bit, y);
        else { plot(left + index * 16 + bit * 2, y); plot(left + index * 16 + bit * 2 + 1, y); }
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
        const v = picture[py * BYTES_PER_LINE + (px >> 3)] & (0x80 >> (px & 7)) ? 0xeb : 0x08;
        rgb.fill(v, ((gap + index * (BANNER_HEIGHT * factor + gap) + y) * width + gap + x) * 3,
          ((gap + index * (BANNER_HEIGHT * factor + gap) + y) * width + gap + x) * 3 + 3);
      }
    }
  });
  return { width, height, rgb };
}

// ---------------------------------------------------------------------------

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const manifest = JSON.parse(fs.readFileSync(path.join(rootDirectory, "build", "manifest.json"), "utf8"));
  const order = manifest.boss.order;              // order[k] = the directory region k + 1 shows
  const charset = readFrontendGraphicsSource(fs.readFileSync(path.join(rootDirectory, "src", "main.s"), "utf8")).frontendCharset;
  fs.mkdirSync(outputDirectory, { recursive: true });
  const rows = [];
  const pictures = [];
  for (const banner of BANNERS) {
    const region = order.indexOf(banner.directory) + 1;
    const { name } = manifest.boss.regions[region - 1];
    const picture = readBannerPicture(banner.id);
    pictures.push(picture);
    const encoding = encodeBanner(picture);
    const cost = bannerCost({ region, name, packedBytes: encoding.packedBytes, payloadBytes: encoding.payloadBytes });
    const costL = bannerCost({ region, name, packedBytes: encoding.packedBytes, payloadBytes: encoding.payloadBytes,
      codeBytes: BANNER_CODE_BYTES - LEVEL_IMAGE_CODE_BYTES });
    const costLP = bannerCost({ region, name, packedBytes: encoding.packedBytes, payloadBytes: encoding.payloadBytes,
      codeBytes: BANNER_CODE_BYTES - LEVEL_IMAGE_CODE_BYTES + PACKED_RUN_CODE_BYTES });
    const packedRuns = packedRegionRuns(manifest, region,
      (file) => new Uint8Array(fs.readFileSync(path.join(rootDirectory, "build", file))));
    costLP.entryFrames += packedRuns.netFrames;
    costLP.entrySectors -= packedRuns.sectorsSaved;
    costLP.headroom = ENTRY_LIMIT_FRAMES - costLP.entryFrames;
    rows.push({ region, boss: name, picture: banner.id, variant: banner.variant ?? null, ...encoding,
      cost, withLevelImageCode: costL, withLevelImageCodeAndPackedRuns: { ...costLP, packedRuns } });
    const screen = renderBannerScreen(bannerScreenLines({ picture, name, filled: 8 }), charset);
    const stem = `r${region}-${banner.id}`;
    fs.writeFileSync(path.join(outputDirectory, `${stem}-1x.png`), encodePng(screen.rgb, screen.width, screen.height));
    const big = scale(screen, 3);
    fs.writeFileSync(path.join(outputDirectory, `${stem}-3x.png`), encodePng(big.rgb, big.width, big.height));
  }
  const sheet = picturesSheet(pictures);
  fs.writeFileSync(path.join(outputDirectory, "pictures-4x.png"), encodePng(sheet.rgb, sheet.width, sheet.height));
  fs.writeFileSync(path.join(outputDirectory, "cost.json"), `${JSON.stringify(rows, null, 2)}\n`);
  rows.sort((a, b) => a.region - b.region);
  console.log("region boss              picture               format     packed  (whole)  run B  sectors +  frames +  entry  left | L: entry left | L+P: entry left");
  for (const row of rows) {
    console.log(`R${row.region}     ${row.boss.padEnd(17)} ${row.picture.padEnd(21)} ${row.format.padEnd(9)} ` +
      `${String(row.packedBytes).padStart(6)}  (${String(row.wholePackedBytes).padStart(5)})  ${String(row.cost.runBytes).padStart(5)}  ` +
      `${String(row.cost.addedSectors).padStart(9)}  ${row.cost.addedFrames.toFixed(1).padStart(8)}  ${row.cost.entryFrames.toFixed(1).padStart(5)}  ` +
      `${row.cost.headroom.toFixed(1).padStart(5)} | ${row.withLevelImageCode.entryFrames.toFixed(1).padStart(5)} ${row.withLevelImageCode.headroom.toFixed(1).padStart(5)}` +
      ` | ${row.withLevelImageCodeAndPackedRuns.entryFrames.toFixed(1).padStart(5)} ${row.withLevelImageCodeAndPackedRuns.headroom.toFixed(1).padStart(5)}` +
      ` (P: -${row.withLevelImageCodeAndPackedRuns.packedRuns.sectorsSaved} sectors, +${row.withLevelImageCodeAndPackedRuns.packedRuns.decodeFrames.toFixed(1)} decode)`);
  }
  console.log(`\nwrote ${path.relative(rootDirectory, outputDirectory)}/`);
}
