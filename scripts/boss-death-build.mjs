import fs from "node:fs";
import path from "node:path";
import { guardFold } from "./disk-guard.mjs";

export async function buildBossDeath({ root, build, runTool, compileC, imports, labels, regions, lightState }) {
  const base = "/project/build/boss-death";
  const pins = `DEATH_LIGHT_STATE = $${lightState.toString(16)}\n` + ["boss_ring_timer", "boss_ring_restore", "boss_queue_draw", "laser_hostile_shots", "boss_head_region", "boss_shown_pos",
    "boss_band_last_operand", "_boss_n", "boss_mx", "boss_mxe", "boss_mflash_timer", "boss_mflash_off"]
    .map(n => `${n} = $${labels.get(n).toString(16)}`).join("\n") + "\n";
  const palettes = `palettes:\n${regions.map(r => "    .byte " + Array.from({length:8}, (_,i) =>
    r.rowPalette.rows[Math.min(i,r.bandShownRows-1)]).flat().join(",")).join("\n")}\n` +
    `shot_codes:\n    .byte ${regions.map(r=>r.shotCode).join(",")}\n` +
    `hostile_codes:\n    .byte ${regions.map(r=>r.hostileShotCode).join(",")}\n` +
    `field_codes:\n    .byte ${regions.map(r=>(r.field?.code??0)&127).join(",")}\n` +
    `blasts:\n    .byte ${regions.flatMap(r=>r.blasts).join(",")}\n`;
  const c = await compileC("boss-death.c", `${base}-c`);
  const assemble = async (name, extra) => runTool("ca65", {
    [`${base}-${name}.s`]: fs.readFileSync(path.join(root, `src/hybrid/boss-death${name === "engine" ? "" : "-boot"}.s`)),
    "/project/build/boss-imports.inc": Buffer.from(imports),
    "/project/build/boss-death-imports.inc": Buffer.from(pins + extra),
    "/project/build/boss-death-palettes.inc": Buffer.from(palettes),
    "/project/build/gameplay-music-abi.inc": fs.readFileSync(path.join(build,"gameplay-music-abi.inc")),
  }, ["--cpu", "6502", "-g", "-I", "/project/build", "-l", `${base}-${name}.lst`,
    "-o", `${base}-${name}.o`, `${base}-${name}.s`], [`${base}-${name}.o`, `${base}-${name}.lst`]);
  const engine = await assemble("engine", "");
  const linked = await runTool("ld65", {
    [`${base}-engine.o`]: engine.outputs[`${base}-engine.o`],
    [`${base}-c.o`]: c.outputs[`${base}-c.o`],
    [`${base}.cfg`]: fs.readFileSync(path.join(root,"cfg/boss-death.cfg")),
  }, ["-C",`${base}.cfg`,"-o",`${base}.bin`,"-Ln",`${base}.lbl`,"-m",`${base}.map`,
    `${base}-engine.o`,`${base}-c.o`], [`${base}.bin`,`${base}.lbl`,`${base}.map`]);
  const raw = Buffer.from(linked.outputs[`${base}.bin`]);
  if (raw.length > 3584) throw new Error(`boss breakup code ${raw.length} > 3584`);
  const sectors = Math.ceil(raw.length / 128);
  const data = Buffer.alloc(sectors * 128); raw.copy(data);
  const fold = guardFold(data);
  const boot = await assemble("boot", `DEATH_CODE_SECTOR = 724\nDEATH_CODE_SECTORS = ${sectors}\n` +
    `DEATH_CODE_FOLD = $${((fold.hi<<8)|fold.lo).toString(16)}\n`);
  const bootLink = await runTool("ld65", {
    [`${base}-boot.o`]: boot.outputs[`${base}-boot.o`],
    [`${base}-boot.cfg`]: fs.readFileSync(path.join(root,"cfg/boss-death-boot.cfg")),
  }, ["-C",`${base}-boot.cfg`,"-o",`${base}-boot.bin`,"-Ln",`${base}-boot.lbl`,
    `${base}-boot.o`], [`${base}-boot.bin`,`${base}-boot.lbl`]);
  const bootData = Buffer.from(bootLink.outputs[`${base}-boot.bin`]);
  for (const r of [linked, bootLink, engine, boot]) for (const [name, bytes] of Object.entries(r.outputs)) {
    fs.writeFileSync(path.join(build,path.basename(name)), bytes);
  }
  return { rawBytes: raw.length, sectors, data, bootData, bootFold: guardFold(bootData) };
}
