import { BadRequestException, Body, ConflictException, Controller, Header, HttpCode, HttpException, HttpStatus, Post, Query, ServiceUnavailableException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { platformOrganization, record } from '../hr/staffing-catalog';

const VERSION = 'D12.search.v1';
const ACTION = 'PUBLIC_SEARCH_SUBMITTED';
const RESOURCE = 'PublicSearch';
const MAX_NEW_EVENTS_PER_MINUTE = 60;
const MAX_REQUESTS_PER_MINUTE = 180;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Controller('discovery/search-events')
export class PublicSearchEventsController {
  // One bounded ingress bucket per process, with no address or visitor keys.
  private ingress = { minute: -1, requests: 0 };
  constructor(private readonly db: DatabaseService) {}

  @Post()
  @HttpCode(204)
  @Header('Cache-Control', 'no-store')
  async submitted(@Body() body: unknown, @Query() query: Record<string, unknown>) {
    const input = record(body);
    if (!body || Array.isArray(body) || Object.keys(query).length
        || Object.keys(input).length !== 2 || Object.keys(input).some(key => !['eventId', 'schemaVersion'].includes(key))
        || input.schemaVersion !== VERSION || typeof input.eventId !== 'string' || !UUID.test(input.eventId)) {
      throw new BadRequestException('Invalid public search event.');
    }
    const minute = Math.floor(Date.now() / 60_000);
    if (this.ingress.minute !== minute) this.ingress = { minute, requests: 0 };
    if (++this.ingress.requests > MAX_REQUESTS_PER_MINUTE) throw this.limited();
    const eventId = input.eventId.toLowerCase();
    const persist = () => this.db.serializable(async tx => {
      // The database-wide lock and Serializable retry protect the shared write
      // budget across instances. Return an integer, not PostgreSQL's void type.
      await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtext('D12:PUBLIC_SEARCH_SUBMITTED')::bigint)`;
      let platform;
      try { platform = await platformOrganization(tx); } catch { throw new ServiceUnavailableException('Public search measurement is unavailable.'); }
      if (!platform) throw new ServiceUnavailableException('Public search measurement is unavailable.');
      const existing = await tx.auditEvent.findUnique({ where: { id: eventId }, select: { action: true, resource: true, resourceId: true, actorId: true, ipAddress: true, metadata: true } });
      if (existing) {
        const metadata = record(existing.metadata);
        if (existing.action !== ACTION || existing.resource !== RESOURCE || existing.resourceId !== eventId
            || existing.actorId !== null || existing.ipAddress !== null || metadata.organizationId !== platform.id
            || metadata.schemaVersion !== VERSION || metadata.scope !== 'PLATFORM') {
          throw new ConflictException('Public search event identity is already in use.');
        }
        return; // A replay never changes the original time, scope or payload.
      }
      const [clock] = await tx.$queryRaw<Array<{ at: Date }>>`SELECT CURRENT_TIMESTAMP AS at`;
      const start = new Date(Math.floor(clock.at.getTime() / 60_000) * 60_000);
      const count = await tx.auditEvent.count({ where: {
        action: ACTION, resource: RESOURCE, occurredAt: { gte: start, lt: new Date(start.getTime() + 60_000) },
        metadata: { path: ['organizationId'], equals: platform.id },
      } });
      if (count >= MAX_NEW_EVENTS_PER_MINUTE) throw this.limited();
      await tx.auditEvent.create({ data: {
        id: eventId, action: ACTION, resource: RESOURCE, resourceId: eventId,
        actorId: null, ipAddress: null, requestId: null, occurredAt: clock.at,
        metadata: { schemaVersion: VERSION, scope: 'PLATFORM', organizationId: platform.id },
      } });
    });
    try { await persist(); } catch (error) {
      // A concurrent insert can surface as a uniqueness conflict rather than
      // serialization failure. Re-read in a fresh transaction; never overwrite.
      if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') await persist();
      else throw error;
    }
  }

  private limited() {
    return new HttpException('Public search measurement capacity reached.', HttpStatus.TOO_MANY_REQUESTS);
  }
}
