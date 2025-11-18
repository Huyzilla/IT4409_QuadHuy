import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';

/**
 * Bootstrap the NestJS application with:
 * - CORS enabled for cross-origin requests
 * - Global validation pipe for DTO validation
 * - Socket.IO adapter for WebSocket support
 */
async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'warn', 'debug', 'verbose'],
  });

  // Enable CORS for frontend connections
  app.enableCors({
    origin: '*',
    credentials: true,
  });

  // Enable global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Use Socket.IO adapter for WebSocket
  app.useWebSocketAdapter(new IoAdapter(app));

  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  console.log(`
  🚀 Server is running on: http://localhost:${port}
  📡 WebSocket (AI Cameras): ws://localhost:${port}/ingest
  📡 WebSocket (Dashboard): ws://localhost:${port}/traffic
  `);
}

bootstrap();

