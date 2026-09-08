const FLAG_C = 0x01;
const FLAG_Z = 0x02;
const FLAG_I = 0x04;
const FLAG_D = 0x08;
const FLAG_B = 0x10;
const FLAG_U = 0x20;
const FLAG_V = 0x40;
const FLAG_N = 0x80;

const instructions = new Array(256);

function define(opcode, operation, mode, cycles, pageCross = false) {
  instructions[opcode] = { operation, mode, cycles, pageCross };
}

function defineReadFamily(operation, opcodes) {
  for (const [opcode, mode, cycles, pageCross = false] of opcodes) {
    define(opcode, operation, mode, cycles, pageCross);
  }
}

defineReadFamily("LDA", [
  [0xa9, "imm", 2], [0xa5, "zp", 3], [0xb5, "zpx", 4], [0xad, "abs", 4],
  [0xbd, "absx", 4, true], [0xb9, "absy", 4, true], [0xa1, "indx", 6],
  [0xb1, "indy", 5, true],
]);
defineReadFamily("LDX", [
  [0xa2, "imm", 2], [0xa6, "zp", 3], [0xb6, "zpy", 4], [0xae, "abs", 4],
  [0xbe, "absy", 4, true],
]);
defineReadFamily("LDY", [
  [0xa0, "imm", 2], [0xa4, "zp", 3], [0xb4, "zpx", 4], [0xac, "abs", 4],
  [0xbc, "absx", 4, true],
]);
defineReadFamily("STA", [
  [0x85, "zp", 3], [0x95, "zpx", 4], [0x8d, "abs", 4], [0x9d, "absx", 5],
  [0x99, "absy", 5], [0x81, "indx", 6], [0x91, "indy", 6],
]);
defineReadFamily("STX", [[0x86, "zp", 3], [0x96, "zpy", 4], [0x8e, "abs", 4]]);
defineReadFamily("STY", [[0x84, "zp", 3], [0x94, "zpx", 4], [0x8c, "abs", 4]]);

for (const [operation, base] of [
  ["ORA", 0x00], ["AND", 0x20], ["EOR", 0x40], ["ADC", 0x60],
  ["CMP", 0xc0], ["SBC", 0xe0],
]) {
  defineReadFamily(operation, [
    [base + 0x09, "imm", 2], [base + 0x05, "zp", 3], [base + 0x15, "zpx", 4],
    [base + 0x0d, "abs", 4], [base + 0x1d, "absx", 4, true],
    [base + 0x19, "absy", 4, true], [base + 0x01, "indx", 6],
    [base + 0x11, "indy", 5, true],
  ]);
}

defineReadFamily("CPX", [[0xe0, "imm", 2], [0xe4, "zp", 3], [0xec, "abs", 4]]);
defineReadFamily("CPY", [[0xc0, "imm", 2], [0xc4, "zp", 3], [0xcc, "abs", 4]]);
defineReadFamily("BIT", [[0x24, "zp", 3], [0x2c, "abs", 4]]);
defineReadFamily("INC", [[0xe6, "zp", 5], [0xf6, "zpx", 6], [0xee, "abs", 6], [0xfe, "absx", 7]]);
defineReadFamily("DEC", [[0xc6, "zp", 5], [0xd6, "zpx", 6], [0xce, "abs", 6], [0xde, "absx", 7]]);
defineReadFamily("ASL", [[0x0a, "acc", 2], [0x06, "zp", 5], [0x16, "zpx", 6], [0x0e, "abs", 6], [0x1e, "absx", 7]]);
defineReadFamily("LSR", [[0x4a, "acc", 2], [0x46, "zp", 5], [0x56, "zpx", 6], [0x4e, "abs", 6], [0x5e, "absx", 7]]);
define(0x6a, "ROR", "acc", 2);

for (const [opcode, operation] of [
  [0x90, "BCC"], [0xb0, "BCS"], [0xf0, "BEQ"], [0x30, "BMI"],
  [0xd0, "BNE"], [0x10, "BPL"], [0x50, "BVC"], [0x70, "BVS"],
]) {
  define(opcode, operation, "rel", 2);
}

for (const [opcode, operation, cycles] of [
  [0x18, "CLC", 2], [0xd8, "CLD", 2], [0x58, "CLI", 2], [0xb8, "CLV", 2],
  [0x38, "SEC", 2], [0xf8, "SED", 2], [0x78, "SEI", 2], [0xea, "NOP", 2],
  [0xe8, "INX", 2], [0xc8, "INY", 2], [0xca, "DEX", 2], [0x88, "DEY", 2],
  [0xaa, "TAX", 2], [0xa8, "TAY", 2], [0x8a, "TXA", 2], [0x98, "TYA", 2],
  [0xba, "TSX", 2], [0x9a, "TXS", 2], [0x48, "PHA", 3], [0x68, "PLA", 4],
  [0x08, "PHP", 3], [0x28, "PLP", 4], [0x60, "RTS", 6], [0x40, "RTI", 6],
]) {
  define(opcode, operation, "imp", cycles);
}

define(0x20, "JSR", "abs", 6);
define(0x4c, "JMP", "abs", 3);
define(0x6c, "JMP", "ind", 5);

function signedByte(value) {
  return value < 0x80 ? value : value - 0x100;
}

export class Nmos6502 {
  constructor(memory = new Uint8Array(0x10000), hooks = {}) {
    this.memory = memory;
    this.hooks = hooks;
    this.a = 0;
    this.x = 0;
    this.y = 0;
    this.sp = 0xfd;
    this.p = FLAG_I | FLAG_U;
    this.pc = 0;
    this.cycles = 0;
  }

  clone() {
    const copy = new Nmos6502(Uint8Array.from(this.memory), this.hooks);
    copy.a = this.a;
    copy.x = this.x;
    copy.y = this.y;
    copy.sp = this.sp;
    copy.p = this.p;
    copy.pc = this.pc;
    copy.cycles = this.cycles;
    return copy;
  }

  read(address) {
    const normalized = address & 0xffff;
    const hooked = this.hooks.read?.(normalized, this);
    return hooked === undefined ? this.memory[normalized] : hooked & 0xff;
  }

  write(address, value) {
    const normalized = address & 0xffff;
    const byte = value & 0xff;
    if (this.hooks.write?.(normalized, byte, this) !== false) {
      this.memory[normalized] = byte;
    }
  }

  readWord(address) {
    const low = this.read(address);
    return low | (this.read((address + 1) & 0xffff) << 8);
  }

  readIndirectWord(address) {
    const low = this.read(address);
    const highAddress = (address & 0xff00) | ((address + 1) & 0xff);
    return low | (this.read(highAddress) << 8);
  }

  fetch() {
    const value = this.read(this.pc);
    this.pc = (this.pc + 1) & 0xffff;
    return value;
  }

  fetchWord() {
    const low = this.fetch();
    return low | (this.fetch() << 8);
  }

  push(value) {
    this.write(0x100 | this.sp, value);
    this.sp = (this.sp - 1) & 0xff;
  }

  pull() {
    this.sp = (this.sp + 1) & 0xff;
    return this.read(0x100 | this.sp);
  }

  setFlag(flag, enabled) {
    if (enabled) this.p |= flag;
    else this.p &= ~flag;
    this.p |= FLAG_U;
  }

  getFlag(flag) {
    return (this.p & flag) !== 0;
  }

  setNz(value) {
    const byte = value & 0xff;
    this.setFlag(FLAG_Z, byte === 0);
    this.setFlag(FLAG_N, (byte & 0x80) !== 0);
    return byte;
  }

  resolve(mode) {
    switch (mode) {
      case "imm": {
        const address = this.pc;
        this.pc = (this.pc + 1) & 0xffff;
        return { address, pageCrossed: false };
      }
      case "zp": return { address: this.fetch(), pageCrossed: false };
      case "zpx": return { address: (this.fetch() + this.x) & 0xff, pageCrossed: false };
      case "zpy": return { address: (this.fetch() + this.y) & 0xff, pageCrossed: false };
      case "abs": return { address: this.fetchWord(), pageCrossed: false };
      case "absx": {
        const base = this.fetchWord();
        const address = (base + this.x) & 0xffff;
        return { address, pageCrossed: (base & 0xff00) !== (address & 0xff00) };
      }
      case "absy": {
        const base = this.fetchWord();
        const address = (base + this.y) & 0xffff;
        return { address, pageCrossed: (base & 0xff00) !== (address & 0xff00) };
      }
      case "indx": {
        const pointer = (this.fetch() + this.x) & 0xff;
        const address = this.read(pointer) | (this.read((pointer + 1) & 0xff) << 8);
        return { address, pageCrossed: false };
      }
      case "indy": {
        const pointer = this.fetch();
        const base = this.read(pointer) | (this.read((pointer + 1) & 0xff) << 8);
        const address = (base + this.y) & 0xffff;
        return { address, pageCrossed: (base & 0xff00) !== (address & 0xff00) };
      }
      case "ind": return { address: this.readIndirectWord(this.fetchWord()), pageCrossed: false };
      case "rel": return { offset: signedByte(this.fetch()), pageCrossed: false };
      case "acc":
      case "imp": return { pageCrossed: false };
      default: throw new Error(`Unsupported addressing mode ${mode}`);
    }
  }

  compare(register, value) {
    const result = (register - value) & 0xff;
    this.setFlag(FLAG_C, register >= value);
    this.setNz(result);
  }

  adc(value) {
    const carry = this.getFlag(FLAG_C) ? 1 : 0;
    const binary = this.a + value + carry;
    const binaryResult = binary & 0xff;
    this.setFlag(FLAG_V, ((~(this.a ^ value) & (this.a ^ binaryResult)) & 0x80) !== 0);
    if (this.getFlag(FLAG_D)) {
      let low = (this.a & 0x0f) + (value & 0x0f) + carry;
      if (low > 9) low += 6;
      let high = (this.a >> 4) + (value >> 4) + (low > 0x0f ? 1 : 0);
      if (high > 9) high += 6;
      this.setFlag(FLAG_C, high > 0x0f);
      this.a = this.setNz(((high << 4) | (low & 0x0f)) & 0xff);
      return;
    }
    this.setFlag(FLAG_C, binary > 0xff);
    this.a = this.setNz(binaryResult);
  }

  sbc(value) {
    const carry = this.getFlag(FLAG_C) ? 1 : 0;
    const difference = this.a - value - (1 - carry);
    const binaryResult = difference & 0xff;
    this.setFlag(FLAG_V, (((this.a ^ binaryResult) & (this.a ^ value)) & 0x80) !== 0);
    this.setFlag(FLAG_C, difference >= 0);
    if (this.getFlag(FLAG_D)) {
      let low = (this.a & 0x0f) - (value & 0x0f) - (1 - carry);
      let borrow = 0;
      if (low < 0) {
        low -= 6;
        borrow = 1;
      }
      let high = (this.a >> 4) - (value >> 4) - borrow;
      if (high < 0) high -= 6;
      this.a = this.setNz(((high << 4) | (low & 0x0f)) & 0xff);
      return;
    }
    this.a = this.setNz(binaryResult);
  }

  branch(take, offset) {
    if (!take) return 0;
    const before = this.pc;
    this.pc = (this.pc + offset) & 0xffff;
    return 1 + ((before & 0xff00) !== (this.pc & 0xff00) ? 1 : 0);
  }

  step() {
    const pcBefore = this.pc;
    const spBefore = this.sp;
    const opcode = this.fetch();
    const instruction = instructions[opcode];
    if (!instruction) {
      throw new Error(
        `Unsupported NMOS 6502 opcode $${opcode.toString(16).padStart(2, "0")} ` +
        `at $${pcBefore.toString(16).padStart(4, "0")}`,
      );
    }
    const operand = this.resolve(instruction.mode);
    let extraCycles = instruction.pageCross && operand.pageCrossed ? 1 : 0;
    let target;

    const value = () => this.read(operand.address);
    const store = (byte) => this.write(operand.address, byte);
    switch (instruction.operation) {
      case "LDA": this.a = this.setNz(value()); break;
      case "LDX": this.x = this.setNz(value()); break;
      case "LDY": this.y = this.setNz(value()); break;
      case "STA": store(this.a); break;
      case "STX": store(this.x); break;
      case "STY": store(this.y); break;
      case "ORA": this.a = this.setNz(this.a | value()); break;
      case "AND": this.a = this.setNz(this.a & value()); break;
      case "EOR": this.a = this.setNz(this.a ^ value()); break;
      case "ADC": this.adc(value()); break;
      case "SBC": this.sbc(value()); break;
      case "CMP": this.compare(this.a, value()); break;
      case "CPX": this.compare(this.x, value()); break;
      case "CPY": this.compare(this.y, value()); break;
      case "BIT": {
        const byte = value();
        this.setFlag(FLAG_Z, (this.a & byte) === 0);
        this.setFlag(FLAG_N, (byte & 0x80) !== 0);
        this.setFlag(FLAG_V, (byte & 0x40) !== 0);
        break;
      }
      case "INC": { const byte = this.setNz((value() + 1) & 0xff); store(byte); break; }
      case "DEC": { const byte = this.setNz((value() - 1) & 0xff); store(byte); break; }
      case "ASL": {
        const byte = instruction.mode === "acc" ? this.a : value();
        this.setFlag(FLAG_C, (byte & 0x80) !== 0);
        const result = this.setNz((byte << 1) & 0xff);
        if (instruction.mode === "acc") this.a = result;
        else store(result);
        break;
      }
      case "LSR": {
        const byte = instruction.mode === "acc" ? this.a : value();
        this.setFlag(FLAG_C, (byte & 0x01) !== 0);
        const result = this.setNz(byte >> 1);
        if (instruction.mode === "acc") this.a = result;
        else store(result);
        break;
      }
      case "ROR": {
        const carry = this.getFlag(FLAG_C) ? 0x80 : 0;
        this.setFlag(FLAG_C, (this.a & 0x01) !== 0);
        this.a = this.setNz(carry | this.a >> 1);
        break;
      }
      case "BCC": extraCycles += this.branch(!this.getFlag(FLAG_C), operand.offset); break;
      case "BCS": extraCycles += this.branch(this.getFlag(FLAG_C), operand.offset); break;
      case "BEQ": extraCycles += this.branch(this.getFlag(FLAG_Z), operand.offset); break;
      case "BMI": extraCycles += this.branch(this.getFlag(FLAG_N), operand.offset); break;
      case "BNE": extraCycles += this.branch(!this.getFlag(FLAG_Z), operand.offset); break;
      case "BPL": extraCycles += this.branch(!this.getFlag(FLAG_N), operand.offset); break;
      case "BVC": extraCycles += this.branch(!this.getFlag(FLAG_V), operand.offset); break;
      case "BVS": extraCycles += this.branch(this.getFlag(FLAG_V), operand.offset); break;
      case "CLC": this.setFlag(FLAG_C, false); break;
      case "CLD": this.setFlag(FLAG_D, false); break;
      case "CLI": this.setFlag(FLAG_I, false); break;
      case "CLV": this.setFlag(FLAG_V, false); break;
      case "SEC": this.setFlag(FLAG_C, true); break;
      case "SED": this.setFlag(FLAG_D, true); break;
      case "SEI": this.setFlag(FLAG_I, true); break;
      case "INX": this.x = this.setNz((this.x + 1) & 0xff); break;
      case "INY": this.y = this.setNz((this.y + 1) & 0xff); break;
      case "DEX": this.x = this.setNz((this.x - 1) & 0xff); break;
      case "DEY": this.y = this.setNz((this.y - 1) & 0xff); break;
      case "TAX": this.x = this.setNz(this.a); break;
      case "TAY": this.y = this.setNz(this.a); break;
      case "TXA": this.a = this.setNz(this.x); break;
      case "TYA": this.a = this.setNz(this.y); break;
      case "TSX": this.x = this.setNz(this.sp); break;
      case "TXS": this.sp = this.x; break;
      case "PHA": this.push(this.a); break;
      case "PLA": this.a = this.setNz(this.pull()); break;
      case "PHP": this.push(this.p | FLAG_B | FLAG_U); break;
      case "PLP": this.p = (this.pull() & ~FLAG_B) | FLAG_U; break;
      case "JSR": {
        target = operand.address;
        const returnAddress = (this.pc - 1) & 0xffff;
        this.push(returnAddress >> 8);
        this.push(returnAddress & 0xff);
        this.pc = target;
        break;
      }
      case "JMP": target = operand.address; this.pc = target; break;
      case "RTS": {
        const low = this.pull();
        const high = this.pull();
        this.pc = (((high << 8) | low) + 1) & 0xffff;
        break;
      }
      case "RTI": {
        this.p = (this.pull() & ~FLAG_B) | FLAG_U;
        const low = this.pull();
        this.pc = low | (this.pull() << 8);
        break;
      }
      case "NOP": break;
      default: throw new Error(`Unimplemented operation ${instruction.operation}`);
    }

    const usedCycles = instruction.cycles + extraCycles;
    this.cycles += usedCycles;
    return {
      pcBefore,
      spBefore,
      opcode,
      operation: instruction.operation,
      target,
      cycles: usedCycles,
    };
  }
}

export const nmos6502Flags = {
  carry: FLAG_C,
  zero: FLAG_Z,
  interrupt: FLAG_I,
  decimal: FLAG_D,
  overflow: FLAG_V,
  negative: FLAG_N,
};
