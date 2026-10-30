import { Schema } from 'mongoose';
import type { FsmStep } from '../common/constants.js';

export interface SessionData {
  step: FsmStep;
  regionId?: string;
  regionName?: string;
  district?: string;
  institutionName?: string;
  locationLat?: number | null;
  locationLon?: number | null;
  category?: string;
  categoryLabel?: string;
  priority?: string;
  contentText?: string;
  mediaFileId?: string | null;
  mediaType?: string | null;
  phoneNumber?: string | null;
  isAnonymous?: boolean;
  resolveTicketId?: string | null;
  adminDraft?: {
    telegramId?: number;
    fio?: string;
    regions?: string[];
  };
}

export interface BotSession {
  telegramId: number;
  data: SessionData;
  updatedAt?: Date;
}

export const SessionSchema = new Schema<BotSession>(
  {
    telegramId: { type: Number, required: true, unique: true, index: true },
    data: { type: Schema.Types.Mixed, required: true },
  },
  { timestamps: { createdAt: false, updatedAt: true } },
);
