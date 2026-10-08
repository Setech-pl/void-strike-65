// Resident constant data — an inventory from the ca65 listings, the link maps
// and the built runtime image.
//
// For every always-resident link (main, encounter-director, light-kernel,
// sector-reader, integration-glue, capital-player-collision) and the
// session-resident level-summary module, the script walks the listing
// (`build/*.lst`), keeps every line that emits bytes, classifies it as CODE (a
// mnemonic), DATA (`.byte`, `.word`, `.addr`, `.dbyt`, `.asciiz`, `.incbin`,
// an EMIT_* macro) or RES (`.res`, reserved RAM), and sizes each emission by
// the offset difference to the next emission of the same segment (the listing
// shows at most twelve of a line's bytes, so the byte column cannot be
// summed). Data emissions under one label are merged into runs. Addresses are
// the segment's start from the link map plus the object's offset in it plus
// the listing offset. The run's bytes are read from the runtime image that
// `scripts/runtime-image.mjs` installs, so duplicates are found by content.
//
//   node scripts/measure-resident-data.mjs                # markdown + totals
//   node scripts/measure-resident-data.mjs --min=16       # detail threshold
//   node scripts/measure-resident-data.mjs --json=out.json
//
// Reads only; MEASURED from the build; touches no build output. The phases
// that read a table and whether its record is packed are not in the listing:
// the plan that uses this inventory adds them by hand.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { installRuntimeSegments } from "./runtime-image.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const arg = (name, fallback = null) => {
  const found = process.argv.find((v) => v.startsWith(`--${name}=`));
  return found === undefined ? fallback : found.slice(name.length + 3);
};
const MIN = Number.parseInt(arg("min", "16"), 10);

const LINKS = [
  { name: "main", map: "void-strike-65.map", lsts: ["main.lst"], sources: ["src/main.s", "src/boot-splash.s"] },
  { name: "encounter-director", map: "encounter-director.map",
    lsts: ["encounter-director-abi.lst", "encounter-director.lst", "encounter-director-lifecycle.lst"],
    objects: { "encounter-director.lst": "encounter-director-c.o" },
    sources: ["src/hybrid/c-asm-abi.s", "src/c/director.c", "src/c/lifecycle.c"] },
  { name: "light-kernel", map: "light-kernel.map", lsts: ["light-kernel.lst"],
    sources: ["src/hybrid/light-kernel.s", "src/hybrid/disk-guard.s"] },
  { name: "sector-reader", map: "sector-reader.map", lsts: ["sector-reader.lst"],
    sources: ["src/hybrid/sector-reader.s"] },
  { name: "integration-glue", map: "integration-glue.map", lsts: ["integration-glue.lst"],
    sources: ["src/integration-glue.s"] },
  { name: "capital-player-collision", map: "capital-player-collision.map",
    lsts: ["capital-player-collision.lst"], sources: ["src/capital-player-collision.s"] },
  { name: "level-summary", map: "level-summary.map", lsts: ["level-summary.lst"],
    sources: ["src/hybrid/level-summary.s"] },
];

function parseMap(file) {
  const text = fs.readFileSync(file, "utf8");
  const segments = new Map();
  for (const line of (text.split("Segment list:")[1]?.split("Exports list")[0] ?? "").split("\n")) {
    const m = line.match(/^([A-Z_0-9]+)\s+([0-9A-F]{6})\s+([0-9A-F]{6})\s+([0-9A-F]{6})/);
    if (m) segments.set(m[1], { start: parseInt(m[2], 16), size: parseInt(m[4], 16) });
  }
  // Per-object segment offsets and sizes: a segment two objects share places
  // the second object's bytes after the first's.
  const modules = new Map();
  let object = null;
  for (const line of (text.split("Modules list:")[1]?.split("Segment list:")[0] ?? "").split("\n")) {
    const o = line.match(/^([a-z0-9-]+\.o):/);
    if (o) { object = o[1]; continue; }
    const m = line.match(/^\s+([A-Z_0-9]+)\s+Offs=([0-9A-F]{6})\s+Size=([0-9A-F]{6})/);
    if (m && object) modules.set(`${object}/${m[1]}`, { offset: parseInt(m[2], 16), size: parseInt(m[3], 16) });
  }
  return { segments, modules };
}

const DATA_RE = /^(?:[A-Za-z_][A-Za-z0-9_]*:\s*)?(\.(?:byte|byt|word|addr|dbyt|dword|asciiz|incbin)\b|EMIT_[A-Z0-9_]+)/;
const RES_RE = /^(?:[A-Za-z_][A-Za-z0-9_]*:\s*)?\.res\b/;
const LABEL_RE = /^([A-Za-z_][A-Za-z0-9_]*):/;
const SEG_RE = /^\.segment\s+"([A-Z_0-9]+)"/;
const SHORT_SEG = { ".code": "CODE", ".rodata": "RODATA", ".bss": "BSS", ".data": "DATA" };

function parseListing(file, link, segments, modules, object, labelLines) {
  const text = fs.readFileSync(file, "utf8");
  const emissions = []; // { segment, offset, kind, label }
  let segment = "CODE";
  let label = "(none)";
  let lastKind = null;
  let inMacro = false;
  for (const raw of text.split("\n")) {
    const m = raw.match(/^([0-9A-F]{6})r\s+(\d+)\s\s(.{0,12})\s*(.*)$/);
    if (!m) continue;
    const [, offsetHex, , byteField, source] = m;
    const offset = parseInt(offsetHex, 16);
    const src = source.trim();
    if (src.startsWith(";")) continue;
    if (/^\.macro\b/.test(src)) { inMacro = true; continue; }
    if (/^\.endmacro\b/.test(src)) { inMacro = false; continue; }
    if (inMacro) continue;                       // a definition emits nothing
    const segMatch = src.match(SEG_RE);
    if (segMatch) { segment = segMatch[1]; lastKind = null; continue; }
    if (SHORT_SEG[src]) { segment = SHORT_SEG[src]; lastKind = null; continue; }
    const labelMatch = src.match(LABEL_RE);
    if (labelMatch) label = labelMatch[1];
    const bytes = byteField.trim().split(/\s+/).filter(Boolean);
    if (bytes.length === 0) {
      if (src && !(DATA_RE.test(src))) lastKind = null;
      continue;
    }
    let kind;
    if (src === "") kind = lastKind;             // a continuation line
    else if (bytes[0] === "xx" || RES_RE.test(src)) kind = "res";
    else if (DATA_RE.test(src)) kind = "data";
    else if (src.startsWith(".")) kind = lastKind ?? "data";
    else kind = "code";
    if (kind === null) kind = bytes[0] === "xx" ? "res" : "data";
    lastKind = kind;
    if (!segments.has(segment)) continue;
    const last = emissions.at(-1);
    if (last && last.segment === segment && last.offset === offset) continue; // the same line, listed twice
    emissions.push({ segment, offset, kind, label, line: labelLines.get(label) ?? null });
  }
  // Size every emission by the next offset of its segment; the last one runs
  // to the object's end in that segment.
  const bySegment = new Map();
  for (const e of emissions) (bySegment.get(e.segment) ?? bySegment.set(e.segment, []).get(e.segment)).push(e);
  const sized = [];
  for (const [seg, list] of bySegment) {
    list.sort((a, b) => a.offset - b.offset);
    const mod = modules.get(`${object}/${seg}`) ?? { offset: 0, size: segments.get(seg).size };
    for (let i = 0; i < list.length; i += 1) {
      const next = i + 1 < list.length ? list[i + 1].offset : mod.size;
      const bytes = Math.max(0, next - list[i].offset);
      sized.push({ ...list[i], bytes, address: segments.get(seg).start + mod.offset + list[i].offset, link: link.name });
    }
  }
  return sized;
}

function labelLinesOf(sources) {
  const map = new Map();
  for (const rel of sources) {
    const file = path.join(root, rel);
    if (!fs.existsSync(file)) continue;
    fs.readFileSync(file, "utf8").split("\n").forEach((line, index) => {
      const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*):/);
      if (m && !map.has(m[1])) map.set(m[1], `${rel}:${index + 1}`);
      const c = line.match(/^(?:static\s+)?const\s+[A-Za-z_0-9 ]+\s+([A-Za-z_][A-Za-z0-9_]*)\s*[\[=]/);
      if (c && !map.has(`_${c[1]}`)) map.set(`_${c[1]}`, `${rel}:${index + 1}`);
    });
  }
  return map;
}

const memory = new Uint8Array(0x10000);
installRuntimeSegments(memory, root, path.join(root, "build"));

const emissions = [];
for (const link of LINKS) {
  const { segments, modules } = parseMap(path.join(root, "build", link.map));
  const labelLines = labelLinesOf(link.sources);
  for (const lst of link.lsts) {
    const object = link.objects?.[lst] ?? lst.replace(/\.lst$/, ".o");
    emissions.push(...parseListing(path.join(root, "build", lst), link, segments, modules, object, labelLines));
  }
}
emissions.sort((a, b) => a.address - b.address);

// Totals per link / segment.
const totals = new Map();
for (const e of emissions) {
  const key = `${e.link}/${e.segment}`;
  const t = totals.get(key) ?? { link: e.link, segment: e.segment, code: 0, data: 0, res: 0 };
  t[e.kind] += e.bytes; totals.set(key, t);
}
// Data runs: consecutive data emissions under one label.
const runs = [];
for (const e of emissions) {
  if (e.kind !== "data" || e.bytes === 0) continue;
  const last = runs.at(-1);
  if (last && last.link === e.link && last.segment === e.segment && last.label === e.label &&
      last.address + last.bytes === e.address) { last.bytes += e.bytes; continue; }
  runs.push({ link: e.link, segment: e.segment, label: e.label, address: e.address, bytes: e.bytes, line: e.line });
}
for (const r of runs) {
  r.hex = Buffer.from(memory.subarray(r.address, r.address + r.bytes)).toString("hex");
  r.imageAllZero = /^0*$/.test(r.hex);
}

const byHex = new Map();
for (const r of runs) {
  if (r.bytes < 8 || r.imageAllZero) continue;
  (byHex.get(r.hex) ?? byHex.set(r.hex, []).get(r.hex)).push(r);
}
const duplicates = [...byHex.values()].filter((l) => l.length > 1);
const contained = [];
for (const a of runs) {
  if (a.bytes < 16 || a.imageAllZero) continue;
  for (const b of runs) {
    if (a === b || b.bytes <= a.bytes || b.imageAllZero) continue;
    if (b.hex.includes(a.hex)) contained.push({ inner: a, outer: b });
  }
}

const hex4 = (n) => `$${n.toString(16).toUpperCase().padStart(4, "0")}`;
const json = arg("json");
if (json) {
  fs.writeFileSync(json, JSON.stringify({
    totals: [...totals.values()],
    runs: runs.map(({ hex, ...r }) => r),
    duplicates: duplicates.map((l) => l.map((r) => ({ label: r.label, address: r.address, bytes: r.bytes, link: r.link, segment: r.segment }))),
    contained: contained.map((c) => ({ inner: c.inner.label, innerBytes: c.inner.bytes, outer: c.outer.label, outerBytes: c.outer.bytes })),
  }, null, 2));
}

console.log("## Segment totals (bytes by emission; code = mnemonics, data = tables, res = reserved RAM)\n");
console.log("| Link | Segment | code | data | res |");
console.log("| --- | --- | ---: | ---: | ---: |");
for (const t of totals.values()) console.log(`| ${t.link} | ${t.segment} | ${t.code} | ${t.data} | ${t.res} |`);
console.log(`\n## Data runs of at least ${MIN} B\n`);
console.log("| Address | Link / segment | Symbol | Bytes | Source |");
console.log("| --- | --- | --- | ---: | --- |");
const small = new Map();
for (const r of runs) {
  if (r.bytes >= MIN) console.log(`| ${hex4(r.address)} | ${r.link} / ${r.segment} | \`${r.label}\` | ${r.bytes} | ${r.line ?? ""}${r.imageAllZero ? " (image zero)" : ""} |`);
  else { const e = small.get(`${r.link}/${r.segment}`) ?? { n: 0, bytes: 0 }; e.n += 1; e.bytes += r.bytes; small.set(`${r.link}/${r.segment}`, e); }
}
console.log(`\n## Data runs under ${MIN} B, aggregated\n`);
for (const [k, e] of small) console.log(`- ${k}: ${e.n} runs, ${e.bytes} B`);
console.log("\n## Identical runs (same bytes in the runtime image, at least 8 B)\n");
for (const l of duplicates) console.log(`- ${l.map((r) => `\`${r.label}\` ${hex4(r.address)} (${r.link}/${r.segment})`).join(" = ")} — ${l[0].bytes} B`);
console.log("\n## Runs of at least 16 B contained in a larger run\n");
for (const c of contained) console.log(`- \`${c.inner.label}\` ${hex4(c.inner.address)} (${c.inner.bytes} B) inside \`${c.outer.label}\` ${hex4(c.outer.address)} (${c.outer.bytes} B)`);
