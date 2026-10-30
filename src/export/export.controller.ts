import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import ExcelJS from 'exceljs';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import type { TicketStatus } from '../common/constants.js';
import { TicketsService } from '../tickets/tickets.service.js';

@Controller('export')
@UseGuards(JwtAuthGuard)
export class ExportController {
  constructor(private readonly tickets: TicketsService) {}

  @Get('tickets.xlsx')
  async excel(
    @Res() res: Response,
    @Query('status') status?: TicketStatus,
    @Query('region') region?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const items = await this.tickets.query({ status, region, from, to });
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Murojaatlar');
    sheet.columns = [
      { header: 'Ticket ID', key: 'ticketId', width: 18 },
      { header: 'Sana', key: 'createdAt', width: 20 },
      { header: 'Viloyat', key: 'region', width: 28 },
      { header: 'Tuman', key: 'district', width: 24 },
      { header: 'Ta’lim muassasasi', key: 'institutionName', width: 32 },
      { header: 'Toifa', key: 'categoryLabel', width: 36 },
      { header: 'Status', key: 'status', width: 14 },
      { header: 'Anonim', key: 'isAnonymous', width: 10 },
      { header: 'Matn', key: 'contentText', width: 50 },
      { header: 'Natija', key: 'resolutionText', width: 40 },
    ];
    for (const t of items) {
      const view = this.tickets.sanitize(t);
      sheet.addRow({
        ticketId: view.ticketId,
        createdAt: view.createdAt
          ? new Date(view.createdAt).toISOString()
          : '',
        region: view.region,
        district: view.district,
        institutionName: view.institutionName,
        categoryLabel: view.categoryLabel,
        status: view.status,
        isAnonymous: view.isAnonymous ? 'Ha' : 'Yo‘q',
        contentText: view.contentText,
        resolutionText: view.resolutionText ?? '',
      });
    }
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="murojaatlar.xlsx"',
    );
    await workbook.xlsx.write(res);
    res.end();
  }
}
