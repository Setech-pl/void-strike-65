// fix/audit-m5 (M5-04, docs/audits/2026-10-19-m5.md): scripts/sio-boot-repro.mjs
// prepares the real-SIO diagnostic emulator by copying the built wall-trace
// tree, swapping the trace header and patching sio.c, then running make. When
// the copied objects and the new sources share a second (or the copy is the
// newer), make has nothing to do and the copy kept the WALL-TRACE executable -
// stamped as the diagnostic build, so later calls trusted it. The hardware
// tests then failed on "missing DFTRACE_FRAMES".
//
// A stand-in emulator tree with a real Makefile reproduces it: the diagnostic
// binary must differ from the wall-trace one, a second call must reuse it
// without running make, and a binary that no longer matches its stamp must be
// rebuilt.
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

import { prepareSioDiagEmulator } from "../scripts/sio-boot-repro.mjs";

const makeMissing = spawnSync("make", ["--version"]).status !== 0;
const sha256 = (file) => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");

// The files prepareSioDiagEmulator checks and patches, and a Makefile whose
// "executable" is the header followed by sio.c, so it changes exactly when a
// recompile would. Every build appends a line to build.log.
function standInTree(directory) {
  fs.mkdirSync(path.join(directory, "src"), { recursive: true });
  fs.writeFileSync(path.join(directory, "Makefile"), [
    "src/atari800: src/cpu.c src/sio.c src/voidstrike65_trace.h",
    "\tcat src/voidstrike65_trace.h src/sio.c > src/atari800",
    "\techo built >> build.log",
    "clean:",
    "\trm -f src/atari800",
    "",
  ].join("\n"));
  fs.writeFileSync(path.join(directory, "src", "cpu.c"),
    '#include "voidstrike65_trace.h"\nvoid step(void) {\n\tDFTrace_Observe(GET_PC(), A, X, Y, S);\n}\n');
  fs.writeFileSync(path.join(directory, "src", "sio.c"), [
    "void SIO_SwitchCommandFrame(int onoff)\n{\n\t(void)onoff;\n}\n",
    "void SIO_PutByte(int byte)\n{\n\t(void)byte;\n}\n",
    "int SIO_GetByte(void)\n{\n\tint byte = 0;\n\treturn byte;\n}\n",
  ].join("\n"));
  fs.writeFileSync(path.join(directory, "src", "voidstrike65_trace.h"), "/* the wall trace's header */\n");
  const built = spawnSync("make", { cwd: directory, encoding: "utf8" });
  assert.equal(built.status, 0, built.stderr);
}

// Every file of `directory` to one whole second, `secondsAhead` from now.
function stampAll(directory, secondsAhead) {
  const when = Math.floor(Date.now() / 1000) + secondsAhead;
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(file);
      fs.utimesSync(file, when, when);
    }
  };
  walk(directory);
}

const builds = (directory) => (fs.existsSync(path.join(directory, "build.log"))
  ? fs.readFileSync(path.join(directory, "build.log"), "utf8").trim().split("\n").length : 0);

test("M5-04: the SIO-diagnostic copy of an already-built emulator is recompiled, stamped by its executable, and reused only while it matches",
  { skip: makeMissing && "make is not on the PATH" }, () => {
    const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "vs65-sio-diag-"));
    try {
      const source = path.join(scratch, "atari800-trace");
      const diag = path.join(scratch, "atari800-sio-diag");
      standInTree(source);
      const wallTrace = sha256(path.join(source, "src", "atari800"));
      // The audit's state: the copy of the built tree with every object and
      // the executable in the same second as the header written after it.
      fs.cpSync(source, diag, { recursive: true });
      stampAll(diag, 2);
      const before = builds(diag);

      const binary = prepareSioDiagEmulator(source, diag);
      assert.equal(binary, path.join(diag, "src", "atari800"));
      assert.notEqual(sha256(binary), wallTrace, "the diagnostic copy kept the wall-trace executable");
      assert.ok(fs.readFileSync(binary, "utf8").includes(
        fs.readFileSync(path.join(diag, "src", "voidstrike65_trace.h"), "utf8")),
      "the executable was not built from the diagnostic header");
      assert.ok(fs.readFileSync(binary, "utf8").includes("voidstrike65_sio_event"), "sio.c's hooks are not in it");
      assert.equal(builds(diag), before + 1, "make did not run once");

      // The cached call: same header, same executable - nothing is rebuilt.
      const diagnostic = sha256(binary);
      assert.equal(prepareSioDiagEmulator(source, diag), binary);
      assert.equal(builds(diag), before + 1, "a current, stamped build was rebuilt");
      assert.equal(sha256(binary), diagnostic);

      // An executable that no longer matches its stamp is not trusted.
      fs.copyFileSync(path.join(source, "src", "atari800"), binary);
      stampAll(diag, 4);
      prepareSioDiagEmulator(source, diag);
      assert.equal(builds(diag), before + 2, "a replaced executable was trusted by its stamp");
      assert.equal(sha256(binary), diagnostic);
    } finally {
      fs.rmSync(scratch, { recursive: true, force: true });
    }
  });
