import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import zlib from "node:zlib";
import { compileEntityEffects, loadEntityEffectsDefinition } from "./entity-effects.mjs";
import { readGameGraphicsSource } from "./preview.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const rootDirectory = path.resolve(scriptDirectory, "..");
const gameplayDirectory = path.join(rootDirectory, "docs", "media", "gameplay");
const assetDirectory = path.join(rootDirectory, "docs", "media", "assets");
const conceptDirectory = path.join(rootDirectory, "docs", "media", "concepts");
const captureDirectory = path.join(rootDirectory, "build", "github-showcase");
const runtimeTraceDirectory = path.join(rootDirectory, "build", "runtime-wall-trace");
const manifestPath = path.join(rootDirectory, "docs", "media", "manifest.json");
const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

function sha256(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

const CRC32_TABLE = Array.from({ length: 256 }, (_, value) => {
  let crc = value;
  for (let bit = 0; bit < 8; bit += 1) {
    crc = (crc & 1) !== 0 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
  }
  return crc >>> 0;
});

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const value of bytes) crc = CRC32_TABLE[(crc ^ value) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const name = Buffer.from(type, "ascii");
  const chunk = Buffer.alloc(data.length + 12);
  chunk.writeUInt32BE(data.length, 0);
  name.copy(chunk, 4);
  data.copy(chunk, 8);
  chunk.writeUInt32BE(crc32(Buffer.concat([name, data])), data.length + 8);
  return chunk;
}

function encodeRgbPng(rgb, width, height) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header.set([8, 2, 0, 0, 0], 8);
  const stride = width * 3;
  const rows = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    rgb.copy(rows, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  return Buffer.concat([
    PNG_SIGNATURE,
    pngChunk("IHDR", header),
    pngChunk("IDAT", zlib.deflateSync(rows, { level: 9 })),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

function decodeIndexedPng(bytes) {
  invariant(bytes.subarray(0, 8).equals(PNG_SIGNATURE), "Runtime screenshot is not PNG");
  let offset = 8;
  let header;
  let palette;
  const compressed = [];
  while (offset < bytes.length) {
    const length = bytes.readUInt32BE(offset);
    const type = bytes.toString("ascii", offset + 4, offset + 8);
    const data = bytes.subarray(offset + 8, offset + 8 + length);
    if (type === "IHDR") header = data;
    else if (type === "PLTE") palette = data;
    else if (type === "IDAT") compressed.push(data);
    offset += length + 12;
    if (type === "IEND") break;
  }
  invariant(header?.[8] === 8 && header?.[9] === 3 && header?.[12] === 0 && palette,
    "Runtime screenshot must be a non-interlaced indexed Atari800 PNG");
  const width = header.readUInt32BE(0);
  const height = header.readUInt32BE(4);
  const raw = zlib.inflateSync(Buffer.concat(compressed));
  invariant(raw.length === (width + 1) * height, "Runtime screenshot row length is invalid");
  const indices = Buffer.alloc(width * height);
  const paeth = (left, above, upperLeft) => {
    const prediction = left + above - upperLeft;
    const leftDistance = Math.abs(prediction - left);
    const aboveDistance = Math.abs(prediction - above);
    const diagonalDistance = Math.abs(prediction - upperLeft);
    return leftDistance <= aboveDistance && leftDistance <= diagonalDistance
      ? left : aboveDistance <= diagonalDistance ? above : upperLeft;
  };
  for (let y = 0; y < height; y += 1) {
    const filter = raw[y * (width + 1)];
    for (let x = 0; x < width; x += 1) {
      const encoded = raw[y * (width + 1) + x + 1];
      const left = x > 0 ? indices[y * width + x - 1] : 0;
      const above = y > 0 ? indices[(y - 1) * width + x] : 0;
      const upperLeft = x > 0 && y > 0 ? indices[(y - 1) * width + x - 1] : 0;
      const predictor = [0, left, above, Math.floor((left + above) / 2),
        paeth(left, above, upperLeft)][filter];
      invariant(predictor !== undefined, `Unsupported Atari800 PNG filter ${filter}`);
      indices[y * width + x] = (encoded + predictor) & 0xff;
    }
  }
  const rgb = Buffer.alloc(width * height * 3);
  for (let index = 0; index < indices.length; index += 1) {
    const source = indices[index] * 3;
    rgb[index * 3] = palette[source];
    rgb[index * 3 + 1] = palette[source + 1];
    rgb[index * 3 + 2] = palette[source + 2];
  }
  return { width, height, rgb };
}

function cropRuntimeFrame(sourcePath) {
  const sourceBytes = fs.readFileSync(sourcePath);
  const decoded = decodeIndexedPng(sourceBytes);
  invariant(decoded.width === 336 && decoded.height === 240,
    `${sourcePath} is not a native 336x240 Atari800 frame`);
  const width = 320;
  const height = 240;
  const rgb = Buffer.alloc(width * height * 3);
  for (let y = 0; y < height; y += 1) {
    decoded.rgb.copy(rgb, y * width * 3, (y * decoded.width + 8) * 3,
      (y * decoded.width + 8 + width) * 3);
  }
  return { sourceBytes, png: encodeRgbPng(rgb, width, height), width, height };
}

function hslToRgb(hueDegrees, saturation, lightness) {
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const hue = (((hueDegrees % 360) + 360) % 360) / 60;
  const intermediate = chroma * (1 - Math.abs((hue % 2) - 1));
  const sectors = [
    [chroma, intermediate, 0], [intermediate, chroma, 0], [0, chroma, intermediate],
    [0, intermediate, chroma], [intermediate, 0, chroma], [chroma, 0, intermediate],
  ];
  const [red, green, blue] = sectors[Math.floor(hue) % 6];
  const match = lightness - chroma / 2;
  return [red + match, green + match, blue + match].map((component) =>
    Math.max(0, Math.min(255, Math.round(component * 255))));
}

function atariPalRegisterToRgb(value) {
  const hue = (value >>> 4) & 0x0f;
  const luminance = value & 0x0e;
  const lightness = 0.04 + luminance / 14 * 0.86;
  if (hue === 0) {
    const gray = Math.round(lightness * 255);
    return [gray, gray, gray];
  }
  const hueAngles = [0, 52, 34, 16, 354, 326, 294, 258, 226, 204, 184, 164, 136, 108, 82, 62];
  return hslToRgb(hueAngles[hue], 0.68, lightness);
}

class Canvas {
  constructor(width, height, background = [5, 9, 15]) {
    this.width = width;
    this.height = height;
    this.rgb = Buffer.alloc(width * height * 3);
    this.fillRect(0, 0, width, height, background);
  }

  fillRect(x, y, width, height, color) {
    for (let py = Math.max(0, y); py < Math.min(this.height, y + height); py += 1) {
      for (let px = Math.max(0, x); px < Math.min(this.width, x + width); px += 1) {
        const offset = (py * this.width + px) * 3;
        this.rgb[offset] = color[0];
        this.rgb[offset + 1] = color[1];
        this.rgb[offset + 2] = color[2];
      }
    }
  }

  frame(x, y, width, height, color) {
    this.fillRect(x, y, width, 1, color);
    this.fillRect(x, y + height - 1, width, 1, color);
    this.fillRect(x, y, 1, height, color);
    this.fillRect(x + width - 1, y, 1, height, color);
  }

  png() {
    return encodeRgbPng(this.rgb, this.width, this.height);
  }
}

function drawHudText(canvas, text, x, y, scale, color, graphics) {
  const zero = graphics.constants.get("CH_ZERO");
  const letterA = graphics.constants.get("CH_HUD_A");
  let cursor = x;
  for (const character of text.toUpperCase()) {
    let glyphIndex;
    if (character >= "A" && character <= "Z") glyphIndex = letterA + character.charCodeAt(0) - 65;
    else if (character >= "0" && character <= "9") glyphIndex = zero + Number(character);
    else {
      cursor += 8 * scale;
      continue;
    }
    const glyph = graphics.hudCharset.subarray(glyphIndex * 8, glyphIndex * 8 + 8);
    for (let row = 0; row < 8; row += 1) {
      for (let bit = 0; bit < 8; bit += 1) {
        if ((glyph[row] & (0x80 >>> bit)) !== 0) {
          canvas.fillRect(cursor + bit * scale, y + row * scale, scale, scale, color);
        }
      }
    }
    cursor += 8 * scale;
  }
}

function drawPmg(canvas, bytes, x, y, scale, color, horizontalSize = 1) {
  for (let row = 0; row < bytes.length; row += 1) {
    for (let bit = 0; bit < 8; bit += 1) {
      if ((bytes[row] & (0x80 >>> bit)) !== 0) {
        canvas.fillRect(x + bit * scale * horizontalSize, y + row * scale,
          scale * horizontalSize, scale, color);
      }
    }
  }
}

function drawAntic4Glyph(canvas, glyph, x, y, scale, palette, inverse = false) {
  for (let row = 0; row < 8; row += 1) {
    for (let pair = 0; pair < 4; pair += 1) {
      const value = (glyph[row] >>> (6 - pair * 2)) & 3;
      const color = value === 3 && inverse ? palette[4] : palette[value];
      canvas.fillRect(x + pair * scale * 2, y + row * scale, scale * 2, scale, color);
    }
  }
}

function writeAssetSheet(outputPath, canvas) {
  const png = canvas.png();
  fs.writeFileSync(outputPath, png);
  return { bytes: png.length, sha256: sha256(png), width: canvas.width, height: canvas.height };
}

export function createAssetSheets() {
  const source = fs.readFileSync(path.join(rootDirectory, "src", "main.s"), "utf8");
  const graphics = readGameGraphicsSource(source);
  const entities = compileEntityEffects(loadEntityEffectsDefinition(
    path.join(rootDirectory, "assets", "graphics", "entity-effects.json")));
  const white = atariPalRegisterToRgb(0x0e);
  const steel = atariPalRegisterToRgb(0x84);
  const yellow = atariPalRegisterToRgb(0x1e);
  const red = atariPalRegisterToRgb(0x46);
  const burgundy = atariPalRegisterToRgb(0x44);
  const blue = atariPalRegisterToRgb(0x28);
  const black = atariPalRegisterToRgb(0x00);
  const muted = [111, 135, 159];
  const panel = [8, 16, 27];
  const outline = [29, 60, 93];
  const palette = [black, white, steel, yellow, red];
  const results = [];

  {
    const canvas = new Canvas(960, 400);
    drawHudText(canvas, "FIGHTER AND ENEMIES", 32, 24, 2, white, graphics);
    drawHudText(canvas, "COMPILED PMG ART USED BY THE RELEASE", 32, 62, 1, muted, graphics);
    canvas.fillRect(30, 100, 420, 250, panel);
    canvas.frame(30, 100, 420, 250, outline);
    drawHudText(canvas, "PLAYER_FIGHTER", 60, 120, 2, steel, graphics);
    drawPmg(canvas, graphics.playerShape, 160, 178, 7, white, 1);
    drawPmg(canvas, graphics.playerEngineShape, 160, 178, 7, yellow, 1);
    drawHudText(canvas, "PLAYER FIGHTER", 84, 318, 1, muted, graphics);
    canvas.fillRect(510, 100, 420, 250, panel);
    canvas.frame(510, 100, 420, 250, outline);
    drawHudText(canvas, "HOSTILE INTERCEPTOR", 540, 120, 2, burgundy, graphics);
    drawPmg(canvas, graphics.releaseEnemy.bodyRows, 640, 174, 7, burgundy, 2);
    drawPmg(canvas, graphics.releaseEnemy.accentFrames[2], 640, 174, 7, red, 2);
    drawHudText(canvas, "ACTIVE RELEASE ENEMY", 580, 318, 1, muted, graphics);
    const output = path.join(assetDirectory, "fighter-and-enemies.png");
    results.push({ path: path.relative(rootDirectory, output), ...writeAssetSheet(output, canvas),
      sources: ["src/main.s", "assets/graphics/enemy-roster.json"] });
  }

  {
    const canvas = new Canvas(960, 520);
    drawHudText(canvas, "WEAPONS AND EFFECTS", 32, 24, 2, white, graphics);
    drawHudText(canvas, "ACTUAL PROJECTILE GLYPHS AND EXPLOSION MASKS", 32, 62, 1, muted, graphics);
    const cards = [
      ["PLAYER_FIGHTER SHOT", graphics.fighterWeapons.glyphs.player_fighter[0], yellow, false],
      ["RAPID SHOT", graphics.fighterWeapons.glyphs.player_fighter[0], red, true],
      ["INTERCEPTOR PULSE", graphics.fighterWeapons.glyphs.interceptor[0], red, true],
    ];
    cards.forEach(([label, glyph, color, inverse], index) => {
      const x = 30 + index * 300;
      canvas.fillRect(x, 105, 270, 150, panel);
      canvas.frame(x, 105, 270, 150, outline);
      drawHudText(canvas, label, x + 20, 120, 1, color, graphics);
      const localPalette = [black, white, steel, color, color];
      drawAntic4Glyph(canvas, glyph, x + 104, 160, 8, localPalette, inverse);
    });
    drawHudText(canvas, "FIGHTER EXPLOSION PHASES", 32, 290, 1, muted, graphics);
    for (let phase = 0; phase < 6; phase += 1) {
      const outer = graphics.fighterWeapons.sharedFighterExplosion.outerBytes
        .slice(phase * 8, phase * 8 + 8);
      const core = graphics.fighterWeapons.sharedFighterExplosion.coreMasks[phase];
      const x = 54 + phase * 145;
      canvas.fillRect(x - 18, 326, 112, 142, panel);
      canvas.frame(x - 18, 326, 112, 142, outline);
      drawPmg(canvas, outer, x, 350, 8, red, 1);
      drawPmg(canvas, Array(8).fill(core), x, 350, 8, yellow, 1);
      drawHudText(canvas, `PHASE ${phase + 1}`, x - 8, 444, 1, muted, graphics);
    }
    const output = path.join(assetDirectory, "weapons-and-effects.png");
    results.push({ path: path.relative(rootDirectory, output), ...writeAssetSheet(output, canvas),
      sources: ["src/main.s", "assets/graphics/fighter-weapons.json", "assets/graphics/entity-effects.json"] });
  }

  {
    const canvas = new Canvas(960, 560);
    drawHudText(canvas, "DEBRIS AND PICKUPS", 32, 24, 2, white, graphics);
    drawHudText(canvas, "COMPILED ANTIC 4 GLYPHS IN THEIR GAME PALETTE", 32, 62, 1, muted, graphics);
    const drawPair = (label, offset, x, y) => {
      drawHudText(canvas, label, x, y, 1, steel, graphics);
      drawAntic4Glyph(canvas, entities.glyphs.subarray(offset, offset + 8), x, y + 28, 7, palette);
      drawAntic4Glyph(canvas, entities.glyphs.subarray(offset + 8, offset + 16), x + 56, y + 28, 7, palette);
    };
    drawPair("ARMOUR SHARD PHASE 1", 0, 42, 120);
    drawPair("ARMOUR SHARD PHASE 2", 16, 282, 120);
    drawPair("TRUSS FRAGMENT PHASE 1", 32, 522, 120);
    drawPair("TRUSS FRAGMENT PHASE 2", 48, 762, 120);
    drawHudText(canvas, "DEBRIS BREAKUP FRAGMENTS", 42, 280, 1, muted, graphics);
    drawAntic4Glyph(canvas, entities.effectGlyphs.subarray(0, 8), 42, 315, 7, palette);
    drawAntic4Glyph(canvas, entities.effectGlyphs.subarray(8, 16), 115, 315, 7, palette, true);
    drawHudText(canvas, "RAPID FIRE CAPSULE", 340, 280, 1, muted, graphics);
    for (let row = 0; row < 2; row += 1) {
      for (let column = 0; column < 2; column += 1) {
        const index = row * 2 + column;
        drawAntic4Glyph(canvas, entities.pickupGlyphs.subarray(index * 8, index * 8 + 8),
          400 + column * 80, 320 + row * 80, 10, palette);
      }
    }
    drawHudText(canvas, "STEEL OUTLINE  YELLOW FIELD  BLACK RF", 340, 500, 1, muted, graphics);
    const output = path.join(assetDirectory, "debris-and-pickups.png");
    results.push({ path: path.relative(rootDirectory, output), ...writeAssetSheet(output, canvas),
      sources: ["assets/graphics/entity-effects.json", "build/entity-effects.inc"] });
  }

  {
    const canvas = new Canvas(960, 680);
    drawHudText(canvas, "CAPITAL SHIP MODULES", 32, 24, 2, white, graphics);
    drawHudText(canvas, "THIRTY ONE COMPILED ANTIC 4 HULL GLYPHS", 32, 62, 1, muted, graphics);
    graphics.capitalHulls.glyphs.forEach((glyph, index) => {
      const column = index % 4;
      const row = Math.floor(index / 4);
      const x = 30 + column * 230;
      const y = 104 + row * 68;
      canvas.fillRect(x, y, 212, 58, panel);
      canvas.frame(x, y, 212, 58, outline);
      const inverse = (glyph.screenCode & 0x80) !== 0;
      drawAntic4Glyph(canvas, glyph.bytes, x + 10, y + 9, 5, [black, white, steel, blue, burgundy], inverse);
      const shortName = glyph.name.replaceAll("_", " ").toUpperCase().slice(0, 16);
      drawHudText(canvas, `${glyph.index} ${shortName}`, x + 62, y + 20, 1,
        glyph.faction === "allied" ? steel : burgundy, graphics);
    });
    const output = path.join(assetDirectory, "capital-ship-modules.png");
    results.push({ path: path.relative(rootDirectory, output), ...writeAssetSheet(output, canvas),
      sources: ["assets/graphics/capital-hulls.json", "build/capital-hulls.inc"] });
  }
  return results;
}

function captureBreakupFrames() {
  fs.mkdirSync(captureDirectory, { recursive: true });
  const prefix = path.join(captureDirectory, "neutral-combat");
  const observer = spawnSync(process.execPath,
    [path.join(scriptDirectory, "runtime-wall-trace.mjs"), "--smoke-frames=150"], {
      cwd: rootDirectory,
      encoding: "utf8",
      env: { ...process.env, DFTRACE_ENGINE_SCREENSHOT_PREFIX: prefix },
    });
  if (observer.status !== 0) {
    process.stderr.write(observer.stdout ?? "");
    process.stderr.write(observer.stderr ?? "");
    throw new Error("Atari800 showcase capture failed");
  }
  for (const frame of [25, 31, 100, 113]) {
    invariant(fs.existsSync(`${prefix}-${String(frame).padStart(3, "0")}.png`),
      `Atari800 showcase frame ${frame} is missing`);
  }

  // The observer smoke intentionally clears stale pickup evidence. Recreate it
  // from the focused release-runtime session after the neutral-combat capture.
  const weaponPickup = spawnSync(process.execPath, [
    path.join(scriptDirectory, "runtime-wall-trace.mjs"),
    "--only-session=weapon-pickup-2-hunt-fire4",
  ], { cwd: rootDirectory, encoding: "utf8" });
  if (weaponPickup.status !== 0) {
    process.stderr.write(weaponPickup.stdout ?? "");
    process.stderr.write(weaponPickup.stderr ?? "");
    throw new Error("Atari800 Rapid Fire showcase capture failed");
  }
}

function requireCaptureSources() {
  const sources = {
    loader: path.join(runtimeTraceDirectory, "boot-smoke", "xex-a5-frame250.png"),
    standard: path.join(captureDirectory, "neutral-combat-025.png"),
    interceptor: path.join(captureDirectory, "neutral-combat-031.png"),
    debris: path.join(captureDirectory, "neutral-combat-113.png"),
    pickup: path.join(runtimeTraceDirectory, "weapon-pickup-static-atari800.png"),
    rapid: path.join(runtimeTraceDirectory, "weapon-pickup-rapid-projectiles-atari800.png"),
    spread: path.join(runtimeTraceDirectory, "weapon-pickup-spread-projectiles-atari800.png"),
    broadside: path.join(captureDirectory, "neutral-combat-100.png"),
    engines: path.join(runtimeTraceDirectory, "engine-xex-a5-0-immediate-096.png"),
  };
  for (const sourcePath of Object.values(sources)) {
    invariant(fs.existsSync(sourcePath),
      `Required Atari800 source frame is missing: ${path.relative(rootDirectory, sourcePath)}; ` +
      "run npm run runtime:wall-trace, then npm run showcase -- --capture");
  }
  return sources;
}

export function createGameplayGallery() {
  const sources = requireCaptureSources();
  const runtimeReport = JSON.parse(fs.readFileSync(
    path.join(rootDirectory, "docs", "runtime-wall-trace.json"), "utf8"));
  const spreadCaptureFrame =
    runtimeReport.coverage?.weapon_pickup_spread_shot?.screenshot?.capture_frame;
  invariant(Number.isInteger(spreadCaptureFrame),
    "Runtime report is missing the authentic Spread Shot capture frame");
  const definitions = [
    ["01-title-loader.png", sources.loader, "XEX", 250, "Loader title and capital-ship art"],
    ["02-standard-combat.png", sources.standard, "XEX", 25, "PlayerFighter, Interceptor, starfield and capital hull corridor"],
    ["03-interceptor-breakup.png", sources.interceptor, "XEX", 31, "Interceptor local breakup after a PlayerFighter projectile kill"],
    ["04-debris-breakup.png", sources.debris, "XEX", 113, "Destructible debris with four transient fragments"],
    ["05-rapid-fire-pickup.png", sources.pickup, "XEX", 385, "Static 2x2 Rapid Fire capsule in active gameplay"],
    ["06-rapid-fire-active.png", sources.rapid, "XEX", 449, "Full BOOST HUD label, energy cells, and yellow Rapid Fire projectiles"],
    ["07-capital-broadside.png", sources.broadside, "XEX", 100, "Capital corridor combat and broadside fire"],
    ["08-capital-engines.png", sources.engines, "XEX", 96, "Capital engine bank in its deterministic 8-frame phase"],
    ["09-spread-shot-active.png", sources.spread, "XEX", spreadCaptureFrame, "Full BOOST HUD label, energy cells, and all-yellow three-projectile fan"],
  ];
  return definitions.map(([fileName, sourcePath, medium, frame, description]) => {
    const { sourceBytes, png, width, height } = cropRuntimeFrame(sourcePath);
    const outputPath = path.join(gameplayDirectory, fileName);
    fs.writeFileSync(outputPath, png);
    return {
      path: path.relative(rootDirectory, outputPath),
      description,
      source: path.relative(rootDirectory, sourcePath),
      source_medium: medium,
      emulator: "Atari800 7.1.2 PAL XL",
      frame,
      width,
      height,
      source_sha256: sha256(sourceBytes),
      sha256: sha256(png),
      bytes: png.length,
    };
  });
}

function readCommittedGameplayGallery() {
  invariant(fs.existsSync(manifestPath),
    "The committed gameplay manifest is missing; rerun npm run showcase -- --capture");
  const committed = JSON.parse(fs.readFileSync(manifestPath, "utf8")).gameplay;
  invariant(Array.isArray(committed) && committed.length === 9,
    "The committed gameplay manifest must contain nine Atari800 frames");
  return committed.map((item) => {
    const outputPath = path.join(rootDirectory, item.path);
    invariant(fs.existsSync(outputPath), `Committed showcase frame is missing: ${item.path}`);
    const bytes = fs.readFileSync(outputPath);
    invariant(bytes.length === item.bytes && sha256(bytes) === item.sha256,
      `${item.path} differs from its Atari800 capture manifest; rerun with --capture`);
    invariant(bytes.subarray(0, 8).equals(PNG_SIGNATURE) &&
      bytes.readUInt32BE(16) === 320 && bytes.readUInt32BE(20) === 240,
    `${item.path} is not a native 320x240 PNG`);
    return item;
  });
}

function readOwnerSuppliedConceptArt() {
  const definitions = [
    {
      fileName: "void-strike-65-concept-from-floppy-to-stars.jpg",
      title: "From Floppy to the Stars",
      caption: "Concept art — From Floppy to the Stars. An AI-assisted visualization of the project’s journey from its 1990 origins to the current release. Not an in-game screenshot.",
    },
    {
      fileName: "void-strike-65-concept-gauntlet-run.jpg",
      title: "Gauntlet Run",
      caption: "Concept art — Gauntlet Run. An AI-assisted visualization of the intended scale, atmosphere and future battlefield composition. Not an in-game screenshot.",
    },
  ];
  return definitions.map(({ fileName, title, caption }) => {
    const conceptPath = path.join(conceptDirectory, fileName);
    invariant(fs.existsSync(conceptPath), `Owner-supplied concept art is missing: ${fileName}`);
    const bytes = fs.readFileSync(conceptPath);
    invariant(bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8 &&
      bytes.at(-2) === 0xff && bytes.at(-1) === 0xd9,
      `${fileName} is not a complete JPEG file`);
    return {
      path: path.relative(rootDirectory, conceptPath),
      title,
      caption,
      classification: "owner-supplied AI-assisted concept art",
      runtime_capture: false,
      deterministic_runtime_capture: false,
      bytes: bytes.length,
      sha256: sha256(bytes),
    };
  });
}

export function generateShowcase({ capture = false } = {}) {
  fs.mkdirSync(gameplayDirectory, { recursive: true });
  fs.mkdirSync(assetDirectory, { recursive: true });
  if (capture) captureBreakupFrames();
  const xex = fs.readFileSync(path.join(rootDirectory, "dist", "void-strike-65.xex"));
  const atr = fs.readFileSync(path.join(rootDirectory, "dist", "void-strike-65.atr"));
  const runtimeReport = JSON.parse(fs.readFileSync(
    path.join(rootDirectory, "docs", "runtime-wall-trace.json"), "utf8"));
  invariant(runtimeReport.artifact.sha256 === sha256(xex),
    "Runtime wall trace does not match the current release XEX");
  const gameplay = capture ? createGameplayGallery() : readCommittedGameplayGallery();
  const assets = createAssetSheets();
  const concepts = readOwnerSuppliedConceptArt();
  const manifest = {
    formatVersion: 1,
    generatedBy: "scripts/github-showcase.mjs",
    runtimeEvidence: {
      xex: { path: "dist/void-strike-65.xex", bytes: xex.length, sha256: sha256(xex) },
      atr: { path: "dist/void-strike-65.atr", bytes: atr.length, sha256: sha256(atr) },
      wallTrace: { path: "docs/runtime-wall-trace.json", sha256: sha256(fs.readFileSync(
        path.join(rootDirectory, "docs", "runtime-wall-trace.json"))) },
      note: "Gameplay images are unenhanced 320x240 crops of Atari800's packed-release framebuffer. The eight-pixel emulator side borders are the only pixels removed.",
    },
    gameplay,
    assetSheets: assets,
    concepts,
  };
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  return manifest;
}

function isMainModule() {
  return process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
}

if (isMainModule()) {
  const manifest = generateShowcase({ capture: process.argv.includes("--capture") });
  const mediaBytes = [...manifest.gameplay, ...manifest.assetSheets, ...manifest.concepts]
    .reduce((sum, item) => sum + item.bytes, 0);
  console.log("GitHub showcase media manifest generated successfully");
  console.log(`  gameplay : ${manifest.gameplay.length} Atari800 frames`);
  console.log(`  assets   : ${manifest.assetSheets.length} source-derived sheets`);
  console.log(`  concepts : ${manifest.concepts.length} owner-supplied images`);
  console.log(`  media    : ${mediaBytes} bytes`);
}
