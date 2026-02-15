import type { Effect } from "./types";
import type { EffectConfig } from "@/types/remote-config";
import { generateFirePalette } from "../utils/palette";

export class FireEffect implements Effect {
  readonly name = "Fire";

  private palette: Uint32Array = new Uint32Array(256);
  private heat!: Uint8Array;
  private w = 0;
  private h = 0;
  private intensity: number;

  constructor(config?: EffectConfig) {
    this.intensity = (config?.intensity as number) ?? 0.6;
  }

  applyConfig(config: EffectConfig): void {
    this.intensity = (config?.intensity as number) ?? this.intensity;
  }

  init(width: number, height: number): void {
    this.w = width;
    this.h = height;
    this.palette = generateFirePalette();
    this.heat = new Uint8Array(width * height);

    // Warm up the heat buffer so fire is already burning on first frame
    for (let i = 0; i < height; i++) {
      this.update(0, 0.016);
    }
  }

  update(_time: number, _delta: number): void {
    const w = this.w;
    const h = this.h;
    const heat = this.heat;
    const threshold = 1 - this.intensity;

    // Seed the bottom two rows with random heat
    const bottomStart = (h - 2) * w;
    for (let x = 0; x < w * 2; x++) {
      heat[bottomStart + x] = Math.random() > threshold ? (180 + Math.random() * 75) | 0 : (Math.random() * 100) | 0;
    }

    // Propagate heat upward
    for (let y = 0; y < h - 2; y++) {
      for (let x = 0; x < w; x++) {
        const idx = y * w + x;
        const below = (y + 1) * w;
        const below2 = (y + 2) * w;

        const xl = x > 0 ? x - 1 : x;
        const xr = x < w - 1 ? x + 1 : x;

        const avg =
          (heat[below + xl] + heat[below + x] + heat[below + xr] + heat[below2 + x]) /
          4.04;

        heat[idx] = avg > 0 ? (avg | 0) : 0;
      }
    }
  }

  render(pixels: Uint32Array, width: number, height: number): void {
    const heat = this.heat;
    const palette = this.palette;
    const len = width * height;

    for (let i = 0; i < len; i++) {
      pixels[i] = palette[heat[i]];
    }
  }
}
