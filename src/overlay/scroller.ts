export class TextScroller {
  private textCanvas: HTMLCanvasElement;
  private textCtx: CanvasRenderingContext2D;
  private textWidth = 0;
  private scrollOffset = 0;
  private message: string;
  private scrollerSpeed: number;
  private fontSize = 0;
  private ready = false;

  constructor(message: string, speed: number) {
    this.message = message;
    this.scrollerSpeed = speed;
    this.textCanvas = document.createElement("canvas");
    const ctx = this.textCanvas.getContext("2d");
    if (!ctx) throw new Error("Cannot create text canvas context");
    this.textCtx = ctx;
  }

  init(viewWidth: number, viewHeight: number): void {
    this.fontSize = Math.max(16, (viewHeight * 0.06) | 0);
    const font = `bold ${this.fontSize}px "Helvetica Neue", Helvetica, Arial, sans-serif`;

    // Measure text
    this.textCtx.font = font;
    const metrics = this.textCtx.measureText(this.message);
    this.textWidth = metrics.width + viewWidth;

    // Size the offscreen canvas for the full text
    this.textCanvas.width = (this.textWidth + viewWidth) | 0;
    this.textCanvas.height = this.fontSize * 2;

    // Re-set font after resize (canvas reset clears state)
    this.textCtx.font = font;
    this.textCtx.textBaseline = "middle";

    // Render text to offscreen canvas with glow
    this.textCtx.clearRect(
      0,
      0,
      this.textCanvas.width,
      this.textCanvas.height,
    );

    // Glow pass
    this.textCtx.shadowColor = "rgba(200, 180, 255, 0.6)";
    this.textCtx.shadowBlur = this.fontSize * 0.4;
    this.textCtx.fillStyle = "rgba(200, 180, 255, 0.3)";
    this.textCtx.fillText(
      this.message,
      viewWidth,
      this.textCanvas.height * 0.5,
    );

    // Main text pass
    this.textCtx.shadowColor = "rgba(255, 255, 255, 0.4)";
    this.textCtx.shadowBlur = this.fontSize * 0.15;
    this.textCtx.fillStyle = "rgba(255, 255, 255, 0.85)";
    this.textCtx.fillText(
      this.message,
      viewWidth,
      this.textCanvas.height * 0.5,
    );

    this.scrollOffset = 0;
    this.ready = true;
  }

  setSpeed(speed: number): void {
    this.scrollerSpeed = speed;
  }

  update(delta: number): void {
    if (!this.ready) return;
    this.scrollOffset += this.scrollerSpeed * delta;
    if (this.scrollOffset > this.textWidth) {
      this.scrollOffset -= this.textWidth;
    }
  }

  render(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    if (!this.ready) return;

    const yBase = height * 0.85;
    const t = performance.now() * 0.001;

    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.globalCompositeOperation = "screen";

    // Draw with sine wave displacement
    const sliceWidth = 4;
    const totalSlices = ((width / sliceWidth) | 0) + 1;

    for (let i = 0; i < totalSlices; i++) {
      const sx = this.scrollOffset + i * sliceWidth;
      const dstX = i * sliceWidth;
      const sineOffset =
        Math.sin(t * 2.0 + i * 0.08) * this.fontSize * 0.35;

      ctx.drawImage(
        this.textCanvas,
        sx,
        0,
        sliceWidth,
        this.textCanvas.height,
        dstX,
        yBase + sineOffset - this.fontSize,
        sliceWidth,
        this.textCanvas.height,
      );
    }

    ctx.restore();
  }
}
