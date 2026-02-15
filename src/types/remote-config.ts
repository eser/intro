export interface GeneralConfig {
  effectDuration: number;
  transitionDuration: number;
  resolutionScale: number;
}

export interface OverlayConfig {
  type: string;
  enabled: boolean;
  content?: string;
  speed?: number;
}

export interface EffectConfig {
  type: string;
  enabled: boolean;
  [key: string]: unknown;
}

export interface RemoteConfig {
  general: GeneralConfig;
  overlays: OverlayConfig[];
  effects: EffectConfig[];
}
