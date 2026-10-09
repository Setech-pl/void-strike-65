// data/w2-lights (docs/plans/w2-lights.md §5, owner answers Q3 and addition 2
// of 2026-10-08): the trace records each Light slot's state and archetype, and
// clause L1-L5 reads them over every measured legal replay. Synthetic rows
// here; the evidence's own verdict is checked in tests/runtime-wall-trace.test.mjs.
//
// Every clause must show its subject is non-empty and fails when it is empty
// (owner addition 2): L1 and L2 rows with a live Light, L3 swarm rows, L4 elite
// rows, L5 variant (a) formations.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import * as observers from "../scripts/trace-clause-observers.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const W = 12;                       // the Wingman's record offset
const I = 24;                       // the Interceptor's
// Sector 0 elite (a), 1 swarm, 2 elite (b): index = director_sector.
const SECTORS = [
  { subtype: "elite", variantA: true },
  { subtype: "swarm", variantA: false },
  { subtype: "elite", variantA: false },
];

function row(frame, sector, enemy, slots, extra = {}) {
  const value = { session: "s", frame, director_sector: sector, enemy_state: enemy, boss_state: 0, ...extra };
  for (let k = 0; k < 4; k += 1) {
    value[`light_state${k}`] = slots[k]?.[0] ?? 0;
    value[`light_archetype${k}`] = slots[k]?.[1] ?? W;
  }
  return value;
}

// A replay that meets every clause: a variant (a) formation with its
// Interceptor, then a swarm with two Lights and no Heavy, then (b).
function goodRows() {
  return [
    row(1, 0, 0, []),
    row(2, 0, 1, [[2, I]]),                      // (a): Raiders admitted with the Interceptor
    row(3, 0, 1, [[2, I]]),
    row(4, 1, 0, [[2, W]]),
    row(5, 1, 0, [[2, W], [2, I]]),              // two Lights at once in the swarm
    row(6, 2, 1, []),
  ];
}

function coverage(rows) {
  assert.equal(typeof observers.lightCoverage, "function", "scripts/trace-clause-observers.mjs has no lightCoverage");
  return observers.lightCoverage(rows, SECTORS);
}

test("Light clause: a replay set with an Interceptor, two Lights at once, a clean swarm and variant (a) holds", () => {
  const verdict = coverage(goodRows());
  assert.equal(verdict.held, true, verdict.failures.join("; "));
  assert.equal(verdict.maximumLiveLights, 2);
  assert.deepEqual(Object.fromEntries(Object.entries(verdict.clauses).map(([id, c]) => [id, c.subject])),
    { L1: 4, L2: 4, L3: 2, L4: 4, L5: 1 });
  assert.equal(verdict.clauses.L1.frames, 3);
  assert.equal(verdict.clauses.L2.frames, 1);
  assert.equal(verdict.clauses.L3.violations, 0);
  assert.equal(verdict.clauses.L4.violations, 0);
  assert.equal(verdict.clauses.L5.frames, 2);
});

test("Light clause L1: no live Interceptor fails it", () => {
  const rows = goodRows().map((r) => {
    const copy = { ...r };
    for (let k = 0; k < 4; k += 1) copy[`light_archetype${k}`] = W;
    return copy;
  });
  const verdict = coverage(rows);
  assert.equal(verdict.clauses.L1.held, false);
  assert.equal(verdict.held, false);
});

test("Light clause L2: one Light at a time fails it", () => {
  const rows = goodRows().filter((r) => r.frame !== 5);
  const verdict = coverage(rows);
  assert.equal(verdict.clauses.L2.held, false);
  assert.equal(verdict.maximumLiveLights, 1);
});

test("Light clause: a break-up-pending slot (state 3) is not a live Light", () => {
  const rows = goodRows().map((r) => (r.frame === 5 ? row(5, 1, 0, [[2, W], [3, I]]) : r));
  const verdict = coverage(rows);
  assert.equal(verdict.clauses.L2.held, false, "a state-3 slot counted as live");
});

test("Light clause L3: a Heavy live in a swarm row fails it; no swarm row at all fails it", () => {
  const heavy = coverage(goodRows().map((r) => (r.frame === 4 ? { ...r, enemy_state: 1 } : r)));
  assert.equal(heavy.clauses.L3.held, false);
  assert.equal(heavy.clauses.L3.violations, 1);
  const empty = coverage(goodRows().filter((r) => r.director_sector !== 1));
  assert.equal(empty.clauses.L3.subject, 0);
  assert.equal(empty.clauses.L3.held, false, "an empty swarm subject held");
});

test("Light clause L4: two live Lights in an elite row fail it; no elite row at all fails it", () => {
  const two = coverage(goodRows().map((r) => (r.frame === 6 ? row(6, 2, 1, [[2, W], [2, W]]) : r)));
  assert.equal(two.clauses.L4.held, false);
  assert.equal(two.clauses.L4.violations, 1);
  const carried = coverage(goodRows().map((r) => (r.frame === 6 ? row(6, 2, 1, [[2, I]]) : r)));
  assert.equal(carried.clauses.L4.held, true, "one carried Light in an elite sector is legal");
  const empty = coverage(goodRows().filter((r) => r.director_sector === 1));
  assert.equal(empty.clauses.L4.subject, 0);
  assert.equal(empty.clauses.L4.held, false, "an empty elite subject held");
});

test("Light clause L5: no variant (a) formation, or one without its Interceptor, fails it", () => {
  const none = coverage(goodRows().filter((r) => r.director_sector !== 0));
  assert.equal(none.clauses.L5.subject, 0);
  assert.equal(none.clauses.L5.held, false, "an empty variant (a) subject held");
  const alone = coverage(goodRows().map((r) => (r.director_sector === 0 ? row(r.frame, 0, r.enemy_state, []) : r)));
  assert.equal(alone.clauses.L5.subject, 1);
  assert.equal(alone.clauses.L5.held, false, "(a)'s Raiders without an Interceptor held");
});

test("Light clause: boss rows are set aside", () => {
  const rows = [...goodRows(), row(7, 1, 1, [[2, I]], { boss_state: 3 })];
  assert.equal(coverage(rows).clauses.L3.violations, 0);
});

test("Light clause: the trace records each Light slot's state and archetype", () => {
  const header = fs.readFileSync(path.join(root, "scripts", "atari800-wall-trace.h"), "utf8");
  const harness = fs.readFileSync(path.join(root, "scripts", "runtime-wall-trace.mjs"), "utf8");
  // RE-POINTED S5-1: the archetype columns are no longer the header's last -
  // the boss entry's HUD snapshots follow them - so the closing "\n" is not
  // part of the match; the columns and their order are unchanged.
  for (const columns of ["\",light_state0,light_state1,light_state2,light_state3\"",
    "\",light_archetype0,light_archetype1,light_archetype2,light_archetype3\""]) {
    assert.ok(header.includes(columns), `the trace CSV header has no ${columns} columns`);
  }
  for (const name of ["DFTRACE_LIGHT_STATE", "DFTRACE_LIGHT_ARCHETYPE"]) {
    assert.ok(header.includes(`"${name}"`), `the trace header does not read ${name}`);
    assert.ok(harness.includes(`${name}:`), `the harness does not pass ${name}`);
  }
  assert.match(harness, /lightCoverage\(/, "the harness does not run the Light clause");
});
