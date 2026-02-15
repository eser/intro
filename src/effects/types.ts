import type { EffectConfig } from "@/types/remote-config";

export interface Effect {
  readonly name: string;

  /** Initialize or reinitialize for the given canvas dimensions. */
  init(width: number, height: number): void;

  /** Advance internal state by one frame. */
  update(time: number, delta: number): void;

  /** Render the current frame into the pixel buffer (Uint32Array, ABGR packed). */
  render(pixels: Uint32Array, width: number, height: number): void;

  /** Hot-update configurable parameters without restarting the effect. */
  applyConfig?(config: EffectConfig): void;

  /** Optional cleanup. */
  destroy?(): void;
}
