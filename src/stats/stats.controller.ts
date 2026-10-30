import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { CuratorsService } from '../curators/curators.service.js';
import { TicketsService } from '../tickets/tickets.service.js';

@Controller('stats')
@UseGuards(JwtAuthGuard)
export class StatsController {
  constructor(
    private readonly tickets: TicketsService,
    private readonly curators: CuratorsService,
  ) {}

  @Get('overview')
  overview() {
    return this.tickets.overview();
  }

  @Get('by-region')
  byRegion() {
    return this.tickets.byRegion();
  }

  @Get('by-category')
  byCategory() {
    return this.tickets.byCategory();
  }

  @Get('by-curator')
  async byCurator() {
    const rows = await this.tickets.byCurator();
    const all = await this.curators.findAll();
    const map = new Map(all.map((c) => [c.telegramId, c]));
    return rows.map((row) => ({
      telegramId: row._id,
      fio: map.get(row._id as number)?.fio ?? `ID ${row._id}`,
      total: row.total,
      new: row.new,
      resolved: row.resolved,
      inProgress: row.inProgress,
    }));
  }
}
