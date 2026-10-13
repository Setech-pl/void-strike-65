// S5-3 (the owner's answers of 2026-10-13): the slot F write clause
// (scripts/trace-clause-observers.mjs slotFWriteClause, S5-1's write-watch
// proof) admits region 3's field code writing its own state - and nothing
// else. Synthetic watches in the trace's shape (DFWATCH_OUTPUT: each writer's
// PC, count, frames, first / last / lowest / highest address): the field's
// state writes pass; a foreign write into slot F, a field-code write outside
// its state bytes, a write that strays past them between its first and last,
// and any field write on a disk without field code still fail.
import assert from "node:assert/strict";
import test from "node:test";

import { slotFWriteClause } from "../scripts/trace-clause-observers.mjs";

const COPY = 0x3000;                        // copy_hud_charset (a label of the main link)
const labels = new Map([["copy_hud_charset", COPY], ["after_copy", COPY + 0x40]]);
const reader = { readerAddress: 0xa000, readerEnd: 0xa800 };
const field = { codeStart: 0x526e, codeEnd: 0x533b, stateStart: 0x533b, stateEnd: 0x5343 };
const writer = (pc, first, last = first, { min = Math.min(first, last), max = Math.max(first, last), frame = 900 } = {}) =>
  ({ pc, count: 3, first_frame: frame, last_frame: frame + 10, first_address: first, last_address: last,
    min_address: min, max_address: max });
const watch = (...extra) => [{ session: "s", bossEntry: false, slot_f: { overflow: 0, writers: [
  writer(COPY + 4, 0x5200, 0x53ff, { frame: 10 }),          // the charset copy at start-up
  writer(0xa262, 0x5200, 0x527f),                          // the region block's read
  ...extra] } }];
const run = (watches, withField = field) => slotFWriteClause(watches, { labels, ...reader, blockBytes: 0, field: withField });

test("the field's code writing its own state is admitted", () => {
  const result = run(watch(writer(0x527c, 0x533b), writer(0x52b7, 0x5340, 0x5342)));
  assert.deepEqual(result.violations, []);
  assert.equal(result.fieldWrites, 6);
});

test("a foreign PC writing into the field's state still fails", () => {
  const result = run(watch(writer(0x2000, 0x533b)));
  assert.equal(result.violations.length, 1, JSON.stringify(result.violations));
});

test("the field's code writing slot F outside its state still fails (the look tail, its own code)", () => {
  for (const address of [0x5200, 0x526d, 0x5300, 0x5343, 0x53ff]) {
    const result = run(watch(writer(0x52b7, address)));
    assert.equal(result.violations.length, 1, `$${address.toString(16)}: ${JSON.stringify(result.violations)}`);
  }
});

test("a field-code writer whose first and last writes are in its state but which strayed between still fails", () => {
  const result = run(watch(writer(0x52b7, 0x533b, 0x5342, { min: 0x5200, max: 0x5342 })));
  assert.equal(result.violations.length, 1);
});

test("on a disk without field code every such writer is foreign", () => {
  const result = run(watch(writer(0x527c, 0x533b)), null);
  assert.equal(result.violations.length, 1);
});
