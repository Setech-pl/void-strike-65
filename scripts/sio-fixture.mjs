// Shared host-only POKEY wire fixture. Executes the real resident reader.
import fs from "node:fs";
import crypto from "node:crypto";
import path from "node:path";
import { Nmos6502, nmos6502Flags } from "./nmos6502.mjs";
const reg = {
  AUDF3: 0xd204, AUDC3: 0xd205, AUDF4: 0xd206, AUDC4: 0xd207, AUDCTL: 0xd208,
  SKRES: 0xd20a, SERIN: 0xd20d, SEROUT: 0xd20d, IRQEN: 0xd20e, IRQST: 0xd20e,
  SKCTL: 0xd20f, SKSTAT: 0xd20f, PBCTL: 0xd303, WSYNC: 0xd40a, VCOUNT: 0xd40b,
};

const status = {
  OK: 0, NO_DEVICE: 1, WIRE_EXHAUSTED: 2, DEVICE_ERROR: 3, BAD_IMAGE: 4,
};

const IRQ_SERIN = 0x20;
const IRQ_SEROUT_RDY = 0x10;
const IRQ_XMTDONE = 0x08;

// SKSTAT with no error: bit 7 framing OK, bit 5 serial overrun OK. Bit 6 is
// the KEYBOARD overrun and must never be read as a wire error.
const SKSTAT_CLEAN = 0xff;
const SKSTAT_FRAMING_ERROR = 0xff & ~0x80;
const SKSTAT_SERIAL_OVERRUN = 0xff & ~0x20;
const SKSTAT_KEYBOARD_OVERRUN = 0xff & ~0x40;

export class PokeyStub {
  constructor({ respond, vcountPeriod = 3 } = {}) {
    this.respond = respond;
    this.vcountPeriod = vcountPeriod;   // VCOUNT reads per simulated PAL frame
    this.vcountReads = 0;
    this.vcount = 0;

    this.skctl = 0;
    this.irqen = 0;
    this.latched = 0;                   // bits currently asserted (active-low in IRQST)
    this.commandLine = false;
    this.frameBytes = [];
    this.commandFrames = [];            // every frame the reader put on the wire
    this.skctlDuringTransmit = new Set();
    this.skctlDuringReceive = new Set();
    this.txPending = false;
    this.txOutstanding = 0;
    this.rxQueue = [];
    this.serin = 0;
    this.skstat = SKSTAT_CLEAN;
    this.skresWrites = 0;
    this.wsyncBeforeFirstByte = 0;
    this.wsyncAfterLastByte = 0;
    this.countingPreHold = false;
    this.countingPostHold = false;
  }

  read(address) {
    switch (address) {
      case reg.VCOUNT: {
        this.vcountReads += 1;
        if (this.vcountReads % this.vcountPeriod === 0) {
          this.vcount = 0;              // the wrap past line 312: a frame edge
        } else {
          this.vcount = (this.vcount + 1) & 0x7f;
          if (this.vcount === 0) this.vcount = 1;
        }
        return this.vcount;
      }
      case reg.IRQST: {
        this.advance();
        return 0xff & ~this.latched;    // an asserted bit reads 0
      }
      case reg.SKSTAT:
        return this.skstat;
      default:
        return undefined;
    }
  }

  write(address, value) {
    switch (address) {
      case reg.IRQEN: {
        // Writing a bit low resets that latch; bit 3 is not latched at all.
        const cleared = (~value) & 0xff;
        this.latched &= ~(cleared & (IRQ_SERIN | IRQ_SEROUT_RDY));
        this.irqen = value;
        return false;
      }
      case reg.SKCTL:
        this.skctl = value;
        if (value === 0x00) {           // full serial reset
          this.latched = 0;
          this.txPending = false;
          this.txOutstanding = 0;
          this.rxQueue = [];
        }
        return false;
      case reg.SKRES:
        this.skresWrites += 1;
        this.skstat = SKSTAT_CLEAN;
        return false;
      case reg.SEROUT:
        if (this.commandLine) {
          if (this.frameBytes.length === 0) this.countingPreHold = false;
          this.frameBytes.push(value);
          this.skctlDuringTransmit.add(this.skctl);
        }
        this.txPending = true;
        this.txOutstanding += 1;
        this.latched &= ~IRQ_XMTDONE;
        return false;
      case reg.PBCTL:
        if (value === 0x34) {
          this.commandLine = true;
          this.frameBytes = [];
          this.countingPreHold = true;
          this.wsyncBeforeFirstByte = 0;
        } else if (value === 0x3c && this.commandLine) {
          this.commandLine = false;
          this.countingPostHold = false;
          if (this.frameBytes.length === 5) {
            this.commandFrames.push([...this.frameBytes]);
            this.rxQueue = this.respond([...this.frameBytes], this.commandFrames.length);
          }
        }
        return false;
      case reg.WSYNC:
        if (this.countingPreHold) this.wsyncBeforeFirstByte += 1;
        if (this.countingPostHold) this.wsyncAfterLastByte += 1;
        return false;
      default:
        return undefined;        // not a register: let the store reach RAM
    }
  }

  advance() {
    if (!this.commandLine && this.skctl !== 0x00) this.skctlDuringReceive.add(this.skctl);
    // Transmission: the queued byte moves into the shift register, freeing
    // SEROUT (bit 4). When nothing is outstanding the register is idle (bit 3).
    if (this.txPending) {
      this.latched |= IRQ_SEROUT_RDY;
      this.txPending = false;
      this.txOutstanding -= 1;
      if (this.txOutstanding <= 0) {
        this.txOutstanding = 0;
        this.latched |= IRQ_XMTDONE;
        if (this.frameBytes.length === 5) {
          this.countingPostHold = true;
          this.wsyncAfterLastByte = 0;
        }
      }
      return;
    }
    if (this.txOutstanding === 0) this.latched |= IRQ_XMTDONE;
    // Reception: only while the input latch is armed and not already asserted.
    if (this.rxQueue.length > 0 && (this.irqen & IRQ_SERIN) !== 0 &&
      (this.latched & IRQ_SERIN) === 0) {
      const next = this.rxQueue.shift();
      this.serin = next.byte & 0xff;
      this.skstat = next.skstat ?? SKSTAT_CLEAN;
      this.latched |= IRQ_SERIN;
    }
  }
}


export function loadCheckedL2(memory, root, build, manifest) {
  if (!manifest.l2) return;
  const labelText=fs.readFileSync(path.join(build,"sector-reader.lbl"),"utf8");
  const labels=new Map([...labelText.matchAll(/^al ([0-9a-f]+) \.([^\s]+)/gmi)].map(m=>[m[2],parseInt(m[1],16)]));
  const artifactDirectory=path.resolve(build)===path.join(root,"build")?path.join(root,"dist"):build;
  const atr=fs.readFileSync(path.join(artifactDirectory,"void-strike-65.atr"));
  if(crypto.createHash("sha256").update(atr).digest("hex")!==manifest.artifacts["void-strike-65.atr"].sha256)
    throw Error("checked L2 fixture ATR does not match its manifest");
  return loadCheckedL2Image(memory,atr,labels);
}

export function loadCheckedL2Image(memory, atr, labels) {
  const stub=new PokeyStub({respond:frame=>{
    const sector=frame[2]|frame[3]<<8;
    const data=atr.subarray(16+(sector-1)*128,16+sector*128);
    let sum=0;for(const b of data){sum+=b;if(sum>255)sum=(sum&255)+1;}
    return [{byte:65},{byte:67},...Array.from(data,byte=>({byte})),{byte:sum}];
  }});
  const cpu=new Nmos6502(memory,{
    read:address=>{if(address===reg.SERIN){stub.advance();return stub.serin;}return stub.read(address);},
    write:(address,value)=>stub.write(address,value),
  });
  const call=address=>{
    const stop=0x7fff;cpu.push((stop-1)>>8);cpu.push((stop-1)&255);cpu.pc=address;
    for(let steps=0;cpu.pc!==stop;steps++){
      if(steps>=8000000)throw Error("checked L2 fixture did not return");cpu.step();
    }
  };
  cpu.x=11;call(0xa006);
  if(cpu.p&nmos6502Flags.carry)throw Error("checked L2 fixture rejected disk run");
  call(0x1900);
}
