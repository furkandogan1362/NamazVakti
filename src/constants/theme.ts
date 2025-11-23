export const COLORS = {
  dark: {
    background: ['#0F172A', '#1E1B4B', '#312E81'], // Deep Night Blue -> Indigo
    card: 'rgba(30, 41, 59, 0.7)',
    cardBorder: 'rgba(148, 163, 184, 0.1)',
    text: '#F8FAFC',
    secondaryText: '#CBD5E1', // Lighter for better readability in dark mode
    accent: '#A5B4FC', // Lighter Indigo for better contrast
    highlight: '#D8B4FE', // Lighter Purple
    success: '#34D399', // Brighter Emerald
    error: '#F87171',
    glass: 'rgba(15, 23, 42, 0.6)',
    icon: '#F1F5F9', // Brighter icon color
    shadow: '#000000',
  },
  light: {
    background: ['#D0E8FC', '#C8DDFE', '#E0EDFF'], // Slightly darker/softer blues to reduce glare
    card: 'rgba(255, 255, 255, 0.55)', // Reduced opacity
    cardBorder: 'rgba(255, 255, 255, 0.4)',
    text: '#1E293B',
    secondaryText: '#475569', // Darker for better contrast
    accent: '#3B82F6', // Blue 500
    highlight: '#8B5CF6', // Violet 500
    success: '#10B981',
    error: '#EF4444',
    glass: 'rgba(255, 255, 255, 0.6)', // Reduced opacity
    icon: '#334155',
    shadow: '#94A3B8',
  },
};

export const SPACING = {
  xs: 4,
  s: 8,
  m: 16,
  l: 24,
  xl: 32,
  xxl: 48,
};

export const RADIUS = {
  s: 8,
  m: 16,
  l: 24,
  xl: 32,
  round: 9999,
};

export const FONTS = {
  regular: 'System',
  medium: 'System',
  bold: 'System',
  // Custom fonts can be added here if installed
};
