// feat/boss-art (docs/plans/boss-art.md §3.3): the colour rules of the row
// palettes, per region and shown row -
//   flash  the b3 hit flash swaps COLPF2 and COLPF3 on the hit module: in each
//          row the two must differ clearly - RGB distance >= 80 in Atari800's
//          PAL palette (today's weakest pair, region 3's $28 / $04, is 111);
//   ally   no chromatic colour within 45 degrees of the hue of the ally steel
//          of the region's levels ($88 levels 1-6, $84 levels 7-12), on the
//          hue wheel the region tests use (scripts/preview.mjs).
//
//   node scripts/boss-art-rules.mjs [--json]
import path from "node:path";
import { fileURLToPath } from "node:url";

import { bossRegionDirectory, compileBossRegion, loadBossRegionDraft } from "./boss-assets.mjs";
import { atari800PalDistance } from "./atari800-pal-palette.mjs";
import { atariPalRegisterToRgb } from "./preview.mjs";

const rootDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const FLASH_MIN_DISTANCE = 80;
export const ALLY_MIN_DEGREES = 45;

export function hueDegrees(value) {
  const [r, g, b] = atariPalRegisterToRgb(value).map((c) => c / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  if (d < 0.1) return null;
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return (h * 60 + 360) % 360;
}

export function regionRules(regionNumber, region) {
  const ally = hueDegrees(regionNumber <= 2 ? 0x88 : 0x84);
  const rows = (region.rowPalette.proposed ?? region.rowPalette.rows).map((colours, row) => {
    const flash = Math.round(atari800PalDistance(colours[2], colours[3]));
    const allyDegrees = colours.map((value) => {
      const h = hueDegrees(value);
      return h === null ? null : Math.round(Math.min(Math.abs(h - ally), 360 - Math.abs(h - ally)));
    });
    const worstAlly = Math.min(...allyDegrees.filter((d) => d !== null));
    return { row, colours: colours.map((v) => `$${v.toString(16).padStart(2, "0")}`), flash, worstAlly,
      ok: flash >= FLASH_MIN_DISTANCE && worstAlly >= ALLY_MIN_DEGREES };
  });
  return { region: regionNumber, name: region.name, rows, ok: rows.every((r) => r.ok) };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const results = [1, 2, 3, 4].map((n) => regionRules(n,
    compileBossRegion(loadBossRegionDraft(bossRegionDirectory(rootDirectory, n)))));
  if (process.argv.includes("--json")) console.log(JSON.stringify(results, null, 2));
  else {
    for (const r of results) {
      console.log(`R${r.region} ${r.name}: ${r.ok ? "ok" : "FAILS"}`);
      for (const row of r.rows) console.log(`  row ${row.row}: ${row.colours.join(" ")}  flash ${row.flash}  ally ${row.worstAlly} deg${row.ok ? "" : "  <-"}`);
    }
  }
  if (!results.every((r) => r.ok)) process.exitCode = 1;
}
