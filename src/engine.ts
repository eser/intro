import type { Effect } from "./effects/types";
import type { Transition } from "./transitions/types";
import type { CanvasManager } from "./canvas";
import type { TextScroller } from "./overlay/scroller";
import type { RemoteConfig, EffectConfig } from "./types/remote-config";
import { smoothstep } from "./utils/math";

export class Engine {
  private effects: Effect[];
  private effectTypes: string[];
  private transitions: Transition[];
  private scroller: TextScroller | null;
  private canvas: CanvasManager;
  private effectDuration: number;
  private transitionDuration: number;

  private currentIndex = 0;
  private nextIndex = 0;
  private effectTimer = 0;
  private transitioning = false;
  private transitionProgress = 0;
  private activeTransition: Transition | null = null;

  private bufferA: Uint32Array = new Uint32Array(0);
  private bufferB: Uint32Array = new Uint32Array(0);

  private lastTimestamp = 0;
  private running = false;
  private stopped = false;
  private startTime = 0;

  private boundKeyDown = (e: KeyboardEvent): void => this.onKeyDown(e);
  private boundVisibility = (): void => this.onVisibility();

  constructor(
    canvas: CanvasManager,
    effects: Effect[],
    effectTypes: string[],
    transitions: Transition[],
    scroller: TextScroller | null,
    effectDuration: number,
    transitionDuration: number,
  ) {
    this.canvas = canvas;
    this.effects = effects;
    this.effectTypes = effectTypes;
    this.transitions = transitions;
    this.scroller = scroller;
    this.effectDuration = effectDuration;
    this.transitionDuration = transitionDuration;

    this.canvas.onResize = (w, h) => this.onResize(w, h);
    this.initBuffers();
    this.initEffects();
  }

  private initBuffers(): void {
    const len = this.canvas.width * this.canvas.height;
    this.bufferA = new Uint32Array(len);
    this.bufferB = new Uint32Array(len);
  }

  private initEffects(): void {
    const { width, height } = this.canvas;
    for (const effect of this.effects) {
      effect.init(width, height);
    }
    this.scroller?.init(width, height);
  }

  private onResize(width: number, height: number): void {
    const len = width * height;
    this.bufferA = new Uint32Array(len);
    this.bufferB = new Uint32Array(len);
    for (const effect of this.effects) {
      effect.init(width, height);
    }
    this.scroller?.init(width, height);
  }

  start(): void {
    this.running = true;
    this.stopped = false;
    this.startTime = performance.now() * 0.001;
    this.lastTimestamp = performance.now();

    window.addEventListener("keydown", this.boundKeyDown);
    document.addEventListener("visibilitychange", this.boundVisibility);

    this.tick(performance.now());
  }

  stop(): void {
    this.running = false;
    this.stopped = true;
    window.removeEventListener("keydown", this.boundKeyDown);
    document.removeEventListener("visibilitychange", this.boundVisibility);
    this.canvas.destroy();
  }

  applyConfig(config: RemoteConfig): void {
    this.effectDuration = config.general.effectDuration / 1000;
    this.transitionDuration = config.general.transitionDuration / 1000;

    // Build a lookup from effect type to its config
    const configByType = new Map<string, EffectConfig>();
    for (const ec of config.effects) {
      configByType.set(ec.type, ec);
    }

    // Hot-update each effect's realtime parameters
    for (let i = 0; i < this.effects.length; i++) {
      const type = this.effectTypes[i];
      const ec = configByType.get(type);
      if (ec) {
        this.effects[i].applyConfig?.(ec);
      }
    }

    // Update scroller
    const overlay = config.overlays.find(
      (o) => o.type === "tickertext" && o.enabled,
    );
    if (this.scroller && overlay) {
      if (overlay.speed != null) this.scroller.setSpeed(overlay.speed);
      if (overlay.content != null) this.scroller.setMessage(overlay.content);
    }
  }

  private onVisibility(): void {
    if (document.hidden) {
      this.running = false;
    } else {
      this.running = true;
      this.lastTimestamp = performance.now();
      this.tick(performance.now());
    }
  }

  private beginTransition(): void {
    this.transitioning = true;
    this.transitionProgress = 0;
    this.effectTimer = 0;
    this.bufferA.fill(0xff000000);
    this.bufferB.fill(0xff000000);
    this.activeTransition =
      this.transitions[(Math.random() * this.transitions.length) | 0];
  }

  private switchEffect(direction: number): void {
    const n = this.effects.length;
    const base = this.transitioning ? this.nextIndex : this.currentIndex;

    // Snap current if mid-transition
    if (this.transitioning) {
      this.currentIndex = this.nextIndex;
    }

    const target = ((base + direction) % n + n) % n;
    if (target === this.currentIndex) return;

    this.nextIndex = target;
    this.beginTransition();
  }

  private onKeyDown(e: KeyboardEvent): void {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      this.switchEffect(1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      this.switchEffect(-1);
    } else if (e.key === "f" || e.key === "F") {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        document.documentElement.requestFullscreen();
      }
    }
  }

  private tick = (timestamp: number): void => {
    if (!this.running || this.stopped) return;

    const delta = Math.min((timestamp - this.lastTimestamp) * 0.001, 0.1);
    this.lastTimestamp = timestamp;
    const time = timestamp * 0.001 - this.startTime;

    this.effectTimer += delta;
    this.scroller?.update(delta);

    const { width, height } = this.canvas;
    const pixels = this.canvas.pixels;

    if (this.transitioning) {
      this.transitionProgress += delta / this.transitionDuration;

      if (this.transitionProgress >= 1) {
        this.transitioning = false;
        this.transitionProgress = 0;
        this.activeTransition = null;
        this.effectTimer = 0;
        this.currentIndex = this.nextIndex;

        const current = this.effects[this.currentIndex];
        current.update(time, delta);
        current.render(pixels, width, height);
      } else {
        const current = this.effects[this.currentIndex];
        const next = this.effects[this.nextIndex];

        current.update(time, delta);
        next.update(time, delta);

        current.render(this.bufferA, width, height);
        next.render(this.bufferB, width, height);

        const easedProgress = smoothstep(this.transitionProgress);
        this.activeTransition!.apply(
          this.bufferA,
          this.bufferB,
          pixels,
          easedProgress,
          width,
          height,
        );
      }
    } else {
      if (this.effectTimer >= this.effectDuration) {
        this.nextIndex = (this.currentIndex + 1) % this.effects.length;
        this.beginTransition();
      }

      const current = this.effects[this.currentIndex];
      current.update(time, delta);
      current.render(pixels, width, height);
    }

    this.canvas.present();
    this.scroller?.render(this.canvas.ctx, width, height);

    requestAnimationFrame(this.tick);
  };
}
