// MEASUREMENT ONLY (uncommitted). Splits update_fighter_projectiles into the
// player-slot section and the hostile-slot section (@interceptor_slot..rts),
// inclusive of callees, for one profiled trace row.
// usage: node scripts/measure-hostile-slot-split.mjs <prof.csv> <row> [labelsDir]
import fs from "node:fs";
import path from "node:path";
const [file, rowArg, labelDir = "build"] = process.argv.slice(2);
const row = Number(rowArg);
const lbl = fs.readFileSync(path.join(labelDir, "void-strike-65.lbl"), "utf8").split("\n")
  .map((l) => /^al ([0-9A-Fa-f]+) \.(\S+)/.exec(l)).filter(Boolean)
  .map((m) => [parseInt(m[1], 16), m[2]]);
const start = lbl.find(([, n]) => n === "update_fighter_projectiles")[0];
const hostile = lbl.filter(([a, n]) => n === "@interceptor_slot" && a > start).sort((x, y) => x[0] - y[0])[0][0];
const ins = fs.readFileSync(file, "utf8").trim().split("\n").map((l) => l.split(",").map(Number))
  .filter((c) => c[0] === row || c[0] === row + 1);
let mode = null; let entryS = 0; const sums = { player: 0, hostile: 0 };
for (let i = 0; i + 1 < ins.length && ins[i][0] === row; i++) {
  const [, , pc, op, s, clock] = ins[i];
  const cost = ins[i + 1][5] - clock;
  if (mode === null && pc === start && i > 0 && ins[i - 1][3] === 0x20) { mode = "player"; entryS = s; }
  if (mode === "player" && pc === hostile && s === entryS) mode = "hostile";
  if (mode) sums[mode] += cost;
  if (mode && op === 0x60 && s === entryS) { console.log(JSON.stringify({ row, ...sums })); mode = null; }
}
