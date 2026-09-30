import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { assertTraceEmulatorFresh } from "../scripts/atari800-trace-freshness.mjs";

// A fake prepared source tree: the header copy --prepare leaves behind and the
// binary it builds, with the binary's age set explicitly.
function preparedTree(headerText, binaryAgeSeconds) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "vs65-trace-freshness-"));
  fs.mkdirSync(path.join(directory, "src"));
  const header = path.join(directory, "atari800-wall-trace.h");
  fs.writeFileSync(header, "current header\n");
  const prepared = path.join(directory, "src", "voidstrike65_trace.h");
  fs.writeFileSync(prepared, headerText);
  const binary = path.join(directory, "src", "atari800");
  fs.writeFileSync(binary, "");
  const now = Date.now() / 1000;
  fs.utimesSync(prepared, now - 100, now - 100);
  fs.utimesSync(binary, now - 100 + binaryAgeSeconds, now - 100 + binaryAgeSeconds);
  return { directory, header };
}

test("a trace emulator prepared from the current header is accepted", () => {
  const { directory, header } = preparedTree("current header\n", 10);
  assert.doesNotThrow(() => assertTraceEmulatorFresh(directory, header));
});

test("a trace emulator prepared from an older header is refused with --prepare advice", () => {
  const { directory, header } = preparedTree("older header\n", 10);
  assert.throws(() => assertTraceEmulatorFresh(directory, header), /rerun with --prepare/);
});

test("a binary older than its prepared header is refused", () => {
  const { directory, header } = preparedTree("current header\n", -10);
  assert.throws(() => assertTraceEmulatorFresh(directory, header), /older than its prepared/);
});
