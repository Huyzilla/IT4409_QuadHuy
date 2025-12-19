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
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { IntersectionService } from './intersection.service';
import { CreateIntersectionDto, UpdateIntersectionDto } from './dto/intersection.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

/**
 * IntersectionController handles HTTP requests for intersection management
 */
@ApiTags('intersections')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard)
@Controller('intersections')
export class IntersectionController {
  constructor(private readonly intersectionService: IntersectionService) {}

  /**
   * GET /api/intersections
   * Get all intersections
   */
  @Get()
  @ApiOperation({ summary: 'Get all intersections', description: 'Retrieve a list of all registered intersections' })
  @ApiResponse({ status: 200, description: 'List of intersections retrieved successfully' })
  async getAllIntersections() {
    return this.intersectionService.getAllIntersections();
  }

  /**
   * GET /api/intersections/:id
   * Get intersection by ID
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get intersection by ID', description: 'Retrieve detailed information about a specific intersection' })
  @ApiParam({ name: 'id', type: 'number', description: 'Intersection ID' })
  @ApiResponse({ status: 200, description: 'Intersection found' })
  @ApiResponse({ status: 404, description: 'Intersection not found' })
  async getIntersectionById(@Param('id', ParseIntPipe) id: number) {
    return this.intersectionService.getIntersectionById(id);
  }

  /**
   * POST /api/intersections
   * Create a new intersection
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new intersection', description: 'Register a new intersection in the system' })
  @ApiBody({ type: CreateIntersectionDto })
  @ApiResponse({ status: 201, description: 'Intersection created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  async createIntersection(@Body() dto: CreateIntersectionDto) {
    return this.intersectionService.createIntersection(dto);
  }

  /**
   * PUT /api/intersections/:id
   * Update intersection
   */
  @Put(':id')
  @ApiOperation({ summary: 'Update intersection', description: 'Update intersection information' })
  @ApiParam({ name: 'id', type: 'number', description: 'Intersection ID' })
  @ApiBody({ type: UpdateIntersectionDto })
  @ApiResponse({ status: 200, description: 'Intersection updated successfully' })
  @ApiResponse({ status: 404, description: 'Intersection not found' })
  async updateIntersection(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateIntersectionDto,
  ) {
    return this.intersectionService.updateIntersection(id, dto);
  }

  /**
   * DELETE /api/intersections/:id
   * Delete intersection
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete intersection', description: 'Remove an intersection from the system' })
  @ApiParam({ name: 'id', type: 'number', description: 'Intersection ID' })
  @ApiResponse({ status: 204, description: 'Intersection deleted successfully' })
  @ApiResponse({ status: 404, description: 'Intersection not found' })
  async deleteIntersection(@Param('id', ParseIntPipe) id: number) {
    await this.intersectionService.deleteIntersection(id);
  }
}
