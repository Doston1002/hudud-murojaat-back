import { Schema } from 'mongoose';

export interface Curator {
  _id?: { toString(): string };
  telegramId: number;
  fio: string;
  regions: string[];
  isActive: boolean;
}

export const CuratorSchema = new Schema<Curator>(
  {
    telegramId: { type: Number, required: true, unique: true, index: true },
    fio: { type: String, required: true },
    regions: { type: [String], default: [] },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);
