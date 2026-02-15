import type { Effect } from "./types";
import type { EffectConfig } from "@/types/remote-config";
import { packColor, clamp } from "../utils/math";

interface Star {
  x: number;
  y: number;
  z: number;
  prevZ: number;
}

const FOCAL = 180;

export class StarfieldEffect implements Effect {
  readonly name = "Starfield";

  private stars: Star[] = [];
  private w = 0;
  private h = 0;
  private cx = 0;
  private cy = 0;

  private numStars: number;
  private maxDepth: number;
  private speed: number;

  constructor(config?: EffectConfig) {
    this.numStars = (config?.starCount as number) ?? 2000;
    this.maxDepth = (config?.maxDepth as number) ?? 120;
    this.speed = (config?.speed as number) ?? 1.6;
  }

  applyConfig(config: EffectConfig): void {
    this.speed = (config?.speed as number) ?? this.speed;
  }

  init(width: number, height: number): void {
    this.w = width;
    this.h = height;
    this.cx = width * 0.5;
    this.cy = height * 0.5;

    this.stars = [];
    for (let i = 0; i < this.numStars; i++) {
      this.stars.push(this.createStar(true));
    }
  }

  private createStar(randomZ: boolean): Star {
    const z = randomZ ? 1 + Math.random() * (this.maxDepth - 1) : this.maxDepth;
    return {
      x: (Math.random() - 0.5) * this.w * 3,
      y: (Math.random() - 0.5) * this.h * 3,
      z,
      prevZ: z + 2,
    };
  }

  update(_time: number, delta: number): void {
    const speed = this.speed * delta * 60;

    for (const star of this.stars) {
      star.prevZ = star.z;
      star.z -= speed;

      if (star.z <= 0.3) {
        const fresh = this.createStar(false);
        star.x = fresh.x;
        star.y = fresh.y;
        star.z = fresh.z;
        star.prevZ = fresh.prevZ;
      }
    }
  }

  render(pixels: Uint32Array, width: number, height: number): void {
    // Slight fade instead of hard clear - gives subtle trail persistence
    const len = width * height;
    for (let i = 0; i < len; i++) {
      const c = pixels[i];
      const r = ((c & 0xff) * 0.82) | 0;
      const g = (((c >> 8) & 0xff) * 0.82) | 0;
      const b = (((c >> 16) & 0xff) * 0.82) | 0;
      pixels[i] = 0xff000000 | (b << 16) | (g << 8) | r;
    }

    const w = width;
    const h = height;
    const cx = this.cx;
    const cy = this.cy;
    const maxDepth = this.maxDepth;

    for (const star of this.stars) {
      // Current projected position
      const sx = (star.x / star.z) * FOCAL + cx;
      const sy = (star.y / star.z) * FOCAL + cy;

      // Previous projected position (where the streak starts)
      const psx = (star.x / star.prevZ) * FOCAL + cx;
      const psy = (star.y / star.prevZ) * FOCAL + cy;

      const ix = sx | 0;
      const iy = sy | 0;

      if (ix < 1 || ix >= w - 1 || iy < 1 || iy >= h - 1) continue;

      const closeness = 1 - star.z / maxDepth;
      const brightness = clamp((closeness * closeness * 280) | 0, 20, 255);

      // Streak color - slightly blue-white tinted
      const sr = clamp((brightness * 0.9) | 0, 0, 255);
      const sg = clamp((brightness * 0.92) | 0, 0, 255);
      const sb = clamp(brightness, 0, 255);

      // Draw the streak line from previous to current position
      const dx = ix - (psx | 0);
      const dy = iy - (psy | 0);
      const dist = Math.sqrt(dx * dx + dy * dy);
      const steps = Math.min(Math.max(dist | 0, 1), 80);

      // Streak thickness based on closeness (closer = thicker)
      const thickness = closeness > 0.5 ? 2 : closeness > 0.2 ? 1 : 0;

      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        // Brightness fades along the streak (bright at head, dim at tail)
        const fade = t * t;
        const fr = (sr * fade) | 0;
        const fg = (sg * fade) | 0;
        const fb = (sb * fade) | 0;
        const color = packColor(fr, fg, fb);

        const lx = ((psx | 0) + dx * t) | 0;
        const ly = ((psy | 0) + dy * t) | 0;

        if (lx < 0 || lx >= w || ly < 0 || ly >= h) continue;

        pixels[ly * w + lx] = color;

        // Draw thickness perpendicular to streak direction
        if (thickness > 0 && dist > 2) {
          const nx = -dy / dist;
          const ny = dx / dist;
          for (let th = 1; th <= thickness; th++) {
            const dimColor = packColor((fr * 0.5) | 0, (fg * 0.5) | 0, (fb * 0.5) | 0);
            const tx1 = (lx + nx * th) | 0;
            const ty1 = (ly + ny * th) | 0;
            const tx2 = (lx - nx * th) | 0;
            const ty2 = (ly - ny * th) | 0;
            if (tx1 >= 0 && tx1 < w && ty1 >= 0 && ty1 < h)
              pixels[ty1 * w + tx1] = dimColor;
            if (tx2 >= 0 && tx2 < w && ty2 >= 0 && ty2 < h)
              pixels[ty2 * w + tx2] = dimColor;
          }
        }
      }

      // Bright head of the star
      const headColor = packColor(
        clamp(brightness + 40, 0, 255),
        clamp(brightness + 40, 0, 255),
        255,
      );
      pixels[iy * w + ix] = headColor;
      if (closeness > 0.3) {
        // Slightly larger head for close stars
        if (ix + 1 < w) pixels[iy * w + ix + 1] = headColor;
        if (iy + 1 < h) pixels[(iy + 1) * w + ix] = headColor;
      }
    }
  }
}
