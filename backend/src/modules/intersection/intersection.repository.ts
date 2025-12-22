import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import {
  CreateIntersectionDto,
  UpdateIntersectionDto,
} from './dto/intersection.dto';
import { Intersection } from '@prisma/client';

/**
 * IntersectionRepository handles all database operations for intersections
 */
@Injectable()
export class IntersectionRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Find all intersections
   */
  async findAll(): Promise<Intersection[]> {
    return this.prisma.intersection.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        cameras: true,
      },
    });
  }

  /**
   * Find intersection by ID
   */
  async findById(id: number): Promise<Intersection | null> {
    return this.prisma.intersection.findUnique({
      where: { id },
      include: {
        cameras: true,
      },
    });
  }

  /**
   * Create a new intersection
   */
  async create(data: CreateIntersectionDto): Promise<Intersection> {
    return this.prisma.intersection.create({
      data,
    });
  }

  /**
   * Update intersection by ID
   */
  async update(id: number, data: UpdateIntersectionDto): Promise<Intersection> {
    return this.prisma.intersection.update({
      where: { id },
      data,
    });
  }

  /**
   * Delete intersection by ID
   */
  async delete(id: number): Promise<Intersection> {
    return this.prisma.intersection.delete({
      where: { id },
    });
  }
}
