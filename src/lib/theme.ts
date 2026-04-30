// src/lib/theme.ts

export const colors = {
  primary: '#0d7de0',
  primaryDark: '#0a5fb8',
  primaryLight: '#eef6ff',
  background: '#f6f8fb',
  card: '#ffffff',
  border: 'rgba(20,30,40,0.12)',
  text: '#1a1a1a',
  textMuted: '#6b7280',
  textWeak: '#9ca3af',
  danger: '#dc2626',
  dangerLight: '#fee2e2',
  success: '#16a34a',
  successLight: '#d1fae5',
  warning: '#f59e0b',
  warningLight: '#fffbeb',
  info: '#0d7de0',
  infoLight: '#dbeafe',
  white: '#ffffff',
  black: '#000000',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const radius = {
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  full: 999,
};

export const fontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 24,
};

export const shadow = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
};
