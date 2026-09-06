import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  anticERegisterForBitmapPixel,
  anticFRegisterForBitmapBit,
  compileLoaderBitmap,
  createLoaderDisplayListBytes,
  encodeLoaderBitmapPixels,
  loadLoaderBitmapDefinition,
  loaderBitmapConstants,
  loaderBitmapPixelValueAt,
  LOADER_DISPLAY_LIST_ADDRESS,
  renderLoaderCa65Include,
} from "../scripts/loader-assets.mjs";
import { unpackBroadsideLzss } from "../scripts/broadside-lzss.mjs";
import { installRuntimeSegments, readRuntimeBytes } from "../scripts/runtime-image.mjs";
import { Nmos6502 } from "../scripts/nmos6502.mjs";
import {
  PREVIEW_HEIGHT,
  PREVIEW_WIDTH,
  createGameplayPreview,
  createLoaderPreview,
  inspectPng,
  readLoaderRuntimeState,
} from "../scripts/preview.mjs";

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const rootDirectory = path.resolve(testDirectory, "..");
const definitionPath = path.join(
  rootDirectory,
  "assets",
  "graphics",
  "loader-bitmap.json",
);
const obsoleteDefinitionPath = path.join(
  rootDirectory,
  "assets",
  "graphics",
  "loader-screen.json",
);
const referencePath = path.join(
  rootDirectory,
  "assets",
  "graphics",
  "loader.png",
);
const sourcePath = path.join(rootDirectory, "src", "main.s");
const labelsPath = path.join(rootDirectory, "build", "void-strike-65.lbl");
const mapPath = path.join(rootDirectory, "build", "void-strike-65.map");
const includePath = path.join(rootDirectory, "build", "loader-screen.inc");
const manifestPath = path.join(
  rootDirectory,
  "dist",
  "void-strike-65-manifest.json",
);
const definition = loadLoaderBitmapDefinition(definitionPath);
const compiled = compileLoaderBitmap(definition);
const source = fs.readFileSync(sourcePath, "utf8");

function sha256(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function readLabels() {
  const labels = new Map();
  for (const line of fs.readFileSync(labelsPath, "utf8").split(/\r?\n/)) {
    const match = /^al\s+([0-9a-f]+)\s+\.?([^\s]+)$/i.exec(line.trim());
    if (match) {
      labels.set(match[2], Number.parseInt(match[1], 16));
    }
  }
  return labels;
}

function readXexBytes(address, length) {
  return readRuntimeBytes(rootDirectory, address, length);
}

function executeLoaderUnpack(labels) {
  const memory = new Uint8Array(0x10000);
  installRuntimeSegments(memory, rootDirectory);
  const cpu = new Nmos6502(memory);
  const stop = 0x7fff;
  cpu.push((stop - 1) >> 8);
  cpu.push((stop - 1) & 0xff);
  cpu.pc = labels.get("unpack_loader_bitmap");
  for (let steps = 0; steps < 2_000_000 && cpu.pc !== stop; steps += 1) cpu.step();
  assert.equal(cpu.pc, stop, "unpack_loader_bitmap did not return");
  return memory;
}

function countPixels({ x, y, width, height }) {
  let set = 0;
  for (let row = y; row < y + height; row += 1) {
    for (let column = x; column < x + width; column += 1) {
      set += compiled.pixels[row * compiled.width + column];
    }
  }
  return set;
}

test("loader reference PNG is present and unchanged", () => {
  const reference = fs.readFileSync(referencePath);
  assert.deepEqual(
    [...reference.subarray(0, 8)],
    [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  );
  assert.equal(reference.readUInt32BE(16), 1402);
  assert.equal(reference.readUInt32BE(20), 1122);
  assert.equal(sha256(reference), definition.reference.sha256);
  assert.equal(
    sha256(reference),
    "f77650dc0c388497143584f2af779949cdd34d87f1559f7ed7d66c3f75e38248",
  );
});

test("mixed-mode source is exactly 320x192 with 40 MSB-first bytes per row", () => {
  assert.deepEqual(
    [compiled.width, compiled.height, compiled.bytesPerRow],
    [320, 192, 40],
  );
  assert.equal(compiled.bitmapBytes.length, 7680);
  assert.equal(loaderBitmapConstants.bytes, 7680);

  const pixels = new Uint8Array(320 * 192);
  pixels[0] = 1;
  pixels[7] = 1;
  pixels[8] = 1;
  const encoded = encodeLoaderBitmapPixels(pixels);
  assert.deepEqual([...encoded.subarray(0, 2)], [0x81, 0x80]);
});

test("bounded LZSS round-trip is exact and ends at the bitmap boundary", () => {
  const unpacked = unpackBroadsideLzss(compiled.packedBitmap);
  assert.equal(unpacked.length, 7680);
  assert.deepEqual(unpacked, Buffer.from(compiled.bitmapBytes));
  assert.equal(compiled.bitmapAddress, 0x4010);
  assert.equal(compiled.bitmapAddress + unpacked.length, 0x5e10);

  const guard = new Uint8Array(unpacked.length + 2);
  guard[0] = 0xa5;
  guard[guard.length - 1] = 0x5a;
  guard.set(unpacked, 1);
  assert.equal(guard[0], 0xa5);
  assert.equal(guard[guard.length - 1], 0x5a);

  const allAnticFBytes = encodeLoaderBitmapPixels(compiled.pixels);
  assert.deepEqual(
    compiled.bitmapBytes.subarray(0, 157 * compiled.bytesPerRow),
    allAnticFBytes.subarray(0, 157 * compiled.bytesPerRow),
    "mixed-mode encoding must not alter title or ship bitmap bytes",
  );
  assert.notDeepEqual(
    compiled.bitmapBytes.subarray(157 * compiled.bytesPerRow),
    allAnticFBytes.subarray(157 * compiled.bytesPerRow),
    "studio rows must be re-encoded as ANTIC E two-bit pixels",
  );
});

test("both LMS ranges preserve 40-byte rows across 4 KB boundaries", () => {
  assert.equal(compiled.secondLmsLine, 102);
  assert.equal(compiled.bitmapAddress + 102 * 40, 0x5000);
  assert.equal(compiled.secondLmsAddress + 90 * 40, 0x5e10);

  for (let line = 0; line < 192; line += 1) {
    const address =
      line < compiled.secondLmsLine
        ? compiled.bitmapAddress + line * 40
        : compiled.secondLmsAddress +
          (line - compiled.secondLmsLine) * 40;
    assert.ok((address & 0x0fff) + 39 <= 0x0fff, `line ${line} crosses 4 KB`);
  }
});

test("bitmap has fitted title, detailed unmarked hull, three engines, and studio", () => {
  assert.ok(countPixels(compiled.landmarks.title) > 1300);
  assert.ok(countPixels(compiled.landmarks.ship) > 5000);
  assert.ok(countPixels(compiled.landmarks.copyright) > 80);
  assert.ok(countPixels(compiled.landmarks.studio) > 250);
  for (const engine of compiled.landmarks.engineBands) {
    assert.ok(countPixels(engine) > 400);
  }

  const rearBands = [
    { x: 10, y: 55, width: 32, height: 19 },
    { x: 10, y: 82, width: 32, height: 28 },
    { x: 14, y: 120, width: 28, height: 23 },
  ];
  for (const engine of rearBands) {
    assert.ok(countPixels(engine) > 60);
  }
});

test("copyright footer has two bold centered ANTIC E lines with safe spacing", () => {
  const copyrightElement = definition.elements.find(({ name }) => name === "copyright");
  const studioElement = definition.elements.find(({ name }) => name === "studio");
  assert.equal(copyrightElement.text, "(C) 2026");
  assert.equal(studioElement.text, "SETECH GAME STUDIO");
  for (const element of [copyrightElement, studioElement]) {
    assert.deepEqual(
      [element.font, element.scaleX, element.scaleY, element.letterSpacing],
      ["anticE3x7Bold", 2, 2, 2],
    );
    assert.equal(element.x & 1, 0, "paired ANTIC E text must start on an even source pixel");
  }
  assert.deepEqual(compiled.landmarks.copyright, { x: 130, y: 157, width: 60, height: 14 });
  assert.deepEqual(compiled.landmarks.studio, { x: 90, y: 173, width: 140, height: 14 });
  assert.deepEqual(compiled.landmarks.footer, { x: 90, y: 157, width: 140, height: 30 });
  for (const character of ["(", ")", "0", "2"]) {
    assert.ok(definition.fonts.anticE3x7Bold.glyphs[character], `missing ASCII ${character}`);
  }

  const occupiedInRows = (startLine, endLine) => {
    const occupied = [];
    for (let y = startLine; y <= endLine; y += 1) {
      for (let x = 0; x < 320; x += 1) {
        if (loaderBitmapPixelValueAt(compiled, x, y) !== 0) occupied.push([x, y]);
      }
    }
    return occupied;
  };
  const bounds = (occupied) => {
    const xs = occupied.map(([x]) => x);
    const ys = occupied.map(([, y]) => y);
    return [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  };
  const copyrightPixels = occupiedInRows(157, 170);
  const studioPixels = occupiedInRows(173, 186);
  assert.deepEqual(bounds(copyrightPixels), [130, 189, 157, 170]);
  assert.deepEqual(bounds(studioPixels), [90, 229, 173, 186]);
  for (const occupied of [copyrightPixels, studioPixels]) {
    const xs = occupied.map(([x]) => x);
    assert.equal(Math.min(...xs), 319 - Math.max(...xs), "each footer line must be centered");
  }
  for (let y = 171; y <= 172; y += 1) {
    for (let x = 0; x < 320; x += 1) {
      assert.equal(loaderBitmapPixelValueAt(compiled, x, y), 0, "footer gap must stay blank");
    }
  }

  const previous = structuredClone(definition);
  const previousCopyright = previous.elements.find(({ name }) => name === "copyright");
  const previousStudio = previous.elements.find(({ name }) => name === "studio");
  Object.assign(previousCopyright,
    { font: "military5x7", x: 131, scaleX: 1, letterSpacing: 3 });
  Object.assign(previousStudio,
    { font: "military5x7", x: 95, y: 174, scaleX: 1, letterSpacing: 3 });
  previous.landmarks.copyright = { x: 132, y: 157, width: 56, height: 14 };
  previous.landmarks.studio = { x: 94, y: 174, width: 132, height: 14 };
  previous.landmarks.footer = { x: 94, y: 157, width: 132, height: 31 };
  const previousCompiled = compileLoaderBitmap(previous);
  let changed = 0;
  for (let y = 0; y < compiled.height; y += 1) {
    for (let x = 0; x < compiled.width; x += 1) {
      const differs = compiled.pixels[y * compiled.width + x] !==
        previousCompiled.pixels[y * compiled.width + x];
      if (!differs) continue;
      changed += 1;
      assert.ok(x >= 90 && x <= 229 && y >= 157 && y <= 187,
        `footer pixel escaped mask at ${x},${y}`);
    }
  }
  assert.ok(changed > 0);
  assert.equal(compiled.bitmapBytes.length, 40 * 192);
});

test("packed XEX footer uses distinct bold glyphs made of full ANTIC E pixels", () => {
  const acceptedGlyphs = {
    "(": ["010", "100", "100", "100", "100", "100", "010"],
    ")": ["010", "001", "001", "001", "001", "001", "010"],
    "0": ["111", "101", "101", "101", "101", "101", "111"],
    "2": ["110", "001", "001", "010", "100", "100", "111"],
    "6": ["011", "100", "100", "111", "101", "101", "111"],
    A: ["010", "101", "101", "111", "101", "101", "101"],
    C: ["011", "100", "100", "100", "100", "100", "011"],
    D: ["110", "101", "101", "101", "101", "101", "110"],
    E: ["111", "100", "100", "110", "100", "100", "111"],
    G: ["011", "100", "100", "101", "101", "101", "011"],
    H: ["101", "101", "101", "111", "101", "101", "101"],
    I: ["111", "010", "010", "010", "010", "010", "111"],
    M: ["101", "111", "111", "101", "101", "101", "101"],
    O: ["0110", "1001", "1001", "1001", "1001", "1001", "0110"],
    S: ["011", "100", "100", "010", "001", "001", "110"],
    T: ["111", "010", "010", "010", "010", "010", "010"],
    U: ["101", "101", "101", "101", "101", "101", "111"],
  };
  const lines = [
    { text: "(C) 2026", x: 130, y: 157 },
    { text: "SETECH GAME STUDIO", x: 90, y: 173 },
  ];
  const sourcePixels = new Uint8Array(320 * 192);
  for (const line of lines) {
    let cursorX = line.x;
    for (const character of line.text) {
      if (character === " ") {
        cursorX += 6;
        continue;
      }
      const glyph = acceptedGlyphs[character];
      assert.ok(glyph, `accepted glyph snapshot missing ${character}`);
      for (let glyphY = 0; glyphY < 7; glyphY += 1) {
        for (let glyphX = 0; glyphX < glyph[glyphY].length; glyphX += 1) {
          if (glyph[glyphY][glyphX] !== "1") continue;
          for (let pixelX = 0; pixelX < 2; pixelX += 1) {
            sourcePixels[(line.y + glyphY * 2) * 320 + cursorX + glyphX * 2 + pixelX] = 1;
            sourcePixels[(line.y + glyphY * 2 + 1) * 320 + cursorX + glyphX * 2 + pixelX] = 1;
          }
        }
      }
      cursorX += glyph[0].length * 2 + 2;
    }
  }

  const expected = Buffer.alloc(7680);
  for (let y = 157; y <= 187; y += 1) {
    for (let byteColumn = 0; byteColumn < 40; byteColumn += 1) {
      let value = 0;
      for (let pair = 0; pair < 4; pair += 1) {
        const x = byteColumn * 8 + pair * 2;
        const foreground = sourcePixels[y * 320 + x] | sourcePixels[y * 320 + x + 1];
        value |= (foreground ? 2 : 0) << (6 - pair * 2);
      }
      expected[y * 40 + byteColumn] = value;
    }
  }

  const memory = executeLoaderUnpack(readLabels());
  const actual = Buffer.alloc(7680);
  for (let y = 0; y < 192; y += 1) {
    const address = y < 102 ? 0x4010 + y * 40 : 0x5000 + (y - 102) * 40;
    actual.set(memory.subarray(address, address + 40), y * 40);
  }
  const anticEPixel = (bytes, x, y) => {
    const value = bytes[y * 40 + Math.floor(x / 8)];
    return (value >> (6 - Math.floor((x & 7) / 2) * 2)) & 3;
  };

  for (const [lineIndex, line] of lines.entries()) {
    let cursorX = line.x;
    for (const [characterIndex, character] of [...line.text].entries()) {
      if (character === " ") {
        cursorX += 6;
        continue;
      }
      for (let scanline = 0; scanline < 14; scanline += 1) {
        const firstPairX = cursorX & ~1;
        const glyph = acceptedGlyphs[character];
        const lastPairX = cursorX + glyph[0].length * 2 - 2;
        for (let x = firstPairX; x <= lastPairX; x += 2) {
          assert.equal(
            anticEPixel(actual, x, line.y + scanline),
            anticEPixel(expected, x, line.y + scanline),
            `line ${lineIndex}, glyph ${characterIndex} ${character}, scanline ${scanline}, pair x=${x}`,
          );
        }
      }
      cursorX += acceptedGlyphs[character][0].length * 2 + 2;
    }
  }
  assert.deepEqual(
    actual.subarray(157 * 40, 188 * 40),
    expected.subarray(157 * 40, 188 * 40),
    "actual ANTIC E bytes must contain only the exact centered two-line footer",
  );

  const signatures = Object.values(acceptedGlyphs).map((glyph) => glyph.join("/"));
  assert.equal(new Set(signatures).size, signatures.length,
    "every footer glyph must remain visually distinguishable");

  const outsideMask = Buffer.from(actual);
  for (let y = 157; y <= 187; y += 1) {
    outsideMask.fill(0, y * 40 + 11, y * 40 + 29);
  }
  assert.equal(
    sha256(outsideMask),
    "7055b00421d4be403664cc4b3743c99514b172b903698b6f81055cf39b706bd0",
    "loader bytes outside the footer mask must match accepted cd62731",
  );
});

test("title and ship remain ANTIC F while the $D8 studio uses ANTIC E", () => {
  assert.deepEqual(
    compiled.paletteZones.map(({ displayMode, startLine, endLine, foregroundValue }) => [
      displayMode,
      startLine,
      endLine,
      foregroundValue,
    ]),
    [
      ["ANTIC F", 0, 39, 0x1e],
      ["ANTIC F", 40, 156, 0x0a],
      ["ANTIC E", 157, 191, 0xd8],
    ],
  );
  assert.deepEqual(compiled.dliLines, [39, 156]);
  for (const zone of compiled.paletteZones) {
    assert.equal(zone.values.get("COLBK"), 0x00);
  }
  const [title, ship, studio] = compiled.paletteZones;
  assert.equal(title.modeNumber, 0x0f);
  assert.equal(title.values.get("COLPF1"), 0x1e);
  assert.equal(anticFRegisterForBitmapBit(title.values, 1), 0x1e);
  assert.equal(anticFRegisterForBitmapBit(title.values, 0), 0x10);
  assert.equal(ship.modeNumber, 0x0f);
  assert.equal(ship.values.get("COLPF1"), 0x0a);
  assert.equal(anticFRegisterForBitmapBit(ship.values, 1), 0x0a);
  assert.equal(anticFRegisterForBitmapBit(ship.values, 0), 0x00);
  assert.equal(studio.modeNumber, 0x0e);
  assert.equal(studio.values.get("COLPF1"), 0xd8);
  assert.equal(studio.values.get("COLPF2"), 0xd0);
  assert.equal(studio.foregroundPixel, 2);
  assert.equal(anticERegisterForBitmapPixel(studio.values, 2), 0xd8);
  assert.equal(anticERegisterForBitmapPixel(studio.values, 0), 0x00);
});

test("studio ANTIC E pixels use COLBK=$00 and assembled COLPF1=$D8", () => {
  const labels = readLabels();
  const dliAddress = labels.get("loader_dli");
  assert.ok(Number.isInteger(dliAddress));
  const dliBytes = readXexBytes(dliAddress, 64);
  const studioWrites = Buffer.from([
    0xa9, 0xd8, 0x8d, 0x17, 0xd0,
    0xa9, 0xd0, 0x8d, 0x18, 0xd0,
  ]);
  assert.notEqual(
    dliBytes.indexOf(studioWrites),
    -1,
    "loader DLI must write COLPF1=$D8 then COLPF2=$D0",
  );

  const studio = compiled.paletteZones[2];
  assert.deepEqual([studio.startLine, studio.endLine], [157, 191]);
  const footerPixelValues = new Set();
  for (let y = studio.startLine; y <= studio.endLine; y += 1) {
    for (let x = 0; x < compiled.width; x += 2) {
      footerPixelValues.add(loaderBitmapPixelValueAt(compiled, x, y));
    }
  }
  assert.deepEqual([...footerPixelValues].sort(), [0, 2]);
  assert.equal(loaderBitmapPixelValueAt(compiled, 132, 157), 2);
  assert.equal(loaderBitmapPixelValueAt(compiled, 128, 157), 0);
  assert.equal(loaderBitmapPixelValueAt(compiled, 190, 157), 0);
  assert.equal(loaderBitmapPixelValueAt(compiled, 92, 173), 2);
  assert.equal(anticERegisterForBitmapPixel(studio.values, 2), 0xd8);
  assert.equal(anticERegisterForBitmapPixel(studio.values, 0), 0x00);
  assert.notEqual(anticERegisterForBitmapPixel(studio.values, 0), 0xd0);

  const titlePalette = source.slice(
    source.indexOf("set_loader_title_palette:"),
    source.indexOf("loader_dli:"),
  );
  assert.match(titlePalette, /lda #LOADER_TITLE_COLPF1\s+sta COLPF1/);
  assert.match(titlePalette, /lda #LOADER_TITLE_COLPF2\s+sta COLPF2/);
  const dliSource = source.slice(
    source.indexOf("loader_dli:"),
    source.indexOf("unpack_loader_bitmap:"),
  );
  assert.match(dliSource, /pha[\s\S]+sta WSYNC[\s\S]+pla\s+rti/);
  assert.match(dliSource, /lda #LOADER_STUDIO_COLPF1\s+sta COLPF1/);
  assert.match(dliSource, /lda #LOADER_STUDIO_COLPF2\s+sta COLPF2/);
});

test("generated include is canonical and contains no ANTIC 4 loader assets", () => {
  assert.equal(
    fs.readFileSync(includePath, "utf8"),
    renderLoaderCa65Include(compiled),
  );
  assert.equal(fs.existsSync(obsoleteDefinitionPath), false);
  assert.doesNotMatch(source, /copy_loader_charset|loader_charset_data/);
  assert.doesNotMatch(source, /loader_screen_packbits|unpack_loader_screen/);
});

test("assembled display list contains 157 ANTIC F and 35 ANTIC E lines", () => {
  const labels = readLabels();
  const displayListAddress = LOADER_DISPLAY_LIST_ADDRESS;
  assert.equal(displayListAddress & 0x3ff, 0);
  const expected = createLoaderDisplayListBytes(compiled, displayListAddress);
  const memory = executeLoaderUnpack(labels);
  assert.equal(expected.length, 202);
  assert.deepEqual(
    Buffer.from(memory.subarray(
      displayListAddress, displayListAddress + expected.length)),
    Buffer.from(expected),
  );

  const missileMasks = labels.get("missile_masks");
  const missileTables = Buffer.from([
    0x0c, 0x30, 0xc0, 0xf3, 0xcf, 0x3f,
    0x04, 0x10, 0x40, 0x0c, 0x30, 0xc0,
  ]);
  assert.equal(missileMasks, 0x37fc);
  assert.ok(displayListAddress >= missileMasks + missileTables.length,
    "loader display-list publication must not overlap runtime PMG tables");
  assert.deepEqual(Buffer.from(memory.subarray(
    missileMasks, missileMasks + missileTables.length)), missileTables,
  "executed loader unpack must preserve every BROADSIDE draw/erase/size mask");

  let offset = 3;
  let anticFLines = 0;
  let anticELines = 0;
  let lmsCount = 0;
  const dliLines = [];
  for (let line = 0; line < 192; line += 1) {
    const opcode = expected[offset];
    const mode = opcode & 0x0f;
    assert.equal(mode, line < 157 ? 0x0f : 0x0e);
    anticFLines += mode === 0x0f ? 1 : 0;
    anticELines += mode === 0x0e ? 1 : 0;
    offset += 1;
    if (opcode & 0x80) {
      dliLines.push(line);
    }
    if (opcode & 0x40) {
      const lmsAddress = expected[offset] | (expected[offset + 1] << 8);
      assert.equal(
        lmsAddress,
        line === 0 ? compiled.bitmapAddress : compiled.secondLmsAddress,
      );
      lmsCount += 1;
      offset += 2;
    }
  }
  assert.equal(anticFLines, 157);
  assert.equal(anticELines, 35);
  assert.equal(lmsCount, 2);
  assert.deepEqual(dliLines, [39, 156]);
  assert.deepEqual(
    [...expected.subarray(offset)],
    [0x41, displayListAddress & 0xff, displayListAddress >> 8],
  );
});

test("XEX and ATR use the current packed bitmap source", () => {
  const labels = readLabels();
  const packedAddress = labels.get("loader_bitmap_lzss");
  assert.ok(Number.isInteger(packedAddress));
  assert.deepEqual(
    readXexBytes(packedAddress, compiled.packedBitmap.length),
    Buffer.from(compiled.packedBitmap),
  );

  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  assert.equal(manifest.loaderScreen.mode, "mixed ANTIC F/E");
  assert.equal(manifest.loaderScreen.source, "assets/graphics/loader-bitmap.json");
  assert.equal(manifest.loaderScreen.unpackedBitmapBytes, 7680);
  assert.equal(
    manifest.loaderScreen.packedBitmapBytes,
    compiled.packedBitmap.length,
  );
});

test("loader still owns exactly 250 full PAL frames and enters the main menu", () => {
  assert.match(source,
    /jsr show_loader[\s\S]+jsr unpack_starfield_runtime[\s\S]+jmp finish_startup_after_loader/);
  assert.match(source, /lda #LOADER_DURATION_FRAMES\s+sta loader_frame_count/);
  assert.match(
    source,
    /jsr wait_frame_start\s+jsr set_loader_title_palette\s+dec loader_frame_count\s+bne @frame/,
  );
  assert.match(source, /sta WSYNC/);
  assert.match(source, /pla\s+rti/);
  assert.match(source, /lda #\$00\s+sta NMIEN\s+sta DMACTL\s+rts/);
  assert.match(source, /jsr show_loader[\s\S]+jsr clear_pmg[\s\S]+jsr copy_charset/);
  assert.match(source, /jsr enter_main_menu\s+jmp frontend_loop/);
});

test("loader-only tail may use PMG bytes but stays below screen memory", () => {
  const map = fs.readFileSync(mapPath, "utf8");
  const mainEnd = /RODATA\s+[0-9A-F]+\s+([0-9A-F]+)/i.exec(map);
  assert.ok(mainEnd);
  assert.ok(Number.parseInt(mainEnd[1], 16) < 0x4000);
  const labels = readLabels();
  assert.ok(labels.get("loader_display_list_lzss") < labels.get("loader_bitmap_lzss"));
  assert.ok(labels.get("loader_bitmap_lzss") < 0x4000);
  assert.match(source, /jsr show_loader[\s\S]+jsr clear_pmg[\s\S]+jsr copy_frontend_charset/);
  assert.equal(compiled.bitmapAddress, 0x4010);
  assert.equal(compiled.bitmapAddress + compiled.bitmapBytes.length - 1, 0x5e0f);
});

test("capital-hull integration preserves gameplay preview dimensions", () => {
  const preview = createGameplayPreview(source);
  assert.deepEqual(
    [inspectPng(preview).width, inspectPng(preview).height],
    [640, 384],
  );
});

test("loader preview follows ANTIC F title/ship and ANTIC E studio semantics", () => {
  const { loaderAsset, registerPixels } = readLoaderRuntimeState(definition);
  const studio = loaderAsset.paletteZones[2];
  assert.equal(registerPixels[157 * loaderAsset.width + 132], 0xd8);
  assert.equal(registerPixels[157 * loaderAsset.width + 128], 0x00);
  assert.equal(registerPixels[157 * loaderAsset.width + 190], 0x00);
  assert.equal(registerPixels[173 * loaderAsset.width + 92], 0xd8);
  for (let y = studio.startLine; y <= studio.endLine; y += 1) {
    for (let x = 0; x < loaderAsset.width; x += 1) {
      if (loaderBitmapPixelValueAt(loaderAsset, x, y) === 0) {
        assert.equal(registerPixels[y * loaderAsset.width + x], 0x00);
      }
    }
  }

  const first = createLoaderPreview(definition);
  const second = createLoaderPreview(
    loadLoaderBitmapDefinition(definitionPath),
  );
  assert.deepEqual(first, second);

  const info = inspectPng(first);
  assert.deepEqual(
    [info.width, info.height],
    [PREVIEW_WIDTH, PREVIEW_HEIGHT],
  );
  assert.deepEqual([info.width, info.height], [640, 384]);
  assert.equal(info.bitDepth, 8);
  assert.equal(info.colorType, 2);
});
