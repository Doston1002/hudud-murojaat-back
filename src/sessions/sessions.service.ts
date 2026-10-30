import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { FSM } from '../common/constants.js';
import type { BotSession, SessionData } from '../schemas/session.schema.js';

const empty = (): SessionData => ({ step: FSM.IDLE });

@Injectable()
export class SessionsService {
  constructor(
    @InjectModel('BotSession')
    private readonly sessionModel: Model<BotSession>,
  ) {}

  async get(telegramId: number): Promise<SessionData> {
    const doc = await this.sessionModel.findOne({ telegramId }).exec();
    return doc?.data ?? empty();
  }

  async set(telegramId: number, data: SessionData): Promise<void> {
    await this.sessionModel.findOneAndUpdate(
      { telegramId },
      { $set: { data } },
      { upsert: true },
    );
  }

  async reset(telegramId: number): Promise<void> {
    await this.set(telegramId, empty());
  }

  async patch(
    telegramId: number,
    patch: Partial<SessionData>,
  ): Promise<SessionData> {
    const current = await this.get(telegramId);
    const next = { ...current, ...patch };
    await this.set(telegramId, next);
    return next;
  }
}
