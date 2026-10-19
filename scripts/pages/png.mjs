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
