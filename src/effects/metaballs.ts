import type { Effect } from "./types";
import type { EffectConfig } from "@/types/remote-config";
import { generateGradientPalette } from "../utils/palette";

interface Ball {
  phaseX: number;
  phaseY: number;
  speedX: number;
  speedY: number;
  radiusX: number;
  radiusY: number;
  r: number;
}

export class MetaballsEffect implements Effect {
  readonly name = "Metaballs";

  private balls: Ball[] = [];
  private palette: Uint32Array = new Uint32Array(256);
  private ballCount: number;
  private speed: number;

  constructor(config?: EffectConfig) {
    this.ballCount = (config?.ballCount as number) ?? 6;
    this.speed = (config?.speed as number) ?? 1.0;
  }

  applyConfig(config: EffectConfig): void {
    this.speed = (config?.speed as number) ?? this.speed;
  }

  init(_width: number, _height: number): void {
    this.palette = generateGradientPalette([
      { pos: 0.0, r: 0, g: 0, b: 0 },
      { pos: 0.3, r: 10, g: 0, b: 40 },
      { pos: 0.5, r: 60, g: 10, b: 120 },
      { pos: 0.7, r: 180, g: 40, b: 200 },
      { pos: 0.85, r: 255, g: 150, b: 255 },
      { pos: 1.0, r: 255, g: 255, b: 255 },
    ]);

    this.balls = [];
    for (let i = 0; i < this.ballCount; i++) {
      this.balls.push({
        phaseX: Math.random() * Math.PI * 2,
        phaseY: Math.random() * Math.PI * 2,
        speedX: (0.3 + Math.random() * 0.6) * this.speed,
        speedY: (0.4 + Math.random() * 0.5) * this.speed,
        radiusX: 0.2 + Math.random() * 0.25,
        radiusY: 0.2 + Math.random() * 0.25,
        r: 40 + Math.random() * 30,
      });
    }
  }

  update(_time: number, _delta: number): void {
    // Position is time-based in render.
  }

  render(pixels: Uint32Array, width: number, height: number): void {
    const t = performance.now() * 0.001;
    const palette = this.palette;
    const balls = this.balls;
    const w = width;
    const h = height;

    // Calculate current ball positions
    const bx: number[] = [];
    const by: number[] = [];
    const br2: number[] = [];

    for (const ball of balls) {
      bx.push(
        (0.5 + ball.radiusX * Math.sin(t * ball.speedX + ball.phaseX)) * w,
      );
      by.push(
        (0.5 + ball.radiusY * Math.cos(t * ball.speedY + ball.phaseY)) * h,
      );
      br2.push(ball.r * ball.r);
    }

    const nb = balls.length;

    // Skip every other pixel for performance, interpolate later
    const step = 2;
    for (let y = 0; y < h; y += step) {
      for (let x = 0; x < w; x += step) {
        let field = 0;
        for (let i = 0; i < nb; i++) {
          const dx = x - bx[i];
          const dy = y - by[i];
          field += br2[i] / (dx * dx + dy * dy + 1);
        }

        const ci = Math.min((field * 255) | 0, 255);
        const color = palette[ci];

        // Fill the step x step block
        for (let dy = 0; dy < step && y + dy < h; dy++) {
          for (let dx = 0; dx < step && x + dx < w; dx++) {
            pixels[(y + dy) * w + (x + dx)] = color;
          }
        }
      }
    }
  }
}
