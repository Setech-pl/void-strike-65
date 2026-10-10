// audit-hardening (docs/plans/audit-hardening.md; the October 2026 audit,
// docs/audits/2026-10-06-pre-m5.md): the boss entry's loads and the gameplay
// DLI's decimal mode, on the 6502 harness against the built images.
//
//   * AUD-02: nothing the boss entry reads is played, run or used unless its
//     run checks against the values the boot-validated image holds - another
//     disk, a changed byte in an executable run or a data run - and the
//     module count is bounded to 1..16 before the controller starts; a refusal
//     is the reader's failure screen with WRONG DISK, as a read failure is.
//   * AUD-03: the gameplay DLI writes the same with D set as with D clear and
//     returns A, X, Y and P (the boss DLI's own test is in boss-lasers).
//
// The summary's side of AUD-01 and AUD-02 is in tests/level-summary.test.mjs.
import assert from "node:assert/strict";
import test from "node:test";

import {
  Drive, cpuOver, runUntil, bossGateMemory, label, manifest, atrSector, SECTOR_BYTES, nmi,
} from "./boss-harness.mjs";

const SR_BAD_IMAGE = 4;
const bossRun = (name) => {
  const run = manifest.boss.runs.find((entry) => entry.name === name);
  assert.ok(run, `the build placed no ${name} run`);
  return run;
};
const SLOT_A = label("main", "capital_slot_a");
const MUSIC_START = 0xa608;                 // the gameplay music block's first JMP

// The boss entry from the window's resident half, as tests/boss-harness.mjs
// runs it, over a drive holding `sectorOf`; `watch` sees every PC.
function bossEntry({ sectorOf = atrSector, onCommand = null, watch = null, onWrite = null } = {}) {
  const memory = bossGateMemory();
  const drive = new Drive({ sectorOf, onCommand });
  if (onWrite !== null) {
    const write = drive.write.bind(drive);
    drive.write = (address, value) => { onWrite(address, value); return write(address, value); };
  }
  const cpu = cpuOver(drive, memory);
  cpu.sp = 0xf0;
  cpu.pc = label("director", "_asm_boss_enter");
  const end = runUntil(cpu, {
    main_loop: label("main", "main_loop"),
    failure: label("reader", "sector_reader_failure_screen"),
  }, { watch });
  return { memory, drive, cpu, end };
}

// One bit of one byte of the game's disk changed; the drive computes the SIO
// checksum over what it holds, so the wire still checks.
const withFlip = (sector, offset, mask = 0x10) => (n) => {
  const slice = Buffer.from(atrSector(n));
  if (n === sector) slice[offset] ^= mask;
  return slice;
};

// The PCs that mean a run was used: slot A's code, the theme played, the
// install (which runs slots C, D and E and reads the region's tables).
function usage() {
  const seen = { slotA: false, music: false, install: false, init: false };
  const watch = (pc) => {
    if (pc >= SLOT_A && pc < SLOT_A + 2048) seen.slotA = true;
    if (pc === MUSIC_START) seen.music = true;
    if (pc === label("boss", "boss_install")) seen.install = true;
    if (pc === label("boss", "_boss_c_init")) seen.init = true;
  };
  return { seen, watch };
}

// RE-POINTED feat/boss-r1-tuning (owner decision 2026-10-10): region 1 has 15
// modules (gun-5 and gun-6 at the far ends), so the flipped bit 4 reads 31,
// not 29 - still outside 1..16; the clause is unchanged.
test("AUD-02: a band B sector whose module count reads 31, not 15, with a correct SIO checksum, ends at WRONG DISK before the controller starts", () => {
  const bandB = bossRun("boss-region-1-band-b");
  const at = 0xad00 + 12 - bandB.destination;          // BOSS_T_MODULE_COUNT
  const sector = bandB.startSector + Math.floor(at / SECTOR_BYTES);
  const offset = at % SECTOR_BYTES;
  assert.equal(atrSector(sector)[offset], 15, "region 1's module count is not the shipped 15");
  // Every store the controller (slot C's code) makes into its own state.
  const code = label("boss", "__BOSS_C_CODE_RUN__");
  const bssStart = label("boss", "__BOSS_C_BSS_RUN__");
  const bssEnd = bssStart + label("boss", "__BOSS_C_BSS_SIZE__");
  const { seen, watch } = usage();
  const stores = [];
  let pc = 0;
  const run = bossEntry({
    sectorOf: withFlip(sector, offset),
    watch: (now) => { watch(now); pc = now; },
    onWrite: (address) => {
      if (pc >= code && pc < bssStart && address >= bssStart && address < bssEnd) stores.push(address);
    },
  });
  assert.equal(run.end, "failure", "the damaged tables were accepted");
  assert.equal(run.cpu.a, SR_BAD_IMAGE, "not the WRONG DISK reason");
  assert.equal(seen.init, false, "the controller ran on the damaged count");
  assert.equal(seen.install, false, "the install ran on the damaged tables");
  assert.deepEqual(stores, [], "the controller stored into its state");
});

test("AUD-02: the module count is bounded to 1..16 before the controller starts", () => {
  const charset = bossRun("boss-region-1-charset");
  // RE-POINTED feat/boss-r1-tuning: the shipped count is 15 (was 13).
  for (const count of [0, 17, 29, 255, 15]) {
    const { seen, watch } = usage();
    // Band B has landed by the charset's first command: the count is changed
    // in memory, after its run's bytes went through the drive unchanged.
    const run = bossEntry({
      watch,
      onCommand: (sector, cpu) => {
        if (sector === charset.startSector) cpu.memory[0xad00 + 12] = count;
      },
    });
    if (count === 15) {
      assert.equal(run.end, "main_loop", "the shipped count was refused");
    } else {
      assert.equal(run.end, "failure", `a count of ${count} was accepted`);
      assert.equal(run.cpu.a, SR_BAD_IMAGE, `${count}: not the WRONG DISK reason`);
      assert.equal(seen.init, false, `${count}: the controller ran`);
    }
  }
});

test("AUD-02: another disk at the boss entry is refused before a byte of it is played or run", () => {
  const foreign = (sector) => Buffer.from(Array.from({ length: SECTOR_BYTES },
    (_, index) => (sector * 31 + index * 7 + 0x11) & 0xff));
  const { seen, watch } = usage();
  const memoryBefore = bossGateMemory();
  const theme = label("music", "game_music_data_start");
  const run = bossEntry({ sectorOf: foreign, watch });
  assert.equal(run.end, "failure", "another disk's boss was accepted");
  assert.equal(run.cpu.a, SR_BAD_IMAGE);
  assert.equal(seen.music, false, "another disk's theme was played");
  assert.equal(seen.slotA, false, "another disk's code ran in slot A");
  assert.deepEqual([...run.memory.subarray(theme, theme + 256)],
    [...memoryBefore.subarray(theme, theme + 256)], "another disk's theme was copied");
});

test("AUD-02: one changed byte in an executable run or a data run of the boss is refused before the run is used", () => {
  const cases = [
    ["boss-region-1-theme", 0, 9, "music"],
    ["boss-code", 5, 33, "slotA"],
    ["boss-install", 1, 17, "install"],
    ["boss-slot-c", 3, 50, "install"],
    ["boss-slot-d", 2, 60, "install"],
    ["boss-slot-e", 0, 20, "install"],
    ["boss-region-1-band-a", 1, 70, "install"],
    ["boss-region-1-charset", 4, 90, "install"],
  ];
  const failures = [];
  for (const [name, sectorInRun, offset, use] of cases) {
    const run1 = bossRun(name);
    const { seen, watch } = usage();
    try {
      const run = bossEntry({ sectorOf: withFlip(run1.startSector + sectorInRun, offset), watch });
      if (run.end !== "failure" || run.cpu.a !== SR_BAD_IMAGE || seen[use]) {
        failures.push(`${name}: ended at ${run.end}, A=${run.cpu.a}, ${use} ${seen[use] ? "used" : "not used"}`);
      }
    } catch (error) {
      // A damaged run that is used can leave the CPU anywhere.
      failures.push(`${name}: ${use} ${seen[use] ? "used" : "not used"}, then ${error.message.split("\n")[0]}`);
    }
  }
  assert.deepEqual(failures, []);
});

// AUD-03 (the remainder): the gameplay DLI's phase 0 adds 3 to the active
// list's low byte in binary (`clc; adc #$03` into DLISTL), and the NMI keeps
// the interrupted code's D - three gameplay score routines run between SED
// and CLD with this DLI live. Both phases, both lists, D clear and set, C
// clear and set, non-trivial registers: the same writes either way, and A,
// X, Y and P come back as they were.
test("AUD-03: the gameplay DLI writes the same with D set as with D clear, both phases and both lists, and returns A, X, Y and P", () => {
  const base = bossGateMemory();
  const listA = label("main", "PLAYFIELD_DLIST_A") & 0xff;
  const lists = [listA, listA + 90];                    // PLAYFIELD_DLIST_B = A + PLAYFIELD_DLIST_BYTES
  const regs = { a: 0x5a, x: 0xa5, y: 0x3c };
  const run = (phase, list, p) => {
    const memory = Uint8Array.from(base);
    memory[label("main", "loader_dli_phase")] = phase;   // gameplay_dli_phase = loader_dli_phase
    memory[label("main", "PLAYFIELD_ACTIVE_DLIST_LO")] = list;
    const writes = [];
    const out = {};
    nmi(memory, label("main", "gameplay_dli"), { ...regs, p, out,
      hooks: { write: (address, value) => {
        if (address >> 8 !== 0x01) writes.push([address, value]);   // not the stack: the pushed P differs by design
        return undefined;
      } } });
    return { writes, cpu: out.cpu };
  };
  const failures = [];
  for (const phase of [0, 1]) {
    for (const list of lists) {
      for (const carry of [0, 1]) {
        const binary = run(phase, list, 0x24 | carry);
        const decimal = run(phase, list, 0x2c | carry);
        const where = `phase ${phase}, list $${list.toString(16)}, C ${carry}`;
        if (JSON.stringify(decimal.writes) !== JSON.stringify(binary.writes)) {
          const at = decimal.writes.findIndex((w, k) => JSON.stringify(w) !== JSON.stringify(binary.writes[k]));
          failures.push(`${where}: write ${at} is ${JSON.stringify(decimal.writes[at])} with D set, ` +
            `${JSON.stringify(binary.writes[at])} with D clear`);
        }
        for (const [one, p] of [[binary, 0x24 | carry], [decimal, 0x2c | carry]]) {
          const back = { a: one.cpu.a, x: one.cpu.x, y: one.cpu.y, p: one.cpu.p };
          if (JSON.stringify(back) !== JSON.stringify({ ...regs, p })) {
            failures.push(`${where}, P $${p.toString(16)}: returned ${JSON.stringify(back)}`);
          }
        }
        if (phase === 0 && !binary.writes.some(([address, value]) => address === 0xd402 && value === list + 3)) {
          failures.push(`${where}: DLISTL is not the list's byte three`);
        }
      }
    }
  }
  assert.deepEqual(failures, []);
});
