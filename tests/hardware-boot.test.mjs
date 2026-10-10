// fix/hardware-boot (docs/diagnostics/hardware-boot.md, owner answers Q1 and
// Q2, 2026-10-09): the built ATR boots through real SIO. Stage 2 reads the
// extension through the OS SIOV, which writes its status into DSTATS; a DSTATS
// armed once per chunk turned every read after a chunk's first into a no-data
// command, and every real machine stopped on boot_stage2_error's red screen.
// Atari800's SIO patch hid it from every committed run.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const emulatorSource = path.join(root, "build", "atari800-trace");
const emulatorMissing = !fs.existsSync(path.join(emulatorSource, "src", "cpu.c"));

test("stage 2 arms DSTATS for receive before every SIOV call, not once per chunk", () => {
  const lines = fs.readFileSync(path.join(root, "src", "main.s"), "utf8").split("\n");
  const loop = lines.findIndex((line) => /^stage2_read_sector:/.test(line));
  const chunk = lines.findIndex((line) => /^stage2_load_chunk:/.test(line));
  assert.ok(chunk >= 0 && loop > chunk, "stage2_load_chunk / stage2_read_sector are missing");
  const call = lines.findIndex((line, index) => index > loop && /^\s+jsr SIOV\b/.test(line));
  assert.ok(call > loop, "the per-sector loop no longer calls SIOV");
  const body = lines.slice(loop + 1, call).map((line) => line.replace(/;.*/, "").trim()).filter(Boolean);
  assert.deepEqual(body.slice(-2), ["lda #$40", "sta DSTATS"],
    "SIOV leaves its status in DSTATS: the loop must re-arm it before every call");
  // The loop's branch back must reach the store, not the call.
  const branch = lines.findIndex((line, index) => index > call && /^\s+bne stage2_read_sector\b/.test(line));
  assert.ok(branch > call, "the per-sector loop's branch back is missing");
});

test("the built ATR boots through real SIO to gameplay, BASIC on and off (scripts/sio-boot-repro.mjs)",
  { skip: emulatorMissing && "the trace emulator source is not in build/atari800-trace" }, () => {
    const out = path.join("build", "sio-boot-repro-test");
    const result = spawnSync(process.execPath, [path.join(root, "scripts", "sio-boot-repro.mjs"),
      "--start-game", "--frames=6000", `--out=${out}`, `--json=${path.join(out, "report.json")}`],
    { cwd: root, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    const report = JSON.parse(fs.readFileSync(path.join(root, out, "report.json"), "utf8"));
    assert.equal(report.results.length, 4);
    for (const run of report.results) {
      assert.equal(run.stop?.label, "main_loop", `${run.id} ended at ${run.stop?.reason} ${run.stop?.pc}`);
      assert.equal(run.naks + run.errors + run.no_reply + run.sectors_retried, 0, `${run.id} had wire trouble`);
      if (run.patch) continue;
      assert.equal(run.complete_without_data_frame, 0, `${run.id}: a read ended at COMPLETE without its data`);
      assert.equal(run.siov_read_calls_dstats_not_40, 0, `${run.id}: an OS SIOV read not armed for receive`);
      assert.ok(run.milestones.enter_main_menu > 0 && run.milestones.sector_reader_load > run.milestones.enter_main_menu,
        `${run.id}: the menu, then START GAME's read`);
    }
    // fix/hardware-audio (docs/diagnostics/hardware-audio.md): SKCTL bit 4 is
    // POKEY's asynchronous receive mode, which on a real machine holds timers 3
    // and 4 in reset, so channels 3 and 4 are silent; Atari800 plays them. The
    // menu, every exit of the sector reader during START GAME and gameplay must
    // see it clear - with the SIO patch (no OS SIO) and without it alike.
    for (const run of report.results) {
      assert.equal(Number.parseInt(run.stop.skctl.slice(1), 16) & 0x10, 0,
        `${run.id}: SKCTL ${run.stop.skctl} at main_loop has async receive on`);
      const seen = (label) => run.skctl_at.filter((mark) => mark.label === label);
      assert.ok(seen("enter_main_menu").length > 0, `${run.id}: no SKCTL at the menu`);
      assert.ok(seen("sector_reader_quiesce_done").length >= 2, `${run.id}: START GAME's loads were not observed`);
      for (const mark of [...seen("enter_main_menu"), ...seen("sector_reader_quiesce_done"), ...seen("main_loop")]) {
        assert.equal(Number.parseInt(mark.skctl.slice(1), 16) & 0x10, 0,
          `${run.id}: SKCTL ${mark.skctl} at ${mark.label} f${mark.frame} has async receive on`);
      }
    }
  });
