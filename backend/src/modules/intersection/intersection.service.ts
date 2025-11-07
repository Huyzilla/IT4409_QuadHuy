import { Injectable, NotFoundException } from '@nestjs/common';
import { IntersectionRepository } from './intersection.repository';
import { CreateIntersectionDto, UpdateIntersectionDto } from './dto/intersection.dto';
import { Intersection } from '@prisma/client';

/**
 * IntersectionService contains business logic for intersection management
 */
@Injectable()
export class IntersectionService {
  constructor(private readonly intersectionRepository: IntersectionRepository) {}

  /**
   * Get all intersections
   */
  async getAllIntersections(): Promise<Intersection[]> {
    return this.intersectionRepository.findAll();
  }

  /**
   * Get intersection by ID
   */
  async getIntersectionById(id: number): Promise<Intersection> {
    const intersection = await this.intersectionRepository.findById(id);
    if (!intersection) {
      throw new NotFoundException(`Intersection with ID ${id} not found`);
    }
    return intersection;
  }

  /**
   * Create a new intersection
   */
  async createIntersection(dto: CreateIntersectionDto): Promise<Intersection> {
    return this.intersectionRepository.create(dto);
  }

  /**
   * Update intersection
   */
  async updateIntersection(id: number, dto: UpdateIntersectionDto): Promise<Intersection> {
    await this.getIntersectionById(id); // Validate existence
    return this.intersectionRepository.update(id, dto);
  }

  /**
   * Delete intersection
   */
  async deleteIntersection(id: number): Promise<void> {
    await this.getIntersectionById(id); // Validate existence
    await this.intersectionRepository.delete(id);
  }
}
