import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type { User } from '../schemas/user.schema.js';

@Injectable()
export class UsersService {
  constructor(@InjectModel('User') private readonly userModel: Model<User>) {}

  async upsertByTelegramId(
    telegramId: number,
    phoneNumber?: string | null,
  ): Promise<User & { _id: unknown }> {
    const update: Partial<User> = {};
    if (phoneNumber) {
      update.phoneNumber = phoneNumber;
    }
    return this.userModel.findOneAndUpdate(
      { telegramId },
      { $setOnInsert: { telegramId }, $set: update },
      { upsert: true, new: true },
    ) as Promise<User & { _id: unknown }>;
  }
}
