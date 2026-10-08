// Reconcile a run's failures against the recorded ones by NAME and by FIRST
// ASSERTION (chore/evidence-integrity; audit AUD-05,
// docs/audits/2026-10-06-pre-m5.md).
//
// Why: matching by name alone cannot tell a recorded failure from a NEW, earlier
// failure inside the same test. The SPREAD livelock shipped behind exactly that:
// a recorded test that failed on a stale pin before its behavioural assertions
// ran. So every recorded entry carries where it fails and with what message,
// and a run is compared on all three.
//
//   npm test runs   docs/recorded-test-failures.json: `file` + `test` name the
//                   test; `first_failing_assertion` ("tests/x.test.mjs:164")
//                   and `first_failing_message` (the error's first line) say
//                   where and how it fails. Read from a saved spec-reporter log.
//   trace runs      docs/recorded-gate-failures.json: `session` names the
//                   replay and `message` IS its clause's first failing
//                   assertion (the harness throws it). Read from the report
//                   JSON the trace writes (gate.behavioural_clause_failures).
//
// Reported per input: NEW (a failure with no record), MOVED (a recorded name
// that now fails elsewhere or with another message), DISAPPEARED (a record whose
// name no longer fails). Exit 1 on any NEW or MOVED, or on an input that cannot
// be read; DISAPPEARED is printed and leaves the exit at 0 (the record then
// owes an update in the same change, which the release gate enforces for the
// trace's own records).
//
// usage:
//   npm test 2>&1 | tee build/npm-test.log
//   node scripts/reconcile-failures.mjs --tests build/npm-test.log \
//     [--tests <second log>] [--trace docs/runtime-wall-trace.json]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const recordedTestFailuresPath = "docs/recorded-test-failures.json";
export const recordedGateFailuresPath = "docs/recorded-gate-failures.json";

const ANSI = /\x1b\[[0-9;]*m/g;

// The repo-relative "path:line" of a stack frame, or null outside the repo.
function frameLocation(line, root) {
  const match = /\(?(?:file:\/\/)?(\/[^():]+):(\d+):\d+\)?\s*$/.exec(line.trim());
  if (match === null) return null;
  const file = match[1];
  if (!file.startsWith(`${root}/`) || file.includes("/node_modules/")) return null;
  return `${path.relative(root, file)}:${match[2]}`;
}

// The failures in a node:test spec-reporter log: its "failing tests" section,
// one block per failure, "test at <file>:<line>:<col>" then "✖ <name> (<ms>)".
export function parseTestLog(text, { root = rootDirectory } = {}) {
  const lines = text.replace(ANSI, "").split(/\r?\n/);
  const totals = {};
  for (const line of lines) {
    const total = /^ℹ (tests|suites|pass|fail|cancelled|skipped|todo|duration_ms) (\d+(?:\.\d+)?)$/
      .exec(line.trim());
    if (total !== null) totals[total[1]] = Number(total[2]);
  }
  const start = lines.findIndex((line) => line.trim() === "✖ failing tests:");
  const failures = [];
  if (start === -1) return { totals, failures, hasFailingSection: false };
  let current = null;
  for (let index = start + 1; index < lines.length; index += 1) {
    const line = lines[index];
    const header = /^test at (.+):(\d+):\d+$/.exec(line.trim());
    if (header !== null) {
      current = { file: header[1], declared_at: `${header[1]}:${header[2]}`, test: null,
        message: null, frames: [] };
      failures.push(current);
      continue;
    }
    if (current === null) continue;
    if (current.test === null) {
      const name = /^✖ (.*?)(?: \(\d+(?:\.\d+)?m?s\))?$/.exec(line.trim());
      if (name !== null) current.test = name[1];
      continue;
    }
    if (current.message === null) {
      if (line.trim() === "") continue;
      current.message = line.trim()
        .replace(/^AssertionError \[ERR_ASSERTION\]: /, "")
        .replace(/^'(.*)'$/, "$1");
      continue;
    }
    if (/^\s+at /.test(line)) {
      const location = frameLocation(line, root);
      if (location !== null) current.frames.push(location);
    }
  }
  for (const failure of failures) {
    // The first failing assertion: the first frame in the test's own file,
    // else the first frame in the repo (a helper's throw), else where the
    // test is declared (a file that failed to load).
    const own = failure.frames.find((frame) => frame.startsWith(`${failure.file}:`));
    failure.first_failing_assertion = own ?? failure.frames[0] ?? failure.declared_at;
    delete failure.frames;
  }
  return { totals, failures, hasFailingSection: true };
}

const testKey = ({ file, test }) => `${file} > ${test}`;

export function reconcileTests(observed, recorded) {
  const recordedByKey = new Map(recorded.map((entry) => [testKey(entry), entry]));
  const observedByKey = new Map(observed.map((entry) => [testKey(entry), entry]));
  const added = [];
  const moved = [];
  const matched = [];
  for (const [key, failure] of observedByKey) {
    const record = recordedByKey.get(key);
    if (record === undefined) {
      added.push(failure);
      continue;
    }
    const sameLocation = record.first_failing_assertion === failure.first_failing_assertion;
    const sameMessage = record.first_failing_message === failure.message;
    if (sameLocation && sameMessage) matched.push(failure);
    else moved.push({ failure, record });
  }
  const disappeared = recorded.filter((entry) => !observedByKey.has(testKey(entry)));
  return { added, moved, disappeared, matched };
}

export function reconcileGate(observed, recorded) {
  const key = ({ session, message }) => `${session}: ${message}`;
  const recordedKeys = new Set(recorded.map(key));
  const observedKeys = new Set(observed.map(key));
  const recordedSessions = new Set(recorded.map(({ session }) => session));
  const unmatched = observed.filter((entry) => !recordedKeys.has(key(entry)));
  return {
    // A session that is recorded but now fails with another message moved;
    // a session with no record at all is new.
    added: unmatched.filter(({ session }) => !recordedSessions.has(session)),
    moved: unmatched.filter(({ session }) => recordedSessions.has(session)),
    disappeared: recorded.filter((entry) => !observedKeys.has(key(entry))),
    matched: observed.filter((entry) => recordedKeys.has(key(entry))),
  };
}

export function loadRecordedTestFailures(root = rootDirectory) {
  const data = JSON.parse(fs.readFileSync(path.join(root, recordedTestFailuresPath), "utf8"));
  for (const entry of data.failures) {
    for (const field of ["file", "test", "first_failing_assertion", "first_failing_message"]) {
      if (typeof entry[field] !== "string" || entry[field].length === 0) {
        throw new Error(`${recordedTestFailuresPath}: ${entry.test ?? "an entry"} carries no ${field}`);
      }
    }
  }
  return data.failures;
}

export function loadRecordedGateFailures(root = rootDirectory) {
  const data = JSON.parse(fs.readFileSync(path.join(root, recordedGateFailuresPath), "utf8"));
  return data.failures;
}

function printList(label, entries, format) {
  console.log(`  ${label}: ${entries.length}`);
  for (const entry of entries) console.log(`    - ${format(entry)}`);
}

function main(argv) {
  const tests = [];
  const traces = [];
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--tests") tests.push(argv[++index]);
    else if (argv[index] === "--trace") traces.push(argv[++index]);
    else {
      console.error(`unknown argument ${argv[index]}`);
      process.exitCode = 2;
      return;
    }
  }
  if (tests.length + traces.length === 0 || [...tests, ...traces].includes(undefined)) {
    console.error("usage: node scripts/reconcile-failures.mjs --tests <npm-test.log>... " +
      "[--trace <runtime-wall-trace report.json>]...");
    process.exitCode = 2;
    return;
  }
  let failed = false;
  const recordedTests = tests.length === 0 ? [] : loadRecordedTestFailures();
  for (const log of tests) {
    console.log(`npm test log ${log}`);
    if (!fs.existsSync(log)) {
      console.log("  NOT READ: no such file");
      failed = true;
      continue;
    }
    const { totals, failures, hasFailingSection } = parseTestLog(fs.readFileSync(log, "utf8"));
    if (totals.tests === undefined) {
      console.log("  NOT READ: no node:test summary in the log (did the run finish?)");
      failed = true;
      continue;
    }
    console.log(`  totals: tests ${totals.tests}, pass ${totals.pass}, fail ${totals.fail}, ` +
      `skipped ${totals.skipped}, todo ${totals.todo}, cancelled ${totals.cancelled}`);
    if (totals.fail > 0 && !hasFailingSection) {
      console.log("  NOT READ: the log reports failures but has no \"failing tests\" section");
      failed = true;
      continue;
    }
    const result = reconcileTests(failures, recordedTests);
    printList("matched (name and first assertion)", result.matched,
      (entry) => `${testKey(entry)} @ ${entry.first_failing_assertion}: ${entry.message}`);
    printList("NEW", result.added,
      (entry) => `${testKey(entry)} @ ${entry.first_failing_assertion}: ${entry.message}`);
    printList("MOVED", result.moved, ({ failure, record }) =>
      `${testKey(failure)}: recorded ${record.first_failing_assertion} ` +
      `"${record.first_failing_message}", now ${failure.first_failing_assertion} "${failure.message}"`);
    printList("disappeared", result.disappeared,
      (entry) => `${testKey(entry)} (recorded @ ${entry.first_failing_assertion})`);
    if (result.added.length + result.moved.length > 0) failed = true;
  }
  const recordedGate = traces.length === 0 ? [] : loadRecordedGateFailures();
  for (const reportPath of traces) {
    console.log(`trace report ${reportPath}`);
    if (!fs.existsSync(reportPath)) {
      console.log("  NOT READ: no such file");
      failed = true;
      continue;
    }
    const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
    const observed = report?.gate?.behavioural_clause_failures;
    if (!Array.isArray(observed)) {
      console.log("  NOT READ: no gate.behavioural_clause_failures in the report");
      failed = true;
      continue;
    }
    console.log(`  gate: timing_and_dli_passed ${report.gate.timing_and_dli_passed}, ` +
      `clause failures ${observed.length}`);
    const result = reconcileGate(observed, recordedGate);
    const format = ({ session, message }) => `${session}: ${message}`;
    printList("matched (session and message)", result.matched, format);
    printList("NEW", result.added, format);
    printList("MOVED", result.moved, format);
    printList("disappeared", result.disappeared, format);
    if (result.added.length + result.moved.length > 0) failed = true;
  }
  console.log(`Reconciliation: ${failed ? "FAIL" : "PASS"}`);
  if (failed) process.exitCode = 1;
}

if (import.meta.url === `file://${process.argv[1]}`) main(process.argv.slice(2));
