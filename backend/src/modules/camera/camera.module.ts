import { Module } from '@nestjs/common';
import { CameraController } from './camera.controller';
import { CameraService } from './camera.service';
import { CameraRepository } from './camera.repository';
import { AuthModule } from '../auth/auth.module';

/**
 * CameraModule encapsulates camera management features
 */
@Module({
  imports: [AuthModule],
  controllers: [CameraController],
  providers: [CameraService, CameraRepository],
  exports: [CameraService],
})
export class CameraModule {}
