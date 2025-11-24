export const COLORS = {
  dark: {
    // Modern Professional Dark Theme (Zinc/Slate based with Sky Blue accent)
    // Neutral, high contrast, easy on the eyes.
    background: ['#09090B', '#18181B', '#27272A'], // Zinc 950 -> Zinc 900 -> Zinc 800
    card: 'rgba(63, 63, 70, 0.75)', // Zinc 700 - Lighter than Zinc 800
    cardBorder: '#6B7280', // Zinc 500
    text: '#FAFAFA', // Zinc 50
    secondaryText: '#A1A1AA', // Zinc 400
    accent: '#38BDF8', // Sky 400 - Professional Blue
    highlight: '#7DD3FC', // Sky 300
    success: '#34D399', // Emerald 400
    error: '#F87171', // Red 400
    glass: 'rgba(39, 39, 42, 0.7)', // Zinc 800 - Lighter than Zinc 900
    icon: '#E4E4E7', // Zinc 200
    shadow: '#000000',
    buttonBackground: 'rgba(56, 189, 248, 0.15)', // Subtle blue tint for buttons
  },
  light: {
    background: ['#F0F9FF', '#E0F2FE', '#BAE6FD'], // Sky 50 -> 100 -> 200
    card: 'rgba(255, 255, 255, 0.7)',
    cardBorder: '#CBD5E1',
    text: '#0F172A', // Slate 900
    secondaryText: '#475569', // Slate 600
    accent: '#0284C7', // Indigo 600 - Better contrast with Sky Blue background
    highlight: '#0EA5E9', // Indigo 500
    success: '#059669', // Emerald 600
    error: '#DC2626', // Red 600
    glass: 'rgba(255, 255, 255, 0.6)',
    icon: '#334155', // Slate 700
    shadow: '#94A3B8',
    buttonBackground: '#FFFFFF',
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
