import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { CreateCuratorDto, UpdateCuratorDto } from './curator.dto.js';
import { CuratorsService } from './curators.service.js';

@Controller('curators')
@UseGuards(JwtAuthGuard)
export class CuratorsController {
  constructor(private readonly curatorsService: CuratorsService) {}

  @Get()
  list() {
    return this.curatorsService.findAll();
  }

  @Post()
  create(@Body() body: CreateCuratorDto) {
    return this.curatorsService.create(body);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: UpdateCuratorDto) {
    return this.curatorsService.update(id, body);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.curatorsService.remove(id);
    return { ok: true };
  }
}
