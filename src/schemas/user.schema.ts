import { Schema } from 'mongoose';

export interface User {
  telegramId: number;
  phoneNumber?: string | null;
  createdAt?: Date;
}

export const UserSchema = new Schema<User>(
  {
    telegramId: { type: Number, required: true, unique: true, index: true },
    phoneNumber: { type: String, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
