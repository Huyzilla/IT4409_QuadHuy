import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class DatabaseSeedService implements OnModuleInit {
  private readonly logger = new Logger(DatabaseSeedService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit(): Promise<void> {
    // Seed a default admin for demo/dev environments (idempotent).
    // Username: admin
    // Password: 123456
    const existingAdmin = await this.prisma.user.findFirst({
      where: {
        OR: [{ username: 'admin' }, { email: 'admin@traffic.ai' }],
      },
      select: { id: true },
    });

    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash('123456', 10);
      await this.prisma.user.create({
        data: {
          username: 'admin',
          fullName: 'Quản trị viên Hệ thống',
          email: 'admin@traffic.ai',
          password: hashedPassword,
        },
      });
      this.logger.log('Seeded default admin user (admin/123456).');
    }

    // Only seed intersections/cameras when DB is empty to keep this safe/idempotent.
    const existingCameraCount = await this.prisma.camera.count();
    if (existingCameraCount > 0) {
      return;
    }

    this.logger.log('Seeding initial intersection and cameras (IDs 1-4)...');

    const intersection = await this.prisma.intersection.upsert({
      where: { id: 1 },
      update: {},
      create: {
        id: 1,
        name: 'Intersection 1',
        latitude: 21.0,
        longitude: 105.8,
        description: 'auto-seeded',
      },
    });

    await this.prisma.camera.createMany({
      data: [
        {
          id: 1,
          name: 'North',
          videoSource: 'rtsp://mediamtx:8554/north',
          latitude: 21.0,
          longitude: 105.8,
          intersectionId: intersection.id,
        },
        {
          id: 2,
          name: 'East',
          videoSource: 'rtsp://mediamtx:8554/east',
          latitude: 21.0,
          longitude: 105.8,
          intersectionId: intersection.id,
        },
        {
          id: 3,
          name: 'South',
          videoSource: 'rtsp://mediamtx:8554/south',
          latitude: 21.0,
          longitude: 105.8,
          intersectionId: intersection.id,
        },
        {
          id: 4,
          name: 'West',
          videoSource: 'rtsp://mediamtx:8554/west',
          latitude: 21.0,
          longitude: 105.8,
          intersectionId: intersection.id,
        },
      ],
      skipDuplicates: true,
    });

    this.logger.log('Database seeding complete.');
  }
}
