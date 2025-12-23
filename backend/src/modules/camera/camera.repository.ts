import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateCameraDto, UpdateCameraDto } from './dto/camera.dto';
import { Camera } from '@prisma/client';

/**
 * CameraRepository handles all database operations for cameras
 */
@Injectable()
export class CameraRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Find all cameras
   */
  async findAll(): Promise<Camera[]> {
    return this.prisma.camera.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Find camera by ID
   */
  async findById(id: number): Promise<Camera | null> {
    return this.prisma.camera.findUnique({
      where: { id },
    });
  }

  /**
   * Create a new camera
   */
  async create(data: CreateCameraDto): Promise<Camera> {
    // Remove id if present to let database auto-increment
    const { id, ...createData } = data as any;
    return this.prisma.camera.create({
      data: createData,
    });
  }

  /**
   * Update camera by ID
   */
  async update(id: number, data: UpdateCameraDto): Promise<Camera> {
    return this.prisma.camera.update({
      where: { id },
      data,
    });
  }

  /**
   * Delete camera by ID
   */
  async delete(id: number): Promise<Camera> {
    return this.prisma.camera.delete({
      where: { id },
    });
  }
}
