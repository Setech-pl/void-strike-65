// Image operations for the GitHub page tools (docs/plans/enemies-bosses-pages.md).
// RGBA images { width, height, channels: 4, data } only; no dependency.

import { createImage } from "./png.mjs";

// The Atari's PAL pixel aspect. Atari800 captures one hires pixel (half a
// colour clock) by one scanline. The hires dot clock is 2 x 3.546894 MHz =
// 7.093788 MHz; square pixels on a 576-line PAL picture are sampled at
// 14.75 MHz, and one field scanline is two of those 576 lines tall. One hires
// pixel is therefore 14.75 / 7.093788 / 2 = 1.0397 times as wide as a
// scanline is tall (one colour clock: 2.079).
export const PAL_HIRES_PIXEL_ASPECT = 14.75 / (2 * 3.546894) / 2;

// Nearest-neighbour enlargement to `scale` output pixels per scanline, with the
// width corrected to the PAL aspect: output column x shows source column
// floor(x / (scale * aspect)). Column widths alternate by one pixel because
// 8 x 1.0397 is not an integer; rows stay exact.
export function scaleToPalAspect(image, scale, aspect = PAL_HIRES_PIXEL_ASPECT) {
  const step = scale * aspect;
  const width = Math.round(image.width * step);
  const out = createImage(width, image.height * scale);
  for (let y = 0; y < out.height; y += 1) {
    const sy = Math.floor(y / scale);
    for (let x = 0; x < width; x += 1) {
      const sx = Math.min(image.width - 1, Math.floor(x / step));
      const from = (sy * image.width + sx) * 4;
      out.data.set(image.data.subarray(from, from + 4), (y * width + x) * 4);
    }
  }
  return out;
}

// Make every pixel of the given RGB transparent (the playfield's black, $00).
export function keyOut(image, rgb) {
  const out = createImage(image.width, image.height, 4, [0, 0, 0, 0]);
  for (let i = 0; i < image.width * image.height; i += 1) {
    const o = i * 4;
    const same = image.data[o] === rgb[0] && image.data[o + 1] === rgb[1] && image.data[o + 2] === rgb[2];
    if (!same) out.data.set(image.data.subarray(o, o + 4), o);
  }
  return out;
}

// Alpha-composite `top` onto `base` at (x, y), in place.
export function draw(base, top, x0, y0, opacity = 1) {
  for (let y = 0; y < top.height; y += 1) {
    const by = y + y0;
    if (by < 0 || by >= base.height) continue;
    for (let x = 0; x < top.width; x += 1) {
      const bx = x + x0;
      if (bx < 0 || bx >= base.width) continue;
      const t = (y * top.width + x) * 4;
      const a = (top.data[t + 3] / 255) * opacity;
      if (a === 0) continue;
      const b = (by * base.width + bx) * 4;
      for (let c = 0; c < 3; c += 1) base.data[b + c] = Math.round(top.data[t + c] * a + base.data[b + c] * (1 - a));
      base.data[b + 3] = 255;
    }
  }
  return base;
}

// Add `top` (premultiplied by its alpha) onto `base`: light, for glow and bloom.
export function addLight(base, top, x0, y0, gain = 1) {
  for (let y = 0; y < top.height; y += 1) {
    const by = y + y0;
    if (by < 0 || by >= base.height) continue;
    for (let x = 0; x < top.width; x += 1) {
      const bx = x + x0;
      if (bx < 0 || bx >= base.width) continue;
      const t = (y * top.width + x) * 4;
      const a = (top.data[t + 3] / 255) * gain;
      const b = (by * base.width + bx) * 4;
      for (let c = 0; c < 3; c += 1) base.data[b + c] = Math.min(255, Math.round(base.data[b + c] + top.data[t + c] * a));
    }
  }
  return base;
}

// Separable box blur, `passes` times (three passes approximate a Gaussian).
export function blur(image, radius, passes = 3) {
  let src = new Float32Array(image.data);
  const { width, height } = image;
  let tmp = new Float32Array(src.length);
  const window = radius * 2 + 1;
  for (let pass = 0; pass < passes; pass += 1) {
    for (const horizontal of [true, false]) {
      const lines = horizontal ? height : width;
      const length = horizontal ? width : height;
      for (let line = 0; line < lines; line += 1) {
        const index = (i) => (horizontal ? line * width + i : i * width + line) * 4;
        const sum = [0, 0, 0, 0];
        for (let i = -radius; i <= radius; i += 1) {
          const o = index(Math.min(length - 1, Math.max(0, i)));
          for (let c = 0; c < 4; c += 1) sum[c] += src[o + c];
        }
        for (let i = 0; i < length; i += 1) {
          const o = index(i);
          for (let c = 0; c < 4; c += 1) tmp[o + c] = sum[c] / window;
          const out = index(Math.max(0, i - radius));
          const inn = index(Math.min(length - 1, i + radius + 1));
          for (let c = 0; c < 4; c += 1) sum[c] += src[inn + c] - src[out + c];
        }
      }
      [src, tmp] = [tmp, src];
    }
  }
  const out = createImage(width, height);
  for (let i = 0; i < src.length; i += 1) out.data[i] = Math.max(0, Math.min(255, Math.round(src[i])));
  return out;
}

// A copy of `image` whose every opaque pixel is `rgb` (keeps alpha).
export function tint(image, rgb) {
  const out = createImage(image.width, image.height, 4, [0, 0, 0, 0]);
  for (let i = 0; i < image.width * image.height; i += 1) {
    const a = image.data[i * 4 + 3];
    if (a) out.data.set([rgb[0], rgb[1], rgb[2], a], i * 4);
  }
  return out;
}

// Pad an image with transparent margins.
export function pad(image, margin) {
  const out = createImage(image.width + margin * 2, image.height + margin * 2, 4, [0, 0, 0, 0]);
  return draw(out, image, margin, margin);
}

export function verticalGradient(width, height, top, bottom) {
  const out = createImage(width, height);
  for (let y = 0; y < height; y += 1) {
    const t = y / Math.max(1, height - 1);
    const rgb = top.map((c, i) => Math.round(c + (bottom[i] - c) * t));
    for (let x = 0; x < width; x += 1) out.data.set([...rgb, 255], (y * width + x) * 4);
  }
  return out;
}

// Darken towards the corners: 1 at the centre, 1 - strength at the corners.
export function vignette(image, strength) {
  const cx = image.width / 2;
  const cy = image.height / 2;
  const max = Math.hypot(cx, cy);
  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      const d = Math.hypot(x - cx, y - cy) / max;
      const k = 1 - strength * d * d;
      const o = (y * image.width + x) * 4;
      for (let c = 0; c < 3; c += 1) image.data[o + c] = Math.round(image.data[o + c] * k);
    }
  }
  return image;
}

// A 1-bit text bitmap (scripts/pages/font.mjs) as an RGBA image: each font
// pixel `unitX` x `unitY` output pixels.
export function textImage(bitmap, rgb, unitX, unitY = unitX) {
  const out = createImage(Math.round(bitmap.width * unitX), bitmap.height * unitY, 4, [0, 0, 0, 0]);
  for (let y = 0; y < out.height; y += 1) {
    for (let x = 0; x < out.width; x += 1) {
      if (bitmap.bit(Math.min(bitmap.width - 1, Math.floor(x / unitX)), Math.floor(y / unitY))) {
        out.data.set([...rgb, 255], (y * out.width + x) * 4);
      }
    }
  }
  return out;
}
