import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CameraService } from './camera.service';
import { CreateCameraDto, UpdateCameraDto } from './dto/camera.dto';

/**
 * CameraController handles HTTP requests for camera management
 */
@Controller('cameras')
export class CameraController {
  constructor(private readonly cameraService: CameraService) {}

  /**
   * GET /cameras
   * Get all cameras
   */
  @Get()
  async getAllCameras() {
    return this.cameraService.getAllCameras();
  }

  /**
   * GET /cameras/:id
   * Get camera by ID
   */
  @Get(':id')
  async getCameraById(@Param('id', ParseIntPipe) id: number) {
    return this.cameraService.getCameraById(id);
  }

  /**
   * POST /cameras
   * Create a new camera
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createCamera(@Body() dto: CreateCameraDto) {
    return this.cameraService.createCamera(dto);
  }

  /**
   * PUT /cameras/:id
   * Update camera
   */
  @Put(':id')
  async updateCamera(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCameraDto,
  ) {
    return this.cameraService.updateCamera(id, dto);
  }

  /**
   * DELETE /cameras/:id
   * Delete camera
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteCamera(@Param('id', ParseIntPipe) id: number) {
    await this.cameraService.deleteCamera(id);
  }
}
