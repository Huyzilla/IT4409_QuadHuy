import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor() {
    const logger = new Logger(GoogleStrategy.name);

    const clientID = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const callbackURL =
      process.env.GOOGLE_CALLBACK_URL ||
      'http://localhost:3000/auth/google/callback';

    const googleOAuthEnabled = Boolean(clientID && clientSecret);
    if (!googleOAuthEnabled) {
      logger.warn(
        'GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET not set. Google OAuth is disabled; backend will still start.',
      );
    }

    super({
      // passport-google-oauth20 throws if clientID is missing; use dummy values when disabled.
      clientID: googleOAuthEnabled ? clientID : 'disabled',
      clientSecret: googleOAuthEnabled ? clientSecret : 'disabled',
      callbackURL,
      scope: ['profile', 'email'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<any> {
    // Trả về profile, có thể xử lý thêm ở controller
    done(null, profile);
  }
}
