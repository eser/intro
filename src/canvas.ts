export class CanvasManager {
  readonly canvas: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;
  imageData!: ImageData;
  pixels!: Uint32Array;
  width = 0;
  height = 0;

  private resolutionScale: number;
  private resizeTimeout: ReturnType<typeof setTimeout> | null = null;
  private boundResize: () => void;
  onResize: ((width: number, height: number) => void) | null = null;

  constructor(container: HTMLElement, resolutionScale = 0.5) {
    this.resolutionScale = resolutionScale;

    this.canvas = document.createElement("canvas");
    this.canvas.style.position = "fixed";
    this.canvas.style.inset = "0";
    this.canvas.style.width = "100%";
    this.canvas.style.height = "100%";
    this.canvas.style.imageRendering = "pixelated";

    const ctx = this.canvas.getContext("2d", { willReadFrequently: false });
    if (!ctx) throw new Error("Canvas 2D context unavailable");
    this.ctx = ctx;

    container.appendChild(this.canvas);

    this.boundResize = () => this.debouncedResize();
    window.addEventListener("resize", this.boundResize);
    this.resize();
  }

  private debouncedResize(): void {
    if (this.resizeTimeout) clearTimeout(this.resizeTimeout);
    this.resizeTimeout = setTimeout(() => this.resize(), 100);
  }

  resize(): void {
    const scale = this.resolutionScale;
    this.width = Math.max(1, (window.innerWidth * scale) | 0);
    this.height = Math.max(1, (window.innerHeight * scale) | 0);
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.imageData = this.ctx.createImageData(this.width, this.height);
    this.pixels = new Uint32Array(this.imageData.data.buffer);
    this.onResize?.(this.width, this.height);
  }

  present(): void {
    this.ctx.putImageData(this.imageData, 0, 0);
  }

  destroy(): void {
    window.removeEventListener("resize", this.boundResize);
    if (this.resizeTimeout) clearTimeout(this.resizeTimeout);
    this.canvas.remove();
  }
}
