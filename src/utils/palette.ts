import { packColor } from "./math";

/** Generate a 256-entry color palette from HSL cycling. */
export function generateHSLPalette(
  hueOffset: number,
  hueRange: number,
  saturation: number,
  lightness: number,
): Uint32Array {
  const palette = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    const hue = (hueOffset + (i / 256) * hueRange) % 360;
    const [r, g, b] = hslToRgb(hue / 360, saturation, lightness);
    palette[i] = packColor(r, g, b);
  }
  return palette;
}

/** Generate a fire palette: black -> dark red -> red -> orange -> yellow -> white. */
export function generateFirePalette(): Uint32Array {
  const palette = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let r: number, g: number, b: number;
    if (i < 64) {
      r = i * 4;
      g = 0;
      b = 0;
    } else if (i < 128) {
      r = 255;
      g = (i - 64) * 4;
      b = 0;
    } else if (i < 192) {
      r = 255;
      g = 255;
      b = (i - 128) * 4;
    } else {
      r = 255;
      g = 255;
      b = 255;
    }
    palette[i] = packColor(r, g, b);
  }
  return palette;
}

/** Generate a gradient palette between a list of color stops. */
export function generateGradientPalette(
  stops: Array<{ pos: number; r: number; g: number; b: number }>,
): Uint32Array {
  const palette = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    const t = i / 255;
    let s0 = stops[0];
    let s1 = stops[stops.length - 1];
    for (let j = 0; j < stops.length - 1; j++) {
      if (t >= stops[j].pos && t <= stops[j + 1].pos) {
        s0 = stops[j];
        s1 = stops[j + 1];
        break;
      }
    }
    const range = s1.pos - s0.pos;
    const f = range === 0 ? 0 : (t - s0.pos) / range;
    const r = (s0.r + (s1.r - s0.r) * f) | 0;
    const g = (s0.g + (s1.g - s0.g) * f) | 0;
    const b = (s0.b + (s1.b - s0.b) * f) | 0;
    palette[i] = packColor(r, g, b);
  }
  return palette;
}

/** Convert HSL (h: 0-1, s: 0-1, l: 0-1) to RGB (0-255 each). */
function hslToRgb(
  h: number,
  s: number,
  l: number,
): [number, number, number] {
  if (s === 0) {
    const v = (l * 255) | 0;
    return [v, v, v];
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [
    (hue2rgb(p, q, h + 1 / 3) * 255) | 0,
    (hue2rgb(p, q, h) * 255) | 0,
    (hue2rgb(p, q, h - 1 / 3) * 255) | 0,
  ];
}

function hue2rgb(p: number, q: number, t: number): number {
  let tt = t;
  if (tt < 0) tt += 1;
  if (tt > 1) tt -= 1;
  if (tt < 1 / 6) return p + (q - p) * 6 * tt;
  if (tt < 1 / 2) return q;
  if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
  return p;
}
