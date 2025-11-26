import { Module } from '@nestjs/common';
import { IntersectionController } from './intersection.controller';
import { IntersectionService } from './intersection.service';
import { IntersectionRepository } from './intersection.repository';

/**
 * IntersectionModule encapsulates intersection management features
 */
@Module({
  controllers: [IntersectionController],
  providers: [IntersectionService, IntersectionRepository],
  exports: [IntersectionService],
})
export class IntersectionModule {}
