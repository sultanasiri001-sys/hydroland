import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { DatabaseService } from '../database/database.service';

type Credentials = { email: string; password: string };
type Tokens = { accessToken: string; refreshToken: string };

@Injectable()
export class AuthService {
  constructor(private readonly db: DatabaseService) {}

  async register(input: Credentials): Promise<Tokens> {
    const email = this.normalizeEmail(input.email);
    this.validatePassword(input.password);
    const exists = await this.db.account.findUnique({ where: { email } });
    if (exists) throw new ConflictException('An account with this email already exists.');

    const account = await this.db.account.create({
      data: { email, passwordHash: this.hashPassword(input.password), person: { create: { firstName: 'Pending', lastName: 'Profile' } } },
    });
    return this.issueSession(account.id);
  }

  async login(input: Credentials): Promise<Tokens> {
    const account = await this.db.account.findUnique({ where: { email: this.normalizeEmail(input.email) } });
    if (!account || !this.verifyPassword(input.password, account.passwordHash)) {
      throw new UnauthorizedException('Invalid email or password.');
    }
    if (account.status === 'SUSPENDED' || account.status === 'ARCHIVED') {
      throw new UnauthorizedException('Account is not available.');
    }
    await this.db.account.update({ where: { id: account.id }, data: { lastLoginAt: new Date() } });
    return this.issueSession(account.id);
  }

  private async issueSession(accountId: string): Promise<Tokens> {
    const refreshToken = randomBytes(48).toString('base64url');
    await this.db.session.create({ data: { accountId, tokenHash: this.tokenHash(refreshToken), expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30) } });
    return { accessToken: randomBytes(32).toString('base64url'), refreshToken };
  }

  private normalizeEmail(value: string): string {
    const email = value?.trim().toLowerCase();
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) throw new BadRequestException('A valid email is required.');
    return email;
  }

  private validatePassword(password: string): void {
    if (!password || password.length < 12) throw new BadRequestException('Password must be at least 12 characters.');
  }

  private hashPassword(password: string): string {
    const salt = randomBytes(16).toString('hex');
    return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
  }

  private verifyPassword(password: string, stored: string): boolean {
    const [salt, digest] = stored.split(':');
    if (!salt || !digest) return false;
    const actual = scryptSync(password, salt, 64);
    return timingSafeEqual(actual, Buffer.from(digest, 'hex'));
  }

  private tokenHash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
