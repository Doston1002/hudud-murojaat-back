import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { CATEGORIES } from '../common/constants.js';
import { REGIONS } from './regions.js';

@Controller('catalog')
@UseGuards(JwtAuthGuard)
export class CatalogController {
  @Get('regions')
  regions() {
    return REGIONS;
  }

  @Get('categories')
  categories() {
    return Object.values(CATEGORIES);
  }
}
