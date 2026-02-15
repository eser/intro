import type { Effect } from "./types";
import type { EffectConfig } from "@/types/remote-config";
import { packColor, clamp } from "../utils/math";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  r: number;
  g: number;
  b: number;
  size: number;
}

export class ParticleFountainEffect implements Effect {
  readonly name = "Particle Fountain";

  private particles: Particle[] = [];
  private w = 0;
  private h = 0;
  private maxParticles: number;
  private gravity: number;

  constructor(config?: EffectConfig) {
    this.maxParticles = (config?.maxParticles as number) ?? 2500;
    this.gravity = (config?.gravity as number) ?? 90;
  }

  applyConfig(config: EffectConfig): void {
    this.gravity = (config?.gravity as number) ?? this.gravity;
  }

  init(width: number, height: number): void {
    this.w = width;
    this.h = height;
    this.particles = [];

    // Pre-fill with particles so it starts full
    for (let i = 0; i < 600; i++) {
      this.update(0, 0.03);
    }
  }

  update(_time: number, delta: number): void {
    const t = performance.now() * 0.001;
    const w = this.w;
    const h = this.h;

    // Multiple emitters that orbit
    const emitters = [
      {
        x: w * 0.5 + Math.sin(t * 0.9) * w * 0.2,
        y: h * 0.7,
        angle: -Math.PI * 0.5,
        spread: 0.8,
        speed: 160,
        hueBase: t * 60,
      },
      {
        x: w * 0.3 + Math.sin(t * 1.3 + 1) * w * 0.1,
        y: h * 0.8,
        angle: -Math.PI * 0.45,
        spread: 0.6,
        speed: 130,
        hueBase: t * 60 + 120,
      },
      {
        x: w * 0.7 + Math.cos(t * 1.1 + 2) * w * 0.1,
        y: h * 0.8,
        angle: -Math.PI * 0.55,
        spread: 0.6,
        speed: 130,
        hueBase: t * 60 + 240,
      },
    ];

    for (const em of emitters) {
      const count = Math.min(4, ((this.maxParticles - this.particles.length) / 3) | 0);
      for (let i = 0; i < count; i++) {
        const angle = em.angle + (Math.random() - 0.5) * em.spread;
        const speed = em.speed + Math.random() * 100;
        const hue = (em.hueBase + Math.random() * 40) % 360;

        const hr = hue / 60;
        const sector = hr | 0;
        const f = hr - sector;
        let r = 0, g = 0, b = 0;
        switch (sector % 6) {
          case 0: r = 255; g = (f * 255) | 0; b = 30; break;
          case 1: r = ((1 - f) * 255) | 0; g = 255; b = 30; break;
          case 2: r = 30; g = 255; b = (f * 255) | 0; break;
          case 3: r = 30; g = ((1 - f) * 255) | 0; b = 255; break;
          case 4: r = (f * 255) | 0; g = 30; b = 255; break;
          case 5: r = 255; g = 30; b = ((1 - f) * 255) | 0; break;
        }

        this.particles.push({
          x: em.x + (Math.random() - 0.5) * 4,
          y: em.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 0,
          maxLife: 2.0 + Math.random() * 2.5,
          r, g, b,
          size: 1 + Math.random() * 2,
        });
      }
    }

    // Update
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += delta;

      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1);
        continue;
      }

      p.vy += this.gravity * delta;
      p.x += p.vx * delta;
      p.y += p.vy * delta;

      // Bounce off floor with energy loss
      if (p.y > h - 3) {
        p.y = h - 3;
        p.vy *= -0.4;
        p.vx *= 0.7;
      }

      // Bounce off walls
      if (p.x < 2 || p.x > w - 2) {
        p.vx *= -0.6;
        p.x = clamp(p.x, 2, w - 2);
      }
    }
  }

  render(pixels: Uint32Array, width: number, height: number): void {
    // Warm fade for glowing trails
    const len = width * height;
    for (let i = 0; i < len; i++) {
      const c = pixels[i];
      const r = ((c & 0xff) * 0.88) | 0;
      const g = (((c >> 8) & 0xff) * 0.85) | 0;
      const b = (((c >> 16) & 0xff) * 0.87) | 0;
      pixels[i] = 0xff000000 | (b << 16) | (g << 8) | r;
    }

    for (const p of this.particles) {
      const lifeFrac = p.life / p.maxLife;
      const fade = lifeFrac < 0.1
        ? lifeFrac / 0.1  // fade in
        : 1 - (lifeFrac - 0.1) / 0.9;  // fade out
      const brightness = fade * fade;

      const r = clamp((p.r * brightness) | 0, 0, 255);
      const g = clamp((p.g * brightness) | 0, 0, 255);
      const b = clamp((p.b * brightness) | 0, 0, 255);
      const color = packColor(r, g, b);

      // Glow core (brighter)
      const gr = clamp((r + 80 * brightness) | 0, 0, 255);
      const gg = clamp((g + 80 * brightness) | 0, 0, 255);
      const gb = clamp((b + 80 * brightness) | 0, 0, 255);
      const glowColor = packColor(gr, gg, gb);

      const ix = p.x | 0;
      const iy = p.y | 0;
      const sz = ((p.size * (0.5 + brightness * 0.5)) | 0) + 1;

      if (ix < 1 || ix >= width - sz || iy < 1 || iy >= height - sz) continue;

      // Draw particle with glow
      for (let dy = -sz; dy <= sz; dy++) {
        for (let dx = -sz; dx <= sz; dx++) {
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > sz) continue;
          const sx = ix + dx;
          const sy = iy + dy;
          if (sx < 0 || sx >= width || sy < 0 || sy >= height) continue;
          pixels[sy * width + sx] = dist < sz * 0.5 ? glowColor : color;
        }
      }
    }
  }
}
