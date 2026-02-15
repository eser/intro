export interface Transition {
  readonly name: string;

  /**
   * Composite two pixel buffers.
   * @param bufferA - outgoing effect pixels
   * @param bufferB - incoming effect pixels
   * @param output  - destination buffer
   * @param progress - 0.0 (fully A) to 1.0 (fully B)
   */
  apply(
    bufferA: Uint32Array,
    bufferB: Uint32Array,
    output: Uint32Array,
    progress: number,
    width: number,
    height: number,
  ): void;
}
