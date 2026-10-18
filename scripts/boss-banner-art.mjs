// feat/boss-banners (owner decision AL 2): the four boss loading-screen
// banners, drawn as the bosses look in the game now (after feat/boss-art and
// feat/boss-order-scale). Each banner is a 160 x 64 one-bit picture - ANTIC
// mode F pixels, white on black - and this script is its editable source: it
// draws every picture with a few primitives and writes them as RGBA PNGs to
// assets/graphics/boss-banners/ (`node scripts/boss-banner-art.mjs`). The PNGs
// are what the build reads; the owner may edit them by hand and stop running
// this script, as with the band drafts (scripts/boss-r2-art.mjs).
//
// Style: line art on black, lit from the upper left like the bands; mid tones
// only as row-periodic patterns (a scanline hatch, a checker), which keep a
// picture's packed size down (scripts/boss-banner-preview.mjs reports it).
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";

export const BANNER_WIDTH = 160;
export const BANNER_HEIGHT = 64;

const rootDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const BANNER_DIRECTORY = path.join(rootDirectory, "assets", "graphics", "boss-banners");

// ---------------------------------------------------------------------------
// The canvas
// ---------------------------------------------------------------------------

export class Canvas {
  constructor(width = BANNER_WIDTH, height = BANNER_HEIGHT) {
    this.width = width;
    this.height = height;
    this.px = new Uint8Array(width * height);
  }

  inside(x, y) { return x >= 0 && y >= 0 && x < this.width && y < this.height; }
  get(x, y) { return this.inside(x, y) ? this.px[y * this.width + x] : 0; }
  set(x, y, v = 1) { if (this.inside(x, y)) this.px[y * this.width + x] = v ? 1 : 0; return this; }

  // A filled rectangle; `ink` is 1, 0 or a pattern (x, y) -> 0/1.
  rect(x, y, w, h, ink = 1) {
    for (let j = y; j < y + h; j += 1) {
      for (let i = x; i < x + w; i += 1) this.set(i, j, typeof ink === "function" ? ink(i, j) : ink);
    }
    return this;
  }

  frame(x, y, w, h, ink = 1) {
    this.rect(x, y, w, 1, ink).rect(x, y + h - 1, w, 1, ink);
    return this.rect(x, y, 1, h, ink).rect(x + w - 1, y, 1, h, ink);
  }

  hline(x0, x1, y, ink = 1) { return this.rect(Math.min(x0, x1), y, Math.abs(x1 - x0) + 1, 1, ink); }
  vline(x, y0, y1, ink = 1) { return this.rect(x, Math.min(y0, y1), 1, Math.abs(y1 - y0) + 1, ink); }

  line(x0, y0, x1, y1, ink = 1) {
    [x0, y0, x1, y1] = [x0, y0, x1, y1].map(Math.round);
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let error = dx + dy;
    for (;;) {
      this.set(x0, y0, typeof ink === "function" ? ink(x0, y0) : ink);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * error;
      if (e2 >= dy) { error += dy; x0 += sx; }
      if (e2 <= dx) { error += dx; y0 += sy; }
    }
    return this;
  }

  // A polygon filled by the even-odd rule at pixel centres.
  poly(points, ink = 1) {
    const ys = points.map(([, y]) => y);
    for (let y = Math.floor(Math.min(...ys)); y <= Math.ceil(Math.max(...ys)); y += 1) {
      const cy = y + 0.5;
      const xs = [];
      for (let k = 0; k < points.length; k += 1) {
        const [ax, ay] = points[k];
        const [bx, by] = points[(k + 1) % points.length];
        if ((ay <= cy && by > cy) || (by <= cy && ay > cy)) xs.push(ax + (cy - ay) * (bx - ax) / (by - ay));
      }
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        for (let x = Math.ceil(xs[k] - 0.5); x <= Math.floor(xs[k + 1] - 0.5); x += 1) {
          this.set(x, y, typeof ink === "function" ? ink(x, y) : ink);
        }
      }
    }
    return this;
  }

  // A filled ellipse (pixel centres inside), or its ring of width `ring`.
  ellipse(cx, cy, rx, ry, ink = 1, ring = 0) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y += 1) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x += 1) {
        const d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2;
        if (d > 1) continue;
        if (ring > 0) {
          const inner = ((x - cx) / (rx - ring)) ** 2 + ((y - cy) / (ry - ring)) ** 2;
          if (rx - ring > 0 && ry - ring > 0 && inner <= 1) continue;
        }
        this.set(x, y, typeof ink === "function" ? ink(x, y) : ink);
      }
    }
    return this;
  }

  // Copy the left half onto the right half, mirrored (a symmetric hull).
  mirror(axis = this.width / 2) {
    for (let y = 0; y < this.height; y += 1) {
      for (let x = 0; x < axis; x += 1) this.set(Math.round(2 * axis - 1 - x), y, this.get(x, y));
    }
    return this;
  }

  // A new canvas whose pixel (x, y) is this one's at map(x, y) (nearest).
  warp(width, height, map) {
    const out = new Canvas(width, height);
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const source = map(x, y);
        if (source !== null) out.set(x, y, this.get(Math.floor(source[0]), Math.floor(source[1])));
      }
    }
    return out;
  }

  // Mode F bytes: 20 a line, MSB = leftmost pixel, set bit = white.
  toBytes() {
    const bytes = new Uint8Array((this.width / 8) * this.height);
    for (let y = 0; y < this.height; y += 1) {
      for (let x = 0; x < this.width; x += 1) {
        if (this.get(x, y)) bytes[y * (this.width / 8) + (x >> 3)] |= 0x80 >> (x & 7);
      }
    }
    return bytes;
  }
}

// Row-periodic tones.
export const tone = {
  hatch: (x, y) => (y & 1) === 0 ? 1 : 0,          // every other line
  checker: (x, y) => ((x + y) & 1) === 0 ? 1 : 0,   // 50 %
  sparse: (x, y) => (y & 1) === 0 && (x & 1) === 0 ? 1 : 0,   // 25 %
  dots: (x, y) => (y & 3) === 1 && (x & 3) === 1 ? 1 : 0,     // 1 in 16
  dense: (x, y) => ((y & 1) === 0 || (x & 1) === 0) ? 1 : 0,  // 75 %
};

// ---------------------------------------------------------------------------
// PNG out (8-bit RGBA, the repository's reader: scripts/preview.mjs
// decodeRgbaReferencePng)
// ---------------------------------------------------------------------------

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buffer) {
  let c = 0xffffffff;
  for (const byte of buffer) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, "ascii");
  data.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}

export function encodeBannerPng(canvas) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(canvas.width, 0);
  header.writeUInt32BE(canvas.height, 4);
  header[8] = 8;
  header[9] = 6;
  const raw = Buffer.alloc((canvas.width * 4 + 1) * canvas.height);
  for (let y = 0; y < canvas.height; y += 1) {
    for (let x = 0; x < canvas.width; x += 1) {
      const v = canvas.get(x, y) ? 255 : 0;
      raw.set([v, v, v, 255], y * (canvas.width * 4 + 1) + 1 + x * 4);
    }
  }
  return Buffer.concat([PNG_SIGNATURE, chunk("IHDR", header),
    chunk("IDAT", zlib.deflateSync(raw, { level: 9 })), chunk("IEND", Buffer.alloc(0))]);
}

// ---------------------------------------------------------------------------
// The bosses
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Shared parts
// ---------------------------------------------------------------------------

// A hollow shape: a white outline around a pattern (or black) inside.
function hollowRect(c, x, y, w, h, inside = 0) {
  c.rect(x, y, w, h, 1);
  return c.rect(x + 1, y + 1, w - 2, h - 2, inside);
}

// A laser projector (region 1's emitter.png, region 3's cannons): a cap on
// a mast, a stepped tower of three blocks widening downward, a round lens at
// its foot.
function projector(c, cx, top, bottom, half, { lens = true } = {}) {
  const y1 = bottom - (lens ? 6 : 0);
  const step = Math.max(3, Math.floor((y1 - top - 3) / 3));
  c.rect(cx - 1, top, 3, 3, 1);
  for (let k = 0; k < 3; k += 1) {
    const w = Math.max(1, Math.round(half * (k + 1) / 3));
    const y = top + 3 + k * step;
    const h = k === 2 ? y1 - y : step - 1;
    hollowRect(c, cx - w, y, 2 * w + 1, h, tone.hatch);
  }
  c.vline(cx, top + 3, y1 - 1, 1);
  if (lens) {
    c.rect(cx - 1, y1, 3, 1, 1);
    c.ellipse(cx, bottom - 3, 3.6, 2.6, 1);
    c.ellipse(cx, bottom - 3, 1.8, 1.2, 0);
    c.set(cx - 2, bottom - 5, 0);
    // Phase B polish: the lens's glint.
    c.set(cx, bottom - 3, 1);
  }
}

// Region 1's pulse turret: a saucer with a slot on two struts, a stepped
// muzzle under it.
function pulseTurret(c, cx, top, strutTop) {
  c.vline(cx - 2, strutTop, top, 1).vline(cx + 3, strutTop, top, 1);
  c.ellipse(cx + 0.5, top + 3.5, 7.5, 3.5, 1);
  c.ellipse(cx + 0.5, top + 3.5, 5.5, 1.6, 0);
  c.hline(cx - 3, cx + 4, top + 3, 1);
  // Phase B polish: lit from above - the saucer's underside in shadow.
  c.hline(cx - 5, cx + 6, top + 6, tone.checker);
  c.rect(cx - 2, top + 7, 6, 2, 1).rect(cx - 1, top + 9, 4, 2, 1).rect(cx, top + 11, 2, 2, 1);
}

// Regions 2-3's pulse gun: a T - a wide head with a lamp slot, a banded stalk.
function tGun(c, cx, top, height = 14) {
  hollowRect(c, cx - 5, top, 12, 5, 0);
  c.rect(cx - 2, top + 2, 6, 1, 1);
  c.rect(cx - 1, top + 5, 4, height - 5, 1);
  for (let y = top + 7; y < top + height; y += 2) c.hline(cx - 1, cx + 2, y, 0);
  c.rect(cx - 1, top + height, 4, 2, 1);
}

// ---------------------------------------------------------------------------
// The bosses
// ---------------------------------------------------------------------------

// Region 1 - BLOCKADE BREAKER (assets/graphics/boss-regions/region-1/,
// docs/design/boss-banners/r1-twin-lasers-note.md): one continuous deck end
// to end with an engine block and three nozzles at each end; under it the
// hanging weapons on short struts - two laser projector towers (stepped
// tower, mast, round lens) symmetric about the centre, pulse turrets between
// and beyond them; under the weapons a thin belt of armour plates; nothing
// below the belt.
function drawBlockadeBreaker() {
  const c = new Canvas();
  // The engine block and its three nozzles (left half; mirrored).
  hollowRect(c, 6, 6, 14, 44, 0);
  c.rect(8, 8, 10, 40, tone.hatch);
  c.vline(8, 8, 47, 1);
  for (const y of [13, 25, 37]) {
    c.poly([[0, y - 3], [6, y - 1], [6, y + 5], [0, y + 7]], 1);
    c.poly([[1, y - 1], [5, y], [5, y + 4], [1, y + 5]], 0);
    c.hline(1, 5, y + 2, tone.checker);
    hollowRect(c, 10, y, 6, 5, 0);
  }
  // The deck: a lit lip, a run of plates with slots, its shadowed underside.
  c.rect(19, 6, 61, 2, 1);
  for (let k = 0, x = 20; x < 80; k += 1, x += 12) {
    c.rect(x, 9, 11, 9, 1);
    if (k % 2 === 0) hollowRect(c, x + 3, 11, 6, 4, 0);
    else for (let v = x + 3; v < x + 9; v += 2) c.vline(v, 11, 15, 0);
    // Phase B polish: each plate's lower edge in shadow.
    c.hline(x, x + 10, 17, tone.checker);
  }
  c.rect(19, 19, 61, 3, tone.hatch);
  c.hline(19, 79, 22, 1);
  // The hanging weapons.
  pulseTurret(c, 29, 27, 23);
  projector(c, 46, 23, 47, 8);
  pulseTurret(c, 63, 27, 23);
  // The centre slot's turret (on the axis, drawn whole).
  c.vline(76, 23, 27, 1);
  c.ellipse(79.5, 31, 9, 4, 1);
  c.ellipse(79.5, 31, 7, 2, 0);
  c.hline(74, 85, 31, 1);
  c.hline(72, 87, 34, tone.checker);
  c.rect(76, 35, 8, 2, 1).rect(77, 37, 6, 2, 1).rect(78, 39, 4, 2, 1);
  // The belt: one row of plates, lit edge on top, a rivet line, a shadow.
  for (const [x0, x1] of [[20, 37], [39, 54], [56, 80]]) {
    c.rect(x0, 50, x1 - x0, 5, 1);
    c.hline(x0 + 1, x1 - 2, 52, tone.sparse);
    c.hline(x0, x1 - 1, 55, tone.checker);
  }
  return c.mirror();
}

// Region 2 - VOID CITADEL (assets/graphics/boss-regions/region-4/,
// docs/design/boss-banners/r4-void-citadel-note.md): an octagonal fortress -
// one riveted deck along the top with cut corners, side walls; the void core
// at the centre hung under the deck (a black void in a bright rim and a glow
// ring) with its lens under it; two narrow laser cannons hugging the core,
// a dark wall beside each; three pulse guns a side; the salvo spires against
// the hull's ends (twin needles); a one-row armour belt; the gravity column
// (missile M0, a white S-wave under the core) as an option.
function drawVoidCitadel({ column = false } = {}) {
  const c = new Canvas();
  // The deck: a riveted beam with cut corners, the side walls under it.
  c.poly([[30, 9], [36, 3], [80, 3], [80, 12], [36, 12], [36, 46], [30, 40]], 1);
  c.poly([[32, 10], [37, 5], [80, 5], [80, 10], [38, 10], [38, 44], [32, 39]], tone.hatch);
  for (let x = 40; x < 80; x += 4) c.set(x, 7, 0).set(x + 1, 7, 0);
  c.hline(36, 79, 12, 1);
  // Phase B polish: the deck's underside in shadow.
  c.hline(38, 79, 13, tone.checker);
  // The salvo spire against the hull's end: twin needles on a pod.
  for (const x of [20, 25]) {
    c.poly([[x, 2], [x + 2, 2], [x + 3, 34], [x - 1, 34]], 1);
    c.vline(x + 1, 6, 32, 0);
  }
  c.rect(18, 22, 12, 2, 1);
  hollowRect(c, 18, 34, 12, 8, 0);
  c.rect(21, 36, 6, 4, tone.checker);
  c.poly([[21, 42], [27, 42], [25, 46], [23, 46]], 1);
  // Three pulse guns hanging from the deck.
  tGun(c, 43, 13, 13);
  tGun(c, 53, 13, 13);
  c.vline(48, 13, 46, 1);
  // The dark wall beside the cannon, its rivets.
  c.rect(58, 13, 4, 32, 1);
  for (let y = 16; y < 44; y += 4) c.set(59, y, 0).set(60, y, 0);
  // The narrow laser cannon hugging the core.
  projector(c, 66, 13, 42, 4, { lens: false });
  c.rect(64, 42, 6, 3, 1);
  // The void core: a glow ring, a bright rim, a black void; the lens below.
  c.ellipse(79.5, 26, 10, 12, tone.checker, 2);
  c.ellipse(79.5, 26, 8, 10, 1, 2);
  c.ellipse(79.5, 26, 6, 8, 0);
  c.line(74, 31, 77, 33, 1);
  c.ellipse(79.5, 43, 5, 2.5, 1);
  c.hline(76, 83, 43, 0);
  c.set(79, 43, 1).set(80, 43, 1);
  // The belt.
  c.rect(37, 48, 43, 4, 1);
  for (let x = 40; x < 80; x += 6) c.rect(x, 49, 3, 2, 0);
  c.hline(37, 79, 52, tone.checker);
  c.mirror();
  // Phase B polish: a glint on the void's rim, upper left (the centre's 32
  // pixels need not mirror).
  c.set(75, 20, 0).set(76, 19, 0);
  if (column) {
    // The gravity column: a faint S-wave down from the lens.
    for (let y = 47; y < 64; y += 1) {
      const x = Math.round(79.5 + 3 * Math.sin((y - 47) * Math.PI / 8));
      if ((y & 1) === 0) c.set(x, y, 1).set(x + 1, y, 1);
    }
  }
  return c;
}

// Region 3 - SIEGE SPINE (assets/graphics/boss-regions/region-3/): a long
// spine of rounded segments, each with a dorsal spike and a mast; the siege
// cannon at the centre (a dome over a big cone), a laser cone each side,
// T-guns between; an engine pod at each end with three nozzles out; two
// pairs of armour plates under the spine; the force field's row at the
// bottom (decision AO 2). Side-on: as the band shows it.
function drawSiegeSpineSide({ width = BANNER_WIDTH } = {}) {
  const c = new Canvas(width);
  const axis = width / 2;
  const centre = Math.floor(axis) - 1;
  // The engine pod (left; mirrored): a barrel with its rings, three nozzles.
  c.ellipse(13, 24, 8, 11, 1);
  c.ellipse(13, 24, 6, 9, 0);
  c.rect(9, 18, 9, 13, tone.hatch);
  c.vline(13, 17, 31, 1);
  for (const y of [16, 23, 30]) c.poly([[0, y], [5, y + 1], [5, y + 3], [0, y + 4]], 1);
  // The spine: segments with a dorsal spike and a mast each, to the cannon.
  for (let x = 22; x + 9 < centre - 8; x += 10) {
    c.poly([[x, 16], [x + 2, 13], [x + 7, 13], [x + 9, 16], [x + 9, 28], [x + 7, 31], [x + 2, 31], [x, 28]], 1);
    c.rect(x + 2, 16, 6, 12, tone.hatch);
    c.rect(x + 3, 20, 4, 4, 0);
    // Phase B polish: the segment's belly in shadow.
    c.hline(x + 1, x + 8, 29, tone.checker);
    c.poly([[x + 1, 13], [x + 4, 7], [x + 5, 7], [x + 8, 13]], 1);
    c.vline(x + 4, 1, 7, 1);
  }
  c.hline(20, centre, 21, 1);
  // Under the spine: T-guns and the laser cone, every 40 columns.
  for (let x = 26; x < centre - 12; x += 40) {
    tGun(c, x, 32, 12);
    if (x + 19 < centre - 12) projector(c, x + 19, 31, 50, 7);
  }
  tGun(c, centre - 13, 32, 12);
  // The armour plates (two per side).
  hollowRect(c, centre - 46, 51, 21, 7, 0).rect(centre - 44, 53, 17, 3, tone.sparse);
  hollowRect(c, centre - 24, 51, 14, 7, 0).rect(centre - 22, 53, 10, 3, tone.sparse);
  // The force field: one row of the field glyph, a zigzag under the hull.
  for (let x = 18; x < axis; x += 1) c.set(x, 60 + (x & 2 ? 1 : 0), 1);
  c.mirror(axis);
  // The siege cannon on the axis: a dome over the spine, a big cone under it.
  const cx = Math.floor(axis - 0.5);
  c.rect(cx - 9, 1, 20, 13, 0);
  c.ellipse(axis - 0.5, 9, 9, 6, 1);
  c.ellipse(axis - 0.5, 9, 7, 4, 0);
  c.hline(cx - 6, cx + 7, 9, 1);
  c.ellipse(axis - 0.5, 9, 3, 1, 1);
  // Phase B polish: the dome's lit crown.
  c.hline(cx - 3, cx + 4, 4, 0);
  c.rect(cx - 9, 14, 20, 40, 0);
  c.rect(cx - 7, 14, 16, 3, 1);
  projector(c, cx, 17, 50, 10);
  return c;
}

// The Siege Spine head-on: the side-on picture drawn wider (more segments)
// and seen in perspective from in front of its left end - the near end large
// at the left, the spine running away to the right.
function drawSiegeSpineFront() {
  const wide = drawSiegeSpineSide({ width: 200 });
  const near = 1.12;
  const far = 0.72;
  const horizon = 30;
  // Target column x shows source column u(x): a perspective ramp; a column's
  // scale is linear in u between the near and the far end.
  const W = BANNER_WIDTH;
  const scaleAt = (u) => near + (far - near) * (u / wide.width);
  const columnSource = [];
  let u = 0;
  for (let x = 0; x < W; x += 1) {
    columnSource.push(u);
    u += 1 / scaleAt(u) * (wide.width / (W * 1.02)) * ((near + far) / 2);
  }
  return wide.warp(W, BANNER_HEIGHT, (x, y) => {
    const source = columnSource[x];
    if (source >= wide.width) return null;
    const scale = scaleAt(source);
    const sy = horizon + (y - horizon - (near - scale) * 6) / scale;
    return sy < 0 || sy >= wide.height ? null : [source, sy];
  });
}

// Region 4 - BASTION (assets/graphics/boss-regions/region-2/,
// docs/design/boss-banners/r2-bastion-note.md, decisions AT-AV, AX 5/19/20):
// one overhead track edge to edge; the dome hangar at the centre with the
// sphere core inside it and the gate at its foot; an armoured cannon bay each
// side (a pointed spire with fins narrowing into a long barrel and a squared
// muzzle brake, the gate's bars under it); a gun rail each side - a lattice
// girder from the frame's edge to a striped buffer with its L foot, pod
// turrets hanging from it; the dashed guide track between buffer and bay.
// `rails` "off": the rails run off the picture's edges, as in the game;
// "framed": the track ends inside the picture, each rail short and whole.
function drawBastion({ framed = false } = {}) {
  const c = new Canvas();
  const left = framed ? 7 : 0;
  // The track: a steel beam with a rivet line, the lattice band under it.
  c.rect(left, 2, 80 - left, 7, 1);
  c.hline(left, 79, 4, 0).hline(left, 79, 7, tone.checker);
  for (let x = left + 3; x < 80; x += 6) c.set(x, 4, 1);
  if (framed) {
    // The track's end cap.
    hollowRect(c, 2, 0, 7, 12, 0);
    c.rect(4, 2, 3, 8, tone.hatch);
  }
  // The gun rail: a lattice girder under the track out to the buffer.
  const railEnd = 36;
  c.hline(left, railEnd, 10, 1).hline(left, railEnd, 16, 1);
  for (let x = left; x < railEnd; x += 4) c.line(x, 11, x + 2, 15, 1).line(x + 2, 15, x + 4, 11, 1);
  // Pod turrets: a mount, an inverted wedge with a visor and a lamp.
  const pod = (cx) => {
    c.rect(cx - 6, 17, 13, 3, 1);
    c.poly([[cx - 7, 20], [cx + 8, 20], [cx + 2, 34], [cx - 1, 34]], 1);
    hollowRect(c, cx - 4, 21, 9, 4, 0);
    c.rect(cx - 2, 22, 5, 2, tone.checker);
    c.poly([[cx - 2, 26], [cx + 3, 26], [cx + 1, 31], [cx, 31]], 0);
    c.rect(cx, 34, 2, 2, 1);
  };
  if (framed) pod(23);
  else { pod(6); pod(24); }
  // The striped buffer at the rail's front: a post with hazard stripes, a
  // rounded buffer head, the L foot reaching inward along the armour row.
  c.rect(railEnd, 10, 6, 40, 1);
  for (let y = 12; y < 47; y += 4) c.line(railEnd + 1, y + 3, railEnd + 4, y, 0).line(railEnd + 2, y + 3, railEnd + 4, y + 1, 0);
  c.ellipse(railEnd + 7, 24, 3, 4, 1);
  c.rect(railEnd + 6, 22, 2, 4, 0);
  c.rect(railEnd + 6, 46, 9, 5, 1);
  c.hline(railEnd + 7, railEnd + 13, 48, 0);
  // The dashed guide track ahead of the buffer.
  for (let x = railEnd + 10; x < 52; x += 4) c.hline(x, x + 1, 12, 1);
  // The cannon in its bay: a mounting plate, an armoured spire with two fins
  // narrowing into a long barrel, a squared muzzle brake; under it, between
  // the cannon and the player, the bay's armour - the gate's bars.
  const cx = 58;
  c.rect(cx - 6, 9, 13, 3, 1);
  c.poly([[cx - 6, 12], [cx + 7, 12], [cx + 3, 28], [cx - 2, 28]], 1);
  c.poly([[cx - 4, 13], [cx + 1, 13], [cx, 26], [cx - 1, 26]], tone.hatch);
  c.poly([[cx - 6, 15], [cx - 10, 29], [cx - 4, 24]], 1);
  c.poly([[cx + 7, 15], [cx + 11, 29], [cx + 5, 24]], 1);
  c.rect(cx - 1, 28, 3, 13, 1);
  c.vline(cx + 1, 29, 40, 0);
  c.rect(cx - 3, 41, 7, 4, 1);
  c.rect(cx - 1, 42, 3, 2, 0);
  c.rect(cx - 8, 48, 18, 7, 1);
  for (let x = cx - 7; x < cx + 9; x += 3) c.rect(x, 49, 1, 5, 0);
  // The dome hangar: a riveted steel rim, the sphere core inside it.
  // Phase B polish: a black gap around the dome below the track, so the
  // cannons' fins and the rim read as separate parts.
  for (let y = 11; y < 46; y += 1) {
    for (let x = 56; x < 80; x += 1) {
      const d = Math.hypot(x - 79.5, y - 25);
      if (d > 19 && d <= 20.4) c.set(x, y, 0);
    }
  }
  c.ellipse(79.5, 25, 19, 19, 1, 2);
  c.ellipse(79.5, 25, 15.5, 15.5, 1, 1);
  for (let k = 0; k < 10; k += 1) {
    const a = Math.PI * (0.55 + k * 0.09);
    c.set(Math.round(79.5 + 18 * Math.cos(a)), Math.round(25 - 18 * Math.sin(a)), 0);
  }
  c.mirror();
  // The core: a sphere lit from the upper left - white above, the hatch
  // below (orange to red in the game), a white eye and a shine.
  c.ellipse(79.5, 26, 12, 12, 0);
  c.ellipse(79.5, 26, 11, 11, (x, y) => (y < 25 ? 1 : tone.hatch(x, y)));
  c.ellipse(76, 21, 4, 3, 0);
  c.ellipse(75.5, 20.5, 1.5, 1.2, 1);
  c.ellipse(79.5, 26, 11, 11, 1, 1);
  // The gate at the dome's foot: one barred door.
  hollowRect(c, 69, 44, 22, 11, 0);
  for (let x = 71; x < 90; x += 3) c.rect(x, 46, 2, 7, 1);
  return c;
}

// Each picture names the boss directory it draws (assets/graphics/boss-regions/
// region-N/); the region it shows at is the disk's order (order.json).
export const BANNERS = Object.freeze([
  { id: "blockade-breaker", boss: "Blockade Breaker", directory: 1, draw: drawBlockadeBreaker },
  { id: "void-citadel", boss: "Void Citadel", directory: 4, draw: () => drawVoidCitadel() },
  { id: "void-citadel-column", boss: "Void Citadel", directory: 4, variant: "the gravity column", draw: () => drawVoidCitadel({ column: true }) },
  { id: "siege-spine-side", boss: "Siege Spine", directory: 3, variant: "side-on", draw: drawSiegeSpineSide },
  { id: "siege-spine-front", boss: "Siege Spine", directory: 3, variant: "head-on", draw: drawSiegeSpineFront },
  { id: "bastion-rails", boss: "Bastion", directory: 2, variant: "rails off the edges", draw: () => drawBastion() },
  { id: "bastion-framed", boss: "Bastion", directory: 2, variant: "framed", draw: () => drawBastion({ framed: true }) },
]);

export function drawBanner(id) {
  const banner = BANNERS.find((entry) => entry.id === id);
  if (banner === undefined) throw new Error(`no banner ${id}`);
  return banner.draw();
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  fs.mkdirSync(BANNER_DIRECTORY, { recursive: true });
  for (const banner of BANNERS) {
    const file = path.join(BANNER_DIRECTORY, `${banner.id}.png`);
    fs.writeFileSync(file, encodeBannerPng(banner.draw()));
    console.log(`${path.relative(rootDirectory, file)}: ${banner.boss}`);
  }
}
