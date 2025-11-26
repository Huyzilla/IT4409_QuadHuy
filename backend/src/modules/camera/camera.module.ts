import { Module } from '@nestjs/common';
import { CameraController } from './camera.controller';
import { CameraService } from './camera.service';
import { CameraRepository } from './camera.repository';

/**
 * CameraModule encapsulates camera management features
 */
@Module({
  controllers: [CameraController],
  providers: [CameraService, CameraRepository],
  exports: [CameraService],
})
export class CameraModule {}
