// S5-1 (plan docs/plans/s5-boss-regions.md §4.7; owner decision: the target is
// the 64 KB Atari 65XE / 800XL class, PAL; the 130XE is a compatibility check
// only). Every Atari800 launch - the play copy, the trace replays, the boot
// smoke, the menu raster, the capacity watch - runs the 64 KB machine (-xl);
// exactly one boot-smoke session runs the 130XE (-xe), labelled; the documented
// commands say the same.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");
const machineModule = path.join(root, "scripts", "atari800-machine.mjs");
// Atari800's machine-type options (atari800 -help).
const MACHINE_FLAG = /["'`](-(?:atari|xl|xe|xegs|5200|320xe|rambo|axlon|mosaic|1200|a|b|c))["'`]/g;

const sources = (directory) => fs.readdirSync(path.join(root, directory))
  .filter((name) => /\.(mjs|js)$/.test(name)).map((name) => path.join(root, directory, name));

test("the machine flags are defined once: the target -xl (64 KB), the compatibility -xe (130XE)", async () => {
  assert.ok(fs.existsSync(machineModule), "scripts/atari800-machine.mjs is missing");
  const machine = await import(machineModule);
  assert.equal(machine.TARGET_MACHINE, "-xl");
  assert.equal(machine.COMPATIBILITY_MACHINE, "-xe");
});

test("no script or test spells a machine flag of its own; every launch list takes the target's", () => {
  const literal = [], launches = [];
  for (const file of [...sources("scripts"), ...sources("tests")]) {
    if (file === machineModule || file === fileURLToPath(import.meta.url)) continue;
    fs.readFileSync(file, "utf8").split("\n").forEach((line, index) => {
      for (const [, flag] of line.matchAll(MACHINE_FLAG)) literal.push(`${path.relative(root, file)}:${index + 1} ${flag}`);
      if (/["']-pal["']/.test(line)) launches.push({ where: `${path.relative(root, file)}:${index + 1}`, line });
    });
  }
  assert.deepEqual(literal, [], "a machine flag outside scripts/atari800-machine.mjs");
  // Subject: the launch argument lists (each carries "-pal").
  assert.ok(launches.length >= 6, `only ${launches.length} launch lists found`);
  assert.deepEqual(launches.filter(({ line }) => !/\bTARGET_MACHINE\b/.test(line)).map(({ where }) => where), [],
    "a launch list without TARGET_MACHINE");
});

test("npm run play:atr launches the 64 KB machine", () => {
  const result = spawnSync(process.execPath, [path.join(root, "scripts", "artifact-launch.mjs"), "atr", "--dry-run"],
    { cwd: root, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  const record = JSON.parse(result.stdout);
  assert.equal(record.arguments[0], "-xl");
  assert.ok(record.arguments.includes("-pal"));
});

test("the committed evidence ran on the 64 KB machine, with exactly one labelled 130XE boot", () => {
  const report = JSON.parse(read("docs", "runtime-wall-trace.json"));
  assert.equal(report.emulator.model_arguments[0], "-xl", "the trace replays' machine");
  const smoke = report.boot_smoke;
  const target = [...smoke.sessions, ...smoke.reset_sessions,
    ...smoke.overlay.forced_restore_sessions.map(({ id }) => ({ id, launch: null }))];
  for (const session of [...smoke.sessions, ...smoke.reset_sessions]) {
    assert.ok(session.launch.arguments.includes("-xl") && !session.launch.arguments.includes("-xe"), session.id);
  }
  assert.ok(target.length >= 6, `only ${target.length} target-machine boot sessions`);
  assert.equal(smoke.compatibility_sessions?.length, 1, "the one 130XE compatibility session");
  const [compat] = smoke.compatibility_sessions;
  assert.ok(compat.launch.arguments.includes("-xe") && !compat.launch.arguments.includes("-xl"));
  assert.match(compat.machine, /130XE/);
  assert.equal(compat.passed, true);
});

test("the documented emulator commands use the 64 KB machine; a 130XE command says it is the compatibility check", () => {
  const documents = ["README.md", "README.pl.md", "AGENTS.md", "docs/hardware-testing.md", "docs/level-data-howto.md"];
  const commands = [], wrong = [];
  for (const document of documents) {
    read(document).split("\n").forEach((line, index) => {
      if (!/\batari800 -/.test(line)) return;
      commands.push(line);
      const where = `${document}:${index + 1}`;
      if (/\batari800 -xe\b/.test(line) && !/130XE/.test(line)) wrong.push(`${where}: -xe without the 130XE label`);
      else if (!/\batari800 -x[el]\b/.test(line)) wrong.push(`${where}: no machine flag`);
    });
    // The BASIC-on cold boot and the 64 KB machine each have a documented command.
  }
  assert.ok(commands.length >= 10, `only ${commands.length} documented commands`);
  assert.ok(commands.some((line) => /atari800 -xl\b/.test(line)), "no documented -xl command");
  assert.deepEqual(wrong, []);
});
