// fix/hardware-audio (docs/diagnostics/hardware-audio.md, the owner's
// real-hardware results of 2026-10-10): the OS's SIO and the sector reader left
// SKCTL = $13. Bit 4 is POKEY's asynchronous receive mode, which on a real
// machine holds timers 3 and 4 in reset while no start bit arrives, so the
// menu's melody and arpeggio and every channel-3/4 sound effect were silent.
// Atari800 does not model the hold, so these tests assert the register value:
// it must have bit 4 clear at the menu, in play and after every load.
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const emulatorSource = path.join(root, "build", "atari800-trace");
const emulatorMissing = !fs.existsSync(path.join(emulatorSource, "src", "cpu.c"));
const ASYNC_RECEIVE = 0x10;

function source(...parts) {
  return fs.readFileSync(path.join(root, "src", ...parts), "utf8");
}

function equate(text, name) {
  const match = new RegExp(`^${name}\\s*=\\s*\\$([0-9A-Fa-f]+)`, "m").exec(text);
  assert.ok(match, `${name} is not defined`);
  return Number.parseInt(match[1], 16);
}

// Every `sta SKCTL` in src/ with the constant loaded just before it.
function skctlWrites() {
  const writes = [];
  for (const file of ["main.s", "boot-splash.s", path.join("hybrid", "sector-reader.s"),
    path.join("hybrid", "level-summary.s"), path.join("hybrid", "boss.s"),
    path.join("hybrid", "gameplay-music.s"), path.join("hybrid", "light-kernel.s")]) {
    const lines = source(file).split("\n").map((line) => line.replace(/;.*/, "").trim());
    lines.forEach((line, index) => {
      if (/^sta\s+(SKCTL|\$D20F)$/i.test(line)) {
        const load = /^lda\s+#(\w+)$/.exec(lines[index - 1] ?? "");
        writes.push({ file, line: index + 1, value: load?.[1] ?? null });
      }
    });
  }
  return writes;
}

test("the SKCTL values the game leaves at rest keep async receive off and the keyboard scan on", () => {
  const rest = equate(source("hybrid", "sector-reader.s"), "SKCTL_REST");
  const audio = equate(source("main.s"), "SKCTL_AUDIO");
  for (const [name, value] of [["SKCTL_REST", rest], ["SKCTL_AUDIO", audio]]) {
    assert.equal(value & ASYNC_RECEIVE, 0, `${name} $${value.toString(16)} has async receive on`);
    assert.equal(value & 0x03, 0x03, `${name} must keep keyboard scan and debounce (bits 0-1)`);
    assert.equal(value & 0x08, 0, `${name} must not select two-tone mode`);
  }
});

test("every SKCTL write is one this diagnosis reviewed (a new one must keep bit 4 clear at rest)", () => {
  assert.deepEqual(skctlWrites().map(({ file, value }) => `${file}: ${value}`).sort(), [
    "hybrid/level-summary.s: SKCTL_TRANSMIT",   // the save write; both exits run quiesce
    "hybrid/sector-reader.s: SKCTL_RECEIVE",
    "hybrid/sector-reader.s: SKCTL_RESET",
    "hybrid/sector-reader.s: SKCTL_RESET",
    "hybrid/sector-reader.s: SKCTL_REST",       // sector_reader_quiesce, every exit
    "hybrid/sector-reader.s: SKCTL_TRANSMIT",
    "main.s: SKCTL_AUDIO",                      // once, before the first menu
  ].map((entry) => entry.replace(/\//g, path.sep)));
});

test("the save write's exits both hand POKEY back through sector_reader_quiesce", () => {
  const lines = source("hybrid", "level-summary.s").split("\n").map((line) => line.replace(/;.*/, "").trim());
  const write = lines.findIndex((line) => /^sta\s+SKCTL$/.test(line));
  const end = lines.findIndex((line, index) => index > write && /^[a-z_]+:$/.test(line));
  assert.ok(write >= 0 && end > write, "the save write's routine is not where it was");
  const body = lines.slice(write, end);
  const returns = body.map((line, index) => (line === "rts" ? index : -1)).filter((index) => index >= 0);
  assert.equal(returns.length, 2, "the save write has two exits (complete, failed)");
  for (const exit of returns) {
    const before = body.slice(0, exit).reverse();
    const quiesce = before.findIndex((line) => line === "jsr sector_reader_quiesce");
    const branch = before.findIndex((line) => /^(rts|jmp|b[a-z]{2})\b/.test(line));
    assert.ok(quiesce >= 0 && (branch < 0 || quiesce < branch),
      `the exit at +${exit} does not run sector_reader_quiesce first`);
  }
});

test("the cold start writes SKCTL_AUDIO before it enters the main menu", () => {
  const lines = source("main.s").split("\n").map((line) => line.replace(/;.*/, "").trim());
  const write = lines.findIndex((line) => line === "lda #SKCTL_AUDIO");
  assert.ok(write >= 0 && lines[write + 1] === "sta SKCTL", "lda #SKCTL_AUDIO / sta SKCTL is missing");
  const menu = lines.findIndex((line, index) => index > write && line === "jsr enter_main_menu");
  assert.ok(menu > write && menu - write < 20, "the SKCTL write must sit in the cold start, before the menu");
});

test("the boss entry's loads leave async receive off (debug route --level=1:sector=6, real SIO)",
  { skip: emulatorMissing && "the trace emulator source is not in build/atari800-trace" }, () => {
    execFileSync(process.execPath, ["scripts/build.mjs", "--level=1:sector=6", "--quiet"],
      { cwd: root, stdio: "pipe" });
    const out = path.join("build", "hardware-audio-test");
    const result = spawnSync(process.execPath, [path.join(root, "scripts", "sio-boot-repro.mjs"),
      "--atr=build/level-1-s6/void-strike-65.atr", "--labels=build/level-1-s6", "--only=nopatch",
      "--start-game", "--stop=frames", "--frames=3000", `--out=${out}`, `--json=${path.join(out, "report.json")}`],
    { cwd: root, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    const report = JSON.parse(fs.readFileSync(path.join(root, out, "report.json"), "utf8"));
    for (const run of report.results) {
      assert.equal(run.stop?.reason, "frames", `${run.id} ended at ${run.stop?.reason} ${run.stop?.pc}`);
      const gameplay = run.milestones.main_loop;
      assert.ok(gameplay > 0, `${run.id} never reached gameplay`);
      const exits = run.skctl_at.filter(({ label }) => label === "sector_reader_quiesce_done");
      assert.ok(exits.filter(({ frame }) => frame > gameplay).length >= 5,
        `${run.id}: the boss entry's loads were not observed after gameplay began`);
      for (const mark of [...exits, ...run.skctl_at.filter(({ label }) => label === "main_loop")]) {
        assert.equal(Number.parseInt(mark.skctl.slice(1), 16) & ASYNC_RECEIVE, 0,
          `${run.id}: SKCTL ${mark.skctl} at ${mark.label} f${mark.frame} has async receive on`);
      }
      assert.equal(Number.parseInt(run.stop.skctl.slice(1), 16) & ASYNC_RECEIVE, 0,
        `${run.id}: SKCTL ${run.stop.skctl} in the boss fight has async receive on`);
    }
  });
