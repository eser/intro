import { useEffect, useRef } from "react";
import type { EffectConfig } from "@/types/remote-config";
import type { Effect } from "@/effects/types";

import { ConfigManager } from "@/config-manager";
import { CanvasManager } from "@/canvas";
import { Engine } from "@/engine";

import { PlasmaEffect } from "@/effects/plasma";
import { StarfieldEffect } from "@/effects/starfield";
import { FireEffect } from "@/effects/fire";
import { TunnelEffect } from "@/effects/tunnel";
import { MetaballsEffect } from "@/effects/metaballs";
import { RotozoomEffect } from "@/effects/rotozoom";
import { VoxelLandscapeEffect } from "@/effects/voxel-landscape";
import { WireframeCubeEffect } from "@/effects/wireframe-cube";
import { ParticleFountainEffect } from "@/effects/particles";
import { MatrixRainEffect } from "@/effects/matrix-rain";

import { CrossfadeTransition } from "@/transitions/crossfade";
import { WipeTransition } from "@/transitions/wipe";

import { TextScroller } from "@/overlay/scroller";

const EFFECT_FACTORIES: Record<string, (config?: EffectConfig) => Effect> = {
  plasma: (c) => new PlasmaEffect(c),
  starfield: (c) => new StarfieldEffect(c),
  fire: (c) => new FireEffect(c),
  tunnel: (c) => new TunnelEffect(c),
  metaballs: (c) => new MetaballsEffect(c),
  rotozoom: (c) => new RotozoomEffect(c),
  "voxel-landscape": (c) => new VoxelLandscapeEffect(c),
  "wireframe-cube": (c) => new WireframeCubeEffect(c),
  particles: (c) => new ParticleFountainEffect(c),
  "matrix-rain": (c) => new MatrixRainEffect(c),
};

export function DemoCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const configManager = new ConfigManager();
    const config = configManager.getConfig();

    const canvas = new CanvasManager(container, config.general.resolutionScale);

    // Build effects from config (only enabled ones, in config order)
    const effects: Effect[] = [];
    const effectTypes: string[] = [];
    for (const ec of config.effects) {
      if (!ec.enabled) continue;
      const factory = EFFECT_FACTORIES[ec.type];
      if (factory) {
        effects.push(factory(ec));
        effectTypes.push(ec.type);
      }
    }

    // Build overlay scroller from config
    const tickerOverlay = config.overlays.find(
      (o) => o.type === "tickertext" && o.enabled,
    );
    const scroller = tickerOverlay
      ? new TextScroller(tickerOverlay.content ?? "", tickerOverlay.speed ?? 120)
      : null;

    const transitions = [new CrossfadeTransition(), new WipeTransition()];

    const engine = new Engine(
      canvas,
      effects,
      effectTypes,
      transitions,
      scroller,
      config.general.effectDuration / 1000,
      config.general.transitionDuration / 1000,
    );
    engine.start();

    // Poll remote config and hot-apply changes
    configManager.startPolling((newConfig) => {
      engine.applyConfig(newConfig);
    });

    return () => {
      configManager.stopPolling();
      engine.stop();
    };
  }, []);

  return <div ref={containerRef} style={{ width: "100%", height: "100%" }} />;
}
