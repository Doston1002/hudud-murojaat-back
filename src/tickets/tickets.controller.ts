import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import type { TicketStatus } from '../common/constants.js';
import { TicketsService } from './tickets.service.js';

@Controller('tickets')
@UseGuards(JwtAuthGuard)
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Get()
  async list(
    @Query('status') status?: TicketStatus,
    @Query('region') region?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const items = await this.ticketsService.query({
      status,
      region,
      from,
      to,
    });
    return items.map((t) => this.ticketsService.sanitize(t));
  }

  @Get(':ticketId')
  async one(@Param('ticketId') ticketId: string) {
    const ticket = await this.ticketsService.findByTicketId(ticketId);
    if (!ticket) {
      return null;
    }
    return this.ticketsService.sanitize(ticket);
  }
}
