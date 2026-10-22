// Phase A only. Offline character/PMG storyboard; never imported by the build.
// Rebuild: node scripts/boss-death-breakup.mjs [--regions=1,2,3,4]
// Region numbers follow order.json (R2 Citadel is drawn in region-4/).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { BOSS_TABLE, bossRegionDirectory, compileBossRegion, loadBossRegionDraft } from "./boss-assets.mjs";
import { looks } from "./boss-art-preview.mjs";
import { atari800PalRgb } from "./atari800-pal-palette.mjs";
import { encodePng } from "./preview.mjs";
import { encodeGif } from "./showcase-gif.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "build/play/boss-death-breakup");
const WIDTH = 320, HEIGHT = 240, TOP = 16, DEFEAT = 20;
export const VARIANTS = Object.freeze([
  { id: "a-clean-split", label: "A / clean two-way split", launch: 30, frames: 82,
    capRows: 0, particles: 0, diskBytes: [896, 1152], cycles: 12000 },
  { id: "b-crown-launch", label: "B / crown + two wings", launch: 32, frames: 94,
    capRows: 2, particles: 4, diskBytes: [1280, 1536], cycles: 14000 },
  { id: "c-staggered-tear", label: "C / central cap + delayed right wing", launch: 36, frames: 110,
    capRows: 3, particles: 6, diskBytes: [1536, 1792], cycles: 21000 },
]);

function rectangle(out, x, y, w, h, colour) {
  for (let yy = Math.max(0, y); yy < Math.min(HEIGHT, y + h); yy++) {
    for (let xx = Math.max(0, x); xx < Math.min(WIDTH, x + w); xx++) out[yy * WIDTH + xx] = colour;
  }
}

function sourceState(region, last) {
  // Reachable spent fixture: all destructible modules gone except the final
  // weapon, which is broken in the 0.4 s pre-roll. Never rebuild intact guns
  // after defeat. Nozzles are dark; no combat shots, lasers or escort.
  const rows = looks(region).allGone.map(row => [...row]);
  const broken = looks(region).broken;
  for (let y = last.row; y < last.row + last.height; y++) {
    for (let x = last.x; x < last.x + last.width; x++) rows[y][x] = broken[y][x];
  }
  return rows;
}

function lastWeapon(region, variant) {
  const weapons = region.modules.filter(m => m.kind !== "armour" && m.kind !== "core");
  const target = variant.id.startsWith("c") ? 39 : 32;
  return weapons.reduce((best, m) =>
    Math.abs(m.x + m.width / 2 - target) < Math.abs(best.x + best.width / 2 - target) ? m : best);
}

function geometry(region, variant, frame) {
  const last = lastWeapon(region, variant);
  const split = variant.id.startsWith("a") ? 32 : Math.round(last.x + last.width / 2);
  const t = Math.max(0, frame - variant.launch + 1);
  const c = variant.id.startsWith("c");
  return { last, split, t,
    left: t,
    right: c ? Math.max(0, t - 4) : t,
    up: variant.capRows === 0 ? 0 : Math.floor(Math.max(0, t - (c ? 8 : 0)) / (c ? 4 : 3)),
    // Shake is a common HSCROL offset (colour clocks), never independent
    // scrolling for the left and right fragment on the same scanline.
    shake: frame >= DEFEAT && frame < variant.launch + 6 ? [4, -4, 0, 0][frame % 4] : 0,
  };
}

function renderFrame(region, variant, frame) {
  const out = new Uint8Array(WIDTH * HEIGHT);
  // Quiet schematic context, explicitly not a captured game screen. Fixed
  // points and the lower guide remain still so HSCROL shake reads correctly.
  for (let i = 0; i < 28; i++) {
    const x = (i * 73 + 19) % WIDTH, y = 86 + (i * 37) % 132;
    rectangle(out, x & ~1, y, 2, 1, i % 4 === 0 ? 0x06 : 0x02);
  }
  rectangle(out, 0, 232, WIDTH, 1, 0x04);
  const g = geometry(region, variant, frame);
  const started = frame >= variant.launch;
  const isC = variant.id.startsWith("c");
  const rows = frame < DEFEAT ? sourceState(region, g.last) : looks(region).allGone;
  const flash = frame === DEFEAT || frame === DEFEAT + 1 ||
    (variant.particles > 0 && frame === variant.launch - 1);
  const position = region.tables[BOSS_TABLE.start];
  const firstPixel = 32 + position * 2; // HPOS origin 32, viewport HPOS 48
  const centre = 32;
  for (let r = 0; r < region.bandShownRows; r++) {
    for (let col = 0; col < 64; col++) {
      const isCap = variant.capRows > 0 && r < variant.capRows &&
        (!isC || (col >= centre - 6 && col < centre + 6));
      const dx = !started || isCap ? 0 : (col < g.split ? -g.left * 8 : g.right * 8);
      const dy = started && isCap ? -g.up * 8 : 0;
      let code = rows[r][col];
      // The fixture's generators are destroyed, so their field has already
      // collapsed, including during the final weapon's pre-roll.
      if (region.field && r === region.field.row && code === region.field.code) continue;
      if (frame >= DEFEAT && region.nozzle.codes.includes(code & 0x7f)) continue;
      // Actual region blast glyphs, replacing screen cells, no alpha/glow.
      if (frame >= DEFEAT && !started && Math.abs(col - g.split) < 2 &&
          r >= Math.max(0, g.last.row - 1) && r <= g.last.row + 1) {
        code = region.blasts[Math.floor((frame - DEFEAT) / 3) % 2];
      }
      if ((code & 0x7f) < 7) continue;
      // B's cap occupies separate scanlines: source-row palette can follow
      // it. C overlaps rows of the wings, so ALL pieces take ONE death
      // palette at launch. A horizontal colour split would be fictitious.
      let pal = isC && started ? region.rowPalette.rows[0] : region.rowPalette.rows[r];
      if (flash) pal = [0x0e, 0x2c, 0x0e, 0x28];
      for (let y = 0; y < 8; y++) {
        const bits = region.glyphs[(code & 0x7f) * 8 + y];
        for (let x = 0; x < 4; x++) {
          const v = (bits >> (6 - x * 2)) & 3;
          if (v === 0) continue;
          const colour = v === 3 ? pal[code & 0x80 ? 3 : 2] : pal[v - 1];
          rectangle(out, col * 8 + x * 2 - firstPixel + dx + g.shake,
            TOP + r * 8 + y + dy, 2, 1, colour);
        }
      }
    }
  }
  // P1/P2: two normal-width 8-bit strips. Each has ONE HPOS/colour for
  // the whole frame. Four missiles: at most four fixed-X spark trails.
  // No raster multiplexing, scaling, rotation or unlimited particle pool.
  if (variant.particles && started && g.t <= 28) {
    const seam = g.split * 8 - firstPixel;
    for (const side of [-1, 1]) {
      const edge = seam + side * (side < 0 ? g.left : g.right) * 8;
      for (let y = 0; y < 10; y++) {
        const mask = ((0x5a ^ (y * 17 + g.t * 13)) & (g.t > 18 ? 0x24 : 0x7e));
        for (let bit = 0; bit < 8; bit++) if (mask & (0x80 >> bit)) {
          rectangle(out, edge - 8 + bit * 2 + g.shake, TOP + 8 + y, 2, 1, 0x2c);
        }
      }
    }
    for (let m = 0; m < variant.particles - 2; m++) {
      const side = m % 2 ? 1 : -1;
      const x = seam + side * (g.t * (3 + m) + 5);
      const y = TOP + 16 + g.t * (m < 2 ? 1 : -1) + Math.floor(g.t * g.t / 50);
      rectangle(out, Math.round(x / 2) * 2, y, 4, 2, 0x0e);
    }
  }
  return out;
}

function png(pixels, width, height, scale = 1) {
  const rgb = Buffer.alloc(width * height * scale * scale * 3);
  for (let y = 0; y < height * scale; y++) {
    for (let x = 0; x < width * scale; x++) {
      rgb.set(atari800PalRgb(pixels[Math.floor(y / scale) * width + Math.floor(x / scale)]),
        (y * width * scale + x) * 3);
    }
  }
  return encodePng(rgb, width * scale, height * scale);
}

function writeReview(regions) {
  fs.mkdirSync(OUT, { recursive: true });
  const manifest = { kind: "PHASE-A OFFLINE MOCKUPS; NOT RUNTIME EVIDENCE", fps: 50,
    frameDelayMilliseconds: 20, viewport: [WIDTH, HEIGHT], stillScale: 2,
    context: "Schematic static stars and lower guide; no game HUD/player capture. Real compiled boss cells and row colours.",
    outputs: [] };
  const colours = Array.from({ length: 128 }, (_, i) => atari800PalRgb(i * 2));
  const comparisons = [];
  for (const { number, region } of regions) {
    for (const variant of VARIANTS) {
      const prefix = `r${number}-${region.name.toLowerCase().replaceAll(" ", "-")}-${variant.id}`;
      const frames = Array.from({ length: variant.frames }, (_, frame) => renderFrame(region, variant, frame));
      const gif = encodeGif({ width: WIDTH, height: HEIGHT, colours,
        frames: frames.map(pixels => ({ pixels: Uint8Array.from(pixels, c => c >> 1), delay: 2 })) });
      fs.writeFileSync(path.join(OUT, `${prefix}.gif`), gif.bytes);
      const stills = [DEFEAT - 1, variant.launch + 3, variant.launch + 11].map(frame => {
        const name = `${prefix}-f${String(frame).padStart(3, "0")}-x2.png`;
        fs.writeFileSync(path.join(OUT, name), png(frames[frame], WIDTH, HEIGHT, 2));
        return { frame, seconds: frame / 50, path: name };
      });
      comparisons.push({ pixels: frames[variant.launch + 3], number, variant });
      const g = geometry(region, variant, variant.launch);
      manifest.outputs.push({ region: number, name: region.name, variant: variant.id,
        gif: `${prefix}.gif`, frames: variant.frames, seconds: variant.frames / 50,
        defeatFrame: DEFEAT, launchFrame: variant.launch, splitColumn: g.split,
        lastWeapon: g.last.name, capRows: variant.capRows,
        estimateOnly: { diskRunBytes: variant.diskBytes, worstSequenceCpuCyclesPerFrame: variant.cycles }, stills });
      console.log(`${prefix}.gif: ${variant.frames} PAL ticks / ${(variant.frames / 50).toFixed(2)} s; ${gif.frames} encoded GIF frames`);
    }
  }
  // Top 80 scanlines, nearest-neighbour x2: two boss rows x three variants.
  const sheetWidth = WIDTH * 3, sheetHeight = 80 * regions.length;
  const sheet = new Uint8Array(sheetWidth * sheetHeight);
  comparisons.forEach(({ pixels }, i) => {
    const x = (i % 3) * WIDTH, y = Math.floor(i / 3) * 80;
    for (let row = 0; row < 80; row++) sheet.set(pixels.subarray(row * WIDTH, (row + 1) * WIDTH), (y + row) * sheetWidth + x);
  });
  fs.writeFileSync(path.join(OUT, "comparison-x2.png"), png(sheet, sheetWidth, sheetHeight, 2));
  fs.writeFileSync(path.join(OUT, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
  fs.writeFileSync(path.join(OUT, "index.html"), `<!doctype html><html lang="en"><meta charset="utf-8">
<title>Boss death breakup — Phase A engineering review</title><style>
body{background:#111318;color:#ddd;font:16px system-ui;margin:24px}main{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}
img{width:100%;max-width:640px;image-rendering:pixelated}article{background:#1b1e25;padding:12px}a{color:#b8cfff}
</style><h1>Phase A / offline storyboards / 50 PAL ticks per second</h1>
<p>Real spent boss graphics; schematic background. Left to right: A, B, C. No runtime or hardware validation. Disk read pause omitted.</p><main>
${manifest.outputs.map(o => `<article><h2>R${o.region} ${o.name}</h2><p>${o.variant} · ${o.seconds.toFixed(2)} s</p>
<a href="${o.gif}"><img src="${o.gif}" alt="${o.name}: ${o.variant}"></a><p>${o.stills.map(s => `<a href="${s.path}">f${s.frame} ×2</a>`).join(" · ")}</p></article>`).join("\n")}
</main></html>\n`);
  return manifest;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const order = JSON.parse(fs.readFileSync(path.join(ROOT, "assets/graphics/boss-regions/order.json"))).order;
  const numbers = (process.argv.find(a => a.startsWith("--regions="))?.slice(10) ?? "1,2").split(",").map(Number);
  if (numbers.some(n => !Number.isInteger(n) || n < 1 || n > 4)) throw new Error("--regions expects 1..4 in campaign order");
  writeReview(numbers.map(number => ({ number,
    region: compileBossRegion(loadBossRegionDraft(bossRegionDirectory(ROOT, order[number - 1]))) })));
}
