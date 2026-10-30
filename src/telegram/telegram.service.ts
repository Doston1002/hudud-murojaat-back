import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { resolve } from 'node:path';
import { Bot, Context, InlineKeyboard, InputFile } from 'grammy';
import ExcelJS from 'exceljs';
import { CATEGORIES, FSM } from '../common/constants.js';
import { CuratorsService } from '../curators/curators.service.js';
import { findRegion, REGIONS } from '../data/regions.js';
import type { SessionData } from '../schemas/session.schema.js';
import type { Ticket } from '../schemas/ticket.schema.js';
import { SessionsService } from '../sessions/sessions.service.js';
import { TicketsService } from '../tickets/tickets.service.js';
import { UsersService } from '../users/users.service.js';
import {
  draftCard,
  locationHint,
  ticketCard,
  userGuide,
  userStatusLine,
} from './format.js';
import {
  adminMenuKeyboard,
  adminRegionsKeyboard,
  categoriesKeyboard,
  confirmKeyboard,
  curatorResolveKeyboard,
  curatorTicketKeyboard,
  districtsKeyboard,
  locationKeyboard,
  mediaKeyboard,
  phoneKeyboard,
  regionsKeyboard,
  removeKb,
  startKeyboard,
} from './keyboards.js';
import { hasAction } from './match.js';

@Injectable()
export class TelegramService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TelegramService.name);
  private bot: Bot | null = null;

  constructor(
    private readonly config: ConfigService,
    private readonly sessions: SessionsService,
    private readonly users: UsersService,
    private readonly curators: CuratorsService,
    private readonly tickets: TicketsService,
  ) {}

  async onModuleInit() {
    const token = this.config.get<string>('BOT_TOKEN');
    if (!token) {
      this.logger.error('BOT_TOKEN .env da yo‘q — bot ishga tushmadi');
      return;
    }
    this.bot = new Bot(token);
    this.register(this.bot);
    this.bot.catch((err) => {
      this.logger.error(err.error, err.message);
    });
    if (!this.config.get<string>('ARCHIVE_GROUP_ID')) {
      this.logger.warn(
        'ARCHIVE_GROUP_ID sozlanmagan — xabarlar arxiv kanaliga yuborilmaydi',
      );
    }
    try {
      await this.bot.api.setMyCommands([
        { command: 'start', description: 'Xabar jo‘natishni boshlash' },
        { command: 'my', description: 'Murojaatlarim holati' },
        { command: 'cancel', description: 'Jarayonni bekor qilish' },
        { command: 'help', description: 'Botdan foydalanish qo‘llanmasi' },
      ]);
    } catch (error) {
      this.logger.warn(
        `Telegram buyruqlar menyusi sozlanmadi: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    try {
      await this.bot.api.deleteWebhook({ drop_pending_updates: true });
      void this.bot.start().catch((error: unknown) => {
        this.logger.error(
          error instanceof Error ? error.message : String(error),
        );
      });
    } catch (error) {
      this.logger.error(
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  async onModuleDestroy() {
    await this.bot?.stop();
  }

  private adminIds(): number[] {
    const raw = this.config.get<string>('SUPERADMIN_TELEGRAM_IDS') ?? '';
    return raw
      .split(',')
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isFinite(n) && n > 0);
  }

  private isAdmin(id: number): boolean {
    return this.adminIds().includes(id);
  }

  private register(bot: Bot) {
    bot.command('start', (ctx) => this.onStart(ctx));
    bot.command('cancel', (ctx) => this.onCancel(ctx));
    bot.command('my', (ctx) => this.onMy(ctx));
    bot.command('help', (ctx) => this.onHelp(ctx));
    bot.command('admin', (ctx) => this.onAdmin(ctx));
    bot.on('callback_query:data', (ctx) => this.onCallback(ctx));
    bot.on('message', (ctx) => this.onMessage(ctx));
  }

  private async onStart(ctx: Context) {
    const id = ctx.from?.id;
    if (!id) {
      return;
    }
    await this.users.upsertByTelegramId(id);
    await this.sessions.set(id, { step: FSM.IDLE });
    await ctx.reply(userGuide(), { reply_markup: startKeyboard() });
  }

  private async onHelp(ctx: Context) {
    await ctx.reply(userGuide(false), removeKb());
    const guidePath = resolve(
      process.cwd(),
      'assets',
      "Telegram_bot_Xabar_yo'llovchi_uchun_foydalanish_qo'llanmasi.pdf",
    );
    await ctx.replyWithDocument(new InputFile(guidePath));
  }

  private async onCancel(ctx: Context) {
    const id = ctx.from?.id;
    if (!id) {
      return;
    }
    await this.sessions.reset(id);
    await ctx.reply('Jarayon bekor qilindi. Qayta boshlash: /start', removeKb());
  }

  private async onMy(ctx: Context) {
    const id = ctx.from?.id;
    if (!id) {
      return;
    }
    const list = await this.tickets.findByReporter(id);
    if (!list.length) {
      await ctx.reply('Sizda hali murojaat yo‘q. /start bosing.');
      return;
    }
    await ctx.reply(list.map(userStatusLine).join('\n'));
  }

  private async onAdmin(ctx: Context) {
    const id = ctx.from?.id;
    if (!id || !this.isAdmin(id)) {
      await ctx.reply('Bu buyruq faqat SuperAdmin uchun.');
      return;
    }
    await ctx.reply('SuperAdmin paneli', {
      reply_markup: adminMenuKeyboard(),
    });
  }

  private async onCallback(ctx: Context) {
    const data = ctx.callbackQuery?.data;
    const id = ctx.from?.id;
    if (!data || !id) {
      return;
    }
    try {
      await ctx.answerCallbackQuery();
      if (data.startsWith('reg:')) {
        await this.pickRegion(ctx, id, data.slice(4));
        return;
      }
      if (data.startsWith('dis:')) {
        const [, regionId, idx] = data.split(':');
        await this.pickDistrict(ctx, id, regionId, Number(idx));
        return;
      }
      if (data === 'back:region') {
        await this.sessions.set(id, { step: FSM.REGION });
        await ctx.reply('Hududni tanlang:', {
          reply_markup: regionsKeyboard(),
        });
        return;
      }
      if (data.startsWith('cat:')) {
        await this.pickCategory(ctx, id, data.slice(4));
        return;
      }
      if (data.startsWith('take:')) {
        await this.takeTicket(ctx, id, data.slice(5));
        return;
      }
      if (data.startsWith('done:')) {
        await this.startResolve(ctx, id, data.slice(5));
        return;
      }
      if (data.startsWith('adm:') || data.startsWith('ar:') || data === 'ardone') {
        await this.adminCallback(ctx, id, data);
        return;
      }
      if (data.startsWith('adel:')) {
        await this.curators.remove(data.slice(5));
        await ctx.reply('Kurator o‘chirildi (nofaol).');
      }
    } catch (error) {
      this.logger.warn(error instanceof Error ? error.message : error);
      await ctx.reply('Amalni bajarib bo‘lmadi. Qayta urinib ko‘ring.');
    }
  }

  private async pickRegion(ctx: Context, userId: number, regionId: string) {
    const region = findRegion(regionId);
    if (!region) {
      await ctx.reply('Viloyat topilmadi.');
      return;
    }
    await this.sessions.set(userId, {
      step: FSM.DISTRICT,
      regionId: region.id,
      regionName: region.name,
    });
    await ctx.reply(`${region.name}. Tuman/shaharni tanlang:`, {
      reply_markup: districtsKeyboard(region),
    });
  }

  private async pickDistrict(
    ctx: Context,
    userId: number,
    regionId: string,
    index: number,
  ) {
    const region = findRegion(regionId);
    const district = region?.districts[index];
    if (!region || !district) {
      await ctx.reply('Tuman topilmadi.');
      return;
    }
    await this.sessions.patch(userId, {
      step: FSM.INSTITUTION,
      regionId: region.id,
      regionName: region.name,
      district,
    });
    await ctx.reply('Ta’lim muassasasi nomi yoki raqamini kiriting.');
  }

  private async pickCategory(ctx: Context, userId: number, catId: string) {
    const cat = CATEGORIES[catId as keyof typeof CATEGORIES];
    if (!cat) {
      await ctx.reply('Toifa noto‘g‘ri.');
      return;
    }
    await this.sessions.patch(userId, {
      step: FSM.TEXT,
      category: cat.id,
      categoryLabel: cat.label,
      priority: cat.priority,
    });
    await ctx.reply(
      'Holat bo‘yicha batafsil matnli tushuntirish yozing.',
      removeKb(),
    );
  }

  private async takeTicket(ctx: Context, userId: number, ticketId: string) {
    const curator = await this.curators.findByTelegramId(userId);
    if (!curator) {
      await ctx.reply('Siz tizimda kurator emassiz.');
      return;
    }
    const ticket = await this.tickets.findByTicketId(ticketId);
    if (!ticket) {
      await ctx.reply('Murojaat topilmadi.');
      return;
    }
    if (!curator.regions.includes(ticket.region)) {
      await ctx.reply('Bu hudud sizga biriktirilmagan.');
      return;
    }
    const taken = await this.tickets.take(ticketId, {
      _id: (curator as unknown as { _id: unknown })._id,
      telegramId: curator.telegramId,
    });
    try {
      await ctx.api.sendMessage(
        taken.reporterTelegramId,
        `Sizning xabaringiz mas’ul xodim tomonidan o‘rganilmoqda.\nRaqam: ${taken.ticketId}`,
      );
    } catch (error) {
      this.logger.warn(`Foydalanuvchiga xabar ketmadi: ${String(error)}`);
    }
    await ctx.editMessageReplyMarkup({
      reply_markup: curatorResolveKeyboard(ticketId),
    });
    await ctx.reply(`${ticketId} -sonli xabaringiz o'rganish va holatni bartaraf etish jarayoniga o'tkazildi.`);
  }

  private async startResolve(ctx: Context, userId: number, ticketId: string) {
    const curator = await this.curators.findByTelegramId(userId);
    const ticket = await this.tickets.findByTicketId(ticketId);
    if (!curator || !ticket) {
      await ctx.reply('Ruxsat yo‘q yoki xabar topilmadi.');
      return;
    }
    if (ticket.curatorTelegramId && ticket.curatorTelegramId !== userId) {
      await ctx.reply('Bu xabar boshqa mas’ulda.');
      return;
    }
    await this.sessions.set(userId, {
      step: FSM.WAIT_RESOLUTION,
      resolveTicketId: ticketId,
    });
    await ctx.reply(
      `${ticketId} uchun natija matnini yozing. Xohlasangiz rasm ham yuboring.`,
      removeKb(),
    );
  }

  private async adminCallback(ctx: Context, userId: number, data: string) {
    if (!this.isAdmin(userId)) {
      await ctx.reply('Faqat SuperAdmin.');
      return;
    }
    if (data === 'adm:stats') {
      const o = await this.tickets.overview();
      await ctx.reply(
        `📊 Dashboard\nJami: ${o.total}\nYangi: ${o.new}\nJarayonda: ${o.inProgress}\nYopilgan: ${o.resolved}`,
      );
      return;
    }
    if (data === 'adm:add') {
      await this.sessions.set(userId, {
        step: FSM.ADMIN_CURATOR_ID,
        adminDraft: {},
      });
      await ctx.reply('Yangi kuratorning Telegram ID raqamini yuboring.');
      return;
    }
    if (data === 'adm:list') {
      const list = await this.curators.findAll();
      if (!list.length) {
        await ctx.reply('Kuratorlar yo‘q.');
        return;
      }
      for (const c of list) {
        const kb = new InlineKeyboard().text(
          '🗑 O‘chirish',
          `adel:${c._id?.toString()}`,
        );
        await ctx.reply(
          `${c.isActive ? '🟢' : '⚪'} ${c.fio}\nID: ${c.telegramId}\nHududlar: ${c.regions.join(', ') || '—'}`,
          { reply_markup: kb },
        );
      }
      return;
    }
    if (data === 'adm:xlsx') {
      await this.sendExcel(ctx);
      return;
    }
    if (data.startsWith('ar:')) {
      const region = findRegion(data.slice(3));
      const session = await this.sessions.get(userId);
      const selected = [...(session.adminDraft?.regions ?? [])];
      if (region) {
        const i = selected.indexOf(region.name);
        if (i >= 0) {
          selected.splice(i, 1);
        } else {
          selected.push(region.name);
        }
      }
      await this.sessions.patch(userId, {
        adminDraft: { ...session.adminDraft, regions: selected },
      });
      await ctx.editMessageReplyMarkup({
        reply_markup: adminRegionsKeyboard(selected),
      });
      return;
    }
    if (data === 'ardone') {
      const session = await this.sessions.get(userId);
      const draft = session.adminDraft;
      if (!draft?.telegramId || !draft.fio || !draft.regions?.length) {
        await ctx.reply('Telegram ID, F.I.O. va kamida 1 hudud kerak.');
        return;
      }
      await this.curators.create({
        telegramId: draft.telegramId,
        fio: draft.fio,
        regions: draft.regions,
      });
      await this.sessions.reset(userId);
      await ctx.reply(
        `Kurator qo‘shildi: ${draft.fio}\nHududlar: ${draft.regions.join(', ')}`,
      );
    }
  }

  private async sendExcel(ctx: Context) {
    const items = await this.tickets.query({});
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Murojaatlar');
    sheet.columns = [
      { header: 'Ticket ID', key: 'ticketId', width: 18 },
      { header: 'Viloyat', key: 'region', width: 28 },
      { header: 'Tuman', key: 'district', width: 24 },
      { header: 'Ta’lim muassasasi', key: 'institutionName', width: 32 },
      { header: 'Toifa', key: 'categoryLabel', width: 36 },
      { header: 'Status', key: 'status', width: 14 },
      { header: 'Anonim', key: 'anon', width: 10 },
      { header: 'Matn', key: 'contentText', width: 50 },
    ];
    for (const t of items) {
      const v = this.tickets.sanitize(t);
      sheet.addRow({
        ticketId: v.ticketId,
        region: v.region,
        district: v.district,
        institutionName: v.institutionName,
        categoryLabel: v.categoryLabel,
        status: v.status,
        anon: v.isAnonymous ? 'Ha' : 'Yo‘q',
        contentText: v.contentText,
      });
    }
    const buf = await workbook.xlsx.writeBuffer();
    await ctx.replyWithDocument(
      new InputFile(Buffer.from(buf), 'murojaatlar.xlsx'),
    );
  }

  private async onMessage(ctx: Context) {
    const id = ctx.from?.id;
    if (!id || !ctx.message) {
      return;
    }
    try {
      const session = await this.sessions.get(id);
      if (session.step === FSM.WAIT_RESOLUTION) {
        await this.handleResolution(ctx, id, session);
        return;
      }
      if (session.step === FSM.ADMIN_CURATOR_ID) {
        const num = Number(ctx.message.text);
        if (!Number.isFinite(num)) {
          await ctx.reply('Faqat raqam yuboring (Telegram ID).');
          return;
        }
        await this.sessions.patch(id, {
          step: FSM.ADMIN_CURATOR_FIO,
          adminDraft: { telegramId: num },
        });
        await ctx.reply('Kurator F.I.O. sini yuboring.');
        return;
      }
      if (session.step === FSM.ADMIN_CURATOR_FIO) {
        const fio = ctx.message.text?.trim();
        if (!fio) {
          await ctx.reply('F.I.O. matn bo‘lishi kerak.');
          return;
        }
        await this.sessions.patch(id, {
          step: FSM.ADMIN_CURATOR_REGIONS,
          adminDraft: { ...session.adminDraft, fio },
        });
        await ctx.reply('Hududlarni tanlang (bir nechta mumkin):', {
          reply_markup: adminRegionsKeyboard([]),
        });
        return;
      }
      await this.handleFsm(ctx, id, session);
    } catch (error) {
      this.logger.error(error instanceof Error ? error.stack : error);
      await ctx.reply(
        'Xatolik yuz berdi, bot ishlashda davom etadi. /start bosing.',
      );
    }
  }

  private async handleResolution(
    ctx: Context,
    userId: number,
    session: SessionData,
  ) {
    const ticketId = session.resolveTicketId;
    if (!ticketId) {
      await this.sessions.reset(userId);
      return;
    }
    const text =
      ctx.message?.text ||
      ctx.message?.caption ||
      'Natija kiritildi.';
    const photo = ctx.message?.photo?.at(-1)?.file_id;
    const resolved = await this.tickets.resolve(ticketId, text, photo ?? null);
    await this.sessions.reset(userId);
    try {
      if (photo) {
        await ctx.api.sendPhoto(resolved.reporterTelegramId, photo, {
          caption: `✅ Murojaatingiz hal etildi (${resolved.ticketId})\n${text}`,
        });
      } else {
        await ctx.api.sendMessage(
          resolved.reporterTelegramId,
          `✅ Murojaatingiz hal etildi (${resolved.ticketId})\n${text}`,
        );
      }
    } catch (error) {
      this.logger.warn(`Natija yuborilmadi: ${String(error)}`);
    }
    await ctx.reply(`${ticketId} yopildi. Foydalanuvchiga natija yuborildi.`);
  }

  private async handleFsm(ctx: Context, userId: number, session: SessionData) {
    const text = ctx.message?.text?.trim();
    switch (session.step) {
      case FSM.IDLE:
        if (hasAction(text, 'Xabar yuborishni boshlang')) {
          await this.sessions.set(userId, { step: FSM.REGION });
          await ctx.reply('Hududni tanlang:', {
            reply_markup: regionsKeyboard(),
          });
          return;
        }
        await ctx.reply(
          'Xabar yuborishni boshlash uchun quyidagi tugmani bosing.',
          { reply_markup: startKeyboard() },
        );
        return;
      case FSM.INSTITUTION:
        if (!text || text.startsWith('/')) {
          await ctx.reply(
            'Ta’lim muassasasi nomi yoki raqamini matn ko‘rinishida kiriting.',
          );
          return;
        }
        await this.sessions.patch(userId, {
          step: FSM.LOCATION,
          institutionName: text,
        });
        await ctx.reply(locationHint(), { reply_markup: locationKeyboard() });
        return;
      case FSM.LOCATION:
        await this.stepLocation(ctx, userId, session);
        return;
      case FSM.TEXT:
        if (!text || text.startsWith('/')) {
          await ctx.reply('Iltimos, holatni matn ko‘rinishida yozing.');
          return;
        }
        await this.sessions.patch(userId, {
          step: FSM.MEDIA,
          contentText: text,
        });
        await ctx.reply(
          'Rasm yoki video yuboring. Bo‘lmasa «➡️ Media yo‘q» ni bosing.',
          { reply_markup: mediaKeyboard() },
        );
        return;
      case FSM.MEDIA:
        await this.stepMedia(ctx, userId, session, text);
        return;
      case FSM.PHONE:
        await this.stepPhone(ctx, userId, session, text);
        return;
      case FSM.CONFIRM:
        await this.stepConfirm(ctx, userId, session, text);
        return;
      case FSM.REGION:
        await ctx.reply('Hududni tugmalardan tanlang.', {
          reply_markup: regionsKeyboard(),
        });
        return;
      case FSM.DISTRICT: {
        const region = session.regionId
          ? findRegion(session.regionId)
          : undefined;
        await ctx.reply('Tumanni tugmalardan tanlang.', {
          reply_markup: region
            ? districtsKeyboard(region)
            : regionsKeyboard(),
        });
        return;
      }
      case FSM.CATEGORY:
        await ctx.reply('Toifani tanlang.', {
          reply_markup: categoriesKeyboard(),
        });
        return;
      default:
        await ctx.reply('Xabar yuborish uchun /start bosing.');
    }
  }

  private async stepLocation(
    ctx: Context,
    userId: number,
    session: SessionData,
  ) {
    const loc = ctx.message?.location;
    const skip = hasAction(
      ctx.message?.text,
      "O'tkazib yuborish",
      'O‘tkazib yuborish',
    );
    if (!loc && !skip) {
      await ctx.reply(
        'Joylashuvni yuboring yoki «➡️ O‘tkazib yuborish» ni bosing.',
        { reply_markup: locationKeyboard() },
      );
      return;
    }
    await this.sessions.patch(userId, {
      step: FSM.CATEGORY,
      locationLat: loc?.latitude ?? null,
      locationLon: loc?.longitude ?? null,
    });
    await ctx.reply('Muammo toifasini tanlang:', {
      reply_markup: categoriesKeyboard(),
    });
    void session;
  }

  private async stepMedia(
    ctx: Context,
    userId: number,
    _session: SessionData,
    text?: string,
  ) {
    const skip = hasAction(text, "Media yo'q", 'Media yo‘q');
    const photo = ctx.message?.photo?.at(-1)?.file_id;
    const video = ctx.message?.video?.file_id;
    if (!skip && !photo && !video) {
      await ctx.reply(
        'Rasm/video yuboring yoki «➡️ Media yo‘q» ni bosing. Boshqa fayl qabul qilinmaydi.',
        { reply_markup: mediaKeyboard() },
      );
      return;
    }
    await this.sessions.patch(userId, {
      step: FSM.PHONE,
      mediaFileId: photo ?? video ?? null,
      mediaType: photo ? 'photo' : video ? 'video' : null,
    });
    await ctx.reply(
      'Qayta aloqa uchun telefon raqamingizni yuboring yoki anonim qoling.',
      { reply_markup: phoneKeyboard() },
    );
  }

  private async stepPhone(
    ctx: Context,
    userId: number,
    session: SessionData,
    text?: string,
  ) {
    const contact = ctx.message?.contact;
    const anon = hasAction(text, 'Anonim');
    if (!contact && !anon) {
      await ctx.reply(
        'Kontakt yuboring yoki «➡️ Anonim qolish» ni bosing.',
        { reply_markup: phoneKeyboard() },
      );
      return;
    }
    const next = await this.sessions.patch(userId, {
      step: FSM.CONFIRM,
      isAnonymous: Boolean(anon),
      phoneNumber: contact?.phone_number ?? null,
    });
    if (next.mediaFileId && next.mediaType === 'photo') {
      await ctx.replyWithPhoto(next.mediaFileId);
    } else if (next.mediaFileId && next.mediaType === 'video') {
      await ctx.replyWithVideo(next.mediaFileId);
    }
    await ctx.reply(draftCard({ ...session, ...next }), {
      reply_markup: confirmKeyboard(),
    });
  }

  private async stepConfirm(
    ctx: Context,
    userId: number,
    session: SessionData,
    text?: string,
  ) {
    if (hasAction(text, 'Bekor')) {
      await this.sessions.reset(userId);
      await ctx.reply('Bekor qilindi. /start', removeKb());
      return;
    }
    if (!hasAction(text, 'Yuborish')) {
      await ctx.reply('✅ Yuborish yoki ❌ Bekor qilish ni bosing.', {
        reply_markup: confirmKeyboard(),
      });
      return;
    }
    const user = await this.users.upsertByTelegramId(
      userId,
      session.phoneNumber,
    );
    const ticket = await this.tickets.create({
      reporterId: (user as { _id: Ticket['reporterId'] })._id,
      reporterTelegramId: userId,
      region: session.regionName ?? '',
      district: session.district ?? '',
      institutionName: session.institutionName ?? '',
      locationLat: session.locationLat ?? null,
      locationLon: session.locationLon ?? null,
      category: session.category ?? 'EMERGENCY',
      categoryLabel: session.categoryLabel ?? '',
      priority: session.priority ?? 'NORMAL',
      contentText: session.contentText ?? '',
      mediaFileId: session.mediaFileId ?? null,
      mediaType: session.mediaType ?? null,
      isAnonymous: Boolean(session.isAnonymous),
      phoneNumber: session.isAnonymous ? null : (session.phoneNumber ?? null),
      reporterName: session.isAnonymous
        ? null
        : ctx.from?.first_name ?? null,
      reporterUsername: session.isAnonymous
        ? null
        : (ctx.from?.username ?? null),
    });
    await this.sessions.reset(userId);
    await this.dispatch(ticket);
    await ctx.reply(
      `Murojaatingiz qabul qilindi.\nRaqam: ${ticket.ticketId}\nStatus: Yangi\n\nHolatni /my orqali kuzating.`,
      removeKb(),
    );
  }

  private async dispatch(ticket: Ticket) {
    if (!this.bot) {
      return;
    }
    const card = ticketCard(ticket, true);
    const groupId = this.config.get<string>('ARCHIVE_GROUP_ID');
    if (groupId) {
      try {
        await this.sendTicketPayload(Number(groupId) || groupId, ticket, card);
      } catch (error) {
        this.logger.warn(`Guruhga yuborilmadi: ${String(error)}`);
      }
    }
    const assigned = await this.curators.findByRegion(ticket.region);
    if (!assigned.length) {
      this.logger.warn(`Kurator yo‘q: ${ticket.region}`);
      for (const adminId of this.adminIds()) {
        try {
          await this.bot.api.sendMessage(
            adminId,
            `⚠️ ${ticket.region} uchun faol kurator yo‘q.\n${ticket.ticketId}`,
          );
        } catch (error) {
          this.logger.warn(String(error));
        }
      }
      return;
    }
    for (const curator of assigned) {
      try {
        await this.sendTicketPayload(
          curator.telegramId,
          ticket,
          card,
          curatorTicketKeyboard(ticket.ticketId),
        );
      } catch (error) {
        this.logger.warn(
          `Kurator ${curator.telegramId} ga yuborilmadi: ${String(error)}`,
        );
      }
    }
  }

  private async sendTicketPayload(
    chatId: number | string,
    ticket: Ticket,
    card: string,
    keyboard?: InlineKeyboard,
  ) {
    if (!this.bot) {
      return;
    }
    const extra = keyboard ? { reply_markup: keyboard } : undefined;
    if (ticket.mediaType === 'photo' && ticket.mediaFileId) {
      await this.bot.api.sendPhoto(chatId, ticket.mediaFileId, {
        caption: card.slice(0, 1000),
        ...extra,
      });
      return;
    }
    if (ticket.mediaType === 'video' && ticket.mediaFileId) {
      await this.bot.api.sendVideo(chatId, ticket.mediaFileId, {
        caption: card.slice(0, 1000),
        ...extra,
      });
      return;
    }
    await this.bot.api.sendMessage(chatId, card, extra);
    if (ticket.locationLat && ticket.locationLon) {
      await this.bot.api.sendLocation(
        chatId,
        ticket.locationLat,
        ticket.locationLon,
      );
    }
  }

  regionsCatalog() {
    return REGIONS;
  }
}
