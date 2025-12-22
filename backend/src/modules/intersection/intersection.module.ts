import { Module } from '@nestjs/common';
import { IntersectionController } from './intersection.controller';
import { IntersectionService } from './intersection.service';
import { IntersectionRepository } from './intersection.repository';
import { AuthModule } from '../auth/auth.module';

/**
 * IntersectionModule encapsulates intersection management features
 */
@Module({
  imports: [AuthModule],
  controllers: [IntersectionController],
  providers: [IntersectionService, IntersectionRepository],
  exports: [IntersectionService],
})
export class IntersectionModule {}
