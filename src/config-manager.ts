import type { RemoteConfig } from "@/types/remote-config";
import defaultConfig from "../config.json";

const POLL_INTERVAL = 30_000;

export class ConfigManager {
  private config: RemoteConfig;
  private remoteUrl: string | undefined;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private onChange: ((config: RemoteConfig) => void) | null = null;
  private lastJson = "";

  constructor() {
    this.config = defaultConfig as RemoteConfig;
    this.lastJson = JSON.stringify(this.config);

    const envVal = import.meta.env.VITE_REMOTE_CONFIG as string | undefined;
    this.remoteUrl = envVal && envVal.trim() !== "" ? envVal.trim() : undefined;
  }

  getConfig(): RemoteConfig {
    return this.config;
  }

  startPolling(onChange: (config: RemoteConfig) => void): void {
    this.onChange = onChange;

    if (!this.remoteUrl) return;

    this.fetchConfig();
    this.intervalId = setInterval(() => this.fetchConfig(), POLL_INTERVAL);
  }

  stopPolling(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private async fetchConfig(): Promise<void> {
    try {
      const response = await fetch(this.remoteUrl!);
      if (!response.ok) {
        console.error(`Remote config fetch failed: ${response.status}`);
        return;
      }

      const newConfig = (await response.json()) as RemoteConfig;
      const newJson = JSON.stringify(newConfig);

      if (newJson !== this.lastJson) {
        this.config = newConfig;
        this.lastJson = newJson;
        this.onChange?.(newConfig);
      }
    } catch (err) {
      console.error("Failed to fetch remote config:", err);
    }
  }
}
