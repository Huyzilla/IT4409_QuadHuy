import { Module, Global } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { DatabaseSeedService } from './seed.service';

/**
 * PrismaModule provides database access across the application.
 * Marked as Global to avoid re-importing in every module.
 */
@Global()
@Module({
  providers: [PrismaService, DatabaseSeedService],
  exports: [PrismaService],
})
export class PrismaModule {}
