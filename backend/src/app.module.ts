import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './modules/database/prisma.module';
import { RedisModule } from './modules/redis/redis.module';
import { CameraModule } from './modules/camera/camera.module';
import { IntersectionModule } from './modules/intersection/intersection.module';
import { TrafficModule } from './modules/traffic/traffic.module';

/**
 * AppModule is the root module of the application.
 * Imports all feature modules and provides global infrastructure.
 */
@Module({
  imports: [
    // Core infrastructure modules (Global)
    PrismaModule,
    RedisModule,
    
    // Feature modules
    CameraModule,
    IntersectionModule,
    TrafficModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

