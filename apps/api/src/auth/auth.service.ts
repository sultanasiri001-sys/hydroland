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

  async login(input: LoginDto) {
    const account = await this.prisma.account.findUnique({ where: { email: input.email.trim().toLowerCase() }, include: { person: true } });
    if (!account?.passwordHash || !(await compare(input.password, account.passwordHash))) throw new UnauthorizedException('بيانات الدخول غير صحيحة');
    if (account.status !== 'ACTIVE' && account.status !== 'PENDING') throw new UnauthorizedException('الحساب غير متاح لتسجيل الدخول');
    const refreshToken = randomBytes(48).toString('base64url');
    await this.prisma.session.create({ data: { accountId: account.id, refreshTokenHash: await hash(refreshToken, 12), expiresAt: new Date(Date.now() + 2592000000) } });
    return { accessToken: await this.issue(account.personId, account.id), refreshToken, expiresInSeconds: 900 };
  }

  async refresh(refreshToken: string) {
    const sessions = await this.prisma.session.findMany({ where: { revokedAt: null, expiresAt: { gt: new Date() } }, include: { account: true }, take: 20 });
    for (const session of sessions) {
      if (await compare(refreshToken, session.refreshTokenHash)) {
        return { accessToken: await this.issue(session.account.personId, session.accountId), expiresInSeconds: 900 };
      }
    }
    throw new UnauthorizedException('جلسة التجديد غير صالحة أو منتهية');
  }

  async logout(refreshToken: string) {
    const sessions = await this.prisma.session.findMany({ where: { revokedAt: null }, take: 20 });
    for (const session of sessions) {
      if (await compare(refreshToken, session.refreshTokenHash)) {
        await this.prisma.session.update({ where: { id: session.id }, data: { revokedAt: new Date() } });
        break;
      }
    }
    return { success: true };
  }
}
