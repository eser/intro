import type { Effect } from "./types";
import type { EffectConfig } from "@/types/remote-config";
import { packColor, clamp } from "../utils/math";

interface Column {
  y: number;
  speed: number;
  length: number;
  chars: number[];
  changeTimer: number;
}

const CHAR_W = 8;
const CHAR_H = 12;

export class MatrixRainEffect implements Effect {
  readonly name = "Matrix Rain";

  private columns: Column[] = [];
  private cols = 0;
  private rows = 0;
  private glyphs!: Uint8Array[];
  private speed: number;

  constructor(config?: EffectConfig) {
    this.speed = (config?.speed as number) ?? 1.0;
  }

  applyConfig(config: EffectConfig): void {
    this.speed = (config?.speed as number) ?? this.speed;
  }

  init(width: number, height: number): void {
    this.cols = (width / CHAR_W) | 0;
    this.rows = (height / CHAR_H) | 0;

    // Pre-render glyphs to bitmap arrays
    this.prerenderGlyphs();

    // Initialize columns
    this.columns = [];
    for (let i = 0; i < this.cols; i++) {
      this.columns.push(this.createColumn());
    }
  }

  private prerenderGlyphs(): void {
    const canvas = document.createElement("canvas");
    canvas.width = CHAR_W;
    canvas.height = CHAR_H;
    const ctx = canvas.getContext("2d")!;
    ctx.font = `${CHAR_H - 2}px monospace`;
    ctx.textBaseline = "top";

    // Characters: katakana-like + digits + symbols
    const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ<>{}[]|/\\=+-*&@#$%";
    this.glyphs = [];

    for (const ch of chars) {
      ctx.clearRect(0, 0, CHAR_W, CHAR_H);
      ctx.fillStyle = "#fff";
      ctx.fillText(ch, 0, 1);
      const data = ctx.getImageData(0, 0, CHAR_W, CHAR_H).data;
      const glyph = new Uint8Array(CHAR_W * CHAR_H);
      for (let i = 0; i < CHAR_W * CHAR_H; i++) {
        glyph[i] = data[i * 4 + 3]; // alpha channel as brightness
      }
      this.glyphs.push(glyph);
    }
  }

  private createColumn(): Column {
    const length = 5 + (Math.random() * (this.rows * 0.6)) | 0;
    const chars: number[] = [];
    for (let i = 0; i < length; i++) {
      chars.push((Math.random() * this.glyphs.length) | 0);
    }
    return {
      y: -Math.random() * this.rows * 2,
      speed: (3 + Math.random() * 8) * this.speed,
      length,
      chars,
      changeTimer: 0,
    };
  }

  update(_time: number, delta: number): void {
    for (let i = 0; i < this.columns.length; i++) {
      const col = this.columns[i];
      col.y += col.speed * delta;
      col.changeTimer += delta;

      // Randomly change characters
      if (col.changeTimer > 0.08) {
        col.changeTimer = 0;
        const idx = (Math.random() * col.chars.length) | 0;
        col.chars[idx] = (Math.random() * this.glyphs.length) | 0;
      }

      // Reset when fully off screen
      if (col.y - col.length > this.rows) {
        this.columns[i] = this.createColumn();
        this.columns[i].y = -this.columns[i].length;
      }
    }
  }

  render(pixels: Uint32Array, width: number, height: number): void {
    // Darken previous frame
    const len = width * height;
    for (let i = 0; i < len; i++) {
      const c = pixels[i];
      const r = ((c & 0xff) * 0.75) | 0;
      const g = (((c >> 8) & 0xff) * 0.75) | 0;
      const b = (((c >> 16) & 0xff) * 0.75) | 0;
      pixels[i] = 0xff000000 | (b << 16) | (g << 8) | r;
    }

    for (let colIdx = 0; colIdx < this.columns.length; colIdx++) {
      const col = this.columns[colIdx];
      const baseX = colIdx * CHAR_W;

      for (let ci = 0; ci < col.chars.length; ci++) {
        const row = (col.y | 0) - ci;
        if (row < 0 || row >= this.rows) continue;

        const baseY = row * CHAR_H;
        const glyph = this.glyphs[col.chars[ci]];

        // Head character is bright white-green, rest fade to dark green
        const headDist = ci;
        const isHead = headDist === 0;
        const fade = clamp(1 - headDist / col.length, 0, 1);

        let cr: number, cg: number, cb: number;
        if (isHead) {
          cr = 200; cg = 255; cb = 200;
        } else {
          cr = (fade * 30) | 0;
          cg = (fade * fade * 220) | 0;
          cb = (fade * 40) | 0;
        }

        // Draw glyph pixels
        for (let gy = 0; gy < CHAR_H; gy++) {
          const sy = baseY + gy;
          if (sy >= height) break;
          for (let gx = 0; gx < CHAR_W; gx++) {
            const sx = baseX + gx;
            if (sx >= width) break;
            const alpha = glyph[gy * CHAR_W + gx];
            if (alpha < 30) continue;
            const a = alpha / 255;
            const pr = (cr * a) | 0;
            const pg = (cg * a) | 0;
            const pb = (cb * a) | 0;
            pixels[sy * width + sx] = packColor(pr, pg, pb);
          }
        }
      }
    }
  }
}
