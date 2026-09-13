import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import { PrismaService } from '../database/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async register(input: RegisterDto) {
    const email = input.email.trim().toLowerCase();
    const existing = await this.prisma.account.findUnique({ where: { email } });
    if (existing) throw new ConflictException('البريد الإلكتروني مستخدم بالفعل');

    const passwordHash = await hash(input.password, 12);
    return this.prisma.$transaction(async (tx) => {
      const person = await tx.person.create({
        data: {
          firstName: input.firstName.trim(),
          middleName: input.middleName?.trim(),
          lastName: input.lastName.trim(),
          preferredLanguage: input.preferredLanguage ?? 'ar',
          profile: {
            create: { displayName: `${input.firstName.trim()} ${input.lastName.trim()}` },
          },
          accounts: {
            create: { email, passwordHash },
          },
        },
        select: { id: true, publicId: true, firstName: true, lastName: true, status: true },
      });
      return person;
    });
  }

  async login(input: LoginDto, userAgent?: string, ipAddress?: string) {
    const email = input.email.trim().toLowerCase();
    const account = await this.prisma.account.findUnique({
      where: { email },
      include: { person: true },
    });

    if (!account?.passwordHash || !(await compare(input.password, account.passwordHash))) {
      throw new UnauthorizedException('بيانات الدخول غير صحيحة');
    }
    if (account.status === 'LOCKED' || account.status === 'SUSPENDED' || account.status === 'ARCHIVED') {
      throw new UnauthorizedException('الحساب غير متاح لتسجيل الدخول');
    }

    const accessSecret = process.env.JWT_ACCESS_SECRET;
    if (!accessSecret) throw new Error('JWT_ACCESS_SECRET is required');

    const accessToken = await this.jwt.signAsync(
      { sub: account.personId, accountId: account.id, type: 'access' },
      { secret: accessSecret, expiresIn: '15m' },
    );
    const refreshToken = randomBytes(48).toString('base64url');
    const refreshTokenHash = await hash(refreshToken, 12);
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await this.prisma.$transaction([
      this.prisma.session.create({
        data: { accountId: account.id, refreshTokenHash, userAgent, ipAddress, expiresAt },
      }),
      this.prisma.account.update({ where: { id: account.id }, data: { lastLoginAt: new Date() } }),
    ]);

    return {
      accessToken,
      refreshToken,
      expiresInSeconds: 900,
      person: { publicId: account.person.publicId, firstName: account.person.firstName, lastName: account.person.lastName },
    };
  }
}
