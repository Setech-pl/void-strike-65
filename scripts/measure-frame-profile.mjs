// MEASUREMENT ONLY (uncommitted). Call-tree profile of one or more native trace
// rows logged by scripts/measure-frame-profile.h (DFPROF_OUTPUT).
// usage: node scripts/measure-frame-profile.mjs <prof.csv> <row> [depth] [labelsDir]
import fs from "node:fs";
import path from "node:path";
const [file, rowArg, depthArg = "3", labelDir = "build"] = process.argv.slice(2);
const row = Number(rowArg);
const maxDepth = Number(depthArg);
const labels = new Map();
for (const name of ["void-strike-65.lbl", "integration-glue.lbl", "encounter-director.lbl",
  "capital-player-collision.lbl"]) {
  const p = path.join(labelDir, name);
  if (!fs.existsSync(p)) continue;
  for (const line of fs.readFileSync(p, "utf8").split("\n")) {
    const m = /^al ([0-9A-Fa-f]+) \.(\S+)/.exec(line);
    if (!m) continue;
    const a = parseInt(m[1], 16);
    const score = (n) => (n.startsWith("profile_") ? 0 : n.startsWith("__") ? 1 : /[a-z]/.test(n) ? 3 : 2);
    if (!labels.has(a) || score(m[2]) > score(labels.get(a))) labels.set(a, m[2]);
  }
}
const sorted = [...labels.entries()].filter(([a]) => a >= 0x400).sort((x, y) => x[0] - y[0]);
const nearest = (pc) => {
  let lo = 0, hi = sorted.length - 1, best = null;
  while (lo <= hi) { const mid = (lo + hi) >> 1; if (sorted[mid][0] <= pc) { best = sorted[mid]; lo = mid + 1; } else hi = mid - 1; }
  return best ? (best[0] === pc ? best[1] : `${best[1]}+${pc - best[0]}`) : `$${pc.toString(16)}`;
};
const exact = (pc) => labels.get(pc) ?? nearest(pc);
const ins = fs.readFileSync(file, "utf8").trim().split("\n").map((l) => l.split(",").map(Number))
  .filter((c) => c[0] === row || c[0] === row + 1);
let rowIns = ins.filter((c) => c[0] === row);
let next = ins.find((c) => c[0] === row + 1);
const waitAddressEarly = parseInt(/al ([0-9A-F]+) \.wait_frame_at_line\n/i.exec(fs.readFileSync(path.join(labelDir, "void-strike-65.lbl"), "utf8"))[1], 16);
const fullRowIns = rowIns;
if (process.env.PREWAIT) {
  const cut = rowIns.findIndex((c, i) => c[2] === waitAddressEarly && i > 0 && rowIns[i - 1][3] === 0x20);
  if (cut > 0) { next = rowIns[cut]; rowIns = rowIns.slice(0, cut); }
}
const root = { name: `row ${row}`, cycles: 0, self: 0, calls: 1, children: new Map() };
const stack = [{ node: root, s: 0x100 }];
const flat = new Map();
for (let i = 0; i < rowIns.length; i++) {
  const [, , pc, op, s, clock, ypos] = rowIns[i];
  const after = rowIns[i + 1] ?? next;
  const cost = after ? after[5] - clock : 0;
  for (const f of stack) f.node.cycles += cost;
  stack.at(-1).node.self += cost;
  const fn = nearest(pc).replace(/\+\d+$/, "");
  flat.set(fn, (flat.get(fn) ?? 0) + cost);
  if (!after) break;
  const sAfter = after[4];
  const delta = (sAfter - s + 256) % 256;
  const push = (name) => {
    const parent = stack.at(-1).node;
    let child = parent.children.get(name);
    if (!child) { child = { name, cycles: 0, self: 0, calls: 0, children: new Map() }; parent.children.set(name, child); }
    child.calls += 1;
    stack.push({ node: child, s: sAfter });
  };
  if (op === 0x20 && delta === 254) push(exact(after[2]));
  else if (delta === 253 && op !== 0x20) push(`<interrupt ${exact(after[2])} @y${after[6]}>`);
  else if ((op === 0x60 || op === 0x40) && stack.length > 1) {
    while (stack.length > 1 && stack.at(-1).s <= s) stack.pop();
  }
}
const print = (node, depth, indent) => {
  console.log(`${indent}${String(node.cycles).padStart(6)}  self ${String(node.self).padStart(5)}  x${node.calls}  ${node.name}`);
  if (depth >= maxDepth) return;
  for (const child of [...node.children.values()].sort((a, b) => b.cycles - a.cycles))
    print(child, depth + 1, indent + "  ");
};
const first = rowIns[0];
console.log(`row ${row}: host ${first[1]} start y${first[6]} x${first[7]}; ${rowIns.length} instructions; ` +
  `row start->next row start ${next ? next[5] - first[5] : "?"} cycles`);
print(root, 0, "");
if (process.env.FLAT) {
  console.log("--- flat self by routine ---");
  for (const [n, c] of [...flat.entries()].sort((a, b) => b[1] - a[1]).slice(0, Number(process.env.FLAT))) console.log(String(c).padStart(6), n);
}
{
  const waitAddress = Number(process.env.WAIT_ADDRESS ?? parseInt(/al ([0-9A-F]+) \.wait_frame_at_line\n/i.exec(fs.readFileSync(path.join(labelDir, "void-strike-65.lbl"), "utf8"))[1], 16));
  const entries = fullRowIns.filter((c, i) => c[2] === waitAddress && i > 0 && fullRowIns[i - 1][3] === 0x20);
  const e = entries.at(-1);
  if (e) {
    const preWait = e[5] - first[5];
    const lineMargin = (240 - e[6]) * 114 - e[7];
    console.log(`wait_frame_at_line entry: +${preWait} cycles from row start, scanline ${e[6]} x${e[7]}; ` +
      `cycles to scanline 240 (VCOUNT $78, miss) ${lineMargin}`);
  }
}
