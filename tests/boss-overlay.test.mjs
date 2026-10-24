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
  atrRun, bossGateMemory, exists, includeConstants, label, labelsOf, manifest, readBuild, root,
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
    // RE-POINTED (fix/smoke-2026-10-07 P1): SECTOR_COMPLETION draws the
    // player's shots in the band once the band has been shown (slot E), then
    // jumps to boss_completion (asserted after the table).
    update_sector_completion: label("boss", "boss_shots_late"),
    // RE-POINTED M6 stage 1 (docs/plans/m6-void-lance.md §6.1): the VOID
    // LANCE's tick (TICK_FLASHES, before read_input and UPDATE) - boss_rts
    // before. HULL_CONTACT is boss_rts again since the owner's smoke of
    // 2026-10-20 (the kill's meeting is the patched admit operand now).
    tick_launch_flashes: label("boss", "lance_tick"),
  };
  const image = label("boss", "boss_vector_image") - slot.address;
  vectors.forEach((target, index) => {
    const offset = image + index * 3;
    assert.equal(code[offset], 0x4c, `entry ${index} is not a JMP`);
    assert.equal(code.readUInt16LE(offset + 1), expected[target] ?? label("boss", "boss_rts"),
      `the boss's ${target} entry`);
  });
  const completion = label("boss", "boss_completion");
  const slotE = readBuild("overlay-boss-slot-e.bin");
  const jmp = [0x4c, completion & 0xff, completion >> 8];
  assert.ok(slotE.some((byte, at) => jmp.every((value, i) => slotE[at + i] === value)),
    "boss_shots_late does not hand on to boss_completion");
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
test("the disk: boss code from 528, the install 544-546, slot C from 547, region 1 at 632-647, its block at 696", () => {
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
  // RE-POINTED S5-1 (owner decision Q10): regions 2-4 are on the disk as
  // copies of region 1 (they were S5's 48 empty reserved sectors), each with
  // its block in the blocks' reservation 696-711 (owner decision Q9: the look
  // tail is the region's block in slot F, no longer slot D's head).
  for (let region = 0; region < 4; region += 1) {
    const at = REGION_1_SECTOR + region * 16;
    // RE-POINTED fix/boss-polish (owner decision AL 1): each region's theme run
    // is its own file now - the same theme, then its own boss title's records
    // from byte $C0 (tests/boss-polish.test.mjs reads them).
    const theme = readBuild(`boss-region-${region + 1}-theme.bin`);
    assert.deepEqual(atrRun(at, BOSS_THEME_SECTORS), theme, `region ${region + 1} theme`);
    assert.deepEqual(theme.subarray(0, 0xc0), readBuild("boss-region-1-theme.bin").subarray(0, 0xc0),
      `region ${region + 1} plays region 1's theme`);
    // RE-POINTED S5-3 (feat/boss-region-3, the owner's answers of
    // 2026-10-13): region 3 is Siege Spine from its own draft - its band A
    // and charset runs are its own (the built files), its block its tail and
    // the field's code; regions 2 and 4 are still copies of region 1.
    // RE-POINTED feat/boss-region-4 (S5-4, the owner's answers of 2026-10-13
    // / 2026-10-14): region 4 is the Void Citadel from its own draft too - its
    // own band A and charset runs, its block its tail and the well's code;
    // region 2 is still a copy of region 1.
    // RE-POINTED feat/boss-region-2 (S5-5, the owner's choice of 2026-10-15):
    // region 2 is the Bastion from its own draft - its own band A and charset
    // runs, its block its tail, the rails' tables and their code. Only region 1
    // is region 1's.
    if (region === 1 || region === 2 || region === 3) {
      for (const [run, offset] of [["band-a", 2], ["charset", 8]]) {
        const built = manifest.boss.runs.find((r) => r.name === `boss-region-${region + 1}-${run}`);
        assert.deepEqual(atrRun(at + offset, built.sectors), readBuild(built.file), `region ${region + 1} ${run}`);
      }
      const block = manifest.boss.runs.find((r) => r.name === `boss-region-${region + 1}-block`);
      assert.deepEqual(atrRun(696 + region * 4, block.sectors), readBuild(block.file), `region ${region + 1} block`);
      continue;
    }
    assert.deepEqual(atrRun(at + 2, BOSS_BAND_A_SECTORS), Buffer.from(bandA.data), `region ${region + 1} band A`);
    assert.deepEqual(atrRun(at + 8, charset.sectors), Buffer.from(charset.data), `region ${region + 1} charset`);
    assert.deepEqual(atrRun(696 + region * 4, region1.runs.block.sectors), Buffer.from(region1.runs.block.data),
      `region ${region + 1} block`);
  }
  // RE-PINNED feat/boss-banners (decision AY): + the regions' banner runs,
  // 10 sectors a region from 280 (each read after its theme run).
  // RE-PINNED journal §BG (plan §6.3): + the VOID LANCE run's own four
  // sectors at the disk's free tail; journal §BH: five (712-716).
  assert.deepEqual(manifest.boss.reservedSectors, { code: [528, 583], regions: [632, 695], blocks: [696, 711],
    // L1-03: six lance sectors plus the two-sector page-2 tail, 712-719.
    banners: [280, 319], lance: [712, 719] });
});

// RE-POINTED M5b-S4a-i: entry 1's count is the boss code's linked sectors;
// entry 2 is region 1's 2-sector theme run at 632 (was the 4-sector staging
// run at 547).
test("the overlay directory names the boss code and the four regions' theme runs", () => {
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
  // RE-POINTED S5-1 (owner decision Q10): regions 2-4 are on the disk (copies
  // of region 1), so entries 3-5 name their theme runs (they stayed empty).
  for (const index of [3, 4, 5]) {
    assert.deepEqual(entries[index], { sector: REGION_1_SECTOR + (index - 2) * 16, count: BOSS_THEME_SECTORS,
      destination: STAGING_ADDRESS }, `entry ${index}`);
  }
});

test("Q-S3: the window's pins are the addresses their links gave those labels", () => {
  const source = fs.readFileSync(path.join(root, "src/hybrid/boss-entry-pins.inc"), "utf8");
  const pins = [...source.matchAll(/^pin_(\w+)\s*=\s*\$([0-9A-Fa-f]+)\s*;\s*(main|reader|music)\b/gm)];
  // RE-PINNED feat/interceptor-standoff Phase B (owner answer Q2 of
  // 2026-10-12): 8 -> 9, pin_boss_enter_head (main) - the entry's head moved
  // from the window to PICKUP_CODE's tail.
  // RE-PINNED feat/boss-banners (the owner's smoke of 2026-10-18): 9 -> 8,
  // pin_sector_reader_show_records (reader) - the entry shows no text screen.
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
  // RE-POINTED feat/boss-order-scale (the owner's dead zone of 2026-10-16):
  // the pad's last byte went to the tick, so the segment may be empty; the
  // kernel stays at $B478 (src/hybrid/c-asm-abi.s).
  assert.ok(asmBytes >= 0 && asmBytes <= WINDOW_HOOKS_STOP,
    `the resident half is ${asmBytes} B (STOP over ${WINDOW_HOOKS_STOP})`);
  // RE-POINTED feat/interceptor-standoff Phase B (owner answer Q2 of
  // 2026-10-12, plan interceptor-standoff §13.11): the entry's resident half
  // is no longer in the window. Its head is main's, in PICKUP_CODE's tail
  // (pin_boss_enter_head); the window's ASM keeps only the 4-B pad (0 B since
  // feat/boss-order-scale), inside
  // the budget above, and the hot Light C keeps its addresses.
  assert.equal(label("director", "_asm_boss_enter"), label("main", "boss_enter_head"));
  assert.ok(label("main", "boss_enter_head") >= label("main", "__PICKUP_CODE_RUN__") &&
    label("main", "boss_enter_head") < label("main", "__PICKUP_CODE_RUN__") + label("main", "__PICKUP_CODE_SIZE__"),
    "the entry's head is in PICKUP_CODE");
  // RE-PINNED 2026-10-06, 13,621 -> 13,618: plasma FX B1.2 (docs/plans/plasma-fx.md §12): the break-up is main's again, its renderer one stage list with no per-fragment codes and no growth hold, so the initial block content is 13,618 B, 3 B under main's 13,621. No byte of the boss is in it.
  // RE-PINNED 2026-10-10, fix/hardware-audio (docs/diagnostics/hardware-audio.md, F2): `lda #SKCTL_AUDIO / sta SKCTL` before the first menu, 5 B in ENTITY_CODE's cold start: 13,618 -> 13,623. Still no byte of the boss.
  // L1: menu data leaves boot; compressed padding restores gameplay addresses.
  assert.equal(manifest.transportCapacity.initialBootContentBytes, 12829);
  assert.ok(manifest.boss.reservedSectors.code[0] > manifest.transportCapacity.initialBootSectors,
    "boss code starts after the initial block");
});

// RE-POINTED feat/boss-banners (the owner's smoke of 2026-10-18): decision 32's
// WARNING text screen is gone from the boss entry - the owner saw it for ~0.9 s
// before the banner. The kernel carries no WARNING record any more and the
// head calls no screen of the reader's; the black screen up to the banner's
// is tests/boss-banners.test.mjs's. The reader's text screen stays for the
// session's first START GAME (ENGAGING ENEMY SECTOR) and the failure screen.
test("the boss entry's resident half draws no text screen: no WARNING record, no reader screen call", () => {
  const kernelImage = readBuild("light-kernel.bin");
  assert.equal(kernelImage.indexOf(Buffer.from("WARNING", "latin1")), -1, "the kernel still carries WARNING");
  assert.throws(() => label("kernel", "boss_warning_records"));
  const head = label("main", "boss_enter_head");
  const memory = bossGateMemory();
  const show = label("reader", "sector_reader_show_records");
  const publish = label("reader", "sector_reader_publish_screen");
  for (let at = head; at < head + 96; at += 1) {
    if (memory[at] === 0x20 || memory[at] === 0x4c) {
      const target = memory[at + 1] | (memory[at + 2] << 8);
      assert.ok(target !== show && target !== publish, `the head calls the reader's text screen at $${at.toString(16)}`);
    }
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
