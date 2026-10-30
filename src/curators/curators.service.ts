import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type { Curator } from '../schemas/curator.schema.js';

@Injectable()
export class CuratorsService {
  constructor(
    @InjectModel('Curator') private readonly curatorModel: Model<Curator>,
  ) {}

  create(data: {
    telegramId: number;
    fio: string;
    regions: string[];
  }): Promise<Curator> {
    return this.curatorModel.findOneAndUpdate(
      { telegramId: data.telegramId },
      { $set: { ...data, isActive: true } },
      { upsert: true, new: true },
    ) as Promise<Curator>;
  }

  findAll(): Promise<Curator[]> {
    return this.curatorModel.find().sort({ fio: 1 }).exec();
  }

  findByTelegramId(telegramId: number): Promise<Curator | null> {
    return this.curatorModel.findOne({ telegramId, isActive: true }).exec();
  }

  findByRegion(region: string): Promise<Curator[]> {
    return this.curatorModel
      .find({ isActive: true, regions: region })
      .exec();
  }

  async update(
    id: string,
    data: Partial<Pick<Curator, 'fio' | 'regions' | 'isActive' | 'telegramId'>>,
  ): Promise<Curator> {
    const updated = await this.curatorModel
      .findByIdAndUpdate(id, { $set: data }, { new: true })
      .exec();
    if (!updated) {
      throw new NotFoundException('Kurator topilmadi');
    }
    return updated;
  }

  async remove(id: string): Promise<void> {
    const updated = await this.curatorModel
      .findByIdAndUpdate(id, { $set: { isActive: false } }, { new: true })
      .exec();
    if (!updated) {
      throw new NotFoundException('Kurator topilmadi');
    }
  }
}
