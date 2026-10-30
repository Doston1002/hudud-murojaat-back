import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CounterSchema } from '../schemas/counter.schema.js';
import { TicketSchema } from '../schemas/ticket.schema.js';
import { TicketsController } from './tickets.controller.js';
import { TicketsService } from './tickets.service.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Ticket', schema: TicketSchema },
      { name: 'Counter', schema: CounterSchema },
    ]),
  ],
  controllers: [TicketsController],
  providers: [TicketsService],
  exports: [TicketsService],
})
export class TicketsModule {}
