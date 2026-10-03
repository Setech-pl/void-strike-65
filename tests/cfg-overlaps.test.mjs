// ld65 checks each memory area against its own segments, never one area
// against another, and never across links. Two areas that overlap by accident
// are therefore invisible to the linker: DIRECTOR_ABI_RAM reached one byte into
// PICKUP_CODE_RAM at $8776 for months, guarded only by an assert in
// c-asm-abi.s (M5b-S3 brief). This test fails on any overlap between two cfg
// memory areas unless scripts/memory-map-report.mjs declares it on purpose, by
// name, with its reason - and on a declaration that no longer matches one.
import assert from "node:assert/strict";
import test from "node:test";

import { DECLARED_CFG_OVERLAPS, cfgAreaOverlaps } from "../scripts/memory-map-report.mjs";

const hex = (value) => `$${value.toString(16).toUpperCase().padStart(4, "0")}`;
const key = (left, right) => [left, right].sort().join(" / ");

test("every overlap between two cfg memory areas is declared on purpose and named", () => {
  const declared = new Map(DECLARED_CFG_OVERLAPS.map((entry) => [key(...entry.areas), entry]));
  const undeclared = cfgAreaOverlaps()
    .filter((overlap) => !declared.has(key(overlap.a.name, overlap.b.name)))
    .map((overlap) => `${overlap.a.name} (${overlap.a.cfg}) and ${overlap.b.name} ` +
      `(${overlap.b.cfg}) share ${hex(overlap.start)}-${hex(overlap.end)}`);
  assert.deepEqual(undeclared, [], "undeclared cfg overlaps");
});

test("every declared cfg overlap still exists and carries a name and a reason", () => {
  const present = new Set(cfgAreaOverlaps().map((overlap) => key(overlap.a.name, overlap.b.name)));
  for (const entry of DECLARED_CFG_OVERLAPS) {
    assert.equal(entry.areas.length, 2, "a declaration names two areas");
    assert.ok(present.has(key(...entry.areas)), `declared overlap ${key(...entry.areas)} no longer exists`);
    assert.match(entry.name, /\S/, `${key(...entry.areas)} has no name`);
    assert.ok(entry.reason.length >= 20, `${key(...entry.areas)} has no reason`);
  }
  assert.equal(new Set(DECLARED_CFG_OVERLAPS.map((entry) => key(...entry.areas))).size,
    DECLARED_CFG_OVERLAPS.length, "a pair is declared twice");
});
