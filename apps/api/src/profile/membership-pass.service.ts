import { BadRequestException, ForbiddenException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { createCipheriv, createDecipheriv, createHmac, randomBytes } from 'node:crypto';
import { DatabaseService } from '../database/database.service';

const PURPOSE = Buffer.from('HYDROLAND_MEMBERSHIP_REFERENCE_V1');
const NOTICE = 'بطاقة حساب داخلية في HYDROLAND، وليست رخصة غوص أو إثبات لياقة أو اعتمادًا مهنيًا.';
const MEMBER_ROLES: Readonly<Record<string, string>> = {
  DIVER: 'هواة الغوص', INSTRUCTOR: 'محترفي الغوص', DIVE_CENTER: 'مركز غوص',
  BOAT_OWNER: 'الوساطة البحرية', ORGANIZATION: 'جهة',
};

@Injectable()
export class MembershipPassService {
  constructor(private readonly db: DatabaseService) {}

  private key() {
    const secret = process.env.JWT_SECRET;
    if (!secret || secret.length < 32) throw new ServiceUnavailableException('Membership references are unavailable.');
    // Domain-separated encryption, not a login JWT. The returned reference never
    // grants a session and never exposes account/session IDs or identity records.
    return createHmac('sha256', secret).update(PURPOSE).digest();
  }

  private async snapshot(accountId: string) {
    const account = await this.db.account.findUnique({
      where: { id: accountId },
      select: { status: true, emailVerifiedAt: true,
        person: { select: { firstName: true, lastName: true } },
        roleAssignments: { where: { status: 'ACTIVE' }, select: { role: true } },
      },
    });
    if (!account || account.status !== 'ACTIVE' || !account.emailVerifiedAt) {
      throw new ForbiddenException('Active verified account required.');
    }
    return {
      cardType: 'INTERNAL_ACCOUNT_REFERENCE', officialLicence: false,
      displayName: [account.person.firstName, account.person.lastName].filter(Boolean).join(' ').trim().slice(0, 161) || 'عضو HYDROLAND',
      accountStatus: account.status,
      roles: [...new Set(account.roleAssignments.map(row => MEMBER_ROLES[row.role]).filter(Boolean))],
      noticeAr: NOTICE, observedAt: new Date().toISOString(),
    };
  }

  private async liveSession(sessionId: string) {
    const session = await this.db.session.findUnique({
      where: { id: sessionId }, select: { accountId: true, expiresAt: true, revokedAt: true },
    });
    if (!session || session.revokedAt || session.expiresAt.getTime() <= Date.now()) {
      throw new ForbiddenException('Membership reference is no longer valid.');
    }
    return session;
  }

  async issue(accountId: string, sessionId: string) {
    if (typeof sessionId !== 'string' || sessionId.length > 128 || !sessionId.length) throw new ForbiddenException('An authenticated session is required.');
    const session = await this.liveSession(sessionId);
    if (session.accountId !== accountId) throw new ForbiddenException('Membership account mismatch.');
    const card = await this.snapshot(accountId);
    const expiresAt = Math.min(Date.now() + 300_000, session.expiresAt.getTime());
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key(), iv, { authTagLength: 16 });
    cipher.setAAD(PURPOSE);
    const ciphertext = Buffer.concat([cipher.update(JSON.stringify([sessionId, expiresAt]), 'utf8'), cipher.final()]);
    const reference = 'hlm1.' + Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString('base64url');
    return { ...card, reference, expiresAt: new Date(expiresAt).toISOString(),
      access: 'OWNER_OR_ACTIVE_ADMIN', revokedOnLogout: true };
  }

  async verify(viewerAccountId: string, input: unknown) {
    if (typeof input !== 'string' || input.length > 400 || !/^hlm1\.[A-Za-z0-9_-]+$/.test(input)) throw new BadRequestException('Invalid membership reference.');
    const key = this.key();
    let claims: unknown;
    try {
      const raw = Buffer.from(input.slice(5), 'base64url');
      if (raw.length < 29 || raw.toString('base64url') !== input.slice(5)) throw new Error();
      const decipher = createDecipheriv('aes-256-gcm', key, raw.subarray(0, 12), { authTagLength: 16 });
      decipher.setAAD(PURPOSE); decipher.setAuthTag(raw.subarray(12, 28));
      claims = JSON.parse(Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]).toString('utf8'));
    } catch { throw new BadRequestException('Invalid membership reference.'); }
    if (!Array.isArray(claims) || claims.length !== 2 || typeof claims[0] !== 'string' || !claims[0].length || claims[0].length > 128 || !Number.isSafeInteger(claims[1])) throw new BadRequestException('Invalid membership reference.');
    if (claims[1] <= Date.now() || claims[1] > Date.now() + 300_000) throw new ForbiddenException('Membership reference expired.');
    const session = await this.liveSession(claims[0]);
    if (viewerAccountId !== session.accountId) {
      // Same active-ADMIN rule as the existing AdminGuard. No new role grants,
      // public disclosure, or cross-account access for ordinary members.
      const role = await this.db.roleAssignment.findFirst({ where: { accountId: viewerAccountId, status: 'ACTIVE', role: 'ADMIN' }, select: { id: true } });
      if (!role) throw new ForbiddenException('Membership verification permission required.');
    }
    const card = await this.snapshot(session.accountId);
    return { ...card, expiresAt: new Date(claims[1]).toISOString(), verifiedAt: new Date().toISOString(), access: 'OWNER_OR_ACTIVE_ADMIN' };
  }
}
