import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

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

export type WeatherGateSettings = {
  enabled: boolean;
  mode: WeatherGateMode;
  provider: string;
};

type SettingRow = { value: unknown };

@Injectable()
export class WeatherGateService {
  constructor(private readonly db: DatabaseService) {}

  private defaults(): WeatherGateSettings {
    return { enabled: false, mode: 'ADVISORY', provider: 'NOT_SELECTED' };
  }

  async settings(): Promise<WeatherGateSettings> {
    const rows = await this.db.$queryRaw<SettingRow[]>`
      SELECT "value" FROM "OperationalSetting" WHERE "key" = 'WEATHER_GATE' LIMIT 1
    `;
    const value = rows[0]?.value;
    if (!value || Array.isArray(value) || typeof value !== 'object') return this.defaults();
    const record = value as Record<string, unknown>;
    return {
      enabled: record.enabled === true,
      mode: record.mode === 'ENFORCE' ? 'ENFORCE' : 'ADVISORY',
      provider: typeof record.provider === 'string' ? record.provider : 'NOT_SELECTED',
    };
  }

  async configure(input: { enabled?: boolean; mode?: WeatherGateMode }) {
    const current = await this.settings();
    const next: WeatherGateSettings = {
      ...current,
      enabled: typeof input.enabled === 'boolean' ? input.enabled : current.enabled,
      mode: input.mode === 'ENFORCE' || input.mode === 'ADVISORY' ? input.mode : current.mode,
    };
    await this.db.$executeRaw`
      INSERT INTO "OperationalSetting" ("key", "value", "updatedAt")
      VALUES ('WEATHER_GATE', ${JSON.stringify(next)}::jsonb, NOW())
      ON CONFLICT ("key") DO UPDATE SET "value" = EXCLUDED."value", "updatedAt" = NOW()
    `;
    return next;
  }

  evaluate(snapshot: WeatherSnapshot | null | undefined, settings: WeatherGateSettings) {
    if (!snapshot) {
      return {
        blocking: settings.enabled && settings.mode === 'ENFORCE',
        decision: 'UNAVAILABLE' as const,
        reason: 'Weather data unavailable.',
      };
    }
    const decision = snapshot.decision ?? 'UNAVAILABLE';
    const blocking = settings.enabled && settings.mode === 'ENFORCE' && decision !== 'ALLOWED';
    return { blocking, decision, reason: snapshot.reason ?? null };
  }
}
