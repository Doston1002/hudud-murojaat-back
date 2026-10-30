import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SessionSchema } from '../schemas/session.schema.js';
import { SessionsService } from './sessions.service.js';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'BotSession', schema: SessionSchema }]),
  ],
  providers: [SessionsService],
  exports: [SessionsService],
})
export class SessionsModule {}
