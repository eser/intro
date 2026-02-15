import type { Effect } from "./types";
import type { EffectConfig } from "@/types/remote-config";
import { packColor, clamp } from "../utils/math";

export class VoxelLandscapeEffect implements Effect {
  readonly name = "Voxel Landscape";

  private heightMap!: Float32Array;
  private colorMap!: Uint32Array;
  private mapSize = 512;
  private cameraSpeed: number;
  private viewDistance: number;

  constructor(config?: EffectConfig) {
    this.cameraSpeed = (config?.cameraSpeed as number) ?? 1.0;
    this.viewDistance = (config?.viewDistance as number) ?? 400;
  }

  applyConfig(config: EffectConfig): void {
    this.cameraSpeed = (config?.cameraSpeed as number) ?? this.cameraSpeed;
    this.viewDistance = (config?.viewDistance as number) ?? this.viewDistance;
  }

  init(_width: number, _height: number): void {
    const size = this.mapSize;
    this.heightMap = new Float32Array(size * size);
    this.colorMap = new Uint32Array(size * size);

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const idx = y * size + x;
        const nx = x / size;
        const ny = y / size;

        let h = 0;
        h += Math.sin(nx * 5.0) * Math.cos(ny * 4.3) * 50;
        h += Math.sin(nx * 11.7 + 1.3) * Math.cos(ny * 9.1 + 2.4) * 25;
        h += Math.sin(nx * 23.4 + 0.7) * Math.cos(ny * 19.8 + 1.1) * 12;
        h += Math.sin((nx + ny) * 7.5) * 20;
        h += Math.abs(Math.sin(nx * 3.1 + ny * 2.7)) * 30 - 15;
        this.heightMap[idx] = h;

        if (h < -25) {
          this.colorMap[idx] = packColor(10, 20, 60);
        } else if (h < -5) {
          const f = (h + 25) / 20;
          this.colorMap[idx] = packColor(
            (10 + f * 40) | 0, (20 + f * 10) | 0, (60 + f * 80) | 0,
          );
        } else if (h < 10) {
          this.colorMap[idx] = packColor(200, 50, 120);
        } else if (h < 30) {
          const f = (h - 10) / 20;
          this.colorMap[idx] = packColor(
            (200 - f * 100) | 0, (50 + f * 50) | 0, (120 + f * 80) | 0,
          );
        } else if (h < 50) {
          this.colorMap[idx] = packColor(60, 180, 220);
        } else {
          this.colorMap[idx] = packColor(220, 200, 255);
        }
      }
    }
  }

  update(_time: number, _delta: number): void {}

  private sampleHeight(wx: number, wy: number): number {
    const size = this.mapSize;
    const mask = size - 1;
    const fx = ((wx % size) + size) % size;
    const fy = ((wy % size) + size) % size;
    const ix = fx | 0;
    const iy = fy | 0;
    const dx = fx - ix;
    const dy = fy - iy;

    const i00 = (iy & mask) * size + (ix & mask);
    const i10 = (iy & mask) * size + ((ix + 1) & mask);
    const i01 = ((iy + 1) & mask) * size + (ix & mask);
    const i11 = ((iy + 1) & mask) * size + ((ix + 1) & mask);

    const h = this.heightMap;
    return h[i00] * (1 - dx) * (1 - dy) +
           h[i10] * dx * (1 - dy) +
           h[i01] * (1 - dx) * dy +
           h[i11] * dx * dy;
  }

  private sampleColor(wx: number, wy: number): number {
    const size = this.mapSize;
    const mask = size - 1;
    const ix = (((wx | 0) % size) + size) & mask;
    const iy = (((wy | 0) % size) + size) & mask;
    return this.colorMap[iy * size + ix];
  }

  render(pixels: Uint32Array, width: number, height: number): void {
    const t = performance.now() * 0.001;

    const camX = t * 35 * this.cameraSpeed;
    const camY = t * 22 * this.cameraSpeed;
    const camHeight = 90 + Math.sin(t * 0.4) * 20;
    const camAngle = Math.sin(t * 0.2) * 0.3;
    const cosA = Math.cos(camAngle);
    const sinA = Math.sin(camAngle);

    const horizon = (height * 0.35) | 0;

    pixels.fill(0xff000000);

    // Sky gradient
    for (let y = 0; y < horizon; y++) {
      const f = y / horizon;
      const r = clamp((10 + f * 30 + Math.sin(t * 0.3) * 10) | 0, 0, 255);
      const g = clamp((5 + f * 15) | 0, 0, 255);
      const b = clamp((30 + f * 60) | 0, 0, 255);
      const color = packColor(r, g, b);
      const row = y * width;
      for (let x = 0; x < width; x++) {
        pixels[row + x] = color;
      }
    }

    const yBuffer = new Float32Array(width);
    yBuffer.fill(height);

    const maxDist = this.viewDistance;
    const steps = 280;

    for (let d = 1; d < steps; d++) {
      const dist = (d / steps) * maxDist + 1;
      const fogFactor = clamp(1 - dist / maxDist, 0, 1);
      const fogPow = fogFactor * fogFactor;

      for (let x = 0; x < width; x++) {
        const rx = (x - width * 0.5) / width;
        const ry = 1.0;

        const worldX = (rx * cosA - ry * sinA) * dist + camX;
        const worldY = (rx * sinA + ry * cosA) * dist + camY;

        const terrainHeight = this.sampleHeight(worldX, worldY);
        const color = this.sampleColor(worldX, worldY);

        const screenY =
          (((camHeight - terrainHeight) / dist) * height * 0.5 + horizon) | 0;

        if (screenY < yBuffer[x]) {
          const top = Math.max(screenY, 0);
          const bottom = Math.min(yBuffer[x] | 0, height);

          const cr = clamp(((color & 0xff) * fogPow) | 0, 0, 255);
          const cg = clamp((((color >> 8) & 0xff) * fogPow) | 0, 0, 255);
          const cb = clamp((((color >> 16) & 0xff) * fogPow) | 0, 0, 255);
          const foggedColor = packColor(cr, cg, cb);

          for (let y = top; y < bottom; y++) {
            pixels[y * width + x] = foggedColor;
          }

          yBuffer[x] = screenY;
        }
      }
    }
  }
}
