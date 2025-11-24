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
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';
import { CameraService } from './camera.service';
import { CreateCameraDto, UpdateCameraDto } from './dto/camera.dto';

/**
 * CameraController handles HTTP requests for camera management
 */
@ApiTags('cameras')
@Controller('cameras')
export class CameraController {
  constructor(private readonly cameraService: CameraService) {}

  /**
   * GET /api/cameras
   * Get all cameras
   */
  @Get()
  @ApiOperation({ summary: 'Get all cameras', description: 'Retrieve a list of all registered cameras in the system' })
  @ApiResponse({ status: 200, description: 'List of cameras retrieved successfully' })
  async getAllCameras() {
    return this.cameraService.getAllCameras();
  }

  /**
   * GET /api/cameras/:id
   * Get camera by ID
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get camera by ID', description: 'Retrieve detailed information about a specific camera' })
  @ApiParam({ name: 'id', type: 'number', description: 'Camera ID' })
  @ApiResponse({ status: 200, description: 'Camera found' })
  @ApiResponse({ status: 404, description: 'Camera not found' })
  async getCameraById(@Param('id', ParseIntPipe) id: number) {
    return this.cameraService.getCameraById(id);
  }

  /**
   * POST /api/cameras
   * Create a new camera
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new camera', description: 'Register a new AI camera in the system' })
  @ApiBody({ type: CreateCameraDto })
  @ApiResponse({ status: 201, description: 'Camera created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  async createCamera(@Body() dto: CreateCameraDto) {
    return this.cameraService.createCamera(dto);
  }

  /**
   * PUT /api/cameras/:id
   * Update camera
   */
  @Put(':id')
  @ApiOperation({ summary: 'Update camera', description: 'Update camera information' })
  @ApiParam({ name: 'id', type: 'number', description: 'Camera ID' })
  @ApiBody({ type: UpdateCameraDto })
  @ApiResponse({ status: 200, description: 'Camera updated successfully' })
  @ApiResponse({ status: 404, description: 'Camera not found' })
  async updateCamera(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCameraDto,
  ) {
    return this.cameraService.updateCamera(id, dto);
  }

  /**
   * DELETE /api/cameras/:id
   * Delete camera
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete camera', description: 'Remove a camera from the system' })
  @ApiParam({ name: 'id', type: 'number', description: 'Camera ID' })
  @ApiResponse({ status: 204, description: 'Camera deleted successfully' })
  @ApiResponse({ status: 404, description: 'Camera not found' })
  async deleteCamera(@Param('id', ParseIntPipe) id: number) {
    await this.cameraService.deleteCamera(id);
  }
}
