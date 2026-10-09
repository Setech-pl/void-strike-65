// S5-1 (plan docs/plans/s5-boss-regions.md §4.7): the target is the 64 KB
// machine, so the game must never touch the 130XE's bank switching or map the
// self-test ROM. PORTB (XL/XE): bit 0 OS ROM on, bit 1 BASIC off, bits 2-3 the
// 130XE bank, bit 4 CPU access to the bank (0 = on), bit 5 ANTIC access to it
// (0 = on), bit 7 self-test ROM off (0 maps it at $5000-$57FF while the OS ROM
// is on - over the HUD charset and slot F). Every PORTB write in src/ must keep
// bits 4 and 5 set and never clear bit 7 while the OS ROM is mapped. PBCTL
// bit 2 selects whether $D301 is the port or its direction register, so every
// PBCTL write must keep it set too.
//
// The analyser walks back from each store to the load of the stored register
// and composes the ORA / AND masks in between; any other write to that
// register, or a read-modify-write instruction on the port itself, is refused
// as unanalysable.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { bossGateMemory, call, label, root } from "./boss-harness.mjs";

// Where each PORTB write runs. A write in a routine not listed here fails the
// test until its phase is recorded.
const PORTB_PHASES = new Map([
  ["disable_basic_rom", "boot stage 2 (boot_stage2_atr_entry, src/main.s:12468): the OS ROM mapped, before the first SIO read"],
]);
const PORT = { PORTB: /^(?:PORTB|\$D301)$/i, PBCTL: /^(?:PBCTL|\$D303)$/i };
const REGISTER = { sta: "A", stx: "X", sty: "Y" };
const WRITES = { A: /^(lda|ora|and|eor|adc|sbc|asl|lsr|rol|ror|txa|tya|pla)$/, X: /^(ldx|inx|dex|tax|tsx)$/, Y: /^(ldy|iny|dey|tay)$/ };

function instructions(text) {
  return text.split("\n").map((raw, index) => {
    const line = raw.replace(/;.*$/, "");
    const match = /^\s*(?:([@A-Za-z_][\w@]*):)?\s*([a-z]{3})?\b\s*([^\s].*?)?\s*$/i.exec(line);
    return { index, raw, label: match?.[1] ?? (/^[A-Za-z_]\w*\s*:/.test(line) ? line.split(":")[0].trim() : null),
      op: match?.[2]?.toLowerCase() ?? null, operand: match?.[3] ?? "" };
  });
}

// Every store to PORTB or PBCTL in `text`, analysed; `symbols` resolves an
// immediate's equate (NAME = $xx).
export function analyse(text, file, symbols = new Map()) {
  const lines = instructions(text);
  const out = [];
  lines.forEach((ins, at) => {
    const port = Object.keys(PORT).find((name) => PORT[name].test(ins.operand.trim()));
    if (port === undefined || ins.op === null) return;
    if (/^(lda|ldx|ldy|bit|cmp|cpx|cpy|ora|and|eor|adc|sbc)$/.test(ins.op)) return;   // a read
    let routine = null;
    for (let i = at; i >= 0 && routine === null; i -= 1) if (lines[i].label && !lines[i].label.startsWith("@")) routine = lines[i].label;
    const row = { where: `${file}:${ins.index + 1}`, port, routine, operation: null, problems: [] };
    out.push(row);
    const register = REGISTER[ins.op];
    if (register === undefined) { row.operation = `${ins.op} ${port}`; row.problems.push("read-modify-write on the port"); return; }
    // Walk back to the register's load.
    const ops = [];
    let source = null;
    for (let i = at - 1; i >= 0; i -= 1) {
      const { op, operand, label: l } = lines[i];
      if (op === null) { if (l) break; continue; }
      if (/^(jsr|jmp|rts|rti|brk|b..)$/.test(op) && op !== "bit") break;
      if (!WRITES[register].test(op)) continue;
      const value = /^#\$?([0-9a-f]+)$/i.exec(operand.trim());
      const named = /^#([A-Za-z_]\w*)$/.exec(operand.trim());
      const imm = value ? Number.parseInt(value[1], operand.includes("$") ? 16 : 10)
        : named ? (symbols.get(named[1]) ?? null) : null;
      if (/^ld[axy]$/.test(op)) {
        if (imm !== null) source = { constant: imm };
        else if (PORT[port].test(operand.trim())) source = { port: true };
        break;
      }
      if ((op === "ora" || op === "and") && imm !== null && register === "A") { ops.unshift([op, imm]); continue; }
      break;
    }
    if (source === null) { row.operation = "?"; row.problems.push("unanalysable: no load of the stored register in the block"); return; }
    // f(x) = (x & and) | or, or a constant.
    let and = 0xff, or = 0x00, constant = source.constant ?? null;
    for (const [op, m] of ops) {
      if (constant !== null) constant = op === "ora" ? constant | m : constant & m;
      else if (op === "ora") or |= m;
      else { and &= m; or &= m; }
    }
    row.operation = constant !== null ? `#$${constant.toString(16).toUpperCase().padStart(2, "0")}`
      : `${port}${ops.map(([op, m]) => ` ${op === "ora" ? "|" : "&"} $${m.toString(16).toUpperCase().padStart(2, "0")}`).join("")}`;
    // A bit after the write: 1, 0 or "kept" (the port's own value).
    const bit = (b) => (constant !== null ? (constant >> b) & 1 : ((or >> b) & 1) ? 1 : ((and >> b) & 1) ? "kept" : 0);
    if (port === "PORTB") {
      for (const b of [4, 5]) if (bit(b) === 0) row.problems.push(`clears bit ${b} (130XE bank access)`);
      if (bit(7) === 0 && bit(0) !== 0) row.problems.push("clears bit 7 with the OS ROM mapped (self-test ROM at $5000-$57FF)");
    } else if (bit(2) === 0) row.problems.push("clears PBCTL bit 2 ($D301 becomes the direction register)");
  });
  return out;
}

function sourceFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(directory, entry.name);
    return entry.isDirectory() ? sourceFiles(full) : /\.(s|inc)$/.test(entry.name) ? [full] : [];
  });
}

function equates(files) {
  const symbols = new Map();
  for (const file of files) {
    for (const [, name, hex] of fs.readFileSync(file, "utf8").matchAll(/^\s*([A-Za-z_]\w*)\s*=\s*\$([0-9A-Fa-f]{1,2})\b/gm)) {
      symbols.set(name, Number.parseInt(hex, 16));
    }
  }
  return symbols;
}

test("every PORTB and PBCTL write in src/ keeps the 64 KB map: bits 4, 5 set, bit 7 with the OS ROM, PBCTL bit 2", () => {
  const files = sourceFiles(path.join(root, "src"));
  const symbols = equates(files);
  const rows = files.flatMap((file) => analyse(fs.readFileSync(file, "utf8"), path.relative(root, file), symbols));
  for (const row of rows) {
    const phase = row.port === "PORTB" ? (PORTB_PHASES.get(row.routine) ?? "UNLISTED")
      : "every SIO command frame (the sector reader): boot, transitions, the boss entry";
    console.log(`# ${row.where} | ${row.port} | ${row.routine} | ${row.operation} | ${phase} | ${row.problems.join("; ") || "ok"}`);
    if (row.port === "PORTB" && phase === "UNLISTED") row.problems.push("a PORTB write in a routine with no recorded phase");
  }
  const portb = rows.filter(({ port }) => port === "PORTB");
  assert.ok(portb.length >= 1, "no PORTB write found (subject empty)");
  assert.deepEqual(rows.filter(({ problems }) => problems.length > 0)
    .map(({ where, problems }) => `${where}: ${problems.join("; ")}`), []);
});

test("the analyser flags every planted bad write and passes the game's pattern", () => {
  const rows = analyse(fs.readFileSync(path.join(root, "tests", "fixtures", "portb-planted.s"), "utf8"), "fixture");
  const flagged = (routine) => rows.find((row) => row.routine === routine)?.problems ?? null;
  assert.match(flagged("bank_switch_planted").join(), /bit 4/);
  assert.match(flagged("constant_planted").join(), /bit 4.*bit 5/);
  assert.match(flagged("self_test_planted").join(), /bit 7/);
  assert.match(flagged("direction_planted").join(), /PBCTL bit 2/);
  assert.deepEqual(flagged("basic_off_good"), []);
});

test("disable_basic_rom run natively keeps bits 0, 4, 5 and 7 and sets bit 1", () => {
  for (const before of [0xfd, 0xb1]) {
    const memory = bossGateMemory();
    memory[0xd301] = before;
    call(memory, label("main", "disable_basic_rom"));
    const after = memory[0xd301];
    assert.equal(after, before | 0x02, `PORTB $${before.toString(16)} -> $${after.toString(16)}`);
    for (const b of [0, 4, 5, 7]) assert.equal((after >> b) & 1, (before >> b) & 1, `bit ${b}`);
  }
});
