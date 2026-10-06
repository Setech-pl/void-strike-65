// M5b-S3 — the boss overlay's build and disk contracts (docs/plans/m5-loading-boss.md
// §5.11; owner answers Q-S1, Q-S3, Q-S4, Q-S6 and decision 32).
// RE-POINTED M5b-S4a-i (§5.13.4; owner answers Q-B5, Q-B8): slot A's run is
// sized to its code, slot C carries the controller, region 1's four runs sit
// in its 16 sectors from 632; the claim itself is tests/boss-claim.test.mjs's.
//
// Slot A's image and its size, the once-only install run at $7810, the disk
// layout, the overlay directory's boss entries, the window's resident half and
// the addresses it pins, and the START GAME restore table. The runtime
// behaviour is tests/boss-runtime.test.mjs's.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  BOSS_BAND_A_SECTORS, BOSS_BAND_B_SECTORS, BOSS_THEME_SECTORS,
  bossRegionDirectory, compileBossRegion, loadBossRegionDraft,
} from "../scripts/boss-assets.mjs";
import { installRuntimeSegments } from "../scripts/runtime-image.mjs";
import {
  atrRun, exists, includeConstants, label, labelsOf, manifest, readBuild, root,
} from "./boss-harness.mjs";

const SLOT_A_BYTES = 2048;
const INSTALL_ADDRESS = 0x7810;
const INSTALL_SECTORS = 3;
const STAGING_ADDRESS = 0x7990;
const BOSS_CODE_SECTOR = 528;
const INSTALL_SECTOR = 544;
const SLOT_C_SECTOR = 547;
const REGION_1_SECTOR = 632;            // §5.13.4: 16 sectors a region from 632
const RESERVATION_END = 583;            // 528-583, plan §6.3
// The plan's S3 window figure (§5.11.7: ~157 B with decision 32's screen);
// the brief's STOP is 20 % over it.
const WINDOW_HOOKS_STOP = Math.floor(157 * 1.2);

const region1 = compileBossRegion(loadBossRegionDraft(bossRegionDirectory(root, 1)));

// RE-POINTED M5b-S4a-i (Q-B8): the run is sized to the code (S3 read all
// 16 sectors); the 2,048-B limit is unchanged.
test("slot A holds the boss: at most 2,048 B, a JMP to the head, then the 12-entry table image", () => {
  assert.ok(exists("overlay-boss-code.bin"), "the build placed no boss code run");
  const slot = manifest.overlays.slotA;
  const code = readBuild("overlay-boss-code.bin");
  const used = label("boss", "__BOSS_SLOT_RAM_LAST__") - slot.address;
  assert.ok(used > 0 && used <= SLOT_A_BYTES, `slot A holds ${used} B of the boss`);
  assert.equal(code.length, Math.ceil(used / 128) * 128, "the run is the code's sectors");
  assert.equal(manifest.boss.slotA.sectors, code.length / 128);
  assert.equal(label("boss", "boss_slot"), slot.address);
  assert.deepEqual([...code.subarray(0, 3)],
    [0x4c, label("boss", "boss_head") & 0xff, label("boss", "boss_head") >> 8]);
  // The table image, in the capital table's order and meaning.
  const vectors = manifest.overlays.capitalVectors.table.map(({ target }) => target);
  const expected = {
    init_broadside: label("main", "init_broadside"),
    update_broadside: label("boss", "boss_update"),
    prepare_next_hull_row: label("boss", "boss_motion"),
    update_sector_completion: label("boss", "boss_completion"),
  };
  const image = label("boss", "boss_vector_image") - slot.address;
  vectors.forEach((target, index) => {
    const offset = image + index * 3;
    assert.equal(code[offset], 0x4c, `entry ${index} is not a JMP`);
    assert.equal(code.readUInt16LE(offset + 1), expected[target] ?? label("boss", "boss_rts"),
      `the boss's ${target} entry`);
  });
});

test("the once-only install is one 3-sector run at $7810, below the region's theme run", () => {
  assert.ok(exists("overlay-boss-install.bin"));
  const install = readBuild("overlay-boss-install.bin");
  assert.equal(install.length, INSTALL_SECTORS * 128);
  assert.equal(label("boss", "boss_install"), INSTALL_ADDRESS);
  const used = label("boss", "__BOSS_INSTALL_RAM_LAST__") - INSTALL_ADDRESS;
  assert.ok(used > 0 && used <= INSTALL_SECTORS * 128, `the install is ${used} B`);
  assert.ok(INSTALL_ADDRESS + INSTALL_SECTORS * 128 <= STAGING_ADDRESS);
});

// RE-POINTED M5b-S4a-i (§5.13.4): 528-583 holds the boss code (up to 16,
// sized), the install (544-546) and slot C (547, up to 16, sized); each region
// its own 16 sectors from 632 - theme 2, band A 3, band B 3, charset <= 8.
test("the disk: boss code from 528, the install 544-546, slot C from 547, region 1 at 632-647", () => {
  const codeSectors = manifest.boss.slotA.sectors;
  const slotCSectors = manifest.boss.slotC.sectors;
  assert.ok(codeSectors <= 16 && slotCSectors <= 16);
  assert.deepEqual(atrRun(BOSS_CODE_SECTOR, codeSectors), readBuild("overlay-boss-code.bin"));
  assert.ok(atrRun(BOSS_CODE_SECTOR + codeSectors, 16 - codeSectors).every((byte) => byte === 0));
  assert.deepEqual(atrRun(INSTALL_SECTOR, INSTALL_SECTORS), readBuild("overlay-boss-install.bin"));
  assert.deepEqual(atrRun(SLOT_C_SECTOR, slotCSectors), readBuild("overlay-boss-slot-c.bin"));
  assert.ok(SLOT_C_SECTOR + 16 - 1 <= RESERVATION_END, "slot C's 16 fit the reservation");
  const { theme, bandA, bandB, charset } = region1.runs;
  // The theme is the build's (the region compiled here carries none).
  assert.equal(theme.sectors, BOSS_THEME_SECTORS);
  assert.deepEqual(atrRun(REGION_1_SECTOR, BOSS_THEME_SECTORS), readBuild("boss-region-1-theme.bin"));
  assert.deepEqual(atrRun(REGION_1_SECTOR + 2, BOSS_BAND_A_SECTORS), Buffer.from(bandA.data));
  assert.deepEqual(atrRun(REGION_1_SECTOR + 5, BOSS_BAND_B_SECTORS), Buffer.from(bandB.data));
  assert.deepEqual(atrRun(REGION_1_SECTOR + 8, charset.sectors), Buffer.from(charset.data));
  assert.ok(charset.sectors <= 8);
  // Regions 2-4 are S5's: their 48 sectors are reserved and empty.
  assert.ok(atrRun(REGION_1_SECTOR + 16, 48).every((byte) => byte === 0));
  assert.deepEqual(manifest.boss.reservedSectors, { code: [528, 583], regions: [632, 695] });
});

// RE-POINTED M5b-S4a-i: entry 1's count is the boss code's linked sectors;
// entry 2 is region 1's 2-sector theme run at 632 (was the 4-sector staging
// run at 547).
test("the overlay directory names the boss code and region 1's theme run; 3-5 stay empty", () => {
  const text = readBuild("overlay-directory.inc").toString("utf8");
  const directory = text.split("overlay_directory:")[1].split("overlay_directory_end:")[0];
  const entries = [...directory.matchAll(/^\s+\.byte \$([0-9a-f]{2}), \$([0-9a-f]{2}), \$?(\d+), \$([0-9a-f]{2}), \$([0-9a-f]{2})/gm)]
    .map((match) => ({ sector: Number.parseInt(match[1], 16) | (Number.parseInt(match[2], 16) << 8),
      count: Number(match[3]),
      destination: Number.parseInt(match[4], 16) | (Number.parseInt(match[5], 16) << 8) }));
  assert.deepEqual(entries[1], { sector: BOSS_CODE_SECTOR, count: manifest.boss.slotA.sectors,
    destination: manifest.overlays.slotA.address });
  assert.deepEqual(entries[2], { sector: REGION_1_SECTOR, count: BOSS_THEME_SECTORS,
    destination: STAGING_ADDRESS });
  for (const index of [3, 4, 5]) assert.equal(entries[index].count, 0, `entry ${index}`);
});

test("Q-S3: the window's pins are the addresses their links gave those labels", () => {
  const source = fs.readFileSync(path.join(root, "src/hybrid/boss-entry-pins.inc"), "utf8");
  const pins = [...source.matchAll(/^pin_(\w+)\s*=\s*\$([0-9A-Fa-f]+)\s*;\s*(main|reader|music)\b/gm)];
  assert.equal(pins.length, 8);
  for (const [, name, value, link] of pins) {
    assert.equal(Number.parseInt(value, 16), label(link, name),
      `pin_${name} is not ${link}'s ${name}`);
  }
  // The overlay links against the same build's labels, through generated
  // includes: every name in boss-imports.inc is its link's address.
  const imports = fs.readFileSync(path.join(root, "build/boss-imports.inc"), "utf8");
  let checked = 0;
  for (const [, name, value, link] of imports.matchAll(/^(\w+)\s*=\s*\$([0-9A-F]+)\s*;\s*(main|reader|director)$/gm)) {
    assert.equal(Number.parseInt(value, 16), label(link, name), `${name} (${link})`);
    checked += 1;
  }
  assert.ok(checked >= 50, `only ${checked} imports checked`);
});

test("the window pays the entry's resident half inside the plan's S3 figure, and last", () => {
  const asmBytes = label("director", "__HYBRID_ASM_WINDOW_SIZE__");
  assert.ok(asmBytes > 0 && asmBytes <= WINDOW_HOOKS_STOP,
    `the resident half is ${asmBytes} B (STOP over ${WINDOW_HOOKS_STOP})`);
  // Placed last in the window: the hot Light C keeps its addresses.
  assert.ok(label("director", "_asm_boss_enter") >= label("director", "__HYBRID_C_WINDOW_RODATA_RUN__"));
  // RE-PINNED 2026-10-06, 13,621 -> 13,618: plasma FX B1.2 (docs/plans/plasma-fx.md §12): the break-up is main's again, its renderer one stage list with no per-fragment codes and no growth hold, so the initial block content is 13,618 B, 3 B under main's 13,621. No byte of the boss is in it.
  assert.equal(manifest.transportCapacity.initialBootContentBytes, 13618,
    "no byte of the boss lands in the initial block");
});

test("decision 32: the screen's record reads WARNING / BOSS APPROACHING, centred, in the glyph contract", () => {
  // The window's half of the Director link, as transported: from $AE00.
  const windowImage = readBuild("encounter-director-code-hybrid-window.bin");
  let offset = label("director", "boss_warning_records") - 0xae00;
  const lines = [];
  while (windowImage[offset] !== 0xff) {
    const address = windowImage.readUInt16LE(offset);
    offset += 2;
    let text = "";
    while (windowImage[offset] !== 0) text += String.fromCharCode(windowImage[offset++]);
    offset += 1;
    lines.push({ row: Math.floor((address - 0x4000) / 40), column: (address - 0x4000) % 40, text });
  }
  assert.deepEqual(lines.map(({ text }) => text), ["WARNING", "BOSS APPROACHING"]);
  for (const { column, text } of lines) {
    assert.ok(Math.abs(column - Math.floor((40 - text.length) / 2)) <= 1, `${text} is not centred`);
    assert.match(text, /^[A-Z0-9 \-./:]*$/);
  }
});

test("Q-S4: the START GAME restore names every patched setting with the shipped value", () => {
  const text = readBuild("boss-restore.inc").toString("utf8");
  const rows = (name) => [...text.split(`${name}:`)[1].matchAll(/\.byte \$([0-9A-F]{2})/g)]
    .slice(0, includeConstantsCount(text)).map((match) => Number.parseInt(match[1], 16));
  const lo = rows("boss_restore_lo");
  const hi = rows("boss_restore_hi");
  const value = rows("boss_restore_value");
  const restored = new Map(lo.map((low, index) => [low | (hi[index] << 8), value[index]]));
  const rates = label("main", "world_scroll_rates");
  // The shipped values: the resident image as boot lands it.
  const shipped = new Uint8Array(0x10000);
  installRuntimeSegments(shipped, root);
  for (let offset = 0; offset < 6; offset += 1) {
    assert.equal(restored.get(rates + offset), shipped[rates + offset], `scroll rate ${offset}`);
  }
  assert.ok([...shipped.subarray(rates, rates + 6)].every((rate) => rate > 0),
    "every difficulty's world and hull rate is nonzero outside the boss sector");
  const dli = label("main", "gameplay_dli");
  assert.equal(restored.get(label("main", "resume_gameplay_dli_lo_operand")), dli & 0xff);
  assert.equal(restored.get(label("main", "resume_gameplay_dli_hi_operand")), dli >> 8);
  const floor = includeConstants("boss-imports.inc").get("read_input_y_min_operand");
  assert.equal(restored.get(floor), label("main", "PLAYER_Y_MIN"));
  assert.equal(shipped[floor - 1], 0xc9, "the floor operand follows a CMP #");
  assert.equal(shipped[floor], label("main", "PLAYER_Y_MIN"));
  for (const register of [0xd404, 0xd01b, 0xd00c, 0xd004, 0xd005, 0xd006, 0xd007]) {
    assert.equal(restored.get(register), 0, `$${register.toString(16)} is not zeroed`);
  }
});

function includeConstantsCount(text) {
  return Number(/BOSS_RESTORE_COUNT = (\d+)/.exec(text)[1]);
}

// RE-POINTED M5b-S4a-i (Q-B5): the controller lives in slot C now; the same
// no-stack, no-helper, no-runtime-zero-page rule holds.
test("the controller is C in slot C and uses no cc65 stack, helper or runtime zero page", () => {
  const listing = readBuild("boss-c.lst").toString("utf8");
  assert.doesNotMatch(listing, /\b(?:jsr|jmp)\s+(?:push|pop|incsp|decsp|tos|addysp|subysp|mul|div|mod)/i);
  assert.doesNotMatch(listing.replace(/\.importzp.*$/gm, ""),
    /\b(?:c_sp|sreg|regsave|tmp[1-4]|ptr[1-4])\b/);
  const slotC = manifest.boss.slotC;
  for (const name of ["_boss_c_init", "_boss_c_hit", "_boss_c_tick"]) {
    const address = label("boss", name);
    assert.ok(address >= slotC.address && address < slotC.address + slotC.capacityBytes,
      `${name} is outside slot C`);
  }
  const slot = manifest.overlays.slotA;
  assert.ok(labelsOf.boss.get("boss_dli") >= slot.address && labelsOf.boss.get("boss_dli") < slot.endExclusive,
    "the DLI stays in slot A");
});
