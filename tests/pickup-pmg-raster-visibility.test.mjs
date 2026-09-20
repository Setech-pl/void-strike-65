// The fighter pickup was logically ACTIVE, collectable and wrote correct PMG
// bytes, yet was never visible: its missile plane was erased just after the
// frame gate and rewritten only mid-frame, long after ANTIC had already
// fetched the capsule's scanlines. The previous harness check masked the row
// byte with $F0, which inspects only M2/M3, so it agreed with the same wrong
// assumption the shape data encoded and reported "16/16 rows visible".
//
// These assertions are deliberately about WHEN the plane is written and about
// the WHOLE missile quartet. A test that only proves "non-zero bytes were
// written to $3B00" is what let this defect survive many releases.
import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const root = new URL("../", import.meta.url).pathname;
const source = fs.readFileSync(`${root}src/main.s`, "utf8");

const section = (from, to) => {
  const start = source.indexOf(from);
  assert.ok(start >= 0, `missing ${from}`);
  const end = to === undefined ? source.length : source.indexOf(to, start);
  assert.ok(end > start, `missing ${to}`);
  return source.slice(start, end);
};

test("the pickup missile plane is published in the post-playfield window", () => {
  const window = section("fighter_projectile_publication_begin = *",
    "fighter_projectile_publication_capital_render:");
  assert.match(window, /jsr publish_fighter_pickup_pmg/,
    "the capsule must be republished after the playfield has been scanned");

  // The window is entered only after waiting for VCOUNT $77.
  const publisher = section("publish_fighter_projectile_overlays:",
    "fighter_projectile_publication_begin");
  assert.match(publisher, /ldx #\$77\s*\n\s*jsr wait_frame_at_line/,
    "the publication window must still be gated on the final ring scanline");
});

test("no pickup PMG write happens in the early-frame erase chain", () => {
  const erase = section("entity_effects_erase:", "entity_effects_update:");
  assert.doesNotMatch(erase, /jsr clear_fighter_pickup_pmg/,
    "erasing the capsule at frame start blanks it before ANTIC fetches its rows");
});

test("the mid-frame pickup update owns policy only, never publication", () => {
  const update = section("update_fighter_pickup_pmg:", "clear_fighter_pickup_pmg:");
  assert.doesNotMatch(update, /render_fighter_pickup_pmg/,
    "mid-frame code must not write the missile plane");
  assert.match(update, /jmp update_weapon_pickup_active/,
    "movement, collection and booster policy stay on the mid-frame path");
});

test("the publisher erases and redraws as one post-playfield unit", () => {
  const publish = section("publish_fighter_pickup_pmg:", "render_fighter_pickup_pmg:");
  assert.match(publish, /jsr clear_fighter_pickup_pmg/);
  assert.match(publish, /cmp #WEAPON_PICKUP_STATE_ACTIVE\s*\n\s*beq render_fighter_pickup_pmg/,
    "an ACTIVE capsule falls straight through into the renderer");
});

// One missile occupies two bits and the quartet is interleaved, so the colour
// clocks left to right are bits 1,0,3,2,5,4,7,6 - the higher bit of each pair
// is its LEFT pixel. This mapping is verified against captured framebuffer runs
// (see docs/diagnostics/stage-2b2d-pickup-raster-invisibility.json).
const COLOUR_CLOCK_BIT = [1, 0, 3, 2, 5, 4, 7, 6];
const encodeRow = (pixels) =>
  pixels.reduce((byte, on, index) => on ? byte | (1 << COLOUR_CLOCK_BIT[index]) : byte, 0);

// The capsule silhouettes are owned by the artwork source, not by main.s.
// Deriving them here means the assembled table can never drift from the art.
const recoveredSilhouettes = () => {
  const art = JSON.parse(fs.readFileSync(`${root}assets/graphics/entity-effects.json`, "utf8"));
  const anticPixels = (b) => [(b >> 6) & 3, (b >> 4) & 3, (b >> 2) & 3, b & 3];
  return ["weaponPickupRapidFire", "weaponPickupSpreadShot", "weaponPickupShield"]
    .map((key) => {
      const glyphs = art[key].glyphs;
      const rows = [];
      for (let half = 0; half < glyphs.length / 2; half++) {
        const left = glyphs[half * 2], right = glyphs[half * 2 + 1];
        for (let r = 0; r < left.length; r++)
          rows.push([...anticPixels(left[r]), ...anticPixels(right[r])].map((v) => v !== 0));
      }
      return rows.map(encodeRow);
    });
};

const shapeTable = () => {
  const shape = section("fighter_pickup_pmg_shape:", "\n\n");
  return shape.split("\n")
    .filter((line) => line.trim().startsWith(".byte"))
    .flatMap((line) => [...line.matchAll(/\$([0-9A-F]{2})/g)].map((m) => parseInt(m[1], 16)));
};

test("each booster type carries its own recovered capsule silhouette", () => {
  const rows = shapeTable();
  assert.equal(rows.length, 48, "three sixteen-row silhouettes, one per booster type");
  const expected = recoveredSilhouettes();
  const names = ["Rapid Fire", "Spread Shot", "Shield"];
  for (const [type, want] of expected.entries()) {
    const got = rows.slice(type * 16, type * 16 + 16);
    assert.deepEqual(got, want,
      `${names[type]} silhouette does not match assets/graphics/entity-effects.json; ` +
      "re-derive it through the colour-clock mapping rather than hand-editing bytes");
  }
});

test("the three silhouettes are visually distinguishable", () => {
  const rows = shapeTable();
  const shapes = [0, 1, 2].map((t) => rows.slice(t * 16, t * 16 + 16).join(","));
  assert.equal(new Set(shapes).size, 3, "every booster type must look different");
  // A solid block is the diagnostic placeholder, not artwork.
  for (const [type, shape] of shapes.entries())
    assert.ok(shape.split(",").some((b) => Number(b) !== 0xFF),
      `type ${type} is a solid rectangle, which is the diagnostic visual, not the capsule`);
});

test("the renderer selects the silhouette from the pickup type", () => {
  const render = section("render_fighter_pickup_pmg:", "; Effects publish before");
  assert.match(render, /lda ENTITY_TYPE\+WEAPON_PICKUP_SLOT[\s\S]*?asl[\s\S]*?asl[\s\S]*?asl[\s\S]*?asl[\s\S]*?tax/,
    "the type scales into the sixteen-row source stride");
  assert.match(render, /lda fighter_pickup_pmg_shape,x/);
});

test("the shape comment no longer claims GTIA ignores the low nibble", () => {
  assert.doesNotMatch(source, /GTIA consumes only M0-M3 bits 4-7/,
    "that belief produced both the broken shape data and the harness check that hid it");
});

test("the native harness checks the whole quartet, not just the high nibble", () => {
  const tracer = fs.readFileSync(`${root}scripts/atari800-wall-trace.h`, "utf8");
  const gate = tracer.slice(tracer.indexOf("unsigned pickup_rows = 0u;"));
  const window = gate.slice(0, 700);
  assert.doesNotMatch(window, /0x3b00u \+ row\] & 0xf0u/,
    "a high-nibble mask cannot see M0/M1 and agrees with the bug it should catch");
  // Per-type silhouettes are not uniformly $FF, so the harness asserts the full
  // sixteen-row footprint and that the shape exercises the whole quartet.
  assert.match(window, /pickup_union \|= value/);
  assert.match(window, /pickup_rows == 16u && pickup_union == 0xffu/);
});
