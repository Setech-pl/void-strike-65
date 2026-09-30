import fs from "node:fs";
import path from "node:path";

// The instrumented Atari800 compiles scripts/atari800-wall-trace.h in as
// src/voidstrike65_trace.h (--prepare copies it, then builds). A binary built
// from an older header still runs, and its observer then disagrees with the
// clauses: measured 2026-09-30, a 22 Sep binary under a 29 Sep header aborted
// main's own trace. Refuse it before any session runs.
export function assertTraceEmulatorFresh(sourceDirectory, headerPath) {
  const prepared = path.join(sourceDirectory, "src", "voidstrike65_trace.h");
  const binary = path.join(sourceDirectory, "src", "atari800");
  if (!fs.existsSync(prepared) ||
      !fs.readFileSync(prepared).equals(fs.readFileSync(headerPath))) {
    throw new Error(`The trace emulator in ${sourceDirectory} was not prepared from the ` +
      `current ${path.basename(headerPath)}; rerun with --prepare`);
  }
  if (fs.statSync(binary).mtimeMs < fs.statSync(prepared).mtimeMs) {
    throw new Error(`The trace emulator binary in ${sourceDirectory} is older than its ` +
      "prepared trace header; rerun with --prepare");
  }
}
