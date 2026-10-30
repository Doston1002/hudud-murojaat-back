import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { createObserveModule } from '@nestjs/observe';
import { AppController } from './app.controller.js';
import { AuthModule } from './auth/auth.module.js';
import { CuratorsModule } from './curators/curators.module.js';
import { ExportModule } from './export/export.module.js';
import { StatsModule } from './stats/stats.module.js';
import { TelegramModule } from './telegram/telegram.module.js';
import { TicketsModule } from './tickets/tickets.module.js';
import { UsersModule } from './users/users.module.js';

export const { ObserveModule, ObserveInstrument } = createObserveModule();

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env'] }),
    MongooseModule.forRoot(
      process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017/hudud_talim',
    ),
    ObserveModule.forRoot({
      appKey: process.env.OBSERVE_APP_KEY ?? '',
      appSecret: process.env.OBSERVE_APP_SECRET ?? '',
      runtimeMetrics: !Boolean(process.versions?.['webcontainer']),
      serviceId: 'hudud-talim-bot',
    }),
    AuthModule,
    UsersModule,
    CuratorsModule,
    TicketsModule,
    StatsModule,
    ExportModule,
    TelegramModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
