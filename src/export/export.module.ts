import { Module } from '@nestjs/common';
import { TicketsModule } from '../tickets/tickets.module.js';
import { ExportController } from './export.controller.js';

@Module({
  imports: [TicketsModule],
  controllers: [ExportController],
})
export class ExportModule {}
