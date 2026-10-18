// feat/boss-banners, Phase B (owner decisions AL 2 and AY, docs/plans/
// boss-banners.md): the boss loading screen's banner - each boss's 160 x 64
// picture over WARNING, its name and INCOMING, and a loading bar that fills
// once per sector of the boss's data. This module is the format: the screen's
// layout in RAM, the picture's encoding, the title's records and the per-region
// data block the build appends to the boss link's banner code in every
// region's banner run. scripts/build.mjs, scripts/boss-banner-preview.mjs and
// the tests read it; src/hybrid/boss.s reads the same constants through
// build/boss-layout.inc (renderBossBannerInclude).
//
// The pictures are assets/graphics/boss-banners/<id>.png (drawn by
// scripts/boss-banner-art.mjs, editable by hand); banners.json names the one
// each boss directory shows.
import fs from "node:fs";
import path from "node:path";

import { packBroadsideLzss, unpackBroadsideLzss } from "./broadside-lzss.mjs";
import { decodeRgbaReferencePng } from "./preview.mjs";

export const BANNER_WIDTH = 160;
export const BANNER_HEIGHT = 64;
export const BANNER_BYTES_PER_LINE = BANNER_WIDTH / 8;          // 20
// The stored half: the left 12 bytes of a line - the left 64 pixels and the
// centre 32, which may differ from a mirror (a core's shine); the screen's
// bytes 12-19 are bytes 7-0 mirrored.
export const BANNER_KEPT_BYTES = 12;
export const BANNER_MIRRORED_BYTES = 8;
export const BANNER_PAYLOAD_BYTES = BANNER_KEPT_BYTES * BANNER_HEIGHT;   // 768

// The screen (narrow playfield, DMACTL $21: 32 B a mode F line, the picture's
// 20 in the middle). A line is 26 B apart in RAM - its 6 blank bytes, the 20,
// and the next line's 6 blank shown as its right margin - each with its own
// LMS. Lines 0-48 in the PMG area (cleared at every boss entry and idle until
// the install), lines 49-63 from $4000 (the text screen's rows 0-9, the
// WARNING screen's; the summary's dotted row at $4190, which the reader steps
// once a sector, is not on this screen), so no line crosses the 4 KB edge.
export const BANNER_LINE_STRIDE = 26;
export const BANNER_MARGIN_BYTES = 6;
export const BANNER_PICTURE_HIGH = 0x3b00;
export const BANNER_PICTURE_HIGH_LINES = 49;
export const BANNER_PICTURE_LOW = 0x4000;
export const BANNER_ROWS_ADDRESS = 0x41b8;                     // behind the dotted row
// The text rows: ANTIC 7 / 6 glyphs from the frontend charset (CHBASE $48, its
// codes 0-63 are the glyph contract's), COLPF0. A row with the HSCROL bit
// fetches 20 B and is shown half a glyph (HSCROL 4) right: the line of an odd
// count of glyphs, centred.
export const BANNER_WARNING_ROW = BANNER_ROWS_ADDRESS;         // 20 B, HSCROL
export const BANNER_NAME_ROW = BANNER_WARNING_ROW + 20;        // 20 B
export const BANNER_INCOMING_ROW = BANNER_NAME_ROW + 20;       // 16 B
// The bar: two mode F rows of 32 B - A, the bar's lines with no dash (0-2 and
// 4-7 of the frontend charset's dash glyph), and B, the dash's line - 20 cells
// of the dash ($FE) in the empty part, both filled from the left a pixel at a
// time.
export const BANNER_BAR_A = BANNER_INCOMING_ROW + 16;
export const BANNER_BAR_B = BANNER_BAR_A + 32;
export const BANNER_SCREEN_END = BANNER_BAR_B + 32;            // $4230: cleared $4000 up to here
export const BANNER_BAR_PIXELS = BANNER_WIDTH;
export const BANNER_BAR_DASH = 0xfe;
export const BANNER_BAR_LINES = Object.freeze(["A", "A", "A", "B", "A", "A", "A", "A"]);
export const BANNER_HSCROL = 4;
export const BANNER_WHITE = 0x0e;
export const BANNER_DMACTL = 0x21;                              // narrow playfield, list DMA, no PMG

// RAM during the entry (docs/memory-map.md, phase boss-entry):
//   the banner run lands in slot C's area (read later by the run it starts);
//   the picture is unpacked behind it, in the same area; the display list and
//   the part of the code that reads the boss's data under the banner go to the
//   staging RAM $7990-$7BCF, free once the theme has been copied out.
export const BANNER_RUN_ADDRESS = 0x1000;
export const BANNER_RUN_MAX_SECTORS = 10;                       // $1000-$14FF
export const BANNER_BUFFER = BANNER_RUN_ADDRESS + BANNER_RUN_MAX_SECTORS * 128;   // $1500-$17FF
// The scratch page at $1800 holds the HUD booster backup across the entry.
if (BANNER_BUFFER + BANNER_PAYLOAD_BYTES > 0x1800) throw new Error("the banner's buffer reaches the boss scratch page");
export const BANNER_DL = 0x7990;
export const BANNER_KEEP = 0x7a90;
export const BANNER_KEEP_END = 0x7bd0;                          // the arena
// The disk: 10 sectors a region from 280, between the boot transport (1-213)
// and the levels' reservation (320-511).
export const BANNER_BASE_SECTOR = 280;
export const BANNER_REGION_SECTORS = 10;

// The theme run's tail (2 sectors at $7990, read first as today): the cold
// code, then the banner run's spec - its first sector, its count and its
// expected fold (the disk guard's), which the cold code checks it against.
export const BANNER_SPEC_BYTES = 5;

// The per-region data block, behind the linked banner code in the banner run:
//   +0  the region's index (0-3), slot A's head check's
//   +1  the bar's step, 8.8 pixels a sector, lo / hi
//   +3  the name line's ANTIC instruction ($46, or $56 with HSCROL)
//   +4  the packed picture's address, lo / hi
//   +6  the title's records, $FF-terminated; then the packed picture
export const BANNER_DATA_REGION = 0;
export const BANNER_DATA_STEP = 1;
export const BANNER_DATA_NAME_MODE = 3;
export const BANNER_DATA_PICTURE = 4;
export const BANNER_DATA_RECORDS = 6;

export const BANNER_TEXT_WARNING = "WARNING";
export const BANNER_TEXT_INCOMING = "INCOMING";
// A wide glyph is 8 colour clocks; the narrow window shows 16. A row with the
// HSCROL bit fetches 20 bytes, byte k at colour clock 52 + 8k (48 + HSCROL 4),
// an unscrolled one 16, byte k at 64 + 8k: either way the text's centre is the
// window's (colour clock 128).
export const BANNER_ROW_GLYPHS = 16;

export function bannerTextPlacement(text) {
  const length = text.length;
  if (length < 1 || length > BANNER_ROW_GLYPHS) throw new Error(`banner text "${text}" is ${length} glyphs; a row shows ${BANNER_ROW_GLYPHS}`);
  const scrolled = length % 2 === 1;
  return { scrolled, offset: scrolled ? (19 - length) / 2 : (16 - length) / 2 };
}

// The title's records ({dst lo, dst hi, text, $00}..., $FF), drawn by
// render_frontend_records into the rows above. WARNING has 7 glyphs, so its
// row is the HSCROL one; INCOMING has 8.
export function bannerTitleRecords(name) {
  const upper = String(name).toUpperCase();
  if (!/^[A-Z0-9 .\/:-]+$/.test(upper)) throw new Error(`boss name "${name}" is outside the glyph contract`);
  const warning = bannerTextPlacement(BANNER_TEXT_WARNING);
  const incoming = bannerTextPlacement(BANNER_TEXT_INCOMING);
  if (!warning.scrolled || incoming.scrolled) throw new Error("the banner's fixed rows assume WARNING odd, INCOMING even");
  const nameAt = bannerTextPlacement(upper);
  const record = (address, text) => [address & 0xff, address >> 8, ...Buffer.from(text, "latin1"), 0x00];
  const bytes = Uint8Array.from([
    ...record(BANNER_WARNING_ROW + warning.offset, BANNER_TEXT_WARNING),
    ...record(BANNER_NAME_ROW + nameAt.offset, upper),
    ...record(BANNER_INCOMING_ROW + incoming.offset, BANNER_TEXT_INCOMING),
    0xff,
  ]);
  return { bytes, nameScrolled: nameAt.scrolled, nameMode: nameAt.scrolled ? 0x56 : 0x46 };
}

export const reverseBits = (byte) => {
  let out = 0;
  for (let bit = 0; bit < 8; bit += 1) if (byte & (1 << bit)) out |= 0x80 >> bit;
  return out;
};

// A picture's 1,280 bytes (20 a line, the left pixel in bit 7).
export function readBannerPicture(file) {
  const image = decodeRgbaReferencePng(fs.readFileSync(file));
  if (image.width !== BANNER_WIDTH || image.height !== BANNER_HEIGHT) {
    throw new Error(`${file} is ${image.width} x ${image.height}; a banner is ${BANNER_WIDTH} x ${BANNER_HEIGHT}`);
  }
  const bytes = new Uint8Array(BANNER_BYTES_PER_LINE * BANNER_HEIGHT);
  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      const [r, g, b, a] = image.rgba.subarray((y * image.width + x) * 4, (y * image.width + x) * 4 + 4);
      const white = a === 255 && r === 255 && g === 255 && b === 255;
      const black = a === 255 && r === 0 && g === 0 && b === 0;
      if (!white && !black) throw new Error(`${file} pixel (${x}, ${y}) is neither black nor white`);
      if (white) bytes[y * BANNER_BYTES_PER_LINE + (x >> 3)] |= 0x80 >> (x & 7);
    }
  }
  return bytes;
}

export function bannerIsMirrored(bytes) {
  for (let y = 0; y < BANNER_HEIGHT; y += 1) {
    for (let k = 0; k < BANNER_MIRRORED_BYTES; k += 1) {
      if (bytes[y * BANNER_BYTES_PER_LINE + BANNER_KEPT_BYTES + k] !==
        reverseBits(bytes[y * BANNER_BYTES_PER_LINE + BANNER_MIRRORED_BYTES - 1 - k])) return false;
    }
  }
  return true;
}

// The stored half and its LZ-10/5 stream for the resident decoder
// (broadside_unpack_command; the stream ends with its $00 command).
export function encodeBannerPicture(bytes, label = "the banner") {
  if (!bannerIsMirrored(bytes)) {
    throw new Error(`${label}: the outer 64 pixels a side must mirror each other (the banner keeps the left 12 bytes of a line)`);
  }
  const payload = new Uint8Array(BANNER_PAYLOAD_BYTES);
  for (let y = 0; y < BANNER_HEIGHT; y += 1) {
    payload.set(bytes.subarray(y * BANNER_BYTES_PER_LINE, y * BANNER_BYTES_PER_LINE + BANNER_KEPT_BYTES), y * BANNER_KEPT_BYTES);
  }
  const packed = packBroadsideLzss(payload);
  const check = unpackBroadsideLzss(packed, payload.length);
  if (!Buffer.from(check).equals(Buffer.from(payload))) throw new Error(`${label}: the LZ stream does not unpack to its payload`);
  return { payload, packed: Uint8Array.from(packed) };
}

// What the screen shows: the payload mirrored back into whole lines.
export function expandBannerPayload(payload) {
  const bytes = new Uint8Array(BANNER_BYTES_PER_LINE * BANNER_HEIGHT);
  for (let y = 0; y < BANNER_HEIGHT; y += 1) {
    const line = payload.subarray(y * BANNER_KEPT_BYTES, (y + 1) * BANNER_KEPT_BYTES);
    bytes.set(line, y * BANNER_BYTES_PER_LINE);
    for (let k = 0; k < BANNER_MIRRORED_BYTES; k += 1) {
      bytes[y * BANNER_BYTES_PER_LINE + BANNER_KEPT_BYTES + k] = reverseBits(line[BANNER_MIRRORED_BYTES - 1 - k]);
    }
  }
  return bytes;
}

// The screen address of a picture line's first (blank) byte: its LMS.
export const bannerLineAddress = (line) => (line < BANNER_PICTURE_HIGH_LINES
  ? BANNER_PICTURE_HIGH + line * BANNER_LINE_STRIDE
  : BANNER_PICTURE_LOW + (line - BANNER_PICTURE_HIGH_LINES) * BANNER_LINE_STRIDE);

// The bar's step: 8.8 pixels a sector, so the last sector of the boss data
// fills the 160th pixel and no earlier one does.
export function bannerBarStep(sectors) {
  const step = Math.ceil((BANNER_BAR_PIXELS * 256) / sectors);
  if (Math.floor((step * sectors) / 256) < BANNER_BAR_PIXELS || Math.floor((step * (sectors - 1)) / 256) >= BANNER_BAR_PIXELS) {
    throw new Error(`the bar's step ${step} does not fill on the last of ${sectors} sectors`);
  }
  if (step > 0xffff) throw new Error(`the bar's step for ${sectors} sectors is out of range`);
  return step;
}
export const bannerBarPixels = (step, sectors) => Math.min(BANNER_BAR_PIXELS, Math.floor((step * sectors) / 256));

// banners.json: { "<boss directory>": "<picture id>" }.
export function loadBannerChoices(rootDirectory) {
  const directory = path.join(rootDirectory, "assets", "graphics", "boss-banners");
  const choices = JSON.parse(fs.readFileSync(path.join(directory, "banners.json"), "utf8")).banners;
  return { directory, choices };
}

// One region's banner: the picture, the records, the data block behind the
// code at `dataAddress`, the bar's step for `bossDataSectors`.
export function compileBossBanner({ rootDirectory, bossDirectory, name, regionIndex, dataAddress, bossDataSectors }) {
  const { directory, choices } = loadBannerChoices(rootDirectory);
  const id = choices[bossDirectory];
  if (typeof id !== "string") throw new Error(`boss-banners/banners.json names no picture for ${bossDirectory}`);
  const file = path.join(directory, `${id}.png`);
  const bytes = readBannerPicture(file);
  const { payload, packed } = encodeBannerPicture(bytes, `boss-banners/${id}.png`);
  const title = bannerTitleRecords(name);
  const step = bannerBarStep(bossDataSectors);
  const pictureAddress = dataAddress + BANNER_DATA_RECORDS + title.bytes.length;
  const data = Uint8Array.from([
    regionIndex, step & 0xff, step >> 8, title.nameMode, pictureAddress & 0xff, pictureAddress >> 8,
    ...title.bytes, ...packed,
  ]);
  return { id, file: path.relative(rootDirectory, file), bytes, payload, packed, title, step, data,
    pictureAddress };
}

// The constants src/hybrid/boss.s reads (appended to build/boss-layout.inc).
export function renderBossBannerInclude() {
  const hex = (value) => `$${value.toString(16).toUpperCase()}`;
  return [
    "; feat/boss-banners (scripts/boss-banner.mjs) - the banner's layout.",
    `BANNER_RUN               = ${hex(BANNER_RUN_ADDRESS)}`,
    `BANNER_BUFFER            = ${hex(BANNER_BUFFER)}`,
    `BANNER_DL                = ${hex(BANNER_DL)}`,
    `BANNER_KEEP              = ${hex(BANNER_KEEP)}`,
    `BANNER_KEEP_END          = ${hex(BANNER_KEEP_END)}`,
    `BANNER_PICTURE_HIGH      = ${hex(BANNER_PICTURE_HIGH)}`,
    `BANNER_PICTURE_HIGH_LINES = ${BANNER_PICTURE_HIGH_LINES}`,
    `BANNER_PICTURE_LOW       = ${hex(BANNER_PICTURE_LOW)}`,
    `BANNER_LINES             = ${BANNER_HEIGHT}`,
    `BANNER_LINE_STRIDE       = ${BANNER_LINE_STRIDE}`,
    `BANNER_MARGIN            = ${BANNER_MARGIN_BYTES}`,
    `BANNER_KEPT              = ${BANNER_KEPT_BYTES}`,
    `BANNER_MIRRORED          = ${BANNER_MIRRORED_BYTES}`,
    `BANNER_PICTURE_BYTES     = ${BANNER_BYTES_PER_LINE}`,
    `BANNER_WARNING_ROW       = ${hex(BANNER_WARNING_ROW)}`,
    `BANNER_NAME_ROW          = ${hex(BANNER_NAME_ROW)}`,
    `BANNER_INCOMING_ROW      = ${hex(BANNER_INCOMING_ROW)}`,
    `BANNER_BAR_A             = ${hex(BANNER_BAR_A)}`,
    `BANNER_BAR_B             = ${hex(BANNER_BAR_B)}`,
    `BANNER_SCREEN_END        = ${hex(BANNER_SCREEN_END)}`,
    `BANNER_BAR_PIXELS        = ${BANNER_BAR_PIXELS}`,
    `BANNER_BAR_DASH          = ${hex(BANNER_BAR_DASH)}`,
    `BANNER_HSCROL            = ${BANNER_HSCROL}`,
    `BANNER_WHITE             = ${hex(BANNER_WHITE)}`,
    `BANNER_DMACTL            = ${hex(BANNER_DMACTL)}`,
    `BANNER_DATA_REGION       = ${BANNER_DATA_REGION}`,
    `BANNER_DATA_STEP         = ${BANNER_DATA_STEP}`,
    `BANNER_DATA_NAME_MODE    = ${BANNER_DATA_NAME_MODE}`,
    `BANNER_DATA_PICTURE      = ${BANNER_DATA_PICTURE}`,
    `BANNER_DATA_RECORDS      = ${BANNER_DATA_RECORDS}`,
    "",
  ].join("\n");
}
