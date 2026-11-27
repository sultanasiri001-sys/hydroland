import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { IntegrationService } from './integration.service';
import { finiteNumericInput } from '../geo/coordinate-input';
import { AIS_PROVIDER_WINDOW_MINUTES, aisTimeAssessment, marineEvidenceDigest, marineUtcInstant } from './marine-provider-evidence';
import { marineProviderFailure, marineProviderJson, marineProviderOrigin } from './marine-provider-transport';

type VesselIdentifier = { mmsi?: string; imo?: string };
export type MarineTrafficAisPosition = {
  mmsi: string;
  imo: string | null;
  shipId: string | null;
  name: string | null;
  latitude: number;
  longitude: number;
  speedKnots: number | null;
  courseDeg: number | null;
  headingDeg: number | null;
  navigationalStatus: string | null;
  timestamp: string;
  source: 'MARINETRAFFIC';
  identityMatched: true;
  requestBinding: { mmsi: string | null; imo: string | null };
  sourceEvidence: { provider: 'MARINETRAFFIC'; version: '6'; responseHash: string; fetchedAt: string };
  freshness: ReturnType<typeof aisTimeAssessment>;
  informationOnly: true;
  operationalAcceptance: false;
};

@Injectable()
export class MarineTrafficAisService {
  constructor(private readonly integrations: IntegrationService) {}

  async singleVesselByMmsi(mmsi: string, expectedImo?: string): Promise<MarineTrafficAisPosition> {
    return this.lookup({ mmsi: this.identifier(mmsi, 9, 'MMSI'), ...(expectedImo === undefined ? {} : { imo: this.identifier(expectedImo, 7, 'IMO') }) });
  }

  async singleVesselByImo(imo: string): Promise<MarineTrafficAisPosition> {
    return this.lookup({ imo: this.identifier(imo, 7, 'IMO') });
  }

  private assertAisProvider() {
    this.integrations.requireOperational('DISTRESS_AIS', { allowSandbox: true });
    if ((process.env.HYDROLAND_DISTRESS_AIS_PROVIDER?.trim().toUpperCase() || '') !== 'MARINETRAFFIC_AIS_ONLY') throw marineProviderFailure('AIS_PROVIDER_NOT_CONFIGURED');
    const key = process.env.MARINETRAFFIC_API_KEY?.trim();
    if (!key || !/^[0-9a-f]{40}$/i.test(key)) throw marineProviderFailure('AIS_CREDENTIAL_NOT_CONFIGURED');
    return key;
  }

  private async lookup(identifier: VesselIdentifier): Promise<MarineTrafficAisPosition> {
    const key = this.assertAisProvider(), origin = marineProviderOrigin('MARINETRAFFIC');
    const lifecycle = process.env.HYDROLAND_INTEGRATION_DISTRESS_AIS_STATUS;
    try {
      const url = new URL(`/api/exportvessel/${encodeURIComponent(key)}`, origin);
      url.searchParams.set('v', '6');
      url.searchParams.set('protocol', 'jsono');
      url.searchParams.set('timespan', String(AIS_PROVIDER_WINDOW_MINUTES));
      if (identifier.mmsi) url.searchParams.set('mmsi', identifier.mmsi);
      if (identifier.imo) url.searchParams.set('imo', identifier.imo);
      const received = await marineProviderJson('MARINETRAFFIC', url, { Accept: 'application/json' });
      if (this.assertAisProvider() !== key || origin !== marineProviderOrigin('MARINETRAFFIC')
        || lifecycle !== process.env.HYDROLAND_INTEGRATION_DISTRESS_AIS_STATUS) throw marineProviderFailure('MARINE_CONFIGURATION_CHANGED');
      const result = this.position(received.payload, identifier, received.fetchedAt, received.responseHash);
      this.integrations.observeMarineProvider('DISTRESS_AIS', 'RESPONSE_RECEIVED');
      return result;
    } catch (error) {
      const response = error instanceof ServiceUnavailableException ? error.getResponse() : null;
      const code = response && typeof response === 'object' && 'code' in response ? String(response.code) : 'AIS_EVIDENCE_UNAVAILABLE';
      this.integrations.observeMarineProvider('DISTRESS_AIS', 'FAILED', code);
      throw error;
    }
  }

  private position(payload: unknown, expected: VesselIdentifier, fetchedAt = new Date().toISOString(), responseHash = marineEvidenceDigest(payload)): MarineTrafficAisPosition {
    const rows = Array.isArray(payload) ? payload : payload && typeof payload === 'object' && Array.isArray((payload as Record<string, unknown>).DATA)
      ? (payload as Record<string, unknown>).DATA as unknown[] : [];
    if (rows.length !== 1) throw marineProviderFailure(rows.length ? 'AIS_RESPONSE_AMBIGUOUS' : 'AIS_POSITION_UNAVAILABLE');
    const row = rows[0];
    if (!row || typeof row !== 'object' || Array.isArray(row)) throw marineProviderFailure('AIS_POSITION_INVALID');
    const data = row as Record<string, unknown>;
    const text = (key: string) => typeof data[key] === 'string' && (data[key] as string).length <= 200 ? (data[key] as string).trim()
      : typeof data[key] === 'number' && Number.isSafeInteger(data[key]) ? String(data[key]) : '';
    const number = (key: string) => finiteNumericInput(data[key]);
    const mmsi = text('MMSI'), rawImo = text('IMO'), imo = rawImo && rawImo !== '0' ? rawImo : null;
    const latitude = number('LAT'), longitude = number('LON');
    if (!/^\d{9}$/.test(mmsi) || imo !== null && !/^\d{7}$/.test(imo)
      || latitude === null || Math.abs(latitude) > 90 || longitude === null || Math.abs(longitude) > 180) throw marineProviderFailure('AIS_POSITION_INVALID');
    if (!expected || !expected.mmsi && !expected.imo || expected.mmsi && expected.mmsi !== mmsi || expected.imo && expected.imo !== imo) throw marineProviderFailure('AIS_VESSEL_IDENTITY_MISMATCH');
    const observedAt = marineUtcInstant(data.TIMESTAMP), fetched = marineUtcInstant(fetchedAt);
    if (!observedAt || !fetched) throw marineProviderFailure('AIS_TIMESTAMP_INVALID');
    if (Date.parse(observedAt) > Date.parse(fetched)) throw marineProviderFailure('AIS_TIMESTAMP_IN_FUTURE');
    const speedRaw = number('SPEED'), courseRaw = number('COURSE'), headingRaw = number('HEADING'), status = text('STATUS') || null;
    return {
      mmsi, imo, shipId: text('SHIP_ID') || null, name: text('SHIPNAME') || null, latitude, longitude,
      speedKnots: speedRaw === null || speedRaw < 0 ? null : speedRaw / 10,
      courseDeg: courseRaw === null || courseRaw < 0 || courseRaw >= 360 ? null : courseRaw,
      headingDeg: status === '97' || headingRaw === null || headingRaw < 0 || headingRaw >= 360 ? null : headingRaw,
      navigationalStatus: status, timestamp: observedAt, source: 'MARINETRAFFIC', identityMatched: true,
      requestBinding: { mmsi: expected.mmsi ?? null, imo: expected.imo ?? null },
      sourceEvidence: { provider: 'MARINETRAFFIC', version: '6', responseHash, fetchedAt: fetched },
      freshness: aisTimeAssessment(observedAt, fetched), informationOnly: true, operationalAcceptance: false,
    };
  }

  private identifier(value: unknown, digits: number, label: string): string {
    const normalized = typeof value === 'string' ? value.trim() : '';
    if (!new RegExp(`^\\d{${digits}}$`).test(normalized)) throw new BadRequestException(`Invalid ${label}.`);
    return normalized;
  }
}
