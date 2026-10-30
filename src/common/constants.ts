export const TICKET_STATUS = {
  NEW: 'NEW',
  IN_PROGRESS: 'IN_PROGRESS',
  RESOLVED: 'RESOLVED',
} as const;

export type TicketStatus =
  (typeof TICKET_STATUS)[keyof typeof TICKET_STATUS];

export const CATEGORIES = {
  INFRASTRUCTURE: {
    id: 'INFRASTRUCTURE',
    label: '🏢 Bino va infratuzilma',
    priority: 'NORMAL',
  },
  STAFF: {
    id: 'STAFF',
    label: '👥 Kadrlar masalasi',
    priority: 'NORMAL',
  },
  EDUCATION: {
    id: 'EDUCATION',
    label: '📚 Ta’lim jarayoni / Darsliklar',
    priority: 'NORMAL',
  },
  VIOLENCE: {
    id: 'VIOLENCE',
    label: '🛑 Zo‘ravonlik va tazyiq (Yuqori ustuvorlik)',
    priority: 'HIGH',
  },
  EMERGENCY: {
    id: 'EMERGENCY',
    label: '⚠️ Favqulodda / Boshqa holatlar',
    priority: 'HIGH',
  },
} as const;

export type CategoryId = keyof typeof CATEGORIES;

export const FSM = {
  IDLE: 'IDLE',
  REGION: 'REGION',
  DISTRICT: 'DISTRICT',
  INSTITUTION: 'INSTITUTION',
  LOCATION: 'LOCATION',
  CATEGORY: 'CATEGORY',
  TEXT: 'TEXT',
  MEDIA: 'MEDIA',
  PHONE: 'PHONE',
  CONFIRM: 'CONFIRM',
  WAIT_RESOLUTION: 'WAIT_RESOLUTION',
  ADMIN_CURATOR_ID: 'ADMIN_CURATOR_ID',
  ADMIN_CURATOR_FIO: 'ADMIN_CURATOR_FIO',
  ADMIN_CURATOR_REGIONS: 'ADMIN_CURATOR_REGIONS',
} as const;

export type FsmStep = (typeof FSM)[keyof typeof FSM];
