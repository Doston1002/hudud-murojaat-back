import { Schema, Types } from 'mongoose';
import type { TicketStatus } from '../common/constants.js';

export interface Ticket {
  ticketId: string;
  reporterId?: Types.ObjectId;
  reporterTelegramId: number;
  region: string;
  district: string;
  institutionName: string;
  locationLat?: number | null;
  locationLon?: number | null;
  category: string;
  categoryLabel: string;
  priority: string;
  contentText: string;
  mediaFileId?: string | null;
  mediaType?: string | null;
  isAnonymous: boolean;
  phoneNumber?: string | null;
  reporterName?: string | null;
  reporterUsername?: string | null;
  status: TicketStatus;
  curatorId?: Types.ObjectId | null;
  curatorTelegramId?: number | null;
  resolutionText?: string | null;
  resolutionMedia?: string | null;
  groupMessageId?: number | null;
  curatorMessageId?: number | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export const TicketSchema = new Schema<Ticket>(
  {
    ticketId: { type: String, required: true, unique: true, index: true },
    reporterId: { type: Schema.Types.ObjectId, ref: 'User' },
    reporterTelegramId: { type: Number, required: true, index: true },
    region: { type: String, required: true, index: true },
    district: { type: String, required: true },
    institutionName: { type: String, required: true },
    locationLat: { type: Number, default: null },
    locationLon: { type: Number, default: null },
    category: { type: String, required: true },
    categoryLabel: { type: String, required: true },
    priority: { type: String, default: 'NORMAL' },
    contentText: { type: String, required: true },
    mediaFileId: { type: String, default: null },
    mediaType: { type: String, default: null },
    isAnonymous: { type: Boolean, default: false },
    phoneNumber: { type: String, default: null },
    reporterName: { type: String, default: null },
    reporterUsername: { type: String, default: null },
    status: {
      type: String,
      enum: ['NEW', 'IN_PROGRESS', 'RESOLVED'],
      default: 'NEW',
      index: true,
    },
    curatorId: { type: Schema.Types.ObjectId, ref: 'Curator', default: null },
    curatorTelegramId: { type: Number, default: null },
    resolutionText: { type: String, default: null },
    resolutionMedia: { type: String, default: null },
    groupMessageId: { type: Number, default: null },
    curatorMessageId: { type: Number, default: null },
  },
  { timestamps: true },
);
