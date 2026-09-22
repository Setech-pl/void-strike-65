import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  buildCapitalHullsAntic2Charset,
  compileCapitalHullsAntic2Prototype,
  loadCapitalHullsAntic2Prototype,
} from "../scripts/capital-hulls-antic2.mjs";
import { loadCapitalHullsDefinition } from "../scripts/capital-hulls.mjs";
import {
  createBroadsideAntic2PrototypePreview,
  createBroadsideModeComparisonPreview,
  createCapitalHullsAntic2StripPreview,
  inspectPng,
  readBroadsideAntic2PrototypeState,
} from "../scripts/preview.mjs";

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const rootDirectory = path.resolve(testDirectory, "..");
const source = fs.readFileSync(path.join(rootDirectory, "src", "main.s"), "utf8");
const buildSource = fs.readFileSync(path.join(rootDirectory, "scripts", "build.mjs"), "utf8");
const capitalHullsDefinition = loadCapitalHullsDefinition(
  path.join(rootDirectory, "assets", "graphics", "capital-hulls.json"),
);
const prototypeDefinition = loadCapitalHullsAntic2Prototype(
  path.join(rootDirectory, "assets", "graphics", "capital-hulls-antic2-prototype.json"),
);
const prototype = compileCapitalHullsAntic2Prototype(
  prototypeDefinition,
  capitalHullsDefinition,
);

function replaceOnce(text, original, replacement) {
  const first = text.indexOf(original);
  assert.notEqual(first, -1, `missing source fixture: ${original}`);
  assert.equal(text.indexOf(original, first + original.length), -1,
    `ambiguous source fixture: ${original}`);
  return `${text.slice(0, first)}${replacement}${text.slice(first + original.length)}`;
}

test("ANTIC 2 prototype source is deterministic and rejects malformed one-bit glyphs", () => {
  const second = compileCapitalHullsAntic2Prototype(
    loadCapitalHullsAntic2Prototype(
      path.join(rootDirectory, "assets", "graphics", "capital-hulls-antic2-prototype.json"),
    ),
    capitalHullsDefinition,
  );
  assert.deepEqual(second.glyphBytes, prototype.glyphBytes);
  assert.deepEqual(second.starGlyphBytes, prototype.starGlyphBytes);
  assert.deepEqual(second.decodedMaps, prototype.decodedMaps);

  const badPixel = structuredClone(prototypeDefinition);
  badPixel.glyphs[0].pixels[0] = "11121111";
  assert.throws(
    () => compileCapitalHullsAntic2Prototype(badPixel, capitalHullsDefinition),
    /eight one-bit pixels/,
  );
  const badOrder = structuredClone(prototypeDefinition);
  badOrder.glyphs = badOrder.glyphs.filter(
    ({ name }) => name !== prototypeDefinition.glyphs[0].name,
  );
  assert.throws(
    () => compileCapitalHullsAntic2Prototype(badOrder, capitalHullsDefinition),
    /must define/,
  );
});

test("prototype reuses the 8+24+8 maps, turret metadata, and one aligned 1 KB charset", () => {
  assert.equal(prototype.definition.displayMode, "ANTIC 2");
  // Re-pinned for hull set v1: the two maps reference 20 distinct glyphs, not
  // 22, because the blank cell is now one glyph shared by both factions and R1
  // leaves two of the seven per-level enemy surface slots unused.
  assert.equal(prototype.glyphs.length, 20);
  assert.equal(prototype.glyphBytes.length, 160);
  assert.equal(prototype.starGlyphBytes.length, 16);
  assert.equal(prototype.sourceGlyphBytes, 176);
  assert.equal(prototype.proposedCharsetAddress, 0x5000);
  assert.equal(prototype.proposedCharsetAddress & 0x03ff, 0);
  assert.equal(prototype.proposedCharsetBytes, 1024);
  assert.equal(prototype.proposedCharsetAddress + prototype.proposedCharsetBytes - 1, 0x53ff);
  assert.equal(prototype.turrets, prototype.capitalHulls.turrets);

  for (let row = 0; row < prototype.segmentRows; row += 1) {
    const assembledRow = new Uint8Array(40);
    assembledRow.set(prototype.decodedMaps.get("allied")[row], 0);
    assembledRow.set(prototype.decodedMaps.get("enemy")[row], 31);
    assert.equal(assembledRow.length, 40);
    assert.ok([...assembledRow].every((screenCode) => screenCode < 0x80));
  }
});

test("ANTIC 2 palette is genuinely monochrome while PMG remains source-derived", () => {
  assert.deepEqual(
    ["COLBK", "COLPF1", "COLPF2"].map((name) => prototype.palette.get(name)),
    [0x00, 0x0a, 0x00],
  );
  const state = readBroadsideAntic2PrototypeState(
    source,
    capitalHullsDefinition,
    prototypeDefinition,
  );
  assert.equal(state.charset.length, 1024);
  assert.deepEqual(
    state.charset.subarray(59 * 8, 59 * 8 + prototype.glyphBytes.length),
    prototype.glyphBytes,
  );
  assert.ok([...state.screen.subarray(80)].every((screenCode) => screenCode < 0x80));

  const canonical = createBroadsideAntic2PrototypePreview(
    source,
    capitalHullsDefinition,
    prototypeDefinition,
  );
  const changedPlayer = replaceOnce(
    source,
    "    .byte %11111111\n    .byte %11011011",
    "    .byte %11111110\n    .byte %11011011",
  );
  assert.notDeepEqual(
    createBroadsideAntic2PrototypePreview(
      changedPlayer,
      capitalHullsDefinition,
      prototypeDefinition,
    ),
    canonical,
  );
  const changedEngine = replaceOnce(
    source,
    "player_engine_shape:\n    .byte $00,$00,$00,$00\n    .byte %00011000",
    "player_engine_shape:\n    .byte $00,$00,$00,$00\n    .byte %00011001",
  );
  assert.notDeepEqual(
    createBroadsideAntic2PrototypePreview(
      changedEngine,
      capitalHullsDefinition,
      prototypeDefinition,
    ),
    canonical,
  );
});

test("prototype previews are deterministic, source-derived, and use exact integer dimensions", () => {
  const gameplay = createBroadsideAntic2PrototypePreview(
    source,
    capitalHullsDefinition,
    prototypeDefinition,
  );
  assert.deepEqual(
    gameplay,
    createBroadsideAntic2PrototypePreview(
      source,
      capitalHullsDefinition,
      prototypeDefinition,
    ),
  );
  assert.deepEqual(
    [inspectPng(gameplay).width, inspectPng(gameplay).height],
    [640, 384],
  );

  const strip = createCapitalHullsAntic2StripPreview(
    source,
    capitalHullsDefinition,
    prototypeDefinition,
  );
  assert.deepEqual([inspectPng(strip).width, inspectPng(strip).height], [640, 512]);
  const comparison = createBroadsideModeComparisonPreview(
    source,
    capitalHullsDefinition,
    prototypeDefinition,
  );
  assert.deepEqual(
    [inspectPng(comparison).width, inspectPng(comparison).height],
    [1280, 416],
  );

  const changedPrototype = structuredClone(prototypeDefinition);
  changedPrototype.glyphs[0].pixels[0] = "01111111";
  assert.notDeepEqual(
    createBroadsideAntic2PrototypePreview(
      source,
      capitalHullsDefinition,
      changedPrototype,
    ),
    gameplay,
  );
});

test("spike is preview-only and leaves the runtime broadside playfield in ANTIC 4", () => {
  assert.match(source,
    /build_playfield_display_list:[\s\S]+lda #\$C2[\s\S]+lda #\$44[\s\S]+lda #\$C4/);
  assert.match(source, /PLAYFIELD_DLIST_BYTES\s*=\s*3\+3\+PLAYFIELD_RING_ROWS\*3\+3/);
  assert.doesNotMatch(source, /broadside_display_list|BROADSID.*CHBASE/i);
  assert.doesNotMatch(buildSource, /capital-hulls-antic2|broadside-antic2/i);

  const base = new Uint8Array(1024);
  const charset = buildCapitalHullsAntic2Charset(base, prototype);
  assert.equal(charset.length, 1024);
  assert.equal(base.some((value) => value !== 0), false);
});
