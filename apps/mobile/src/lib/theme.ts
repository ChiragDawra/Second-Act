import type { AppRole } from './types';

/**
 * Design tokens carried over from the landing page (frontend/tailwind.config.js):
 * deep ink navy, restrained SAP blue, muted amber for gaps, Plus Jakarta Sans
 * for text and JetBrains Mono for data labels.
 */
export const colors = {
  bg: '#FAFBFD',
  card: '#FFFFFF',
  border: 'rgba(15, 23, 42, 0.10)',
  ink950: '#0A1128',
  ink900: '#0F172A',
  ink700: '#334155',
  ink600: '#475569',
  ink500: '#64748B',
  ink400: '#94A3B8',
  ink200: '#E2E8F0',
  ink100: '#F1F5F9',
  ink50: '#F8FAFC',
  sap: '#0064D9',
  sapDark: '#0052B4',
  sap50: '#EFF6FF',
  sap100: '#DBEAFE',
  sap200: '#BFDBFE',
  sap800: '#1E40AF',
  amber: '#D97706',
  amber50: '#FFFBEB',
  amber200: '#FDE68A',
  amber800: '#92400E',
  green: '#047857',
  green50: '#ECFDF5',
  green200: '#A7F3D0',
  red: '#B91C1C',
  red50: '#FEF2F2',
  red200: '#FECACA',
  violet: '#6D28D9',
  violet50: '#F5F3FF',
  violet200: '#DDD6FE',
  white: '#FFFFFF',
};

export const fonts = {
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semibold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
  extrabold: 'PlusJakartaSans_800ExtraBold',
  mono: 'JetBrainsMono_500Medium',
};

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
export const radius = { sm: 8, md: 12, lg: 16, pill: 999 };

/** Each account type gets its own unmistakable colour so the audience always knows who is signed in. */
export const roleTheme: Record<AppRole, { label: string; color: string; tint: string; border: string }> = {
  worker: { label: 'Worker', color: colors.sap, tint: colors.sap50, border: colors.sap200 },
  mentor: { label: 'Mentor', color: colors.green, tint: colors.green50, border: colors.green200 },
  recruiter: { label: 'Recruiter', color: colors.violet, tint: colors.violet50, border: colors.violet200 },
  admin: { label: 'Administrator', color: colors.ink900, tint: colors.ink100, border: colors.ink200 },
};

export const PROFICIENCY_LABELS = ['None', 'Aware', 'Practiced', 'Independent', 'Expert'];
