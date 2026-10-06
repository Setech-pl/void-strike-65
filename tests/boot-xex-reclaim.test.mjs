// boot-xex-reclaim (docs/plans/boot-xex-reclaim.md): the retired XEX entry
// `boot_stage2_xex_entry` (14 B of BOOT_STAGE2, carried raw in the initial
// block) is gone. The ATR is the only medium (owner decision 2026-09-30), so
// boot_stage2_atr_entry is the one stage-2 entry: it alone unmaps BASIC, copies
// the splash blob and writes the $02 chunk-complete token that `start` checks.

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");
const source = read("src", "main.s");
const code = source.split(/\r?\n/).map((line) => line.replace(/;.*$/, "")).join("\n");
const labels = new Map(
  read("build", "void-strike-65.lbl")
    .split(/\r?\n/)
    .map((line) => /^al\s+([0-9a-f]+)\s+\.?([^\s]+)$/i.exec(line.trim()))
    .filter(Boolean)
    .map((match) => [match[2], Number.parseInt(match[1], 16)]),
);
const manifest = JSON.parse(read("build", "manifest.json"));

// main 97344ad, the last build that carried the entry (plan §2, §4).
const MAIN_BOOT_STAGE2_BYTES = 1337;
const MAIN_INITIAL_CONTENT_BYTES = 13626;
const RECLAIMED_BYTES = 14;
// boot-loading-blank-screen (2026-10-01) spent 9 B of BOOT_STAGE2 on blanking
// the display at stage-2 entry; the reclaimed 14 B are still returned.
const BLANKING_BYTES = 9;

function routine(name, next) {
  const start = code.indexOf(`\n${name}:`);
  const end = code.indexOf(`\n${next}:`, start + name.length + 2);
  assert.notEqual(start, -1, `Missing routine ${name}`);
  assert.notEqual(end, -1, `Missing boundary ${next}`);
  return code.slice(start, end);
}

const count = (text, pattern) => (text.match(pattern) ?? []).length;

test("boot_stage2_xex_entry is gone from the source, its exports and the link", () => {
  assert.equal(count(code, /\bboot_stage2_xex_entry\b/g), 0,
    "src/main.s still assembles, exports or references boot_stage2_xex_entry");
  assert.equal(labels.has("boot_stage2_xex_entry"), false, "the label file still has it");
  assert.doesNotMatch(read("build", "void-strike-65.map"), /boot_stage2_xex_entry/);
  assert.match(code, /\.export boot_stage2_atr_entry, boot_stage2_error\n/);
});

test("the initial block returns the entry's 14 bytes", () => {
  assert.equal(labels.get("__BOOT_STAGE2_RUN__"), 0x21c1);
  assert.ok(labels.get("__BOOT_STAGE2_SIZE__") <=
    MAIN_BOOT_STAGE2_BYTES - RECLAIMED_BYTES + BLANKING_BYTES,
    `BOOT_STAGE2 is ${labels.get("__BOOT_STAGE2_SIZE__")} B`);
  const content = manifest.transportCapacity.initialBootContentBytes;
   assert.ok(content <= MAIN_INITIAL_CONTENT_BYTES - RECLAIMED_BYTES + BLANKING_BYTES,
    `initial block content is ${content} B`);
  // The transport STOP rule (no new boot sector) holds with room to spare.
  assert.equal(manifest.transportCapacity.initialBootSectors, 107);
  assert.equal(manifest.bootSectors, 107);
});

test("the ATR entry is the one stage-2 entry and the $02 token has one writer", () => {
  const atrEntry = routine("boot_stage2_atr_entry", "copy_boot_splash_blob");
  assert.match(atrEntry,
    /^\s*jsr disable_basic_rom\n\s*jsr copy_boot_splash_blob\n\s*stx SDMCTL\n\s*lda COLOR2\n\s*sta COLOR4\n\s*jsr boot_stage2_validate_manifest$/m);
  assert.match(atrEntry, /lda #\$02\n\s*sta boot_chunk_ready\n\s*lda #>start\n\s*sta DOSVEC\+1\n\s*rts\s*$/);
  assert.equal(count(code, /\bjsr disable_basic_rom\b/g), 1);
  assert.equal(count(code, /\bjsr copy_boot_splash_blob\b/g), 1);
  assert.equal(count(code, /\bsta boot_chunk_ready\b/g), 1);
  // The one reader is start's chunk-complete check, unchanged.
  assert.equal(count(code, /\blda boot_chunk_ready\b/g), 1);
  assert.match(routine("start", "layout_d_cold_publish_complete"),
    /lda boot_chunk_ready\n\s*cmp #\$02\n\s*beq :\+\n\s*jmp boot_stage2_error/);
  // copy_boot_splash_blob stays a subroutine with its single call site.
  assert.match(routine("copy_boot_splash_blob", "boot_stage2_validate_manifest"), /\n\s*rts\s*$/);
});

test("the fixed bootstrap prefix does not move", () => {
  assert.equal(labels.get("start"), 0x201e);
  assert.equal(labels.get("resident_runtime_suffix"), 0x21c1);
  assert.equal(labels.get("boot_entry"), 0x2006);
});
