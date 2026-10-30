import { InlineKeyboard, Keyboard } from 'grammy';
import { CATEGORIES } from '../common/constants.js';
import { REGIONS, type Region } from '../data/regions.js';

export function regionsKeyboard(): InlineKeyboard {
  const kb = new InlineKeyboard();
  REGIONS.forEach((r, i) => {
    kb.text(r.name, `reg:${r.id}`);
    if (i % 2 === 1) {
      kb.row();
    }
  });
  return kb;
}

export function startKeyboard(): Keyboard {
  return new Keyboard()
    .text('✉️ Xabar yuborishni boshlang')
    .resized()
    .oneTime();
}

export function districtsKeyboard(region: Region): InlineKeyboard {
  const kb = new InlineKeyboard();
  region.districts.forEach((name, i) => {
    kb.text(name, `dis:${region.id}:${i}`).row();
  });
  kb.text('⬅️ Viloyatga qaytish', 'back:region');
  return kb;
}

export function categoriesKeyboard(): InlineKeyboard {
  const kb = new InlineKeyboard();
  Object.values(CATEGORIES).forEach((c) => {
    kb.text(c.label, `cat:${c.id}`).row();
  });
  return kb;
}

export function locationKeyboard(): Keyboard {
  return new Keyboard()
    .requestLocation('📍 Hozirgi manzilni yuborish')
    .row()
    .text('➡️ O‘tkazib yuborish')
    .resized()
    .oneTime();
}

export function mediaKeyboard(): Keyboard {
  return new Keyboard().text('➡️ Media yo‘q').resized().oneTime();
}

export function phoneKeyboard(): Keyboard {
  return new Keyboard()
    .requestContact('📱 Raqamni yuborish')
    .row()
    .text('➡️ Anonim qolish')
    .resized()
    .oneTime();
}

export function confirmKeyboard(): Keyboard {
  return new Keyboard()
    .text('✅ Yuborish')
    .text('❌ Bekor qilish')
    .resized()
    .oneTime();
}

export function curatorTicketKeyboard(ticketId: string): InlineKeyboard {
  return new InlineKeyboard().text(
    '📥 O‘rganish uchun qabul qilish',
    `take:${ticketId}`,
  );
}

export function curatorResolveKeyboard(ticketId: string): InlineKeyboard {
  return new InlineKeyboard().text(
    '✅ Hal etildi (Natijani kiritish) va qayta aloqaga chiqish',
    `done:${ticketId}`,
  );
}

export function adminMenuKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text('📊 Statistika', 'adm:stats')
    .row()
    .text('➕ Kurator qo‘shish', 'adm:add')
    .row()
    .text('👥 Kuratorlar', 'adm:list')
    .row()
    .text('📥 Excel eksport', 'adm:xlsx');
}

export function adminRegionsKeyboard(selected: string[]): InlineKeyboard {
  const kb = new InlineKeyboard();
  REGIONS.forEach((r) => {
    const mark = selected.includes(r.name) ? '✅ ' : '';
    kb.text(`${mark}${r.name}`, `ar:${r.id}`).row();
  });
  kb.text('✅ Tayyor', 'ardone');
  return kb;
}

export function removeKb(): { reply_markup: { remove_keyboard: true } } {
  return { reply_markup: { remove_keyboard: true } };
}
