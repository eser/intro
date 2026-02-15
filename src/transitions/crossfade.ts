import type { Transition } from "./types";
import { lerpColor } from "../utils/math";

export class CrossfadeTransition implements Transition {
  readonly name = "Crossfade";

  apply(
    bufferA: Uint32Array,
    bufferB: Uint32Array,
    output: Uint32Array,
    progress: number,
    _width: number,
    _height: number,
  ): void {
    const len = output.length;
    for (let i = 0; i < len; i++) {
      output[i] = lerpColor(bufferA[i], bufferB[i], progress);
    }
  }
}
