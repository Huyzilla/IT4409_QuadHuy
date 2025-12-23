import { IsString } from 'class-validator';
class RefreshTokenDto {
  @IsString()
  userId: string;
  @IsString()
  refreshToken: string;
}
import {
  Body,
  Controller,
  Post,
  Get,
  Req,
  Res,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { JwtAuthGuard } from './jwt-auth.guard';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { GoogleAuthDto } from './dto/google-auth.dto';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { RedisModule } from '../redis/redis.module';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('refresh')
  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  @ApiResponse({
    status: 201,
    description: 'New accessToken and refreshToken issued',
  })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshAccessToken(dto.userId, dto.refreshToken);
  }

  @Post('register')
  @ApiOperation({
    summary: 'Register with username/password and send email verification code',
  })
  @ApiResponse({ status: 201, description: 'Verification required (OTP sent)' })
  @ApiResponse({ status: 409, description: 'Username or email already exists' })
  async register(@Body() dto: RegisterDto) {
    return this.authService.registerLocal(dto);
  }

  @Post('verify-email')
  @ApiOperation({ summary: 'Verify email with OTP code and create account' })
  @ApiResponse({
    status: 201,
    description: 'Verified + user created + JWT issued',
  })
  @ApiResponse({ status: 401, description: 'Invalid/expired code' })
  async verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.authService.verifyEmailCode(dto);
  }

  @Post('resend-verification')
  @ApiOperation({ summary: 'Resend email verification code (OTP)' })
  @ApiResponse({ status: 201, description: 'OTP resent' })
  async resendVerification(@Body() dto: ResendVerificationDto) {
    return this.authService.resendEmailVerification(dto);
  }

  @Post('login')
  @ApiOperation({ summary: 'Login with username/password and receive JWT' })
  @ApiResponse({ status: 201, description: 'JWT issued' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() dto: LoginDto) {
    return this.authService.loginLocal(dto);
  }

  // OAuth2 redirect: /auth/google
  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth() {
    // Passport sẽ tự redirect sang Google
  }

  // OAuth2 callback: /auth/google/callback
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthCallback(@Req() req: Request, @Res() res: Response) {
    // req.user chứa profile Google
    // Xử lý đăng nhập/đăng ký, sinh JWT, redirect về frontend
    // @ts-ignore: user is injected by passport
    const profile = (req as any).user;
    const email = profile.emails?.[0]?.value;
    const fullName = profile.displayName;
    const avatar = profile.photos?.[0]?.value;
    // Gọi AuthService để upsert user và sinh JWT
    const result = await this.authService.loginOrRegisterGoogleOAuth({
      email,
      fullName,
      avatar,
    });
    // Set refresh token as httpOnly cookie (store both userId and token so server can verify)
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const cookieValue = `${result.user.id}:${result.refreshToken}`;
    const isProd = process.env.NODE_ENV === 'production';
    res.cookie('refreshToken', cookieValue, {
      httpOnly: true,
      secure: isProd,
      // Browsers require SameSite=None to be Secure. Use 'lax' for local dev.
      sameSite: isProd ? 'none' : 'lax',
      path: '/',
      maxAge: 1000 * 60 * 60 * 24 * 30,
    });

    // Also set a short-lived access token cookie (httpOnly) so backend can authenticate requests
    res.cookie('accessToken', result.accessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      path: '/',
      maxAge: 1000 * 60 * 15,
    });

    // Redirect to frontend. Cookies (refresh + access) are already set by res.cookie().
    return res.redirect(`${frontendUrl}/oauth-success`);
  }

  @Get('session')
  async session(@Req() req: Request, @Res() res: Response) {
    // Read refresh cookie set by oauth callback
    const cookie = req.cookies?.refreshToken as string | undefined;
    if (!cookie) throw new UnauthorizedException('No refresh cookie');
    const [userId, refreshToken] = String(cookie).split(':');
    if (!userId || !refreshToken)
      throw new UnauthorizedException('Invalid refresh cookie');

    // Use existing refresh logic to rotate tokens
    const tokens = await this.authService.refreshAccessToken(
      userId,
      refreshToken,
    );

    // Set new refresh cookie (rotate)
    const cookieValue = `${userId}:${tokens.refreshToken}`;
    const isProd = process.env.NODE_ENV === 'production';
    res.cookie('refreshToken', cookieValue, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      path: '/',
      maxAge: 1000 * 60 * 60 * 24 * 30,
    });

    // Optionally set accessToken cookie as httpOnly as well
    res.cookie('accessToken', tokens.accessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      path: '/',
      maxAge: 1000 * 60 * 15,
    });

    const user = await this.authService.getSafeUserById(userId);
    return res.json({ accessToken: tokens.accessToken, user });
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get current authenticated user' })
  async me(@Req() req: Request) {
    // req.user injected by JwtAuthGuard contains JWT payload with sub=userId
    const payload = (req as any).user;
    const userId = payload?.sub;
    if (!userId) return null;
    return this.authService.getSafeUserById(userId);
  }
}
