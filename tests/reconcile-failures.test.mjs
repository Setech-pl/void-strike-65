import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { loadRecordedTestFailures, parseTestLog, reconcileGate, reconcileTests }
  from "../scripts/reconcile-failures.mjs";

// chore/evidence-integrity (AUD-05): recorded failures are reconciled by name
// AND first failing assertion, so a new earlier failure inside a recorded test
// is MOVED, never silently the recorded one.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fakeRoot = "/work/repo";

// The shape node:test's spec reporter prints (Node 26), trimmed.
const specLog = `✔ passes (0.1ms)
ℹ tests 4
ℹ suites 0
ℹ pass 1
ℹ fail 3
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 12.5

✖ failing tests:

test at tests/a.test.mjs:2:1
✖ top fails (0.5ms)
  AssertionError [ERR_ASSERTION]: one is not two
  
  1 !== 2
  
      at TestContext.<anonymous> (file://${fakeRoot}/tests/a.test.mjs:2:34)
      at Test.runInAsyncScope (node:async_hooks:226:14)

test at tests/a.test.mjs:5:1
✖ deep (0.4ms)
  AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:
  + actual - expected
      at helper (file://${fakeRoot}/scripts/helper.mjs:6:28)
      at check (file://${fakeRoot}/tests/a.test.mjs:9:3)
      at TestContext.<anonymous> (file://${fakeRoot}/tests/a.test.mjs:5:22)

test at tests/b.test.mjs:1:1
✖ tests/b.test.mjs (40.3ms)
  'test failed'
`;

test("the spec log parses into names, first assertions and messages", () => {
  const { totals, failures } = parseTestLog(specLog, { root: fakeRoot });
  assert.deepEqual([totals.tests, totals.pass, totals.fail, totals.skipped], [4, 1, 3, 0]);
  assert.deepEqual(failures.map(({ file, test: name, first_failing_assertion, message }) =>
    [file, name, first_failing_assertion, message]), [
    ["tests/a.test.mjs", "top fails", "tests/a.test.mjs:2", "one is not two"],
    // The first frame in the test's own file, not the helper's throw.
    ["tests/a.test.mjs", "deep", "tests/a.test.mjs:9", "Expected values to be strictly deep-equal:"],
    // A file that failed to load: where it is declared.
    ["tests/b.test.mjs", "tests/b.test.mjs", "tests/b.test.mjs:1", "test failed"],
  ]);
});

test("a recorded name failing at another assertion is MOVED, not matched", () => {
  const { failures } = parseTestLog(specLog, { root: fakeRoot });
  const recorded = [
    { file: "tests/a.test.mjs", test: "top fails", first_failing_assertion: "tests/a.test.mjs:2",
      first_failing_message: "one is not two" },
    { file: "tests/a.test.mjs", test: "deep", first_failing_assertion: "tests/a.test.mjs:12",
      first_failing_message: "Expected values to be strictly deep-equal:" },
    { file: "tests/c.test.mjs", test: "gone", first_failing_assertion: "tests/c.test.mjs:3",
      first_failing_message: "x" },
  ];
  const result = reconcileTests(failures, recorded);
  assert.deepEqual(result.matched.map(({ test: name }) => name), ["top fails"]);
  assert.deepEqual(result.moved.map(({ failure }) => failure.test), ["deep"]);
  assert.deepEqual(result.added.map(({ test: name }) => name), ["tests/b.test.mjs"]);
  assert.deepEqual(result.disappeared.map(({ test: name }) => name), ["gone"]);
  // The same location with another message is MOVED too.
  const reworded = reconcileTests(failures.slice(0, 1),
    [{ ...recorded[0], first_failing_message: "one is not three" }]);
  assert.equal(reworded.moved.length, 1);
});

test("a trace clause failure is NEW for an unrecorded session and MOVED for a new message", () => {
  const recorded = [{ session: "s1", message: "clause A failed" },
    { session: "s3", message: "clause C failed" }];
  const result = reconcileGate([
    { session: "s1", message: "clause B failed" },
    { session: "s2", message: "clause A failed" },
  ], recorded);
  assert.deepEqual(result.moved, [{ session: "s1", message: "clause B failed" }]);
  assert.deepEqual(result.added, [{ session: "s2", message: "clause A failed" }]);
  assert.deepEqual(result.disappeared, recorded);
  assert.deepEqual(result.matched, []);
});

test("every recorded npm test failure carries its first assertion and message", () => {
  // loadRecordedTestFailures refuses an entry without either field. An empty
  // set is legitimate (every recorded failure fixed), so no count is pinned.
  const recorded = loadRecordedTestFailures(root);
  for (const entry of recorded) {
    assert.match(entry.first_failing_assertion, /^tests\/[\w.-]+\.test\.mjs:\d+$/);
    assert.ok(fs.existsSync(path.join(root, entry.file)), entry.file);
  }
});

test("the CLI exits non-zero on a NEW failure and on an unreadable log", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "reconcile-"));
  try {
    const log = path.join(directory, "npm-test.log");
    fs.writeFileSync(log, specLog);
    const script = path.join(root, "scripts/reconcile-failures.mjs");
    const run = (args) => spawnSync(process.execPath, [script, ...args], { encoding: "utf8" });
    const newFailures = run(["--tests", log]);
    assert.equal(newFailures.status, 1, newFailures.stdout);
    assert.match(newFailures.stdout, /NEW: 3/);
    assert.equal(run(["--tests", path.join(directory, "missing.log")]).status, 1);
    fs.writeFileSync(log, "the run died before its summary\n");
    assert.equal(run(["--tests", log]).status, 1);
    assert.equal(run([]).status, 2);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
