import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { OAuth2Client } from 'google-auth-library';
import { PrismaService } from '../database/prisma.service';
import { RedisService } from '../redis/redis.service';
import { MailService } from '../mail/mail.service';
import { RateLimitService } from './rate-limit.service';
import * as bcrypt from 'bcrypt';
import { createHash, randomInt, randomUUID } from 'crypto';

type SafeUser = {
  id: string;
  username: string;
  fullName: string;
  email: string;
  avatar: string | null;
  roleId: number;
};

@Injectable()
export class AuthService {
  private static readonly ACCESS_TOKEN_TTL_SECONDS = 15 * 60; // 15 phút
  private static readonly REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 ngày

  private async generateAndStoreRefreshToken(userId: string): Promise<string> {
    const redis = this.getRedis();
    const refreshToken = randomUUID();
    const key = `auth:refresh:${userId}`;
    await redis.set(
      key,
      refreshToken,
      'EX',
      AuthService.REFRESH_TOKEN_TTL_SECONDS,
    );
    return refreshToken;
  }

  private async verifyAndConsumeRefreshToken(
    userId: string,
    refreshToken: string,
  ): Promise<boolean> {
    const redis = this.getRedis();
    const key = `auth:refresh:${userId}`;
    const stored = await redis.get(key);
    if (stored && stored === refreshToken) {
      // Optionally: rotate token here (generate new, delete old)
      await redis.del(key);
      return true;
    }
    return false;
  }

  async revokeRefreshToken(userId: string): Promise<void> {
    const redis = this.getRedis();
    const key = `auth:refresh:${userId}`;
    await redis.del(key);
  }
  private readonly googleClient = new OAuth2Client();

  private static readonly PENDING_REGISTER_TTL_SECONDS = 30 * 60;
  private static readonly EMAIL_VERIFY_CODE_TTL_SECONDS = 10 * 60;

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
    private readonly mailService: MailService,
    private readonly rateLimitService: RateLimitService,
  ) {}

  private getRedis() {
    return this.redisService.getClient();
  }

  private normalizeEmail(email: string): string {
    return String(email || '')
      .trim()
      .toLowerCase();
  }

  private normalizeUsername(username: string): string {
    return String(username || '').trim();
  }

  private hashOtpCode(code: string): string {
    return createHash('sha256').update(code).digest('hex');
  }

  private generateOtp6(): string {
    const n = randomInt(0, 1_000_000);
    return String(n).padStart(6, '0');
  }

  private getGoogleClientIds(): string[] {
    return (process.env.GOOGLE_CLIENT_ID ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }

  private ensureJwtSecretConfigured(): void {
    if (!process.env.JWT_SECRET) {
      throw new InternalServerErrorException('JWT_SECRET is not set');
    }
  }

  private toSafeUser(user: any): SafeUser {
    return {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      email: user.email,
      avatar: user.avatar ?? null,
      roleId: typeof user.roleId === 'number' ? user.roleId : 1,
    };
  }

  async registerLocal(input: {
    username: string;
    fullName: string;
    email: string;
    password: string;
  }): Promise<{ verificationRequired: true; email: string }> {
    // Rate limit: 5 requests per 10 minutes per email
    await this.rateLimitService.check({
      key: `register:${this.normalizeEmail(input.email)}`,
      limit: 5,
      windowSeconds: 600,
      blockSeconds: 600,
      blockMsg: 'Quá nhiều lần đăng ký, vui lòng thử lại sau.',
    });
    this.ensureJwtSecretConfigured();

    const email = this.normalizeEmail(input.email);
    const username = this.normalizeUsername(input.username);

    const existing = await this.prisma.user.findFirst({
      where: {
        OR: [{ username }, { email }],
      },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException('Username hoặc Email đã tồn tại');
    }

    const redis = this.getRedis();

    const pendingKey = `auth:pending:register:${email}`;
    const codeKey = `auth:verify:email:${email}`;

    const passwordHash = await bcrypt.hash(input.password, 10);
    const code = this.generateOtp6();
    const verifyToken = randomUUID();

    // Store pending registration, OTP, and verifyToken in Redis with TTL.
    await redis.set(
      pendingKey,
      JSON.stringify({
        username,
        fullName: input.fullName,
        email,
        passwordHash,
        createdAt: Date.now(),
        verifyToken,
      }),
      'EX',
      AuthService.PENDING_REGISTER_TTL_SECONDS,
    );

    await redis.set(
      codeKey,
      this.hashOtpCode(code),
      'EX',
      AuthService.EMAIL_VERIFY_CODE_TTL_SECONDS,
    );

    // Compose verify link
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const verifyLink = `${frontendUrl}/verify-email?email=${encodeURIComponent(email)}&token=${verifyToken}`;

    await this.mailService.sendEmailVerificationCode(email, code, verifyLink);

    return { verificationRequired: true, email };
  }

  async verifyEmailCode(input: {
    email: string;
    code?: string;
    token?: string;
  }): Promise<{ accessToken: string; refreshToken: string; user: SafeUser }> {
    this.ensureJwtSecretConfigured();

    const email = this.normalizeEmail(input.email);
    const code = input.code ? String(input.code).trim() : undefined;
    const token = input.token ? String(input.token).trim() : undefined;

    const redis = this.getRedis();
    const pendingKey = `auth:pending:register:${email}`;
    const codeKey = `auth:verify:email:${email}`;

    let verified = false;
    if (code) {
      const expectedHash = await redis.get(codeKey);
      if (!expectedHash) {
        throw new UnauthorizedException(
          'Verification code expired or not found',
        );
      }
      if (expectedHash !== this.hashOtpCode(code)) {
        throw new UnauthorizedException('Invalid verification code');
      }
      verified = true;
    } else if (token) {
      // Xác thực qua link
      const pendingRaw = await redis.get(pendingKey);
      if (!pendingRaw) {
        throw new UnauthorizedException(
          'Registration session expired. Please register again.',
        );
      }
      const pending = JSON.parse(pendingRaw);
      if (!pending.verifyToken || pending.verifyToken !== token) {
        throw new UnauthorizedException('Invalid or expired verification link');
      }
      verified = true;
    } else {
      throw new UnauthorizedException('Missing verification code or token');
    }

    const pendingRaw = await redis.get(pendingKey);
    if (!pendingRaw) {
      throw new UnauthorizedException(
        'Registration session expired. Please register again.',
      );
    }
    const pending = JSON.parse(pendingRaw) as {
      username: string;
      fullName: string;
      email: string;
      passwordHash: string;
      verifyToken?: string;
    };

    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ username: pending.username }, { email: pending.email }] },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException('Username hoặc Email đã tồn tại');
    }

    const user = await this.prisma.user.create({
      data: {
        username: pending.username,
        fullName: pending.fullName,
        email: pending.email,
        password: pending.passwordHash,
        roleId: 1,
      },
      select: {
        id: true,
        username: true,
        fullName: true,
        email: true,
        avatar: true,
        roleId: true,
      },
    });

    // One-time use
    await redis.del(codeKey);
    await redis.del(pendingKey);

    const accessToken = this.jwtService.sign(
      {
        sub: user.id,
        email: user.email,
        name: user.fullName,
        //avatar: user.avatar,
        roleId: user.roleId,
        provider: 'local',
      },
      { expiresIn: AuthService.ACCESS_TOKEN_TTL_SECONDS },
    );
    const refreshToken = await this.generateAndStoreRefreshToken(user.id);
    return { accessToken, refreshToken, user: this.toSafeUser(user) };
  }

  async resendEmailVerification(input: {
    email: string;
  }): Promise<{ ok: true }> {
    const email = this.normalizeEmail(input.email);
    // Rate limit: 5 requests per 10 minutes per email
    await this.rateLimitService.check({
      key: `resend:${email}`,
      limit: 5,
      windowSeconds: 600,
      blockSeconds: 600,
      blockMsg: 'Quá nhiều lần gửi lại mã, vui lòng thử lại sau.',
    });
    const redis = this.getRedis();
    const pendingKey = `auth:pending:register:${email}`;
    const codeKey = `auth:verify:email:${email}`;

    const pending = await redis.get(pendingKey);
    if (!pending) {
      // Don't leak whether an email exists; but for this flow, we can be explicit.
      throw new UnauthorizedException('No pending registration for this email');
    }

    const code = this.generateOtp6();
    await redis.set(
      codeKey,
      this.hashOtpCode(code),
      'EX',
      AuthService.EMAIL_VERIFY_CODE_TTL_SECONDS,
    );
    await this.mailService.sendEmailVerificationCode(email, code);
    return { ok: true };
  }

  async loginLocal(input: {
    username: string;
    password: string;
  }): Promise<{ accessToken: string; refreshToken: string; user: SafeUser }> {
    // Rate limit: 10 requests per 10 minutes per username/email
    await this.rateLimitService.check({
      key: `login:${this.normalizeUsername(input.username)}`,
      limit: 10,
      windowSeconds: 600,
      blockSeconds: 600,
      blockMsg: 'Quá nhiều lần đăng nhập, vui lòng thử lại sau.',
    });
    this.ensureJwtSecretConfigured();

    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ username: input.username }, { email: input.username }],
      },
      select: {
        id: true,
        username: true,
        fullName: true,
        email: true,
        avatar: true,
        roleId: true,
        password: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Sai tên đăng nhập hoặc mật khẩu');
    }

    const ok = await bcrypt.compare(input.password, user.password);
    if (!ok) {
      throw new UnauthorizedException('Sai tên đăng nhập hoặc mật khẩu');
    }

    const accessToken = this.jwtService.sign(
      {
        sub: user.id,
        email: user.email,
        name: user.fullName,
        // avatar: user.avatar,
        roleId: user.roleId,
        provider: 'local',
      },
      { expiresIn: AuthService.ACCESS_TOKEN_TTL_SECONDS },
    );
    const refreshToken = await this.generateAndStoreRefreshToken(user.id);
    return { accessToken, refreshToken, user: this.toSafeUser(user) };
  }

  async exchangeGoogleCredential(
    credential: string,
  ): Promise<{ accessToken: string; refreshToken: string; user: SafeUser }> {
    const audiences = this.getGoogleClientIds();
    if (audiences.length === 0) {
      throw new InternalServerErrorException('GOOGLE_CLIENT_ID is not set');
    }
    this.ensureJwtSecretConfigured();

    let payload: any;
    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken: credential,
        audience: audiences,
      });
      payload = ticket.getPayload();
    } catch {
      throw new UnauthorizedException('Invalid Google credential');
    }

    const email = this.normalizeEmail(payload?.email);
    if (!email) {
      throw new UnauthorizedException('Google credential missing email');
    }

    const fullName = payload?.name ?? email;
    const avatar = payload?.picture ?? null;

    // Try to find existing user by email (normalized)
    let user = await this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        username: true,
        fullName: true,
        email: true,
        avatar: true,
        roleId: true,
      },
    });
    if (user) {
      // Update profile fields
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: { fullName, avatar },
        select: {
          id: true,
          username: true,
          fullName: true,
          email: true,
          avatar: true,
          roleId: true,
        },
      });
    } else {
      // Create a safe unique username based on email local part
      const localPart = email.split('@')[0];
      let candidate = this.normalizeUsername(localPart);
      // Ensure username uniqueness
      let exists = await this.prisma.user.findUnique({
        where: { username: candidate },
        select: { id: true },
      });
      if (exists) {
        candidate = `${candidate}_${randomInt(1000, 9999)}`;
        exists = await this.prisma.user.findUnique({
          where: { username: candidate },
          select: { id: true },
        });
        if (exists) {
          candidate = `${candidate}_${Date.now().toString().slice(-4)}`;
        }
      }
      user = await this.prisma.user.create({
        data: {
          username: candidate,
          email,
          fullName,
          avatar,
          password: await bcrypt.hash(randomUUID(), 10),
          roleId: 1,
        },
        select: {
          id: true,
          username: true,
          fullName: true,
          email: true,
          avatar: true,
          roleId: true,
        },
      });
    }

    const accessToken = this.jwtService.sign(
      {
        sub: user.id,
        email: user.email,
        name: user.fullName,
        //avatar: user.avatar,
        roleId: user.roleId,
        provider: 'google',
      },
      { expiresIn: AuthService.ACCESS_TOKEN_TTL_SECONDS },
    );
    const refreshToken = await this.generateAndStoreRefreshToken(user.id);
    return {
      accessToken,
      refreshToken,
      user: this.toSafeUser(user),
    };
  }

  async loginOrRegisterGoogleOAuth(input: {
    email: string;
    fullName: string;
    avatar: string | null;
  }): Promise<{ accessToken: string; refreshToken: string; user: SafeUser }> {
    if (!input.email) {
      throw new UnauthorizedException('Google profile missing email');
    }
    this.ensureJwtSecretConfigured();

    const email = this.normalizeEmail(input.email);
    const fullName = input.fullName;
    const avatar = input.avatar ?? null;

    // Find existing user by normalized email
    let user = await this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        username: true,
        fullName: true,
        email: true,
        avatar: true,
        roleId: true,
      },
    });
    if (user) {
      // Update profile
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: { fullName, avatar },
        select: {
          id: true,
          username: true,
          fullName: true,
          email: true,
          avatar: true,
          roleId: true,
        },
      });
    } else {
      // Create unique username based on email local part
      const localPart = email.split('@')[0];
      let candidate = this.normalizeUsername(localPart);
      let exists = await this.prisma.user.findUnique({
        where: { username: candidate },
        select: { id: true },
      });
      if (exists) {
        candidate = `${candidate}_${randomInt(1000, 9999)}`;
        exists = await this.prisma.user.findUnique({
          where: { username: candidate },
          select: { id: true },
        });
        if (exists)
          candidate = `${candidate}_${Date.now().toString().slice(-4)}`;
      }
      user = await this.prisma.user.create({
        data: {
          username: candidate,
          email,
          fullName,
          avatar,
          password: await bcrypt.hash(randomUUID(), 10),
          roleId: 1,
        },
        select: {
          id: true,
          username: true,
          fullName: true,
          email: true,
          avatar: true,
          roleId: true,
        },
      });
    }
    const accessToken = this.jwtService.sign(
      {
        sub: user.id,
        email: user.email,
        name: user.fullName,
        // avatar: user.avatar,
        roleId: user.roleId,
        provider: 'google',
      },
      { expiresIn: AuthService.ACCESS_TOKEN_TTL_SECONDS },
    );
    const refreshToken = await this.generateAndStoreRefreshToken(user.id);
    return {
      accessToken,
      refreshToken,
      user: this.toSafeUser(user),
    };
  }

  async refreshAccessToken(
    userId: string,
    refreshToken: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    // Xác thực refreshToken, cấp lại accessToken mới và refreshToken mới (rotate)
    const ok = await this.verifyAndConsumeRefreshToken(userId, refreshToken);
    if (!ok)
      throw new UnauthorizedException(
        'Refresh token không hợp lệ hoặc đã hết hạn',
      );
    // Lấy user để cấp accessToken mới
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('User không tồn tại');
    const accessToken = this.jwtService.sign(
      {
        sub: user.id,
        email: user.email,
        name: user.fullName,
        //  avatar: user.avatar,
        roleId: user.roleId,
        provider: 'local',
      },
      { expiresIn: AuthService.ACCESS_TOKEN_TTL_SECONDS },
    );
    const newRefreshToken = await this.generateAndStoreRefreshToken(user.id);
    return { accessToken, refreshToken: newRefreshToken };
  }

  verifyAccessToken(token: string): any {
    this.ensureJwtSecretConfigured();
    try {
      return this.jwtService.verify(token);
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  async getSafeUserById(userId: string): Promise<SafeUser | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        fullName: true,
        email: true,
        avatar: true,
        roleId: true,
      },
    });
    if (!user) return null;
    return this.toSafeUser(user);
  }
}
