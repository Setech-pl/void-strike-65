import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { installRuntimeSegments } from "../scripts/runtime-image.mjs";
import { Nmos6502 } from "../scripts/nmos6502.mjs";

const directory = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(directory, "..");
const source = fs.readFileSync(path.join(root, "src", "main.s"), "utf8");
const labels = new Map(
  fs.readFileSync(path.join(root, "build", "void-strike-65.lbl"), "utf8")
    .split(/\r?\n/)
    .map((line) => /^al\s+([0-9a-f]+)\s+\.?([^\s]+)$/i.exec(line.trim()))
    .filter(Boolean)
    .map((match) => [match[2], Number.parseInt(match[1], 16)]),
);

const addresses = {
  screen: 0x4000,
  scoreLow: labels.get("score_bcd_lo"),
  scoreHigh: labels.get("score_bcd_hi"),
  topLow: labels.get("TOP_SCORE_TABLE_LO"),
  topHigh: labels.get("TOP_SCORE_TABLE_HI"),
  topEnd: labels.get("TOP_SCORE_TABLE_END"),
  playerLifecycle: 0x4eaa,
  playerLives: 0x4eab,
  playerHealth: 0x4e5d,
  damageCooldown: 0x4e5e,
  deathTimer: 0x4e5f,
  damageApplied: 0x4e65,
  enemyArchetype: 0x4ecb,
  enemyScores: labels.get("enemy_scores"),
  addScore: labels.get("add_archetype_score"),
  applyPlayerDamage: labels.get("apply_player_damage"),
  updatePlayerDeath: labels.get("update_player_death"),
  initState: labels.get("init_state"),
  insertTop: labels.get("insert_top_score"),
  drawTop: labels.get("draw_top_score_rows"),
  enterGameOver: labels.get("enter_game_over"),
  enterMainMenu: labels.get("enter_main_menu"),
  enterTopScores: labels.get("enter_top_scores"),
};

function routine(label) {
  const lines = source.split(/\r?\n/);
  const start = lines.findIndex((line) => line.trim() === `${label}:`);
  assert.notEqual(start, -1, `missing routine ${label}`);
  let end = start + 1;
  while (
    end < lines.length &&
    !/^[A-Za-z_][A-Za-z0-9_]*:\s*$/.test(lines[end].replace(/;.*/, "").trim())
  ) {
    end += 1;
  }
  return lines.slice(start + 1, end).join("\n");
}

function createRuntimeMemory() {
  const memory = new Uint8Array(0x10000);
  installRuntimeSegments(memory, root);
  return memory;
}

function runAssembledRoutine(memory, startAddress, { hooks = {} } = {}) {
  const cpu = new Nmos6502(memory, hooks);
  const stop = 0x7fff;
  cpu.push((stop - 1) >> 8);
  cpu.push((stop - 1) & 0xff);
  cpu.pc = startAddress;
  let steps = 0;
  while (cpu.pc !== stop && steps++ < 500_000) cpu.step();
  assert.equal(cpu.pc, stop, `routine $${startAddress.toString(16)} did not return`);
  return { cycles: cpu.cycles, steps };
}

function scoreToBcd(score) {
  return {
    high: Math.floor(score / 1000) << 4 | Math.floor(score / 100) % 10,
    low: Math.floor(score / 10) % 10 << 4 | score % 10,
  };
}

function bcdToScore(high, low) {
  return (high >> 4) * 1000 + (high & 0x0f) * 100 +
    (low >> 4) * 10 + (low & 0x0f);
}

function writeTopScores(memory, scores) {
  for (let index = 0; index < 10; index += 1) {
    const { high, low } = scoreToBcd(scores[index] ?? 0);
    memory[addresses.topLow + index] = low;
    memory[addresses.topHigh + index] = high;
  }
}

function readTopScores(memory) {
  return Array.from({ length: 10 }, (_, index) => bcdToScore(
    memory[addresses.topHigh + index],
    memory[addresses.topLow + index],
  ));
}

function insertScore(memory, score, hooks = {}) {
  const { high, low } = scoreToBcd(score);
  memory[addresses.scoreHigh] = high;
  memory[addresses.scoreLow] = low;
  return runAssembledRoutine(memory, addresses.insertTop, { hooks });
}

function renderedTopScores(memory) {
  runAssembledRoutine(memory, addresses.drawTop);
  return Array.from({ length: 10 }, (_, row) => {
    const digits = memory.subarray(addresses.screen + 80 + row * 20 + 11,
      addresses.screen + 80 + row * 20 + 17);
    return Number.parseInt([...digits].map((code) => (code & 0x3f) - 1).join(""), 10);
  });
}

function frontendHooks() {
  let vcountRead = 0;
  return {
    read(address) {
      if (address !== 0xd40b) return undefined;
      return vcountRead++ === 0 ? 0 : 1;
    },
  };
}

// Focused NMOS 6502 runner for the assembled score and lifecycle paths. It
// executes linked routines, decimal ADC, and selected bounded external calls.
function executeScoreRoutine(memory, startAddress, {
  initialAccumulator = 0,
  externalCalls = new Set(),
} = {}) {
  let accumulator = initialAccumulator;
  let x = 0;
  let stackPointer = 0xff;
  let programCounter = startAddress;
  let carry = false;
  let zero = false;
  let decimal = false;
  let callDepth = 0;
  let instructions = 0;

  const readByte = () => memory[programCounter++ & 0xffff];
  const readWord = () => {
    const low = readByte();
    return low | readByte() << 8;
  };
  const setAccumulator = (value) => {
    accumulator = value & 0xff;
    zero = accumulator === 0;
  };
  const push = (value) => {
    memory[0x100 | stackPointer] = value & 0xff;
    stackPointer = stackPointer - 1 & 0xff;
  };
  const pop = () => {
    stackPointer = stackPointer + 1 & 0xff;
    return memory[0x100 | stackPointer];
  };
  const branch = (condition) => {
    const encoded = readByte();
    if (!condition) return;
    const offset = encoded < 0x80 ? encoded : encoded - 0x100;
    programCounter = programCounter + offset & 0xffff;
  };
  const add = (operand) => {
    const carryIn = Number(carry);
    if (!decimal) {
      const result = accumulator + operand + carryIn;
      carry = result > 0xff;
      setAccumulator(result);
      return;
    }
    let lowDigit = (accumulator & 0x0f) + (operand & 0x0f) + carryIn;
    let highDigit = (accumulator >>> 4) + (operand >>> 4);
    if (lowDigit >= 10) {
      lowDigit -= 10;
      highDigit += 1;
    }
    carry = highDigit >= 10;
    if (carry) highDigit -= 10;
    setAccumulator(highDigit << 4 | lowDigit);
  };
  const compare = (operand) => {
    carry = accumulator >= operand;
    zero = accumulator === operand;
  };

  while (instructions++ < 512) {
    const opcodeAddress = programCounter;
    switch (readByte()) {
      case 0x05: // ORA zp
        setAccumulator(accumulator | memory[readByte()]);
        break;
      case 0x09: // ORA #imm
        setAccumulator(accumulator | readByte());
        break;
      case 0x18: // CLC
        carry = false;
        break;
      case 0x20: { // JSR abs
        const target = readWord();
        if (externalCalls.has(target)) break;
        const returnAddress = programCounter - 1 & 0xffff;
        push(returnAddress >>> 8);
        push(returnAddress);
        callDepth += 1;
        programCounter = target;
        break;
      }
      case 0x29: // AND #imm
        setAccumulator(accumulator & readByte());
        break;
      case 0x48: // PHA
        push(accumulator);
        break;
      case 0x4a: // LSR A
        carry = (accumulator & 1) !== 0;
        setAccumulator(accumulator >>> 1);
        break;
      case 0x38: // SEC
        carry = true;
        break;
      case 0x4c: { // JMP abs
        const target = readWord();
        if (externalCalls.has(target)) return instructions;
        programCounter = target;
        break;
      }
      case 0x60: // RTS
        if (callDepth === 0) return instructions;
        programCounter = (pop() | pop() << 8) + 1 & 0xffff;
        callDepth -= 1;
        break;
      case 0x68: // PLA
        setAccumulator(pop());
        break;
      case 0x69: // ADC #imm
        add(readByte());
        break;
      case 0x7d: { // ADC abs,X
        const address = readWord();
        add(memory[address + x & 0xffff]);
        break;
      }
      case 0x85: // STA zp
        memory[readByte()] = accumulator;
        break;
      case 0x8d: // STA abs
        memory[readWord()] = accumulator;
        break;
      case 0x90: // BCC rel
        branch(!carry);
        break;
      case 0x9d: { // STA abs,X
        const address = readWord();
        memory[address + x & 0xffff] = accumulator;
        break;
      }
      case 0xa2: // LDX #imm
        x = readByte();
        zero = x === 0;
        break;
      case 0xa5: // LDA zp
        setAccumulator(memory[readByte()]);
        break;
      case 0xa9: // LDA #imm
        setAccumulator(readByte());
        break;
      case 0xad: // LDA abs
        setAccumulator(memory[readWord()]);
        break;
      case 0xae: // LDX abs
        x = memory[readWord()];
        zero = x === 0;
        break;
      case 0xb0: // BCS rel
        branch(carry);
        break;
      case 0xbd: { // LDA abs,X
        const address = readWord();
        setAccumulator(memory[address + x & 0xffff]);
        break;
      }
      case 0xc9: // CMP #imm
        compare(readByte());
        break;
      case 0xcd: // CMP abs
        compare(memory[readWord()]);
        break;
      case 0xce: { // DEC abs
        const address = readWord();
        memory[address] = memory[address] - 1 & 0xff;
        zero = memory[address] === 0;
        break;
      }
      case 0xd0: // BNE rel
        branch(!zero);
        break;
      case 0xd8: // CLD
        decimal = false;
        break;
      case 0xe8: // INX
        x = x + 1 & 0xff;
        zero = x === 0;
        break;
      case 0xed: { // SBC abs
        const difference = accumulator - memory[readWord()] - Number(!carry);
        carry = difference >= 0;
        setAccumulator(difference);
        break;
      }
      case 0xf0: // BEQ rel
        branch(zero);
        break;
      case 0xf8: // SED
        decimal = true;
        break;
      default:
        assert.fail(
          `unsupported opcode $${memory[opcodeAddress].toString(16)} ` +
          `at $${opcodeAddress.toString(16)}`,
        );
    }
  }
  assert.fail("assembled score routine exceeded its bounded instruction budget");
}

function awardOnePoint({ scoreLow, scoreHigh, topLow, topHigh }) {
  const memory = createRuntimeMemory();
  memory[addresses.enemyArchetype] = 0;
  memory[addresses.enemyScores] = 0x01;
  memory[addresses.scoreLow] = scoreLow;
  memory[addresses.scoreHigh] = scoreHigh;
  memory[addresses.topLow] = topLow;
  memory[addresses.topHigh] = topHigh;
  const instructions = executeScoreRoutine(memory, addresses.addScore);
  return { memory, instructions };
}

test("all score writes use one BCD award path while source ownership stays unchanged", () => {
  assert.ok(Object.values(addresses).every(Number.isInteger));
  assert.match(source,
    /TOP_SCORE_RECORD_COUNT\s*=\s*10[\s\S]+TOP_SCORE_TABLE_LO\s*=\s*TOP_SCORE_TABLE[\s\S]+TOP_SCORE_TABLE_HI\s*=\s*TOP_SCORE_TABLE_LO\+TOP_SCORE_STORAGE_COUNT/);
  assert.match(routine("add_archetype_score"),
    /adc enemy_scores,x[\s\S]+sta score_bcd_hi[\s\S]+cld\s+jmp update_score_display/);
  assert.doesNotMatch(routine("add_archetype_score"), /insert_top_score/);
  assert.match(routine("update_player_death"),
    /@game_over:[\s\S]+sta PLAYER_LIFECYCLE\s+jsr insert_top_score/);
  assert.match(routine("resolve_enemy_damage"),
    /cmp #\(DAMAGE_CAPITAL_HOSTILE\+1\)\s+bcs @no_score\s+pha\s+jsr add_archetype_score\s+pla\s+cmp #DAMAGE_PLAYER_PROJECTILE\s+bne @no_score\s+lda ENTITY_STATE\+WEAPON_PICKUP_SLOT\s+bne @no_score\s+jsr weapon_pickup_record_qualified_kill/);
  assert.match(routine("init_state"), /sta score_bcd_lo\s+sta score_bcd_hi/);
  assert.doesNotMatch(routine("init_state"), /TOP_SCORE_TABLE/);
  assert.match(routine("finish_startup_after_loader"),
    /ldx #\(TOP_SCORE_TABLE_BYTES-1\)[\s\S]+sta TOP_SCORE_TABLE,x[\s\S]+bpl @clear_top_scores/);
  assert.equal((source.match(/sta score_bcd_lo/g) ?? []).length, 2);
  assert.equal((source.match(/sta score_bcd_hi/g) ?? []).length, 2);
});

test("assembled decimal score code carries without inserting partial-game scores", () => {
  const cases = [
    {
      name: "0009 + 1",
      input: { scoreLow: 0x09, scoreHigh: 0x00, topLow: 0x08, topHigh: 0x00 },
      score: [0x10, 0x00],
      top: [0x08, 0x00],
      hud: [16, 16, 16, 17, 16],
    },
    {
      name: "0099 + 1",
      input: { scoreLow: 0x99, scoreHigh: 0x00, topLow: 0x99, topHigh: 0x00 },
      score: [0x00, 0x01],
      top: [0x99, 0x00],
      hud: [16, 16, 17, 16, 16],
    },
    {
      name: "0199 + 1 exceeds TOP 0199",
      input: { scoreLow: 0x99, scoreHigh: 0x01, topLow: 0x99, topHigh: 0x01 },
      score: [0x00, 0x02],
      top: [0x99, 0x01],
      hud: [16, 16, 18, 16, 16],
    },
  ];

  for (const expected of cases) {
    const { memory, instructions } = awardOnePoint(expected.input);
    assert.deepEqual([memory[addresses.scoreLow], memory[addresses.scoreHigh]],
      expected.score, `${expected.name} score`);
    assert.deepEqual([memory[addresses.topLow], memory[addresses.topHigh]],
      expected.top, `${expected.name} TOP`);
    assert.deepEqual([...memory.subarray(addresses.screen + 6, addresses.screen + 11)],
      expected.hud, `${expected.name} HUD screen codes`);
    assert.ok(instructions < 128, `${expected.name} remains bounded`);
  }
});

test("TOP SCORES owns exactly ten two-byte packed-BCD records", () => {
  assert.equal(labels.get("TOP_SCORE_RECORD_COUNT"), 10);
  assert.equal(labels.get("TOP_SCORE_RECORD_BYTES"), 2);
  assert.equal(labels.get("TOP_SCORE_STORAGE_COUNT"), 10);
  assert.equal(addresses.topHigh, addresses.topLow + 10);
  assert.equal(addresses.topEnd, addresses.topLow + 20);
  assert.equal(addresses.topEnd, 0x4efe);
});

test("assembled ranking covers empty, regression, middle and new-record insertion", () => {
  const scenarios = [
    { name: "empty + 890", before: [], score: 890,
      after: [890, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
    { name: "890 + 690 regression", before: [890], score: 690,
      after: [890, 690, 0, 0, 0, 0, 0, 0, 0, 0] },
    { name: "insert 750 between 890 and 690", before: [890, 690], score: 750,
      after: [890, 750, 690, 0, 0, 0, 0, 0, 0, 0] },
    { name: "new record 950", before: [890, 750, 690], score: 950,
      after: [950, 890, 750, 690, 0, 0, 0, 0, 0, 0] },
  ];
  for (const scenario of scenarios) {
    const memory = createRuntimeMemory();
    writeTopScores(memory, scenario.before);
    const { cycles } = insertScore(memory, scenario.score);
    assert.deepEqual(readTopScores(memory), scenario.after, scenario.name);
    assert.ok(cycles < 600, `${scenario.name} remains bounded`);
  }
});

test("ranking fills every empty slot and remains descending", () => {
  const memory = createRuntimeMemory();
  for (const score of [890, 690, 750, 950, 500, 400, 300, 200, 100, 50]) {
    insertScore(memory, score);
  }
  assert.deepEqual(readTopScores(memory), [950, 890, 750, 690, 500, 400, 300, 200, 100, 50]);
});

test("equal scores insert after existing equals and move both BCD fields together", () => {
  const memory = createRuntimeMemory();
  writeTopScores(memory, [890, 750, 750, 690]);
  const writes = [];
  insertScore(memory, 750, {
    write(address, value) {
      if ((address >= addresses.topLow && address < addresses.topLow + 10) ||
        (address >= addresses.topHigh && address < addresses.topHigh + 10)) {
        writes.push([address, value]);
      }
    },
  });
  assert.deepEqual(readTopScores(memory), [890, 750, 750, 750, 690, 0, 0, 0, 0, 0]);
  assert.deepEqual(writes.slice(0, 2).map(([address]) => address),
    [addresses.topLow + 3, addresses.topHigh + 3],
  "candidate must be stored after both existing equal records");
  for (let index = 0; index < writes.length; index += 2) {
    assert.equal(writes[index + 1][0] - writes[index][0], 10,
      "every shifted low-byte field must be followed by its matching high byte");
  }
});

test("zero and a full-table loser do not alter visible records", () => {
  const full = [950, 890, 750, 690, 500, 400, 300, 200, 100, 50];
  for (const score of [0, 40]) {
    const memory = createRuntimeMemory();
    writeTopScores(memory, full);
    insertScore(memory, score);
    assert.deepEqual(readTopScores(memory), full);
  }
});

test("a full-table winner displaces the last record", () => {
  const memory = createRuntimeMemory();
  writeTopScores(memory, [950, 890, 750, 690, 500, 400, 300, 200, 100, 50]);
  insertScore(memory, 125);
  assert.deepEqual(readTopScores(memory), [950, 890, 750, 690, 500, 400, 300, 200, 125, 100]);
});

test("ordinary awards update only current BCD score until Game Over", () => {
  const actualAward = createRuntimeMemory();
  assert.equal(actualAward[addresses.enemyScores], 0x10,
    "the release Interceptor keeps its descriptor-owned ten-point award");
  actualAward[addresses.enemyArchetype] = 0;
  actualAward[addresses.scoreLow] = 0;
  actualAward[addresses.scoreHigh] = 0;
  actualAward[addresses.topLow] = 0;
  actualAward[addresses.topHigh] = 0;
  executeScoreRoutine(actualAward, addresses.addScore);
  assert.deepEqual([actualAward[addresses.scoreLow], actualAward[addresses.scoreHigh]],
    [0x10, 0x00]);
  assert.deepEqual(readTopScores(actualAward), Array(10).fill(0));
});

test("assembled death and respawn preserve whole-game SCORE before the next award", () => {
  const memory = createRuntimeMemory();
  const externalCalls = new Set([
    "play_hit_sound",
    "erase_bullet",
    "clear_interceptor_pulses",
    "begin_player_fighter_explosion",
    "update_hud_status",
    "erase_player",
    "clear_fighter_projectiles",
    "clear_player_collision_latches",
    "clear_transient_effects",
    "draw_player",
  ].map((label) => labels.get(label)));

  memory[addresses.scoreLow] = 0x23;
  memory[addresses.scoreHigh] = 0x01;
  memory[addresses.topLow] = 0x23;
  memory[addresses.topHigh] = 0x01;
  memory[addresses.playerLifecycle] = 0;
  memory[addresses.playerLives] = 3;
  memory[addresses.playerHealth] = 1;
  memory[addresses.damageCooldown] = 0;
  memory[addresses.damageApplied] = 0;

  executeScoreRoutine(memory, addresses.applyPlayerDamage, {
    initialAccumulator: 1,
    externalCalls,
  });
  assert.equal(memory[addresses.playerLifecycle], 1, "lethal damage enters DYING");
  assert.equal(memory[addresses.playerLives], 2, "lethal damage consumes exactly one life");
  // Rebaselined 2026-09-17 (death-frame deferral): the explosion begins on the
  // first DYING tick, so DYING lasts 25 frames around the 24-frame explosion.
  assert.equal(memory[addresses.deathTimer], 25, "the full explosion lifecycle is retained");
  assert.deepEqual([memory[addresses.scoreLow], memory[addresses.scoreHigh]], [0x23, 0x01]);
  assert.deepEqual([memory[addresses.topLow], memory[addresses.topHigh]], [0x23, 0x01]);

  for (let frame = 0; frame < 25; frame += 1) {
    executeScoreRoutine(memory, addresses.updatePlayerDeath, { externalCalls });
  }
  assert.equal(memory[addresses.playerLifecycle], 2,
    "the completed explosion enters RESPAWN_INVULNERABLE");
  assert.equal(memory[addresses.playerLives], 2);
  assert.deepEqual([memory[addresses.scoreLow], memory[addresses.scoreHigh]], [0x23, 0x01]);
  assert.deepEqual([memory[addresses.topLow], memory[addresses.topHigh]], [0x23, 0x01]);

  memory[addresses.enemyArchetype] = 0;
  assert.equal(memory[addresses.enemyScores], 0x10);
  executeScoreRoutine(memory, addresses.addScore);
  assert.deepEqual([memory[addresses.scoreLow], memory[addresses.scoreHigh]], [0x33, 0x01]);
  assert.deepEqual([memory[addresses.topLow], memory[addresses.topHigh]], [0x23, 0x01]);

  const newGameCalls = new Set([
    "init_fighter_projectiles",
    "init_starfield_state",
    "reset_enemy_fire_cooldown",
  ].map((label) => labels.get(label)));
  executeScoreRoutine(memory, addresses.initState, { externalCalls: newGameCalls });
  assert.deepEqual([memory[addresses.scoreLow], memory[addresses.scoreHigh]], [0, 0]);
  assert.deepEqual([memory[addresses.topLow], memory[addresses.topHigh]], [0x23, 0x01]);

  assert.doesNotMatch(routine("respawn_player"), /score_bcd|TOP_SCORE|init_state/);
  assert.match(routine("update_player_death"), /jsr insert_top_score/);
  assert.doesNotMatch(routine("main_loop"), /reset_score_after_player_death/);
  assert.match(routine("start_gameplay"), /jsr init_state/);
});

test("assembled Game Over transition inserts the final score exactly once", () => {
  const memory = createRuntimeMemory();
  writeTopScores(memory, [200, 100]);
  memory[addresses.playerLifecycle] = 1;
  memory[addresses.playerLives] = 0;
  memory[addresses.deathTimer] = 1;
  memory[addresses.scoreLow] = 0x23;
  memory[addresses.scoreHigh] = 0x01;
  runAssembledRoutine(memory, addresses.updatePlayerDeath);
  assert.equal(memory[addresses.playerLifecycle], 3);
  assert.deepEqual([memory[addresses.scoreLow], memory[addresses.scoreHigh]], [0x23, 0x01]);
  assert.deepEqual(readTopScores(memory), [200, 123, 100, 0, 0, 0, 0, 0, 0, 0]);
  runAssembledRoutine(memory, addresses.updatePlayerDeath);
  assert.deepEqual(readTopScores(memory), [200, 123, 100, 0, 0, 0, 0, 0, 0, 0]);
});

test("assembled TOP formatter renders every RAM record", () => {
  const memory = createRuntimeMemory();
  const expected = [950, 890, 750, 690, 500, 400, 300, 200, 100, 50];
  writeTopScores(memory, expected);
  assert.deepEqual(renderedTopScores(memory), expected);
  assert.match(routine("render_frontend_state"),
    /cmp #STATE_TOP_SCORES[\s\S]+jmp draw_top_score_rows/);
  assert.match(routine("draw_top_score_rows"),
    /TOP_SCORE_TABLE_HI,x[\s\S]+TOP_SCORE_TABLE_LO,x[\s\S]+cpx #10/);
});

test("three consecutive games survive SCORE resets and render immediately", () => {
  const memory = createRuntimeMemory();
  const newGameCalls = new Set([
    "init_fighter_projectiles", "init_starfield_state", "reset_enemy_fire_cooldown",
  ].map((label) => labels.get(label)));
  const expectations = [
    [890, [890, 0, 0, 0, 0, 0, 0, 0, 0, 0]],
    [690, [890, 690, 0, 0, 0, 0, 0, 0, 0, 0]],
    [750, [890, 750, 690, 0, 0, 0, 0, 0, 0, 0]],
  ];
  for (const [score, expected] of expectations) {
    const { high, low } = scoreToBcd(score);
    memory[addresses.scoreHigh] = high;
    memory[addresses.scoreLow] = low;
    memory[addresses.playerLifecycle] = 1;
    memory[addresses.playerLives] = 0;
    memory[addresses.deathTimer] = 1;
    runAssembledRoutine(memory, addresses.updatePlayerDeath);
    assert.deepEqual(readTopScores(memory), expected, `RAM after game ${score}`);
    runAssembledRoutine(memory, addresses.enterGameOver, { hooks: frontendHooks() });
    runAssembledRoutine(memory, addresses.enterMainMenu, { hooks: frontendHooks() });
    runAssembledRoutine(memory, addresses.enterTopScores, { hooks: frontendHooks() });
    assert.deepEqual(renderedTopScores(memory), expected, `screen after game ${score}`);
    executeScoreRoutine(memory, addresses.initState, { externalCalls: newGameCalls });
    assert.deepEqual([memory[addresses.scoreHigh], memory[addresses.scoreLow]], [0, 0]);
    assert.deepEqual(readTopScores(memory), expected, `table survives New Game after ${score}`);
  }
});
