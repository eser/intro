import type { Effect } from "./types";
import type { EffectConfig } from "@/types/remote-config";
import { fastSin } from "../utils/math";
import { generateHSLPalette } from "../utils/palette";

export class PlasmaEffect implements Effect {
  readonly name = "Plasma";

  private palette: Uint32Array = new Uint32Array(256);
  private speed: number;

  constructor(config?: EffectConfig) {
    this.speed = (config?.speed as number) ?? 1.0;
  }

  init(_width: number, _height: number): void {
    this.palette = generateHSLPalette(0, 360, 0.7, 0.5);
  }

  update(_time: number, _delta: number): void {
    // State is purely time-based, computed in render.
  }

  applyConfig(config: EffectConfig): void {
    this.speed = (config?.speed as number) ?? this.speed;
  }

  render(pixels: Uint32Array, width: number, height: number): void {
    const t = performance.now() * 0.001 * this.speed;
    const palette = this.palette;
    const w = width;
    const h = height;
    const cx = w * 0.5;
    const cy = h * 0.5;

    let idx = 0;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const dx = x - cx;
        const dy = y - cy;

        const v1 = fastSin(x * 0.03 + t * 1.1);
        const v2 = fastSin(y * 0.037 + t * 0.9);
        const v3 = fastSin((x + y) * 0.02 + t * 0.7);
        const v4 = fastSin(Math.sqrt(dx * dx + dy * dy) * 0.04 + t * 1.3);

        const v = (v1 + v2 + v3 + v4 + 4) * 0.125; // normalize to 0..1
        const ci = (v * 255 + t * 30) & 0xff;

        pixels[idx++] = palette[ci];
      }
    }
  }
}
