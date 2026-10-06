// boot-loading-blank-screen (docs/plans/boot-loading-blank-screen.md): the
// stage-2 chunk loader publishes records into $9B40-$9FCE while the OS VBI is
// still showing its screen-editor display list. With BASIC enabled at the OS
// cold start - every default 65XE boot, and every RESET, which the OS turns into
// a cold start - that display list sits at $9C20, inside those records, and the
// player saw 65 frames of garbage before the splash. Stage 2 now switches ANTIC
// DMA off and fills the screen with the OS's blue before its first SIO read.

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");
const code = read("src", "main.s").split(/\r?\n/)
  .map((line) => line.replace(/;.*$/, "")).join("\n");
const labels = new Map(
  read("build", "void-strike-65.lbl")
    .split(/\r?\n/)
    .map((line) => /^al\s+([0-9a-f]+)\s+\.?([^\s]+)$/i.exec(line.trim()))
    .filter(Boolean)
    .map((match) => [match[2], Number.parseInt(match[1], 16)]),
);
const manifest = JSON.parse(read("build", "manifest.json"));

// main 55cc361 (plan §5) and the 9 bytes the blanking spends.
const MAIN_BOOT_STAGE2_BYTES = 1323;
const MAIN_INITIAL_CONTENT_BYTES = 13612;
const BLANKING_BYTES = 9;
const INITIAL_BLOCK_STOP_BYTES = 13652;

function routine(name, next) {
  const start = code.indexOf(`\n${name}:`);
  const end = code.indexOf(`\n${next}:`, start + name.length + 2);
  assert.notEqual(start, -1, `Missing routine ${name}`);
  assert.notEqual(end, -1, `Missing boundary ${next}`);
  return code.slice(start, end);
}

test("stage 2 blanks the display before its first SIO read", () => {
  assert.match(code, /^SDMCTL\s+= \$022F\s*$/m);
  assert.match(code, /^COLOR2\s+= \$02C6\s*$/m);
  assert.match(code, /^COLOR4\s+= \$02C8\s*$/m);
  const entry = routine("boot_stage2_atr_entry", "copy_boot_splash_blob");
  // Owner decision A's order is kept: BASIC is unmapped first, then the splash
  // blob is copied, then the display goes blank, all ahead of the chunk load.
  assert.match(entry, /^\s*jsr disable_basic_rom\n\s*jsr copy_boot_splash_blob\n\s*stx SDMCTL\n\s*lda COLOR2\n\s*sta COLOR4\n\s*jsr boot_stage2_validate_manifest$/m);
  assert.ok(entry.indexOf("stx SDMCTL") < entry.indexOf("jsr SIOV"));
  // `stx SDMCTL` stores 0 because the splash copy loop only exits when X wraps.
  assert.match(routine("copy_boot_splash_blob", "boot_stage2_validate_manifest"),
    /\n\s*inx\n\s*bne boot_splash_copy_page\n\s*rts\s*$/);
});

test("the stage-2 CRC bit loop is guarded against a page crossing", () => {
  const crc = routine("boot_stage2_crc16", "boot_stage2_error");
  assert.match(crc, /bcc :\+\s*\.assert >\* = >:\+, error/);
  assert.match(crc, /bne @bit\n\s*\.assert >\* = >@bit, error/);
});

test("the blanking costs 9 bytes of the initial block and no sector", () => {
  assert.equal(labels.get("__BOOT_STAGE2_SIZE__"), MAIN_BOOT_STAGE2_BYTES + BLANKING_BYTES);
  const content = manifest.transportCapacity.initialBootContentBytes;
  // RE-POINTED 2026-10-06: plasma FX B1.2 (docs/plans/plasma-fx.md §12): the break-up is main's again, its renderer one stage list with no per-fragment codes and no growth hold, so the initial block content is 13,618 B, 3 B under main's 13,621; the blanking's own 9 B are unchanged.
  const PLASMA_FX_BYTES = -3;
  assert.equal(content, MAIN_INITIAL_CONTENT_BYTES + BLANKING_BYTES + PLASMA_FX_BYTES);
  assert.ok(content <= INITIAL_BLOCK_STOP_BYTES);
  assert.equal(manifest.transportCapacity.initialBootSectors, 107);
  assert.equal(labels.get("start"), 0x201e);
  assert.equal(labels.get("boot_entry"), 0x2006);
});

test("the committed boot smoke shows no characters before the splash, on every path", () => {
  const smoke = JSON.parse(read("docs", "runtime-wall-trace.json")).boot_smoke;
  assert.match(smoke.blank_window_rule, /at most 64 visible pixels/);
  // The harness allows one 8x8 cell; MEASURED, no frame of any path uses it.
  const clean = (window) => window.start > window.from && window.frames > 0 &&
    window.dirty_frames === 0 && window.worst_stray_pixels === 0;
  // BASIC enabled and disabled, both cold RAM fills.
  assert.deepEqual([...new Set(smoke.sessions.map(({ basic_enabled }) => basic_enabled))],
    [false, true]);
  for (const session of smoke.sessions) {
    assert.equal(session.blank_windows.length, 1, session.id);
    assert.ok(clean(session.blank_windows[0]), `${session.id} ${JSON.stringify(session.blank_windows)}`);
  }
  // RESET during gameplay: the reboot that follows is clean too.
  assert.equal(smoke.reset_sessions.length, 1);
  const [reset] = smoke.reset_sessions;
  assert.equal(reset.basic_enabled, false);
  assert.ok(reset.reset_frame > smoke.gameplay_snapshot_frame);
  assert.equal(reset.blank_windows.length, 2);
  assert.ok(reset.blank_windows.every(clean), JSON.stringify(reset.blank_windows));
  assert.equal(reset.blank_windows[1].from, reset.reset_frame + 2);
});
