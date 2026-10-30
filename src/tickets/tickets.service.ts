import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  CATEGORIES,
  TICKET_STATUS,
  type TicketStatus,
} from '../common/constants.js';
import type { Counter } from '../schemas/counter.schema.js';
import type { Ticket } from '../schemas/ticket.schema.js';

export type CreateTicketInput = Omit<
  Ticket,
  'ticketId' | 'status' | 'createdAt' | 'updatedAt'
>;

@Injectable()
export class TicketsService {
  constructor(
    @InjectModel('Ticket') private readonly ticketModel: Model<Ticket>,
    @InjectModel('Counter') private readonly counterModel: Model<Counter>,
  ) {}

  async nextTicketId(): Promise<string> {
    const year = new Date().getFullYear();
    const doc = await this.counterModel.findByIdAndUpdate(
      `ticket-${year}`,
      { $inc: { seq: 1 } },
      { upsert: true, new: true },
    );
    const seq = doc?.seq ?? 1;
    return `HT-${year}-${String(seq).padStart(6, '0')}`;
  }

  async create(input: CreateTicketInput): Promise<Ticket> {
    const ticketId = await this.nextTicketId();
    return this.ticketModel.create({
      ...input,
      ticketId,
      status: TICKET_STATUS.NEW,
    });
  }

  findByTicketId(ticketId: string): Promise<Ticket | null> {
    return this.ticketModel.findOne({ ticketId }).exec();
  }

  findByReporter(telegramId: number): Promise<Ticket[]> {
    return this.ticketModel
      .find({ reporterTelegramId: telegramId })
      .sort({ createdAt: -1 })
      .limit(10)
      .exec();
  }

  async take(ticketId: string, curator: { _id: unknown; telegramId: number }) {
    const ticket = await this.ticketModel.findOne({ ticketId }).exec();
    if (!ticket) {
      throw new NotFoundException('Murojaat topilmadi');
    }
    if (ticket.status !== TICKET_STATUS.NEW) {
      throw new BadRequestException('Murojaat allaqachon qabul qilingan');
    }
    ticket.status = TICKET_STATUS.IN_PROGRESS;
    ticket.curatorId = curator._id as Ticket['curatorId'];
    ticket.curatorTelegramId = curator.telegramId;
    await ticket.save();
    return ticket;
  }

  async resolve(
    ticketId: string,
    resolutionText: string,
    resolutionMedia?: string | null,
  ) {
    const ticket = await this.ticketModel.findOne({ ticketId }).exec();
    if (!ticket) {
      throw new NotFoundException('Murojaat topilmadi');
    }
    ticket.status = TICKET_STATUS.RESOLVED;
    ticket.resolutionText = resolutionText;
    ticket.resolutionMedia = resolutionMedia ?? null;
    await ticket.save();
    return ticket;
  }

  async query(filters: {
    status?: TicketStatus;
    region?: string;
    from?: string;
    to?: string;
  }): Promise<Ticket[]> {
    const q: Record<string, unknown> = {};
    if (filters.status) {
      q.status = filters.status;
    }
    if (filters.region) {
      q.region = filters.region;
    }
    if (filters.from || filters.to) {
      const createdAt: Record<string, Date> = {};
      if (filters.from) {
        createdAt.$gte = new Date(filters.from);
      }
      if (filters.to) {
        createdAt.$lte = new Date(`${filters.to}T23:59:59.999Z`);
      }
      q.createdAt = createdAt;
    }
    return this.ticketModel.find(q).sort({ createdAt: -1 }).limit(500).exec();
  }

  sanitize(ticket: Ticket) {
    const base = {
      ticketId: ticket.ticketId,
      region: ticket.region,
      district: ticket.district,
      institutionName: ticket.institutionName ?? '',
      locationLat: ticket.locationLat ?? null,
      locationLon: ticket.locationLon ?? null,
      category: ticket.category,
      categoryLabel: ticket.categoryLabel,
      priority: ticket.priority,
      contentText: ticket.contentText,
      mediaFileId: ticket.mediaFileId ?? null,
      mediaType: ticket.mediaType ?? null,
      isAnonymous: ticket.isAnonymous,
      status: ticket.status,
      curatorTelegramId: ticket.curatorTelegramId ?? null,
      resolutionText: ticket.resolutionText ?? null,
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
    };
    if (ticket.isAnonymous) {
      return {
        ...base,
        phoneNumber: null,
        reporterName: null,
        reporterUsername: null,
        reporterTelegramId: null,
      };
    }
    return {
      ...base,
      phoneNumber: ticket.phoneNumber ?? null,
      reporterName: ticket.reporterName ?? null,
      reporterUsername: ticket.reporterUsername ?? null,
    };
  }

  async overview() {
    const [total, neu, progress, resolved] = await Promise.all([
      this.ticketModel.countDocuments(),
      this.ticketModel.countDocuments({ status: TICKET_STATUS.NEW }),
      this.ticketModel.countDocuments({
        status: TICKET_STATUS.IN_PROGRESS,
      }),
      this.ticketModel.countDocuments({ status: TICKET_STATUS.RESOLVED }),
    ]);
    return { total, new: neu, inProgress: progress, resolved };
  }

  async byRegion() {
    return this.ticketModel.aggregate([
      {
        $group: {
          _id: '$region',
          total: { $sum: 1 },
          new: {
            $sum: { $cond: [{ $eq: ['$status', 'NEW'] }, 1, 0] },
          },
          inProgress: {
            $sum: { $cond: [{ $eq: ['$status', 'IN_PROGRESS'] }, 1, 0] },
          },
          resolved: {
            $sum: { $cond: [{ $eq: ['$status', 'RESOLVED'] }, 1, 0] },
          },
        },
      },
      { $sort: { total: -1 } },
    ]);
  }

  async byCategory() {
    const rows = await this.ticketModel.aggregate([
      {
        $group: {
          _id: '$categoryLabel',
          total: { $sum: 1 },
          new: {
            $sum: { $cond: [{ $eq: ['$status', 'NEW'] }, 1, 0] },
          },
          inProgress: {
            $sum: { $cond: [{ $eq: ['$status', 'IN_PROGRESS'] }, 1, 0] },
          },
          resolved: {
            $sum: { $cond: [{ $eq: ['$status', 'RESOLVED'] }, 1, 0] },
          },
        },
      },
      { $sort: { total: -1 } },
    ]);
    const knownLabels = new Set(Object.values(CATEGORIES).map((c) => c.label));
    const byLabel = new Map(rows.map((row) => [row._id, row]));
    const knownRows = Object.values(CATEGORIES).map(
      ({ label }) =>
        byLabel.get(label) ?? {
          _id: label,
          total: 0,
          new: 0,
          inProgress: 0,
          resolved: 0,
        },
    );
    return [
      ...knownRows,
      ...rows.filter((row) => !knownLabels.has(row._id)),
    ];
  }

  async byCurator() {
    return this.ticketModel.aggregate([
      { $match: { curatorTelegramId: { $ne: null } } },
      {
        $group: {
          _id: '$curatorTelegramId',
          total: { $sum: 1 },
          new: {
            $sum: { $cond: [{ $eq: ['$status', 'NEW'] }, 1, 0] },
          },
          resolved: {
            $sum: { $cond: [{ $eq: ['$status', 'RESOLVED'] }, 1, 0] },
          },
          inProgress: {
            $sum: { $cond: [{ $eq: ['$status', 'IN_PROGRESS'] }, 1, 0] },
          },
        },
      },
      { $sort: { total: -1 } },
    ]);
  }
}
