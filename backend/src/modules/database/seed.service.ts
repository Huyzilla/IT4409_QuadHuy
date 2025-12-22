import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Injectable()
export class DatabaseSeedService implements OnModuleInit {
  private readonly logger = new Logger(DatabaseSeedService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit(): Promise<void> {
    // Only seed when DB is empty to keep this safe/idempotent.
    const existingCameraCount = await this.prisma.camera.count();
    if (existingCameraCount > 0) {
      return;
    }

    this.logger.log('Seeding initial intersection and cameras (IDs 1-4)...');

    const i1 = await this.prisma.intersection.upsert({
      where: { id: 1 },
      update: {},
      create: {
        id: 1,
        name: 'Ngã Tư Sở',
        latitude: 21.0,
        longitude: 105.8,
        description: 'auto-seeded',
      },
    });

    await this.prisma.camera.createMany({
      data: [
        { id: 1, name: 'North', videoSource: 'rtsp://mediamtx:8554/north', latitude: 21.0, longitude: 105.8, intersectionId: i1.id },
        { id: 2, name: 'East',  videoSource: 'rtsp://mediamtx:8554/east',  latitude: 21.0, longitude: 105.8, intersectionId: i1.id },
        { id: 3, name: 'South', videoSource: 'rtsp://mediamtx:8554/south', latitude: 21.0, longitude: 105.8, intersectionId: i1.id },
        { id: 4, name: 'West',  videoSource: 'rtsp://mediamtx:8554/west',  latitude: 21.0, longitude: 105.8, intersectionId: i1.id },
      ],
      skipDuplicates: true,
    });

    const i2 = await this.prisma.intersection.upsert({
      where: { id: 2 },
      update: {},
      create: {
        id: 1,
        name: 'Đại Cồ Việt',
        latitude: 21.001,
        longitude: 105.801,
        description: 'auto-seeded (new intersection)',
      },
    });

    await this.prisma.camera.createMany({
      data: [
        { id: 5, name: 'North 1', videoSource: 'rtsp://mediamtx:8554/north1', latitude: 21.001, longitude: 105.801, intersectionId: i2.id },
        { id: 6, name: 'East 1',  videoSource: 'rtsp://mediamtx:8554/east1',  latitude: 21.001, longitude: 105.801, intersectionId: i2.id },
        { id: 7, name: 'South 1', videoSource: 'rtsp://mediamtx:8554/south1', latitude: 21.001, longitude: 105.801, intersectionId: i2.id },
        { id: 8, name: 'West 1',  videoSource: 'rtsp://mediamtx:8554/west1',  latitude: 21.001, longitude: 105.801, intersectionId: i2.id },
      ],
      skipDuplicates: true,
    });

    this.logger.log('Database seeding complete.');
  }
}
