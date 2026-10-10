// feat/boss-r1-tuning (owner smoke 2026-10-09): region 1's boss as the owner's
// comparison variants, written as drafts the build's --boss-variant=NAME reads
// (build/boss-variants/NAME/region-1/ and, for an escort, NAME/level-01.json).
// Nothing under assets/ is written unless --write-assets names the variant the
// owner chose.
//
//   node scripts/boss-r1-variants.mjs                 every variant into build/boss-variants/
//   node scripts/boss-r1-variants.mjs --write-assets=a   variant a into assets/ (Phase B)
//
// The edits, each a data transformation of the committed region 1:
//   * far-end guns: a pulse gun recessed behind each end plate (plate-a,
//     plate-h), its art gun-1's - the 3 x 3 cells at columns 22-24, rows 1-3
//     (the gun's two rows and the recess row under it, decision O) - copied
//     into band.png, open.png, cracked.png and broken.png at the new footprint;
//   * gun durability halved (owner finding 2), the emitter unchanged;
//   * plates: hit points as the variant gives them (the fight's length is
//     restored through the plates, never the guns);
//   * an escort (variant b only): level 1's boss sector authors one
//     Interceptor stream under lights 1 (plan s5-boss-regions §4.3, Q5).
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";

import { decodeRgbaReferencePng } from "./preview.mjs";

const rootDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const regionOne = path.join(rootDirectory, "assets", "graphics", "boss-regions", "region-1");
const levelOne = path.join(rootDirectory, "assets", "levels", "level-01.json");
const BAND_PNGS = ["band", "open", "cracked", "broken"];
const CELL_W = 4;   // draft pixels a cell, horizontally
const CELL_H = 8;

// gun-1's art block: the gun (rows 1-2) and its recess (row 3).
const GUN_ART = Object.freeze({ x: 22, row: 1, width: 3, height: 3 });

const FAR_END_GUNS = Object.freeze([
  { name: "gun-5", x: 12, cover: "plate-a", reload: 60, score: 50 },
  { name: "gun-6", x: 50, cover: "plate-h", reload: 60, score: 50 },
]);

export const VARIANTS = Object.freeze({
  a: {
    _: "Far-end guns behind plate-a and plate-h, every gun's hit points halved (28 -> 14), the emitter 20.",
    guns: FAR_END_GUNS,
    gunHpFactor: 0.5,
    plateHp: {},
    escort: null,
  },
  as: {
    _: "Lever, information only: variant a with the far-end guns as salvo launchers (three shots a turn, x-1, x, x+1).",
    guns: FAR_END_GUNS.map((gun) => ({ ...gun, kind: "salvo" })),
    gunHpFactor: 0.5,
    plateHp: {},
    escort: null,
  },
  b: {
    _: "Variant a with one Interceptor stream in the boss sector (count 6, spacing 100, lights 1).",
    guns: FAR_END_GUNS,
    gunHpFactor: 0.5,
    // Owner decision 2026-10-10: the chosen variant, with plate-a / plate-h trimmed.
    plateHp: { "plate-a": 12, "plate-h": 12 },
    escort: { count: 6, spacing: 100 },
  },
});

// --- PNG (8-bit RGBA, the draft format) ------------------------------------
const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buffer) {
  let c = 0xffffffff;
  for (const byte of buffer) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}
export function encodeRgbaPng({ width, height, rgba }) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 6;
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header), chunk("IDAT", zlib.deflateSync(raw, { level: 9 })), chunk("IEND", Buffer.alloc(0))]);
}

// Copies a block of cells from one footprint to another inside one image.
function copyCells(image, from, toX, toRow) {
  const out = Buffer.from(image.rgba);
  for (let y = 0; y < from.height * CELL_H; y += 1) {
    for (let x = 0; x < from.width * CELL_W; x += 1) {
      const src = ((from.row * CELL_H + y) * image.width + from.x * CELL_W + x) * 4;
      const dst = ((toRow * CELL_H + y) * image.width + toX * CELL_W + x) * 4;
      image.rgba.copy(out, dst, src, src + 4);
    }
  }
  return { ...image, rgba: out };
}

// --- the variant ------------------------------------------------------------
export function variantDraft(name) {
  const variant = VARIANTS[name];
  if (variant === undefined) throw new Error(`unknown variant ${name}; ${Object.keys(VARIANTS).join(", ")}`);
  const layout = JSON.parse(fs.readFileSync(path.join(regionOne, "modules.json"), "utf8"));
  // Since 2026-10-10 assets/ carries variant b (the owner's choice): its
  // region 1 already has the far-end guns, so the transformation would apply twice.
  if (layout.modules.some((module) => module.name === "gun-5")) {
    throw new Error("region 1 already carries the far-end guns (variant b, owner decision 2026-10-10); " +
      "the variants derive from main dcc331a's region 1");
  }
  const template = layout.modules.find((module) => module.name === "gun-1");
  const modules = layout.modules.map((module) => {
    const next = { ...module };
    if (module.kind === "pulse" || module.kind === "salvo") {
      next.hp = Math.max(1, Math.round(module.hp * variant.gunHpFactor));
    }
    if (module.kind === "armour" && variant.plateHp[module.name] !== undefined) {
      next.hp = variant.plateHp[module.name];
    }
    return next;
  });
  const added = variant.guns.map((gun) => ({
    _: `feat/boss-r1-tuning (owner smoke 2026-10-09): a far-end gun recessed behind ${gun.cover}, so the ` +
      "screen edge is under fire; gun-1's art.",
    name: gun.name, kind: gun.kind ?? "pulse", x: gun.x, row: template.row, width: template.width, height: template.height,
    hp: Math.max(1, Math.round(template.hp * variant.gunHpFactor)), score: gun.score, reload: gun.reload,
    cavityRows: template.cavityRows,
  }));
  // Weapons first, as the authored file lists them; the converter sorts.
  const firstPlate = modules.findIndex((module) => module.kind === "armour");
  modules.splice(firstPlate, 0, ...added);
  const images = {};
  for (const png of BAND_PNGS) {
    let image = decodeRgbaReferencePng(fs.readFileSync(path.join(regionOne, `${png}.png`)));
    for (const gun of variant.guns) image = copyCells(image, GUN_ART, gun.x, GUN_ART.row);
    images[png] = image;
  }
  let level = null;
  if (variant.escort !== null) {
    level = JSON.parse(fs.readFileSync(levelOne, "utf8"));
    const boss = level.sectors.find((sector) => sector.kind === "boss");
    boss._escort = "feat/boss-r1-tuning variant b (owner smoke 2026-10-09: an Interceptor might help against " +
      "edge-hiding): one Interceptor stream under lights 1 - the kernel admits one at a time, the next " +
      `${variant.escort.spacing} frames after the slot frees (plan s5-boss-regions §4.3, Q5). Reopens ` +
      "'no Light escort in R1' (m5-loading-boss decisions): never the default unless the owner chooses it.";
    boss.archetypes = ["interceptor"];
    boss.lights = 1;
    boss.waves = [{ archetype: "interceptor", count: variant.escort.count, spacing: variant.escort.spacing, row: 0 }];
  }
  return { variant, layout: { ...layout, modules }, images, level };
}

function writeDraft(name, regionDirectory, levelPath) {
  const { layout, images, level } = variantDraft(name);
  fs.mkdirSync(regionDirectory, { recursive: true });
  for (const file of fs.readdirSync(regionOne)) {
    if (!BAND_PNGS.includes(path.basename(file, ".png")) && file !== "modules.json") {
      fs.copyFileSync(path.join(regionOne, file), path.join(regionDirectory, file));
    }
  }
  fs.writeFileSync(path.join(regionDirectory, "modules.json"), `${JSON.stringify(layout, null, 2)}\n`);
  for (const png of BAND_PNGS) fs.writeFileSync(path.join(regionDirectory, `${png}.png`), encodeRgbaPng(images[png]));
  if (level !== null && levelPath !== null) fs.writeFileSync(levelPath, `${JSON.stringify(level, null, 2)}\n`);
  return { layout, level };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const assetsArgument = process.argv.find((argument) => argument.startsWith("--write-assets="));
  if (assetsArgument !== undefined) {
    const name = assetsArgument.slice("--write-assets=".length);
    writeDraft(name, regionOne, levelOne);
    console.log(`variant ${name} written into assets/graphics/boss-regions/region-1/` +
      `${VARIANTS[name].escort === null ? "" : " and assets/levels/level-01.json"}`);
  } else {
    for (const name of Object.keys(VARIANTS)) {
      const directory = path.join(rootDirectory, "build", "boss-variants", name);
      fs.rmSync(directory, { recursive: true, force: true });
      const { layout } = writeDraft(name, path.join(directory, "region-1"), path.join(directory, "level-01.json"));
      console.log(`build/boss-variants/${name}: ${layout.modules.length} modules - ${VARIANTS[name]._}`);
    }
  }
}
