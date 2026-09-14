import { Injectable } from '@nestjs/common';

export type WeatherGateMode = 'ENFORCE' | 'ADVISORY';
export type WeatherDecision = 'ALLOWED' | 'REVIEW_REQUIRED' | 'DEFERRED' | 'UNAVAILABLE';

export type WeatherSnapshot = {
  provider?: string;
  observedAt?: string;
  windSpeedKph?: number;
  windGustKph?: number;
  windDirectionDeg?: number;
  waveHeightM?: number;
  waveDirectionDeg?: number;
  decision?: WeatherDecision;
  reason?: string;
};

@Injectable()
export class WeatherGateService {
  private enabled = false;
  private mode: WeatherGateMode = 'ADVISORY';

  settings() {
    return { enabled: this.enabled, mode: this.mode, provider: 'NOT_SELECTED' };
  }

  configure(input: { enabled?: boolean; mode?: WeatherGateMode }) {
    if (typeof input.enabled === 'boolean') this.enabled = input.enabled;
    if (input.mode === 'ENFORCE' || input.mode === 'ADVISORY') this.mode = input.mode;
    return this.settings();
  }

  evaluate(snapshot?: WeatherSnapshot | null) {
    if (!snapshot) return { blocking: false, decision: 'UNAVAILABLE' as const, reason: 'Weather data unavailable.' };
    const decision = snapshot.decision ?? 'UNAVAILABLE';
    const blocking = this.enabled && this.mode === 'ENFORCE' && decision !== 'ALLOWED';
    return { blocking, decision, reason: snapshot.reason ?? null };
  }
}