// MEASUREMENT ONLY. Not part of the build or the test suite.
// Population budget harness: drives production main-loop frames on the linked
// release bytes in build/ with the JS NMOS-6502 core, and reports the
// pre-fence (frame start -> profile_after_sector) cycle cost of a frame with a
// controlled population: Heavy members, the Light slot and interactive entity
// slots (debris / pickup capsule).
//
// This is the shared module the other measure-population-* / measure-*-cost
// scripts import; it is not run directly. It needs a linked build in build/
// (npm run build:candidate) for the runtime image and the .lbl label files.
//
// The fence the native PAL audit measures is the wait_frame_at_line $77 inside
// publish_fighter_projectile_overlays, which the main loop reaches at
// profile_after_sector, so "pre-fence cycles" here is directly comparable to
// the audit's worst_pre_wait_cycles / worst_fence_margin_cycles.
import fs from "node:fs";
import path from "node:path";
import { Nmos6502 } from "./nmos6502.mjs";
import { installRuntimeSegments } from "./runtime-image.mjs";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");

const labels = new Map();
for (const file of ["build/void-strike-65.lbl", "build/encounter-director.lbl",
  "build/integration-glue.lbl", "build/capital-player-collision.lbl",
  "build/light-kernel.lbl"]) {
  const p = path.join(root, file);
  if (!fs.existsSync(p)) continue;
  for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
    const m = /^al\s+([0-9a-f]+)\s+\.?(\S+)$/i.exec(line.trim());
    if (m && !labels.has(m[2])) labels.set(m[2], Number.parseInt(m[1], 16));
  }
}
export const L = (name) => {
  const a = labels.get(name);
  if (!Number.isInteger(a)) throw new Error(`missing label ${name}`);
  return a;
};

const STICK0 = 0xd300, TRIG0 = 0xd010, CONSOL = 0xd01f, VCOUNT = 0xd40b;

export function machine({ difficulty = 2 } = {}) {
  const memory = new Uint8Array(0x10000);
  installRuntimeSegments(memory, root);
  const io = { stick: 0x0f, trigger: 1, console: 0xff,
    vcountReads: [0, 1, 0x70, 0x71, 0x77, 0x78], index: 0 };
  const cpu = new Nmos6502(memory, {
    read(address) {
      if (address === STICK0) return io.stick;
      if (address === TRIG0) return io.trigger;
      if (address === CONSOL) return io.console;
      if (address === VCOUNT) return io.vcountReads[io.index++ % io.vcountReads.length];
      return undefined;
    },
  });
  memory[L("sound_enabled")] = 1;
  memory[0x4ee3] = 1;                       // game_music_enabled
  memory[L("DIFFICULTY_SETTING")] = difficulty;
  return { cpu, memory, io };
}

// Runs from `from` until the PC hits any address in `stops`, recording
// inclusive JSR..RTS cycles for every watched routine.
export function run(cpu, from, stops, { watch = [], maxSteps = 8_000_000 } = {}) {
  const stopSet = new Set(stops);
  const watchAddresses = new Map(watch.map((n) => [L(n), n]));
  const samples = new Map();
  const frames = [];
  if (from !== undefined) cpu.pc = from;
  const start = cpu.cycles;
  for (let steps = 0; steps < maxSteps; steps += 1) {
    if (stopSet.has(cpu.pc)) {
      return { pc: cpu.pc, cycles: cpu.cycles - start, samples, steps };
    }
    const name = watchAddresses.get(cpu.pc);
    if (name) frames.push({ name, sp: cpu.sp, at: cpu.cycles });
    const result = cpu.step();
    if (result.operation === "RTS") {
      for (let i = frames.length - 1; i >= 0; i -= 1) {
        if (frames[i].sp !== result.spBefore) continue;
        const list = samples.get(frames[i].name) ?? [];
        list.push(cpu.cycles - frames[i].at + 6);
        samples.set(frames[i].name, list);
        frames.splice(i, 1);
      }
    }
  }
  throw new Error(`did not reach a stop address; pc=$${cpu.pc.toString(16)}`);
}

export function boot(options) {
  const m = machine(options);
  const setup = run(m.cpu, L("start_gameplay"), [L("main_loop")], { maxSteps: 30_000_000 });
  if (setup.pc !== L("main_loop")) throw new Error("setup did not reach main_loop");
  return m;
}

export const FRAME_ACTIVE = () => L("main_loop") + 17;   // main_loop_active/frame_active

// One production frame. Returns pre-fence cycles (frame start ->
// profile_after_sector) and the full frame cycles (-> next main_loop).
export function frame(m, watch = []) {
  const pre = run(m.cpu, FRAME_ACTIVE(), [L("profile_after_sector")], { watch });
  const post = run(m.cpu, undefined, [L("main_loop")], { watch: [] });
  return { pre: pre.cycles, full: pre.cycles + post.cycles, samples: pre.samples };
}
