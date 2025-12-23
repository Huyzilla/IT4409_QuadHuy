import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
// Import cookie-parser in a way that is callable regardless of TS interop settings.
// If you haven't installed types yet, run: `npm install cookie-parser @types/cookie-parser`
import cookieParser = require('cookie-parser');
import { json, urlencoded } from 'express';

/**
 * Bootstrap the NestJS application with:
 * - CORS enabled for cross-origin requests
 * - Global validation pipe for DTO validation
 * - Socket.IO adapter for WebSocket support
 * - Swagger API documentation
 */
async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'warn', 'debug', 'verbose'],
  });

  // Enable CORS for frontend connections (allow credentials)
  // Render + Vercel: allow a list of origins (comma-separated)
  const frontendRaw =
    process.env.FRONTEND_URLS ||
    process.env.FRONTEND_URL ||
    'http://localhost:5173';
  const allowedOrigins = frontendRaw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  app.enableCors({
    origin: (origin, cb) => {
      // Allow same-origin / server-to-server / curl
      if (!origin) return cb(null, true);
      if (allowedOrigins.includes('*')) return cb(null, true);
      if (allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error(`CORS blocked origin: ${origin}`), false);
    },
    credentials: true,
  });

  // enable cookie parser so controllers can read cookies
  app.use(cookieParser());

  // Set global API prefix
  app.setGlobalPrefix('api');
  app.use(json({ limit: '50mb' }));

  // ➕ 3. Tăng giới hạn cho URL encoded (nếu cần)
  app.use(urlencoded({ extended: true, limit: '50mb' }));

  // Enable global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Use Socket.IO adapter for WebSocket with matching CORS
  class AppIoAdapter extends IoAdapter {
    override createIOServer(port: number, options?: any) {
      const cors = {
        origin: allowedOrigins.includes('*') ? true : allowedOrigins,
        credentials: true,
      };
      return super.createIOServer(port, { ...options, cors });
    }
  }
  app.useWebSocketAdapter(new AppIoAdapter(app));

  // Setup Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('AI-Based Adaptive Traffic Control System API')
    .setDescription(
      'Backend API for intelligent traffic light control system with AI camera integration',
    )
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
      'bearer',
    )
    .addTag('cameras', 'Camera management endpoints')
    .addTag('intersections', 'Intersection management endpoints')
    .addTag('traffic', 'Traffic control and monitoring endpoints')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    customSiteTitle: 'Traffic Control API Documentation',
    customfavIcon: 'https://nestjs.com/img/logo_text.svg',
    customCss: '.swagger-ui .topbar { display: none }',
  });

  const port = process.env.PORT ?? 3000;
  await app.listen(port, '0.0.0.0');

  console.log(`
  🚀 Server is running on: http://0.0.0.0:${port}
  📚 API Documentation: http://0.0.0.0:${port}/api/docs
  📡 WebSocket (AI Cameras): /ingest
  📡 WebSocket (Dashboard): /traffic
  `);
}

bootstrap();
