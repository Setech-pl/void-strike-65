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

test("every capsule row asserts the complete M0-M3 quartet", () => {
  const shape = section("fighter_pickup_pmg_shape:", "\n\n");
  const rows = shape.split("\n")
    .filter((line) => line.trim().startsWith(".byte"))
    .flatMap((line) => [...line.matchAll(/\$([0-9A-F]{2})/g)].map((m) => parseInt(m[1], 16)));
  assert.equal(rows.length, 16, "the capsule is sixteen scanlines tall");
  for (const [index, row] of rows.entries()) {
    const missiles = [row & 3, (row >> 2) & 3, (row >> 4) & 3, (row >> 6) & 3];
    assert.deepEqual(missiles, [3, 3, 3, 3],
      `row ${index} ($${row.toString(16).toUpperCase()}) does not set all four missiles; ` +
      "one missile is two bits (M0 = bits 0-1 .. M3 = bits 6-7), so a solid row is $FF");
  }
});

test("the shape comment no longer claims GTIA ignores the low nibble", () => {
  assert.doesNotMatch(source, /GTIA consumes only M0-M3 bits 4-7/,
    "that belief produced both the broken shape data and the harness check that hid it");
});

test("the native harness checks the whole quartet, not just the high nibble", () => {
  const tracer = fs.readFileSync(`${root}scripts/atari800-wall-trace.h`, "utf8");
  const gate = tracer.slice(tracer.indexOf("unsigned pickup_rows = 0u;"));
  assert.doesNotMatch(gate.slice(0, 400), /0x3b00u \+ row\] & 0xf0u/,
    "a high-nibble mask cannot see M0/M1 and agrees with the bug it should catch");
  assert.match(gate.slice(0, 400), /MEMORY_mem\[0x3b00u \+ row\] == 0xffu/);
});
