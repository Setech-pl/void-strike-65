import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const rootDirectory = path.resolve(testDirectory, "..");
const report = JSON.parse(fs.readFileSync(
  path.join(rootDirectory, "docs", "menu-raster-trace.json"), "utf8"));
const canonicalRaster =
  "ba90172fad6c1c799a14b74dfddc55946e0ed49308dbf24c5bb5fc4afcc4bb04";

function sha256(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

test("native menu raster is exact for XEX/ATR and four cold RAM fills", () => {
  assert.equal(report.passed, true);
  assert.deepEqual(report.cold_ram_fills, [0x00, 0xa5, 0x5a, 0xff]);
  assert.equal(report.sessions.length, 8);
  assert.deepEqual(report.sessions.map(({ id }) => id), [
    "xex-00", "xex-a5", "xex-5a", "xex-ff",
    "atr-00", "atr-a5", "atr-5a", "atr-ff",
  ]);
  assert.equal(report.expected.canonical_raster_sha256, canonicalRaster);

  for (const session of report.sessions) {
    assert.equal(session.passed, true, session.id);
    assert.equal(session.transitions_completed, 3, session.id);
    assert.equal(session.pause_entries, 3, session.id);
    assert.equal(session.pause_latch_failures, 0, session.id);
    assert.equal(session.checks.length, 10, session.id);
    assert.equal(
      session.artifact.sha256,
      sha256(path.join(rootDirectory, session.artifact.path)),
      `${session.id} evidence must describe the current artifact`,
    );
    for (const check of session.checks) {
      assert.deepEqual([
        check.screen_difference,
        check.charset_difference,
        check.display_list_difference,
      ], [-1, -1, -1], `${session.id} menu generation ${check.generation}`);
      assert.deepEqual(check.registers.grafp, [0, 0, 0, 0]);
      assert.equal(check.registers.grafm, 0);
      assert.equal(check.registers.chbase, 0x4800);
      assert.equal(check.registers.dmactl, 0x22);
      assert.equal(check.registers.gractl, 0);
      assert.equal(check.registers.prior, 0);
      assert.equal(check.pmg_nonzero, 0);
      assert.equal(check.screenshot_sha256, canonicalRaster);
      assert.ok(check.brightest_run.horizontal < 32,
        `${session.id} contains a horizontal white stripe`);
      assert.ok(check.brightest_run.vertical < 32,
        `${session.id} contains a vertical white stripe`);
    }
  }
});

test("menu stays exact for 500 frames and after three production pause-quit returns", () => {
  for (const session of report.sessions) {
    const keys = new Set(session.checks.map(({ generation, menu_age: age }) =>
      `${generation}:${age}`));
    for (const key of [
      "0:3", "0:20", "0:500", "1:3", "1:20", "2:3", "2:20",
      "3:3", "3:20", "3:500",
    ]) assert.ok(keys.has(key), `${session.id} lacks checkpoint ${key}`);
  }
});

test("menu evidence preserves the audited boot streams and independent charsets", () => {
  const audit = report.memory_audit;
  assert.equal(audit.passed, true);
  assert.equal(audit.no_live_source_overwrite, true);
  assert.deepEqual(audit.live_source_overwrites, []);
  // Both tables are transport-derived: they move on every content commit. The
  // test asserts the properties the menu raster depends on, not a snapshot of
  // the figures -- the snapshot was re-recorded by hand four times upstream and
  // then went stale unnoticed. scripts/runtime-wall-trace.mjs checks the same
  // properties against the manifest at generation time.
  assert.ok(audit.boot_stage_streams.length >= 5,
    "the boot lifecycle must still stage at least five streams");
  assert.equal(audit.boot_stage_streams.length, audit.staged_source_lifetimes.length);
  for (const [index, stream] of audit.boot_stage_streams.entries()) {
    assert.ok(stream.bytes > 0, `boot stage stream ${index + 1} carries no bytes`);
    const lifetime = audit.staged_source_lifetimes[index];
    assert.deepEqual([lifetime.start, lifetime.end_exclusive, lifetime.last_read],
      [stream.source, stream.source + stream.bytes, index + 1],
      `staged source ${index + 1} does not describe its own stream`);
  }

  const menuOwned = [audit.ranges.frontend_screen, audit.ranges.frontend_charset,
    audit.ranges.main_menu_display_list];
  assert.ok(audit.dfmc_records.length > 0);
  for (const [index, record] of audit.dfmc_records.entries()) {
    const previous = audit.dfmc_records[index - 1];
    if (previous !== undefined) {
      assert.equal(record.start_sector, previous.start_sector + previous.sectors,
        `DFMC record ${index + 1} is not contiguous with the record before it`);
    }
    assert.ok(record.sectors * 128 >= record.packed_bytes,
      `DFMC record ${index + 1} does not fit the sectors it claims`);
    for (const range of menuOwned) {
      assert.ok(record.destination >= range.end_exclusive ||
        record.destination + record.raw_bytes <= range.start,
        `DFMC record ${index + 1} lands in memory the menu owns`);
    }
  }
  assert.deepEqual(audit.ranges.a2_runtime,
    { start: 0x9000, end_exclusive: 0x90ff });
  assert.deepEqual(audit.ranges.glue_holding,
    { start: 0x7f16, end_exclusive: 0x8000 });
  assert.deepEqual(audit.ranges.frontend_screen,
    { start: 0x4000, end_exclusive: 0x4400 });
  assert.deepEqual(audit.ranges.gameplay_charset,
    { start: 0x4400, end_exclusive: 0x4800 });
  assert.deepEqual(audit.ranges.frontend_charset,
    { start: 0x4800, end_exclusive: 0x4c00 });
  assert.deepEqual(audit.glyph_126_127, {
    gameplay_charset_addresses: [0x47f0, 0x47ff],
    frontend_charset_addresses: [0x4bf0, 0x4bff],
    frontend_max_used_glyph: 63,
    separate_charsets: true,
    frontend_full_charset_restored: true,
  });
});
