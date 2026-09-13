import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { createHash, createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { DatabaseService } from '../database/database.service';

type Credentials = { email: string; password: string };
type Tokens = { accessToken: string; refreshToken: string };

@Injectable()
export class AuthService {
  constructor(private readonly db: DatabaseService) {}

  async register(input: Credentials): Promise<Tokens> {
    const email = this.normalizeEmail(input.email);
    this.validatePassword(input.password);
    if (await this.db.account.findUnique({ where: { email } })) throw new ConflictException('An account with this email already exists.');
    const account = await this.db.account.create({ data: { email, passwordHash: this.hashPassword(input.password), person: { create: { firstName: 'Pending', lastName: 'Profile' } } } });
    return this.issueSession(account.id);
  }

  async login(input: Credentials): Promise<Tokens> {
    const account = await this.db.account.findUnique({ where: { email: this.normalizeEmail(input.email) } });
    if (!account || !this.verifyPassword(input.password, account.passwordHash)) throw new UnauthorizedException('Invalid email or password.');
    if (account.status === 'SUSPENDED' || account.status === 'ARCHIVED') throw new UnauthorizedException('Account is not available.');
    await this.db.account.update({ where: { id: account.id }, data: { lastLoginAt: new Date() } });
    return this.issueSession(account.id);
  }

  private async issueSession(accountId: string): Promise<Tokens> {
    const refreshToken = randomBytes(48).toString('base64url');
    await this.db.session.create({ data: { accountId, tokenHash: this.tokenHash(refreshToken), expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30) } });
    return { accessToken: this.createAccessToken(accountId), refreshToken };
  }

  private createAccessToken(accountId: string): string {
    const secret = process.env.JWT_SECRET;
    if (!secret || secret.length < 32) throw new Error('JWT_SECRET must be configured with at least 32 characters.');
    const now = Math.floor(Date.now() / 1000);
    const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
    const body = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: accountId, iat: now, exp: now + 900 })}`;
    return `${body}.${createHmac('sha256', secret).update(body).digest('base64url')}`;
  }

  verifyAccessToken(token: string): { accountId: string } {
    const [header, payload, signature] = token.split('.');
    const secret = process.env.JWT_SECRET;
    if (!header || !payload || !signature || !secret) throw new UnauthorizedException('Invalid access token.');
    const expected = createHmac('sha256', secret).update(`${header}.${payload}`).digest('base64url');
    if (signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) throw new UnauthorizedException('Invalid access token.');
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString()) as { sub?: string; exp?: number };
    if (!claims.sub || !claims.exp || claims.exp <= Math.floor(Date.now() / 1000)) throw new UnauthorizedException('Access token expired.');
    return { accountId: claims.sub };
  }
  private normalizeEmail(value: string): string { const email = value?.trim().toLowerCase(); if (!email || !/^\S+@\S+\.\S+$/.test(email)) throw new BadRequestException('A valid email is required.'); return email; }
  private validatePassword(password: string): void { if (!password || password.length < 12) throw new BadRequestException('Password must be at least 12 characters.'); }
  private hashPassword(password: string): string { const salt = randomBytes(16).toString('hex'); return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`; }
  private verifyPassword(password: string, stored: string): boolean { const [salt, digest] = stored.split(':'); if (!salt || !digest) return false; const actual = scryptSync(password, salt, 64); return timingSafeEqual(actual, Buffer.from(digest, 'hex')); }
  private tokenHash(token: string): string { return createHash('sha256').update(token).digest('hex'); }
}
