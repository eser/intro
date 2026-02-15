import type { Transition } from "./types";
import { lerpColor, smoothstep } from "../utils/math";

export class WipeTransition implements Transition {
  readonly name = "Wipe";

  apply(
    bufferA: Uint32Array,
    bufferB: Uint32Array,
    output: Uint32Array,
    progress: number,
    width: number,
    height: number,
  ): void {
    const cx = width * 0.5;
    const cy = height * 0.5;
    const maxDist = Math.sqrt(cx * cx + cy * cy);
    const threshold = progress * maxDist * 1.3;
    const edgeWidth = maxDist * 0.1;

    let idx = 0;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const dx = x - cx;
        const dy = y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < threshold - edgeWidth) {
          output[idx] = bufferB[idx];
        } else if (dist > threshold + edgeWidth) {
          output[idx] = bufferA[idx];
        } else {
          const t = smoothstep((threshold + edgeWidth - dist) / (edgeWidth * 2));
          output[idx] = lerpColor(bufferA[idx], bufferB[idx], t);
        }
        idx++;
      }
    }
  }
}
