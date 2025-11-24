import { Injectable, NotFoundException } from '@nestjs/common';
import { CameraRepository } from './camera.repository';
import { CreateCameraDto, UpdateCameraDto } from './dto/camera.dto';
import { Camera } from '@prisma/client';

/**
 * CameraService contains business logic for camera management
 */
@Injectable()
export class CameraService {
  constructor(private readonly cameraRepository: CameraRepository) {}

  /**
   * Get all cameras
   */
  async getAllCameras(): Promise<Camera[]> {
    return this.cameraRepository.findAll();
  }

  /**
   * Get camera by ID
   */
  async getCameraById(id: number): Promise<Camera> {
    const camera = await this.cameraRepository.findById(id);
    if (!camera) {
      throw new NotFoundException(`Camera with ID ${id} not found`);
    }
    return camera;
  }

  /**
   * Create a new camera
   */
  async createCamera(dto: CreateCameraDto): Promise<Camera> {
    return this.cameraRepository.create(dto);
  }

  /**
   * Update camera
   */
  async updateCamera(id: number, dto: UpdateCameraDto): Promise<Camera> {
    await this.getCameraById(id); // Validate existence
    return this.cameraRepository.update(id, dto);
  }

  /**
   * Delete camera
   */
  async deleteCamera(id: number): Promise<void> {
    await this.getCameraById(id); // Validate existence
    await this.cameraRepository.delete(id);
  }
}
