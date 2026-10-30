import type { SessionData } from '../schemas/session.schema.js';
import type { Ticket } from '../schemas/ticket.schema.js';

const statusUz: Record<string, string> = {
  NEW: '🆕 Yangi',
  IN_PROGRESS: '⏳ Jarayonda',
  RESOLVED: '✅ Hal etildi',
};

export function userGuide(showStartPrompt = true): string {
  return [
    'Assalomu alaykum!',
    "Ta'lim va ilf-fan vazriligining \"Hududlar faoliyatini muvofiqlashtirish boshqarmasi\"ga tezkor xabar berish tizimi, \"Jamoatchilik nazorati va tezkor xabar berish\" botiga xush kelibsiz.",
    'Bot orqali ta’lim muassasalaridagi muammo va holatlar haqida mas’ullarga xabar yuborishingiz mumkin.',
    '',
    '📝 Xabar yuborish tartibi:',
    '1. Hududni tanlang.',
    '2. Tuman/shaharni tanlang.',
    '3. Ta’lim muassasasi nomi yoki raqamini kiriting.',
    '4. Muammo joylashuvini yuboring yoki «O‘tkazib yuborish»ni tanlang. Joylashuv (geolokatsiya) ni yuborish ixtiyoriy.',
    '5. Muammo toifasini tanlang: Bino va infratuzilma, kadrlar masalasi, ta’lim jarayoni/darsliklar, zo‘ravonlik va tazyiq yoki favqulodda/boshqa holatlar.',
    '6. Xabaringiz haqidagi holatni aniq va batafsil yozing: Nima bo‘ldi va qachon kuzatildi.',
    '7. Muammoni ko‘rsatuvchi rasm yoki video yuboring, bo\'lmaganda «Media yo‘q»ni bosing. Media ixtiyoriy.',
    '8. Qayta aloqa uchun telefon raqamingizni kontakt sifatida yuboring yoki telefon raqamingizni yuborishni xoxlamasangiz  «Anonim qolish»ni tanlang.',
    '9. Xabar haqidagi ma’lumotlarni tekshirib, «Yuborish»ni bosing. Yuborishdan oldin «Bekor qilish» orqali jarayonni to‘xtatishingiz mumkin.',
    '',
    '📌  Yuborilgach, xabar raqami beriladi. Holatini /my orqali tekshiring',
    '• Yangi — Xabaringiz qabul qilindi.',
    '• Jarayonda — mas’ul xodim xabaringizni o‘rganmoqda.',
    '• Hal etildi — ko‘rib chiqish natijasi yuborildi.',
    '',
    'Buyruqlar:',
    '/start —  xabar yuborishni boshlash',
    '/my —  xabarlaringiz holatini ko‘rish',
    '/cancel — joriy jarayonni bekor qilish',
    '/help — ushbu qo‘llanmani ko‘rish',
    ...(showStartPrompt
      ? ['', 'Xabar yuborishni boshlash uchun pastdagi tugmani bosing.']
      : []),
  ].join('\n');
}

export function locationHint(): string {
  return [
    '📍 Muammo kuzatilayotgan joyning geolokatsiyasini yubora olasizmi?',
    '',
    'Eslatma: Agar siz hozir aynan holat ro‘y berayotgan joyda bo‘lsangiz, geolokatsiyani yuborishingiz bizga ob’yektni xaritadan aniq topishga va muammoni juda tez bartaraf etishga katta yordam beradi.',
    '',
    'Agar siz boshqa joyda bo‘lsangiz yoki manzilni yuborishni istamasangiz, xavotir olmang — pastdagi “➡️ O‘tkazib yuborish” tugmasini bosishingiz mumkin.',
  ].join('\n');
}

export function draftCard(s: SessionData): string {
  const geo =
    s.locationLat && s.locationLon
      ? `${s.locationLat.toFixed(5)}, ${s.locationLon.toFixed(5)}`
      : 'o‘tkazib yuborilgan';
  const contact = s.isAnonymous
    ? 'anonim'
    : (s.phoneNumber ?? 'ko‘rsatilmagan');
  return [
    '📋 Tezkor xabar loyihasi',
    `🏛 Hudud: ${s.regionName}`,
    `🏙 Tuman: ${s.district}`,
    `🏫 Ta’lim muassasasi: ${s.institutionName ?? '—'}`,
    `📂 Toifa: ${s.categoryLabel}`,
    `📝 Matn: ${s.contentText}`,
    `📍 Geolokatsiya: ${geo}`,
    ...(s.mediaFileId ? [] : ['🖼 Media: yo‘q']),
    `📞 Aloqa: ${contact}`,
    '',
    'Ko‘rsatilgan xabar manzillarini  to‘g‘ri kiritgan bo‘lsangiz, pastdagi "Yuborish" tugmasini bosing?',
  ].join('\n');
}

export function ticketCard(ticket: Ticket, forStaff: boolean): string {
  const lines = [
    ticket.priority === 'HIGH' ? '⚠️ YUQORI USTUVORLIK' : '',
    `${statusUz[ticket.status] ?? ticket.status}  ${ticket.ticketId}`,
    `🏛 ${ticket.region}`,
    `🏙 ${ticket.district}`,
    `🏫 Ta’lim muassasasi: ${ticket.institutionName ?? '—'}`,
    `📂 ${ticket.categoryLabel}`,
    `📝 ${ticket.contentText}`,
  ].filter(Boolean);
  if (ticket.locationLat && ticket.locationLon) {
    lines.push(`📍 ${ticket.locationLat}, ${ticket.locationLon}`);
  }
  if (forStaff) {
    if (ticket.isAnonymous) {
      lines.push('👤 Murojaatchi: Anonim (ticket_id bilan yuritiladi)');
    } else {
      const uname = ticket.reporterUsername
        ? `@${ticket.reporterUsername}`
        : '';
      lines.push(
        `👤 ${ticket.reporterName ?? 'Foydalanuvchi'} ${uname}`.trim(),
      );
      if (ticket.phoneNumber) {
        lines.push(`📞 ${ticket.phoneNumber}`);
      }
    }
  }
  return lines.join('\n');
}

export function userStatusLine(ticket: Ticket): string {
  return `${ticket.ticketId} — ${statusUz[ticket.status] ?? ticket.status}`;
}
