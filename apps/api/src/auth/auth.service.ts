import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import { PrismaService } from '../database/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService, private readonly jwt: JwtService) {}

  async register(input: RegisterDto) {
    const email = input.email.trim().toLowerCase();
    if (await this.prisma.account.findUnique({ where: { email } })) throw new ConflictException('البريد الإلكتروني مستخدم بالفعل');
    const passwordHash = await hash(input.password, 12);
    return this.prisma.person.create({
      data: {
        firstName: input.firstName.trim(), lastName: input.lastName.trim(), preferredLanguage: input.preferredLanguage ?? 'ar',
        profile: { create: { displayName: `${input.firstName.trim()} ${input.lastName.trim()}` } },
        accounts: { create: { email, passwordHash } },
      },
      select: { publicId: true, firstName: true, lastName: true, status: true },
    });
  }

  private secret(): string {
    const secret = process.env.JWT_ACCESS_SECRET;
    if (!secret) throw new Error('JWT_ACCESS_SECRET is required');
    return secret;
  }

  private issue(personId: string, accountId: string) {
    return this.jwt.signAsync({ sub: personId, accountId, type: 'access' }, { secret: this.secret(), expiresIn: '15m' });
  }

  private parseRefreshToken(refreshToken: string) {
    const separator = refreshToken.indexOf('.');
    if (separator <= 0 || separator === refreshToken.length - 1) throw new UnauthorizedException('جلسة التجديد غير صالحة أو منتهية');
    return {
      sessionId: refreshToken.slice(0, separator),
      secret: refreshToken.slice(separator + 1),
    };
  }

  private newRefreshSecret() {
    return randomBytes(48).toString('base64url');
  }

  async login(input: LoginDto) {
    const account = await this.prisma.account.findUnique({ where: { email: input.email.trim().toLowerCase() }, include: { person: true } });
    if (!account?.passwordHash || !(await compare(input.password, account.passwordHash))) throw new UnauthorizedException('بيانات الدخول غير صحيحة');
    if (account.status !== 'ACTIVE' && account.status !== 'PENDING') throw new UnauthorizedException('الحساب غير متاح لتسجيل الدخول');

    const refreshSecret = this.newRefreshSecret();
    const session = await this.prisma.session.create({
      data: {
        accountId: account.id,
        refreshTokenHash: await hash(refreshSecret, 12),
        expiresAt: new Date(Date.now() + 2592000000),
      },
      select: { id: true },
    });

    return {
      accessToken: await this.issue(account.personId, account.id),
      refreshToken: `${session.id}.${refreshSecret}`,
      expiresInSeconds: 900,
    };
  }

  async refresh(refreshToken: string) {
    const parsed = this.parseRefreshToken(refreshToken);
    const session = await this.prisma.session.findUnique({
      where: { id: parsed.sessionId },
      include: { account: true },
    });

    if (!session || session.revokedAt || session.expiresAt <= new Date() || !(await compare(parsed.secret, session.refreshTokenHash))) {
      throw new UnauthorizedException('جلسة التجديد غير صالحة أو منتهية');
    }

    if (session.account.status !== 'ACTIVE' && session.account.status !== 'PENDING') {
      throw new UnauthorizedException('الحساب غير متاح لتجديد الجلسة');
    }

    const nextSecret = this.newRefreshSecret();
    await this.prisma.session.update({
      where: { id: session.id },
      data: { refreshTokenHash: await hash(nextSecret, 12) },
    });

    return {
      accessToken: await this.issue(session.account.personId, session.accountId),
      refreshToken: `${session.id}.${nextSecret}`,
      expiresInSeconds: 900,
    };
  }

  async logout(refreshToken: string) {
    const parsed = this.parseRefreshToken(refreshToken);
    const session = await this.prisma.session.findUnique({ where: { id: parsed.sessionId } });

    if (session && !session.revokedAt && await compare(parsed.secret, session.refreshTokenHash)) {
      await this.prisma.session.update({ where: { id: session.id }, data: { revokedAt: new Date() } });
    }

    return { success: true };
  }
}
