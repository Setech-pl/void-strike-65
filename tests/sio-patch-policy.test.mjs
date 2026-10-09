// fix/hardware-boot (docs/diagnostics/hardware-boot.md, owner answer Q2,
// 2026-10-09): every Atari800 launch states its SIO mode. The boot smoke's cold
// sessions and `npm run play:atr` run real SIO (-nopatch), as the hardware
// does; the trace replays, the menu raster and the capacity watch run with the
// SIO patch on, pinned by -config instead of inherited from ~/.atari800.cfg.
// A launcher that turns the patch back on where it must be off fails here.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const machineModule = path.join(root, "scripts", "atari800-machine.mjs");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");
const sources = (directory) => fs.readdirSync(path.join(root, directory))
  .filter((name) => /\.(mjs|js)$/.test(name)).map((name) => path.join(root, directory, name));

test("the SIO mode is defined once: REAL_SIO is -nopatch, the patch-on mode a pinned config", async () => {
  const machine = await import(machineModule);
  assert.equal(machine.REAL_SIO, "-nopatch");
  assert.equal(machine.PINNED_CONFIG, path.join("build", "atari800-pinned.cfg"));
  assert.equal(typeof machine.atari800SioArguments, "function");
  const host = "Atari 800 Emulator, Version 7.1.2\nROM_OS_BB01R2=/roms/ATARIXL.ROM\nENABLE_SIO_PATCH=0\nCFG_SAVE_ON_EXIT=1\n";
  const pinned = machine.pinnedConfigText(host).split("\n");
  assert.ok(pinned.includes("ROM_OS_BB01R2=/roms/ATARIXL.ROM"), "the host's ROM paths are kept");
  assert.deepEqual(pinned.filter((line) => line.startsWith("ENABLE_SIO_PATCH=")), ["ENABLE_SIO_PATCH=1"],
    "a host config with the patch off is overridden");
  assert.deepEqual(pinned.filter((line) => line.startsWith("CFG_SAVE_ON_EXIT=")), ["CFG_SAVE_ON_EXIT=0"]);
  assert.equal(pinned[0], "Atari 800 Emulator, Version 7.1.2");
  assert.ok(machine.pinnedConfigText("").startsWith("Atari 800 Emulator"), "no host config: a minimal one");
});

test("no script or test spells -nopatch of its own; every launch list takes atari800SioArguments", () => {
  const literal = [], launches = [];
  for (const file of [...sources("scripts"), ...sources("tests")]) {
    if (file === machineModule || file === fileURLToPath(import.meta.url)) continue;
    fs.readFileSync(file, "utf8").split("\n").forEach((line, index) => {
      if (/["'`]-nopatch["'`]/.test(line)) literal.push(`${path.relative(root, file)}:${index + 1}`);
      // Launch lists live in scripts/; a test only asserts on them.
      if (/["']-pal["']/.test(line) && file.includes(`${path.sep}scripts${path.sep}`)) {
        launches.push({ where: `${path.relative(root, file)}:${index + 1}`, line });
      }
    });
  }
  assert.deepEqual(literal, [], "-nopatch spelled outside scripts/atari800-machine.mjs");
  assert.ok(launches.length >= 7, `only ${launches.length} launch lists found`);
  assert.deepEqual(launches.filter(({ line }) => !/\batari800SioArguments\(/.test(line)).map(({ where }) => where), [],
    "a launch list without its SIO mode (atari800SioArguments on the -pal line)");
});

test("the boot smoke launches its cold sessions with real SIO; the replays and the menu raster do not", () => {
  const text = read("scripts", "runtime-wall-trace.mjs");
  const lines = text.split("\n").filter((line) => /["']-pal["']/.test(line));
  const real = lines.filter((line) => /realSio:\s*true/.test(line));
  const patched = lines.filter((line) => /realSio:\s*false/.test(line));
  assert.equal(real.length, 1, "exactly one real-SIO launch list in the harness: the boot smoke's");
  assert.ok(/basic \? "-basic" : "-nobasic"/.test(real[0]), "the real-SIO list is the boot smoke's BASIC x fill matrix");
  assert.equal(patched.length, lines.length - 1, "every other harness launch list is patch-on");
});

test("npm run play:atr runs real SIO by default; --fast keeps the pinned patch", () => {
  const run = (...extra) => {
    const result = spawnSync(process.execPath, [path.join(root, "scripts", "artifact-launch.mjs"), "atr",
      "--dry-run", ...extra], { cwd: root, encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
    return JSON.parse(result.stdout);
  };
  const real = run();
  assert.ok(real.arguments.includes("-nopatch"), "play:atr must load like the hardware");
  assert.ok(real.arguments.includes("-config"));
  assert.match(real.sio_mode, /real SIO/);
  const fast = run("--fast");
  assert.ok(!fast.arguments.includes("-nopatch"));
  assert.ok(fast.arguments.includes("-config"), "the patch-on mode is pinned, not inherited");
});

test("the committed evidence: real-SIO boot smoke with stage 2 clean, pinned patch-on replays and menu raster", () => {
  const report = JSON.parse(read("docs", "runtime-wall-trace.json"));
  const manifest = JSON.parse(read("dist", "void-strike-65-manifest.json"));
  const extensionSectors = manifest.transportCapacity?.extensionSectors ??
    JSON.parse(read("build", "manifest.json")).transportCapacity.extensionSectors;
  assert.ok(extensionSectors > 0);
  assert.match(report.emulator.sio_mode, /SIO patch on, pinned/);
  assert.ok(report.emulator.model_arguments.includes("-config"));
  assert.ok(!report.emulator.model_arguments.includes("-nopatch"));
  const smoke = report.boot_smoke;
  assert.match(smoke.sio_mode, /real SIO/);
  const sessions = [...smoke.sessions, ...smoke.reset_sessions];
  assert.ok(sessions.length >= 5);
  for (const session of sessions) {
    assert.ok(session.launch.arguments.includes("-nopatch"), `${session.id} ran with the SIO patch`);
    const stage2 = session.stage2;
    assert.ok(stage2, `${session.id} recorded no stage-2 clause`);
    assert.equal(stage2.error_frame, -1, `${session.id} reached boot_stage2_error`);
    assert.equal(stage2.runs, session.reset ? 2 : 1, `${session.id} stage-2 runs`);
    assert.equal(stage2.siov_reads, stage2.runs * extensionSectors, `${session.id} stage-2 SIOV reads`);
    assert.equal(stage2.siov_reads_armed, stage2.siov_reads, `${session.id} a stage-2 read not armed for receive`);
  }
  const menu = JSON.parse(read("docs", "menu-raster-trace.json"));
  assert.match(menu.sio_mode, /SIO patch on, pinned/);
  assert.ok(menu.launch_arguments.includes("-config") && !menu.launch_arguments.includes("-nopatch"));
});
