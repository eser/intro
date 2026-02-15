import type { Effect } from "./types";
import type { EffectConfig } from "@/types/remote-config";
import { packColor, clamp } from "../utils/math";

// Cube vertices
const CUBE: [number, number, number][] = [
  [-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1],
  [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1],
];

const CUBE_EDGES: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 0],
  [4, 5], [5, 6], [6, 7], [7, 4],
  [0, 4], [1, 5], [2, 6], [3, 7],
];

export class WireframeCubeEffect implements Effect {
  readonly name = "Wireframe Cube";

  private rotationSpeed: number;

  constructor(config?: EffectConfig) {
    this.rotationSpeed = (config?.rotationSpeed as number) ?? 1.0;
  }

  applyConfig(config: EffectConfig): void {
    this.rotationSpeed = (config?.rotationSpeed as number) ?? this.rotationSpeed;
  }

  init(_width: number, _height: number): void {}

  update(_time: number, _delta: number): void {}

  render(pixels: Uint32Array, width: number, height: number): void {
    const t = performance.now() * 0.001 * this.rotationSpeed;

    // Fade with trails
    const len = width * height;
    for (let i = 0; i < len; i++) {
      const c = pixels[i];
      const r = ((c & 0xff) * 0.92) | 0;
      const g = (((c >> 8) & 0xff) * 0.92) | 0;
      const b = (((c >> 16) & 0xff) * 0.92) | 0;
      pixels[i] = 0xff000000 | (b << 16) | (g << 8) | r;
    }

    const cx = width * 0.5;
    const cy = height * 0.5;
    const baseScale = Math.min(width, height);

    // Draw 3 nested cubes orbiting each other
    const cubes = [
      { scale: 0.30, ax: t * 0.7, ay: t * 1.1, az: t * 0.5, ox: 0, oy: 0, r: 80, g: 180, b: 255 },
      { scale: 0.18, ax: t * -1.2, ay: t * 0.6, az: t * -0.9, ox: Math.sin(t * 0.8) * baseScale * 0.15, oy: Math.cos(t * 0.6) * baseScale * 0.1, r: 255, g: 80, b: 180 },
      { scale: 0.12, ax: t * 0.9, ay: t * -1.4, az: t * 1.1, ox: Math.sin(t * 1.2 + 2) * baseScale * 0.2, oy: Math.cos(t * 0.9 + 1) * baseScale * 0.15, r: 80, g: 255, b: 120 },
    ];

    for (const cube of cubes) {
      const scale = cube.scale * baseScale;
      const focalLength = 4;

      const cosX = Math.cos(cube.ax), sinX = Math.sin(cube.ax);
      const cosY = Math.cos(cube.ay), sinY = Math.sin(cube.ay);
      const cosZ = Math.cos(cube.az), sinZ = Math.sin(cube.az);

      const projected: [number, number, number][] = [];

      for (const [vx, vy, vz] of CUBE) {
        let y1 = vy * cosX - vz * sinX;
        let z1 = vy * sinX + vz * cosX;
        let x2 = vx * cosY + z1 * sinY;
        let z2 = -vx * sinY + z1 * cosY;
        let x3 = x2 * cosZ - y1 * sinZ;
        let y3 = x2 * sinZ + y1 * cosZ;

        const z3 = z2 + focalLength;
        const px = (x3 / z3) * scale + cx + cube.ox;
        const py = (y3 / z3) * scale + cy + cube.oy;

        projected.push([px, py, z3]);
      }

      for (let i = 0; i < CUBE_EDGES.length; i++) {
        const [a, b] = CUBE_EDGES[i];
        // Depth-based brightness
        const avgZ = (projected[a][2] + projected[b][2]) * 0.5;
        const depthFade = clamp((avgZ - 2) / 4, 0.3, 1);

        const cr = (cube.r * depthFade) | 0;
        const cg = (cube.g * depthFade) | 0;
        const cb = (cube.b * depthFade) | 0;
        const color = packColor(cr, cg, cb);

        // Glow color (dimmer)
        const glowColor = packColor((cr * 0.3) | 0, (cg * 0.3) | 0, (cb * 0.3) | 0);

        this.drawLine(
          pixels, width, height,
          projected[a][0], projected[a][1],
          projected[b][0], projected[b][1],
          color, glowColor,
        );
      }

      // Draw glowing vertices
      for (const [px, py, pz] of projected) {
        const ix = px | 0;
        const iy = py | 0;
        const depthFade = clamp((pz - 2) / 4, 0.3, 1);
        const vr = clamp((cube.r * depthFade * 1.3) | 0, 0, 255);
        const vg = clamp((cube.g * depthFade * 1.3) | 0, 0, 255);
        const vb = clamp((cube.b * depthFade * 1.3) | 0, 0, 255);
        const vertColor = packColor(vr, vg, vb);

        for (let dy = -2; dy <= 2; dy++) {
          for (let dx = -2; dx <= 2; dx++) {
            const sx = ix + dx;
            const sy = iy + dy;
            if (sx >= 0 && sx < width && sy >= 0 && sy < height) {
              const dist = Math.sqrt(dx * dx + dy * dy);
              if (dist <= 2) {
                pixels[sy * width + sx] = vertColor;
              }
            }
          }
        }
      }
    }
  }

  private drawLine(
    pixels: Uint32Array, w: number, h: number,
    x0: number, y0: number, x1: number, y1: number,
    color: number, glowColor: number,
  ): void {
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const steps = Math.max(dx, dy, 1) | 0;
    const sx = (x1 - x0) / steps;
    const sy = (y1 - y0) / steps;
    const nx = -sy / Math.sqrt(sx * sx + sy * sy) || 0;
    const ny = sx / Math.sqrt(sx * sx + sy * sy) || 0;

    let x = x0;
    let y = y0;

    for (let i = 0; i <= steps; i++) {
      const ix = x | 0;
      const iy = y | 0;

      // Core line (2px)
      for (let t = -1; t <= 1; t++) {
        const px = ix + (nx * t) | 0;
        const py = iy + (ny * t) | 0;
        if (px >= 0 && px < w && py >= 0 && py < h) {
          pixels[py * w + px] = t === 0 ? color : glowColor;
        }
      }

      x += sx;
      y += sy;
    }
  }
}
