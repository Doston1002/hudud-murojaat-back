import { Module } from '@nestjs/common';
import { CuratorsModule } from '../curators/curators.module.js';
import { TicketsModule } from '../tickets/tickets.module.js';
import { StatsController } from './stats.controller.js';

@Module({
  imports: [TicketsModule, CuratorsModule],
  controllers: [StatsController],
})
export class StatsModule {}
