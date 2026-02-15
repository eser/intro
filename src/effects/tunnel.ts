import type { Effect } from "./types";
import type { EffectConfig } from "@/types/remote-config";
import { generateHSLPalette } from "../utils/palette";

export class TunnelEffect implements Effect {
  readonly name = "Tunnel";

  private angleLut!: Float32Array;
  private distLut!: Float32Array;
  private palette: Uint32Array = new Uint32Array(256);
  private rotationSpeed: number;
  private zoomSpeed: number;

  constructor(config?: EffectConfig) {
    this.rotationSpeed = (config?.rotationSpeed as number) ?? 0.8;
    this.zoomSpeed = (config?.zoomSpeed as number) ?? 1.5;
  }

  applyConfig(config: EffectConfig): void {
    this.rotationSpeed = (config?.rotationSpeed as number) ?? this.rotationSpeed;
    this.zoomSpeed = (config?.zoomSpeed as number) ?? this.zoomSpeed;
  }

  init(width: number, height: number): void {
    this.palette = generateHSLPalette(180, 240, 0.6, 0.45);

    const len = width * height;
    this.angleLut = new Float32Array(len);
    this.distLut = new Float32Array(len);

    const cx = width * 0.5;
    const cy = height * 0.5;

    let idx = 0;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const dx = x - cx;
        const dy = y - cy;
        this.angleLut[idx] = Math.atan2(dy, dx);
        const dist = Math.sqrt(dx * dx + dy * dy);
        this.distLut[idx] = dist > 0 ? 1.0 / dist : 0;
        idx++;
      }
    }
  }

  update(_time: number, _delta: number): void {
    // Time-based rendering.
  }

  render(pixels: Uint32Array, width: number, height: number): void {
    const t = performance.now() * 0.001;
    const angleLut = this.angleLut;
    const distLut = this.distLut;
    const palette = this.palette;
    const len = width * height;

    const rotSpeed = t * this.rotationSpeed;
    const zoomSpd = t * this.zoomSpeed;

    for (let i = 0; i < len; i++) {
      const angle = angleLut[i] + rotSpeed;
      const dist = distLut[i] * 200 + zoomSpd;

      const u = ((angle * 40.74) | 0) & 0xff;
      const v = (dist * 10) & 0xff;

      const texel = (u ^ v) & 0xff;
      pixels[i] = palette[texel];
    }
  }
}
