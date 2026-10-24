// L1 audit: use assembler instruction records, not a linear scan through data.
// node scripts/measure-l1-page-cross.mjs <clean-main-root> <L1-root>
// Output includes every routine with changed addresses in either main's link
// or the Light link, plus every routine whose branch-cross count changed.
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
const [baseRoot, currentRoot] = process.argv.slice(2).map((p) => path.resolve(p));
const branch = new Set([0x10, 0x30, 0x50, 0x70, 0x90, 0xb0, 0xd0, 0xf0]);
async function inspect(root) {
  const { installRuntimeSegments } = await import(pathToFileURL(path.join(root, "scripts/runtime-image.mjs")));
  const memory = new Uint8Array(65536);
  installRuntimeSegments(memory, root);
  const manifest = JSON.parse(fs.readFileSync(path.join(root, "build/manifest.json")));
  const bootMemory = new Uint8Array(65536);
  bootMemory.set(fs.readFileSync(path.join(root, "dist/void-strike-65-boot.bin"))
    .subarray(0, manifest.transportCapacity.initialBootBytes), manifest.loadAddress);
  const routines = {};
  for (const unit of ["main", "light-kernel"]) {
    const mapName = unit === "main" ? "void-strike-65" : unit;
    const map = fs.readFileSync(path.join(root, `build/${mapName}.map`), "utf8");
    const starts = new Map([...map.split("Segment list:")[1].split("Exports list")[0]
      .matchAll(/^(\w+)\s+([0-9A-F]{6})\s+[0-9A-F]{6}\s+[0-9A-F]{6}/gm)]
      .map((m) => [m[1], parseInt(m[2], 16)]));
    let segment = null;
    const owners = new Map();
    for (const line of fs.readFileSync(path.join(root, `build/${unit}.lst`), "utf8").split(/\r?\n/)) {
      const prefix = /^([0-9A-F]{6})r?\s+\d+ /.exec(line);
      if (!prefix) continue;
      let source = line.slice(24).split(";")[0].trim();
      const seg = /^\.segment "([^"]+)"/.exec(source);
      if (seg) { segment = seg[1]; continue; }
      if (!starts.has(segment)) continue;
      const label = /^(\w+):/.exec(source);
      if (label) { owners.set(segment, label[1]); source = source.slice(label[0].length).trim(); }
      const name = owners.get(segment);
      if (!name || !/^[a-z]{3}(\s|$)/i.test(source) || !/\S/.test(line.slice(11, 23))) continue;
      const pc = starts.get(segment) + parseInt(prefix[1], 16);
      const key = `${segment}:${name}`;
      const row = routines[key] ??= { segment, name, address: pc, instructions: 0, branches: 0, crossings: [] };
      row.instructions++;
      // Fetch the opcode/operand from the linked image (listing may say rr).
      const image = segment === "BOOT_STAGE2" ? bootMemory : memory;
      if (branch.has(image[pc])) {
        row.branches++;
        const displacement = image[pc + 1];
        const target = pc + 2 + (displacement < 128 ? displacement : displacement - 256);
        if (((pc + 2) & 0xff00) !== (target & 0xff00)) row.crossings.push({ pc, target });
      }
    }
  }
  return routines;
}
const [base, current] = await Promise.all([inspect(baseRoot), inspect(currentRoot)]);
const rows = Object.keys(current).filter((key) => base[key] &&
  (base[key].address !== current[key].address || base[key].crossings.length !== current[key].crossings.length))
  .map((key) => ({ key, base: base[key], current: current[key] }));
console.log(JSON.stringify({ baseRoot, currentRoot, method: "ca65 instruction records + linked operands; branch taken-page penalty", rows }, null, 2));
