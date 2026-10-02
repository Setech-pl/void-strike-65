// The README's gameplay GIF, recorded from the packed ATR in the instrumented
// Atari800 (docs/plans/showcase-atr.md §3.1).
//
//   npm run showcase:gif              capture, encode, record in the manifest
//   npm run showcase:gif -- --reuse   encode the frames already in build/
//
// The replay is the existing deterministic trace session
// weapon-pickup-spread-0-hunt-fire4 (level 1, EASY, scripted "hunt" input).
// Its window is derived from the session's own CSV, never pinned: it opens
// SPREAD_LEAD frames before the Spread capsule is collected and closes
// BROADSIDE_TAIL frames after the first BROADSIDE that follows, so a game
// change that moves the scene moves the window with it. A window longer than
// MAX_FRAMES fails instead of producing an oversized GIF.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { desktopVideoEnvironment, readIndexedPng, traceSourceArguments } from "./github-showcase.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const rootDirectory = path.resolve(scriptDirectory, "..");
const captureDirectory = path.join(rootDirectory, "build", "showcase-gif");
const framePrefix = path.join(captureDirectory, "frame");
const traceCsvPath = path.join(rootDirectory, "build", "runtime-wall-trace",
  "weapon-pickup-spread-0-hunt-fire4.csv");
const manifestPath = path.join(rootDirectory, "docs", "media", "manifest.json");
export const GIF_PATH = "docs/media/showcase/void-strike-65-level-1.gif";

export const GIF_SCENE = Object.freeze({
  session: "weapon-pickup-spread-0-hunt-fire4",
  spreadLead: 87,
  broadsideTail: 126,
  maxFrames: 750,
  captureLimit: 1600,
  // One PAL frame is 1/50 s: two GIF centiseconds.
  delayCentiseconds: 2,
  cropX: 8,
  width: 320,
  height: 240,
});

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");

function capture() {
  fs.rmSync(captureDirectory, { recursive: true, force: true });
  fs.mkdirSync(captureDirectory, { recursive: true });
  const result = spawnSync(process.execPath, [
    path.join(scriptDirectory, "runtime-wall-trace.mjs"),
    ...traceSourceArguments(),
    `--only-session=${GIF_SCENE.session}`,
  ], {
    cwd: rootDirectory,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    env: {
      ...process.env,
      ...desktopVideoEnvironment(),
      DFTRACE_ENGINE_SCREENSHOT_PREFIX: framePrefix,
      DFTRACE_ENGINE_SCREENSHOT_LIMIT: String(GIF_SCENE.captureLimit),
    },
  });
  if (result.status !== 0) {
    process.stderr.write(result.stdout ?? "");
    process.stderr.write(result.stderr ?? "");
    throw new Error(`Atari800 capture of ${GIF_SCENE.session} failed`);
  }
}

// The scene's landmarks, read from the replay's CSV. Boosters follow the fixed
// sequence Rapid Fire -> Spread Shot -> Shield (docs/game-design.md
// "Implemented boosters"), so Spread is the first change from one non-zero
// booster state to another.
export function sceneWindow(csvText) {
  const lines = csvText.trim().split(/\r?\n/);
  const header = lines[0].split(",");
  const column = (name) => {
    const index = header.indexOf(name);
    invariant(index >= 0, `Trace CSV has no ${name} column`);
    return index;
  };
  const frameColumn = column("frame");
  const boosterColumn = column("pickup_booster_state");
  const broadsideColumn = column("broadside");
  const rows = lines.slice(1).map((line) => line.split(","));
  let spreadFrame;
  let firstBooster = 0;
  for (const row of rows) {
    const booster = Number(row[boosterColumn]);
    if (firstBooster === 0 && booster !== 0) firstBooster = booster;
    else if (firstBooster !== 0 && booster !== 0 && booster !== firstBooster) {
      spreadFrame = Number(row[frameColumn]);
      break;
    }
  }
  invariant(spreadFrame !== undefined, `${GIF_SCENE.session} never collects a Spread capsule`);
  const broadsideRow = rows.find((row) =>
    Number(row[frameColumn]) > spreadFrame && Number(row[broadsideColumn]) !== 0);
  invariant(broadsideRow !== undefined, `${GIF_SCENE.session} reaches no BROADSIDE after Spread`);
  const broadsideFrame = Number(broadsideRow[frameColumn]);
  const first = spreadFrame - GIF_SCENE.spreadLead;
  const end = broadsideFrame + GIF_SCENE.broadsideTail;
  invariant(first >= 0 && end - first <= GIF_SCENE.maxFrames && end <= GIF_SCENE.captureLimit,
    `GIF window ${first}-${end - 1} (Spread f${spreadFrame}, BROADSIDE f${broadsideFrame}) ` +
    `exceeds ${GIF_SCENE.maxFrames} frames or the capture limit; retune GIF_SCENE`);
  return { first, end, spreadFrame, broadsideFrame };
}

// --- GIF89a ---------------------------------------------------------------

function lzwEncode(indices, minimumCodeSize) {
  const clearCode = 1 << minimumCodeSize;
  const endCode = clearCode + 1;
  const output = [];
  let bitBuffer = 0;
  let bitCount = 0;
  let codeSize = minimumCodeSize + 1;
  const emit = (code) => {
    bitBuffer |= code << bitCount;
    bitCount += codeSize;
    while (bitCount >= 8) {
      output.push(bitBuffer & 0xff);
      bitBuffer >>>= 8;
      bitCount -= 8;
    }
  };
  let dictionary = new Map();
  let nextCode = endCode + 1;
  emit(clearCode);
  let prefix = indices[0];
  for (let index = 1; index < indices.length; index += 1) {
    const symbol = indices[index];
    const key = prefix * 4096 + symbol;
    const known = dictionary.get(key);
    if (known !== undefined) {
      prefix = known;
      continue;
    }
    emit(prefix);
    if (nextCode < 4096) {
      dictionary.set(key, nextCode);
      nextCode += 1;
      // The decoder widens one code later than the encoder adds the entry.
      if (nextCode > (1 << codeSize) && codeSize < 12) codeSize += 1;
    } else {
      emit(clearCode);
      dictionary = new Map();
      nextCode = endCode + 1;
      codeSize = minimumCodeSize + 1;
    }
    prefix = symbol;
  }
  emit(prefix);
  emit(endCode);
  if (bitCount > 0) output.push(bitBuffer & 0xff);
  return Buffer.from(output);
}

function subBlocks(bytes) {
  const parts = [];
  for (let offset = 0; offset < bytes.length; offset += 255) {
    const chunk = bytes.subarray(offset, offset + 255);
    parts.push(Buffer.from([chunk.length]), chunk);
  }
  parts.push(Buffer.from([0]));
  return Buffer.concat(parts);
}

// frames: [{ pixels: Uint8Array of global colour indices, delay }]
export function encodeGif({ width, height, colours, frames }) {
  // One table slot beyond the colours is the transparent "unchanged" index.
  const transparent = colours.length;
  let tableBits = 1;
  while ((1 << tableBits) < colours.length + 1) tableBits += 1;
  const table = Buffer.alloc((1 << tableBits) * 3);
  colours.forEach(([red, green, blue], index) => table.set([red, green, blue], index * 3));
  const minimumCodeSize = Math.max(2, tableBits);

  const screen = Buffer.alloc(7);
  screen.writeUInt16LE(width, 0);
  screen.writeUInt16LE(height, 2);
  screen[4] = 0x80 | ((tableBits - 1) << 4) | (tableBits - 1);
  const parts = [
    Buffer.from("GIF89a", "ascii"), screen, table,
    // NETSCAPE2.0 application extension: loop forever.
    Buffer.from([0x21, 0xff, 0x0b]), Buffer.from("NETSCAPE2.0", "ascii"),
    Buffer.from([0x03, 0x01, 0x00, 0x00, 0x00]),
  ];

  const shown = new Uint8Array(width * height).fill(255);
  // Merge each frame that changes nothing into the previous frame's delay.
  const merged = [];
  for (const frame of frames) {
    let changed = false;
    const previous = merged.at(-1);
    if (previous !== undefined) {
      for (let index = 0; index < frame.pixels.length; index += 1) {
        if (frame.pixels[index] !== previous.pixels[index]) { changed = true; break; }
      }
    }
    if (previous !== undefined && !changed) previous.delay += frame.delay;
    else merged.push({ pixels: frame.pixels, delay: frame.delay });
  }

  for (const frame of merged) {
    let left = width;
    let top = height;
    let right = -1;
    let bottom = -1;
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const index = y * width + x;
        if (frame.pixels[index] !== shown[index]) {
          if (x < left) left = x;
          if (x > right) right = x;
          if (y < top) top = y;
          if (y > bottom) bottom = y;
        }
      }
    }
    if (right < 0) { left = 0; top = 0; right = 0; bottom = 0; }
    const boxWidth = right - left + 1;
    const boxHeight = bottom - top + 1;
    const box = new Uint8Array(boxWidth * boxHeight);
    for (let y = 0; y < boxHeight; y += 1) {
      for (let x = 0; x < boxWidth; x += 1) {
        const index = (top + y) * width + left + x;
        const value = frame.pixels[index];
        box[y * boxWidth + x] = value === shown[index] ? transparent : value;
        shown[index] = value;
      }
    }
    const control = Buffer.from([0x21, 0xf9, 0x04, 0x05, 0, 0, transparent, 0x00]);
    control.writeUInt16LE(frame.delay, 4);
    const descriptor = Buffer.alloc(10);
    descriptor[0] = 0x2c;
    descriptor.writeUInt16LE(left, 1);
    descriptor.writeUInt16LE(top, 3);
    descriptor.writeUInt16LE(boxWidth, 5);
    descriptor.writeUInt16LE(boxHeight, 7);
    parts.push(control, descriptor, Buffer.from([minimumCodeSize]),
      subBlocks(lzwEncode(box, minimumCodeSize)));
  }
  parts.push(Buffer.from([0x3b]));
  return { bytes: Buffer.concat(parts), frames: merged.length };
}

// --- Frames ---------------------------------------------------------------

function loadFrames(first, end) {
  const colourIndex = new Map();
  const colours = [];
  const frames = [];
  for (let frame = first; frame < end; frame += 1) {
    const framePath = `${framePrefix}-${String(frame).padStart(3, "0")}.png`;
    invariant(fs.existsSync(framePath), `Captured frame is missing: ${path.relative(rootDirectory, framePath)}`);
    const image = readIndexedPng(fs.readFileSync(framePath));
    invariant(image.width === 336 && image.height === 240,
      `${path.relative(rootDirectory, framePath)} is ${image.width}x${image.height}, not the ` +
      "native 336x240; the capture needs a desktop SDL video driver");
    const pixels = new Uint8Array(GIF_SCENE.width * GIF_SCENE.height);
    for (let y = 0; y < GIF_SCENE.height; y += 1) {
      for (let x = 0; x < GIF_SCENE.width; x += 1) {
        const source = image.indices[y * image.width + x + GIF_SCENE.cropX] * 3;
        const rgb = [image.palette[source], image.palette[source + 1], image.palette[source + 2]];
        const key = (rgb[0] << 16) | (rgb[1] << 8) | rgb[2];
        let index = colourIndex.get(key);
        if (index === undefined) {
          index = colours.length;
          colourIndex.set(key, index);
          colours.push(rgb);
        }
        pixels[y * GIF_SCENE.width + x] = index;
      }
    }
    frames.push({ pixels, delay: GIF_SCENE.delayCentiseconds });
  }
  invariant(colours.length <= 255, `${colours.length} colours do not fit a GIF table with a transparent slot`);
  return { colours, frames };
}

export function generateGif({ reuse = false } = {}) {
  if (!reuse) capture();
  invariant(fs.existsSync(traceCsvPath), `Trace CSV is missing: ${path.relative(rootDirectory, traceCsvPath)}`);
  const scene = sceneWindow(fs.readFileSync(traceCsvPath, "utf8"));
  const { colours, frames } = loadFrames(scene.first, scene.end);
  const { bytes, frames: gifFrames } = encodeGif({
    width: GIF_SCENE.width, height: GIF_SCENE.height, colours, frames,
  });
  invariant(bytes.length <= 5_000_000, `GIF is ${bytes.length} B, over the 5 MB budget`);
  const outputPath = path.join(rootDirectory, GIF_PATH);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, bytes);

  const atr = fs.readFileSync(path.join(rootDirectory, "dist", "void-strike-65.atr"));
  const entry = {
    path: GIF_PATH,
    description: "Level 1 from the ATR: a Bomber and an Interceptor, the Spread Shot capsule and its " +
      "three-shot fan with the single follow-up, then the capital corridor and the first BROADSIDE",
    source_medium: "ATR",
    atr_sha256: sha256(atr),
    emulator: "Atari800 7.1.2 PAL XL",
    replay: GIF_SCENE.session,
    generatedBy: "scripts/showcase-gif.mjs",
    gameplay_frames: [scene.first, scene.end - 1],
    landmarks: { spread_collected: scene.spreadFrame, first_broadside: scene.broadsideFrame },
    source_frames: frames.length,
    gif_frames: gifFrames,
    seconds: frames.length / 50,
    frame_delay_centiseconds: GIF_SCENE.delayCentiseconds,
    colours: colours.length,
    width: GIF_SCENE.width,
    height: GIF_SCENE.height,
    bytes: bytes.length,
    sha256: sha256(bytes),
  };
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  manifest.animations = [entry];
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  return entry;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const entry = generateGif({ reuse: process.argv.includes("--reuse") });
  console.log(`Gameplay GIF: ${entry.path}`);
  console.log(`  frames  : ${entry.gameplay_frames.join("-")} (${entry.source_frames} PAL frames, ` +
    `${entry.seconds} s, ${entry.gif_frames} GIF frames)`);
  console.log(`  colours : ${entry.colours}`);
  console.log(`  bytes   : ${entry.bytes}`);
}
