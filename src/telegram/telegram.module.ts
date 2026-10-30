import { Module } from '@nestjs/common';
import { CuratorsModule } from '../curators/curators.module.js';
import { CatalogController } from '../data/catalog.controller.js';
import { SessionsModule } from '../sessions/sessions.module.js';
import { TicketsModule } from '../tickets/tickets.module.js';
import { UsersModule } from '../users/users.module.js';
import { TelegramService } from './telegram.service.js';

@Module({
  imports: [UsersModule, CuratorsModule, TicketsModule, SessionsModule],
  controllers: [CatalogController],
  providers: [TelegramService],
  exports: [TelegramService],
})
export class TelegramModule {}
