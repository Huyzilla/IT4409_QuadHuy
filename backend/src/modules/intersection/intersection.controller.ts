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
import { IntersectionService } from './intersection.service';
import { CreateIntersectionDto, UpdateIntersectionDto } from './dto/intersection.dto';

/**
 * IntersectionController handles HTTP requests for intersection management
 */
@Controller('intersections')
export class IntersectionController {
  constructor(private readonly intersectionService: IntersectionService) {}

  /**
   * GET /intersections
   * Get all intersections
   */
  @Get()
  async getAllIntersections() {
    return this.intersectionService.getAllIntersections();
  }

  /**
   * GET /intersections/:id
   * Get intersection by ID
   */
  @Get(':id')
  async getIntersectionById(@Param('id', ParseIntPipe) id: number) {
    return this.intersectionService.getIntersectionById(id);
  }

  /**
   * POST /intersections
   * Create a new intersection
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createIntersection(@Body() dto: CreateIntersectionDto) {
    return this.intersectionService.createIntersection(dto);
  }

  /**
   * PUT /intersections/:id
   * Update intersection
   */
  @Put(':id')
  async updateIntersection(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateIntersectionDto,
  ) {
    return this.intersectionService.updateIntersection(id, dto);
  }

  /**
   * DELETE /intersections/:id
   * Delete intersection
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteIntersection(@Param('id', ParseIntPipe) id: number) {
    await this.intersectionService.deleteIntersection(id);
  }
}
