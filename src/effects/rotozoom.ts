import type { Effect } from "./types";
import type { EffectConfig } from "@/types/remote-config";
import { generateHSLPalette } from "../utils/palette";

export class RotozoomEffect implements Effect {
  readonly name = "Rotozoom";

  private palette: Uint32Array = new Uint32Array(256);
  private rotationSpeed: number;
  private scrollSpeed: number;

  constructor(config?: EffectConfig) {
    this.rotationSpeed = (config?.rotationSpeed as number) ?? 0.4;
    this.scrollSpeed = (config?.scrollSpeed as number) ?? 1.0;
  }

  applyConfig(config: EffectConfig): void {
    this.rotationSpeed = (config?.rotationSpeed as number) ?? this.rotationSpeed;
    this.scrollSpeed = (config?.scrollSpeed as number) ?? this.scrollSpeed;
  }

  init(_width: number, _height: number): void {
    this.palette = generateHSLPalette(120, 180, 0.5, 0.45);
  }

  update(_time: number, _delta: number): void {
    // Time-based rendering.
  }

  render(pixels: Uint32Array, width: number, height: number): void {
    const t = performance.now() * 0.001;
    const palette = this.palette;
    const w = width;
    const h = height;
    const cx = w * 0.5;
    const cy = h * 0.5;

    const angle = t * this.rotationSpeed;
    const zoom = 1.0 + Math.sin(t * 0.3) * 0.5;
    const cosA = Math.cos(angle) * zoom;
    const sinA = Math.sin(angle) * zoom;

    const scrollX = t * 30 * this.scrollSpeed;
    const scrollY = t * 20 * this.scrollSpeed;

    let idx = 0;
    for (let y = 0; y < h; y++) {
      const dy = y - cy;
      for (let x = 0; x < w; x++) {
        const dx = x - cx;

        const u = ((dx * cosA - dy * sinA + scrollX) | 0) & 0xff;
        const v = ((dx * sinA + dy * cosA + scrollY) | 0) & 0xff;

        const texel = (u ^ v) & 0xff;
        pixels[idx++] = palette[texel];
      }
    }
  }
}
