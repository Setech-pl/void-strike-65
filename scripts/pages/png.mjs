// Minimal PNG read/write for the GitHub page tools (docs/plans/enemies-bosses-pages.md).
// Node's zlib only - no image dependency. Reads 8-bit greyscale, RGB, RGBA and
// indexed (1/2/4/8-bit) non-interlaced PNGs; writes 8-bit RGB or RGBA.

import zlib from "node:zlib";

const SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes) {
  let c = 0xffffffff;
  for (const byte of bytes) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "latin1"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

// image: { width, height, channels (3|4), data: Uint8Array width*height*channels }
export function encodePng(image) {
  const { width, height, channels, data } = image;
  if (channels !== 3 && channels !== 4) throw new Error("encodePng: 3 or 4 channels");
  const stride = width * channels;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0;
    Buffer.from(data.buffer, data.byteOffset + y * stride, stride).copy(raw, y * (stride + 1) + 1);
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = channels === 4 ? 6 : 2;
  return Buffer.concat([
    SIGNATURE,
    chunk("IHDR", header),
    chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  return pb <= pc ? b : c;
}

// Returns { width, height, channels: 4, data } (always RGBA).
export function decodePng(bytes) {
  if (!SIGNATURE.equals(bytes.subarray(0, 8))) throw new Error("decodePng: not a PNG");
  let offset = 8;
  let header = null;
  let palette = null;
  let transparency = null;
  const idat = [];
  while (offset < bytes.length) {
    const length = bytes.readUInt32BE(offset);
    const type = bytes.toString("latin1", offset + 4, offset + 8);
    const data = bytes.subarray(offset + 8, offset + 8 + length);
    if (type === "IHDR") {
      header = {
        width: data.readUInt32BE(0), height: data.readUInt32BE(4),
        depth: data[8], colour: data[9], interlace: data[12],
      };
    } else if (type === "PLTE") palette = data;
    else if (type === "tRNS") transparency = data;
    else if (type === "IDAT") idat.push(data);
    else if (type === "IEND") break;
    offset += length + 12;
  }
  if (!header) throw new Error("decodePng: no IHDR");
  if (header.interlace !== 0) throw new Error("decodePng: interlaced PNG");
  const samples = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[header.colour];
  if (samples === undefined) throw new Error(`decodePng: colour type ${header.colour}`);
  if (header.depth !== 8 && !(header.colour === 3 && [1, 2, 4].includes(header.depth))) {
    throw new Error(`decodePng: bit depth ${header.depth} on colour type ${header.colour}`);
  }
  const bitsPerPixel = samples * header.depth;
  const stride = Math.ceil((header.width * bitsPerPixel) / 8);
  const bpp = Math.max(1, bitsPerPixel >> 3);
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const rows = Buffer.alloc(stride * header.height);
  for (let y = 0; y < header.height; y += 1) {
    const filter = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let x = 0; x < stride; x += 1) {
      const a = x >= bpp ? rows[y * stride + x - bpp] : 0;
      const b = y > 0 ? rows[(y - 1) * stride + x] : 0;
      const c = x >= bpp && y > 0 ? rows[(y - 1) * stride + x - bpp] : 0;
      const value = line[x];
      rows[y * stride + x] = (filter === 0 ? value
        : filter === 1 ? value + a
          : filter === 2 ? value + b
            : filter === 3 ? value + ((a + b) >> 1)
              : value + paeth(a, b, c)) & 0xff;
    }
  }
  const out = new Uint8Array(header.width * header.height * 4);
  for (let y = 0; y < header.height; y += 1) {
    for (let x = 0; x < header.width; x += 1) {
      const o = (y * header.width + x) * 4;
      if (header.colour === 3) {
        const bit = x * header.depth;
        const byte = rows[y * stride + (bit >> 3)];
        const index = (byte >> (8 - header.depth - (bit & 7))) & ((1 << header.depth) - 1);
        out[o] = palette[index * 3];
        out[o + 1] = palette[index * 3 + 1];
        out[o + 2] = palette[index * 3 + 2];
        out[o + 3] = transparency && index < transparency.length ? transparency[index] : 255;
      } else {
        const p = y * stride + x * samples;
        const grey = header.colour === 0 || header.colour === 4;
        out[o] = rows[p];
        out[o + 1] = grey ? rows[p] : rows[p + 1];
        out[o + 2] = grey ? rows[p] : rows[p + 2];
        out[o + 3] = header.colour === 6 ? rows[p + 3] : header.colour === 4 ? rows[p + 1] : 255;
      }
    }
  }
  return { width: header.width, height: header.height, channels: 4, data: out };
}

export function createImage(width, height, channels = 4, rgba = [0, 0, 0, 255]) {
  const data = new Uint8Array(width * height * channels);
  for (let i = 0; i < width * height; i += 1) {
    for (let c = 0; c < channels; c += 1) data[i * channels + c] = rgba[c];
  }
  return { width, height, channels, data };
}

export function crop(image, x, y, width, height) {
  const out = createImage(width, height, image.channels);
  for (let row = 0; row < height; row += 1) {
    const from = ((y + row) * image.width + x) * image.channels;
    out.data.set(image.data.subarray(from, from + width * image.channels), row * width * image.channels);
  }
  return out;
}

// Nearest-neighbour scale by integer factors (sx horizontally, sy vertically).
export function scaleNearest(image, sx, sy = sx) {
  const out = createImage(image.width * sx, image.height * sy, image.channels);
  const c = image.channels;
  for (let y = 0; y < out.height; y += 1) {
    const sy0 = Math.floor(y / sy);
    for (let x = 0; x < out.width; x += 1) {
      const from = (sy0 * image.width + Math.floor(x / sx)) * c;
      out.data.set(image.data.subarray(from, from + c), (y * out.width + x) * c);
    }
  }
  return out;
}

// --- Palette quantisation (no pngquant/oxipng/sharp in this toolchain) ------
//
// Median cut over the image's colour histogram, weighted by pixel count, to at
// most `maxColours` entries; an image that already has so few colours keeps
// them exactly. Every colour maps to its nearest palette entry (no dither, so
// flat Atari pixels and scanline rows stay flat and compress well).
export function quantise(image, maxColours = 256) {
  const histogram = new Map();
  for (let i = 0; i < image.width * image.height; i += 1) {
    const o = i * image.channels;
    const key = (image.data[o] << 16) | (image.data[o + 1] << 8) | image.data[o + 2];
    histogram.set(key, (histogram.get(key) ?? 0) + 1);
  }
  const entries = [...histogram].map(([key, count]) => ({ rgb: [(key >> 16) & 255, (key >> 8) & 255, key & 255], count, key }));
  let palette;
  if (entries.length <= maxColours) {
    palette = entries.map((e) => e.rgb);
  } else {
    const boxes = [entries];
    const spread = (box) => {
      let best = { channel: 0, range: -1 };
      for (let c = 0; c < 3; c += 1) {
        let lo = 255;
        let hi = 0;
        for (const e of box) { lo = Math.min(lo, e.rgb[c]); hi = Math.max(hi, e.rgb[c]); }
        if (hi - lo > best.range) best = { channel: c, range: hi - lo };
      }
      const weight = box.reduce((sum, e) => sum + e.count, 0);
      return { ...best, score: best.range * Math.sqrt(weight) };
    };
    while (boxes.length < maxColours) {
      let index = -1;
      let best = null;
      boxes.forEach((box, i) => {
        if (box.length < 2) return;
        const s = spread(box);
        if (!best || s.score > best.score) { best = s; index = i; }
      });
      if (index < 0 || best.range <= 0) break;
      const box = boxes[index].sort((a, b) => a.rgb[best.channel] - b.rgb[best.channel]);
      const half = box.reduce((sum, e) => sum + e.count, 0) / 2;
      let acc = 0;
      let cut = 1;
      for (; cut < box.length - 1; cut += 1) { acc += box[cut - 1].count; if (acc >= half) break; }
      boxes.splice(index, 1, box.slice(0, cut), box.slice(cut));
    }
    palette = boxes.map((box) => {
      const weight = box.reduce((sum, e) => sum + e.count, 0);
      return [0, 1, 2].map((c) => Math.round(box.reduce((sum, e) => sum + e.rgb[c] * e.count, 0) / weight));
    });
  }
  const lookup = new Map();
  for (const e of entries) {
    let best = 0;
    let bestDistance = Infinity;
    palette.forEach((p, i) => {
      const d = (p[0] - e.rgb[0]) ** 2 + (p[1] - e.rgb[1]) ** 2 + (p[2] - e.rgb[2]) ** 2;
      if (d < bestDistance) { bestDistance = d; best = i; }
    });
    lookup.set(e.key, best);
  }
  const indices = new Uint8Array(image.width * image.height);
  for (let i = 0; i < indices.length; i += 1) {
    const o = i * image.channels;
    indices[i] = lookup.get((image.data[o] << 16) | (image.data[o + 1] << 8) | image.data[o + 2]);
  }
  return { width: image.width, height: image.height, palette, indices };
}

// An 8-bit indexed PNG (colour type 3), each row's filter chosen by the
// smallest sum of absolute filtered bytes.
export function encodeIndexedPng({ width, height, palette, indices }) {
  const raw = Buffer.alloc((width + 1) * height);
  const candidate = Buffer.alloc(width);
  for (let y = 0; y < height; y += 1) {
    let bestFilter = 0;
    let bestScore = Infinity;
    let bestRow = null;
    for (let filter = 0; filter < 5; filter += 1) {
      let score = 0;
      for (let x = 0; x < width; x += 1) {
        const value = indices[y * width + x];
        const a = x > 0 ? indices[y * width + x - 1] : 0;
        const b = y > 0 ? indices[(y - 1) * width + x] : 0;
        const c = x > 0 && y > 0 ? indices[(y - 1) * width + x - 1] : 0;
        const predicted = filter === 0 ? 0 : filter === 1 ? a : filter === 2 ? b : filter === 3 ? (a + b) >> 1 : paeth(a, b, c);
        const out = (value - predicted) & 0xff;
        candidate[x] = out;
        score += out < 128 ? out : 256 - out;
      }
      if (score < bestScore) { bestScore = score; bestFilter = filter; bestRow = Buffer.from(candidate); }
    }
    raw[y * (width + 1)] = bestFilter;
    bestRow.copy(raw, y * (width + 1) + 1);
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 3;
  return Buffer.concat([
    SIGNATURE,
    chunk("IHDR", header),
    chunk("PLTE", Buffer.from(palette.flat())),
    chunk("IDAT", zlib.deflateSync(raw, { level: 9, memLevel: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}
