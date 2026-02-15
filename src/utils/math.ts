/** Precomputed sine table with 1024 entries. */
const SINE_TABLE_SIZE = 1024;
const SINE_TABLE = new Float64Array(SINE_TABLE_SIZE);
const COSINE_TABLE = new Float64Array(SINE_TABLE_SIZE);

for (let i = 0; i < SINE_TABLE_SIZE; i++) {
  const angle = (i / SINE_TABLE_SIZE) * Math.PI * 2;
  SINE_TABLE[i] = Math.sin(angle);
  COSINE_TABLE[i] = Math.cos(angle);
}

/** Fast sine lookup. Input is in radians. */
export function fastSin(rad: number): number {
  const idx =
    ((rad * (SINE_TABLE_SIZE / (Math.PI * 2))) % SINE_TABLE_SIZE +
      SINE_TABLE_SIZE) %
    SINE_TABLE_SIZE;
  return SINE_TABLE[idx | 0];
}

/** Fast cosine lookup. Input is in radians. */
export function fastCos(rad: number): number {
  const idx =
    ((rad * (SINE_TABLE_SIZE / (Math.PI * 2))) % SINE_TABLE_SIZE +
      SINE_TABLE_SIZE) %
    SINE_TABLE_SIZE;
  return COSINE_TABLE[idx | 0];
}

/** Linear interpolation. */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Clamp value between min and max. */
export function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

/** Smoothstep easing (3t^2 - 2t^3). */
export function smoothstep(t: number): number {
  const c = clamp(t, 0, 1);
  return c * c * (3 - 2 * c);
}

/** Pack RGBA into a single Uint32 (ABGR for little-endian). */
export function packColor(r: number, g: number, b: number, a = 255): number {
  return (a << 24) | (b << 16) | (g << 8) | r;
}

/** Unpack Uint32 ABGR to [r, g, b, a]. */
export function unpackColor(c: number): [number, number, number, number] {
  return [c & 0xff, (c >> 8) & 0xff, (c >> 16) & 0xff, (c >> 24) & 0xff];
}

/** Blend two packed colors by factor t (0 = a, 1 = b). */
export function lerpColor(a: number, b: number, t: number): number {
  const t256 = (t * 256) | 0;
  const invT = 256 - t256;

  const rA = a & 0xff;
  const gA = (a >> 8) & 0xff;
  const bA = (a >> 16) & 0xff;

  const rB = b & 0xff;
  const gB = (b >> 8) & 0xff;
  const bB = (b >> 16) & 0xff;

  const r = (rA * invT + rB * t256) >> 8;
  const g = (gA * invT + gB * t256) >> 8;
  const bC = (bA * invT + bB * t256) >> 8;

  return 0xff000000 | (bC << 16) | (g << 8) | r;
}
