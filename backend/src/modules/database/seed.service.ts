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
          roleId: 0,
        },
      });
      this.logger.log('Seeded default admin user (admin/123456).');
    } else {
      // Ensure the default admin remains admin even if DB was seeded previously.
      await this.prisma.user.updateMany({
        where: {
          OR: [{ username: 'admin' }, { email: 'admin@traffic.ai' }],
        },
        data: { roleId: 0 },
      });
    }

    // Seed 2 default intersections + 8 cameras.
    // Use upserts so this can fix partial/previous demo data without requiring a DB wipe.
    this.logger.log(
      'Ensuring default intersections and cameras exist (IDs 1-8)...',
    );

    const intersection = await this.prisma.intersection.upsert({
      where: { id: 1 },
      update: {
        name: 'Ngã Tư Sở',
        latitude: 21.0,
        longitude: 105.8,
        description: 'auto-seeded',
      },
      create: {
        id: 1,
        name: 'Ngã Tư Sở',
        latitude: 21.0,
        longitude: 105.8,
        description: 'auto-seeded',
      },
    });

    const common = {
      latitude: intersection.latitude,
      longitude: intersection.longitude,
      intersectionId: intersection.id,
    };

    const trafficSettings = {
      threshold: 0.7,
      maxVehicles: 5,
      aiEnabled: true,
    };

    await this.prisma.camera.upsert({
      where: { id: 1 },
      update: {
        name: 'North',
        videoSource: 'rtsp://mediamtx:8554/north',
        ...trafficSettings,
        ...common,
      },
      create: {
        id: 1,
        name: 'North',
        videoSource: 'rtsp://mediamtx:8554/north',
        ...trafficSettings,
        ...common,
      },
    });

    await this.prisma.camera.upsert({
      where: { id: 2 },
      update: {
        name: 'East',
        videoSource: 'rtsp://mediamtx:8554/east',
        ...trafficSettings,
        ...common,
      },
      create: {
        id: 2,
        name: 'East',
        videoSource: 'rtsp://mediamtx:8554/east',
        ...trafficSettings,
        ...common,
      },
    });

    await this.prisma.camera.upsert({
      where: { id: 3 },
      update: {
        name: 'South',
        videoSource: 'rtsp://mediamtx:8554/south',
        ...trafficSettings,
        ...common,
      },
      create: {
        id: 3,
        name: 'South',
        videoSource: 'rtsp://mediamtx:8554/south',
        ...trafficSettings,
        ...common,
      },
    });

    await this.prisma.camera.upsert({
      where: { id: 4 },
      update: {
        name: 'West',
        videoSource: 'rtsp://mediamtx:8554/west',
        ...trafficSettings,
        ...common,
      },
      create: {
        id: 4,
        name: 'West',
        videoSource: 'rtsp://mediamtx:8554/west',
        ...trafficSettings,
        ...common,
      },
    });

    const intersection2 = await this.prisma.intersection.upsert({
      where: { id: 2 },
      update: {
        name: 'Đại Cồ Việt',
        latitude: 21.001,
        longitude: 105.801,
        description: 'auto-seeded',
      },
      create: {
        id: 2,
        name: 'Đại Cồ Việt',
        latitude: 21.001,
        longitude: 105.801,
        description: 'auto-seeded',
      },
    });

    const common2 = {
      latitude: intersection2.latitude,
      longitude: intersection2.longitude,
      intersectionId: intersection2.id,
    };

    const trafficSettings2 = {
      threshold: 0.7,
      maxVehicles: 5,
      aiEnabled: true,
    };

    await this.prisma.camera.upsert({
      where: { id: 5 },
      update: {
        name: 'North 1',
        videoSource: 'rtsp://mediamtx:8554/north1',
        ...trafficSettings2,
        ...common2,
      },
      create: {
        id: 5,
        name: 'North 1',
        videoSource: 'rtsp://mediamtx:8554/north1',
        ...trafficSettings2,
        ...common2,
      },
    });

    await this.prisma.camera.upsert({
      where: { id: 6 },
      update: {
        name: 'East 1',
        videoSource: 'rtsp://mediamtx:8554/east1',
        ...trafficSettings2,
        ...common2,
      },
      create: {
        id: 6,
        name: 'East 1',
        videoSource: 'rtsp://mediamtx:8554/east1',
        ...trafficSettings2,
        ...common2,
      },
    });

    await this.prisma.camera.upsert({
      where: { id: 7 },
      update: {
        name: 'South 1',
        videoSource: 'rtsp://mediamtx:8554/south1',
        ...trafficSettings2,
        ...common2,
      },
      create: {
        id: 7,
        name: 'South 1',
        videoSource: 'rtsp://mediamtx:8554/south1',
        ...trafficSettings2,
        ...common2,
      },
    });

    await this.prisma.camera.upsert({
      where: { id: 8 },
      update: {
        name: 'West 1',
        videoSource: 'rtsp://mediamtx:8554/west1',
        ...trafficSettings2,
        ...common2,
      },
      create: {
        id: 8,
        name: 'West 1',
        videoSource: 'rtsp://mediamtx:8554/west1',
        ...trafficSettings2,
        ...common2,
      },
    });

    this.logger.log('Database seeding complete (2 intersections + 8 cameras).');
  }
}
