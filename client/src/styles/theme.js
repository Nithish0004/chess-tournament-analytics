/**
 * Chess Magic Design System Tokens
 * Reference: Chess_Magic_Tournament_Dashboard_Montage.png
 */

export const theme = {
  colors: {
    bg: {
      page: '#0f0f10',
      surface: '#161617',
      elevated: '#1c1c1e',
      card: '#161617',
      inset: '#121213',
      input: '#1a1a1c',
      inputHover: '#202023',
    },
    border: {
      subtle: '#262628',
      divider: '#202022',
      light: '#2e2e30',
      active: '#3a3a3d',
      gold: 'rgba(198, 161, 91, 0.4)',
    },
    accent: {
      gold: '#C6A15B',
      goldLight: '#DFB86C',
      goldDark: '#A4823E',
      goldMuted: 'rgba(198, 161, 91, 0.15)',
    },
    text: {
      primary: '#F5F5F5',
      secondary: '#A1A1AA',
      muted: '#71717A',
      disabled: '#52525B',
      white: '#FFFFFF',
      gold: '#C6A15B',
    },
    status: {
      success: '#10B981',
      warning: '#F59E0B',
      error: '#EF4444',
      info: '#3B82F6',
    }
  },
  typography: {
    heading: 'font-condensed uppercase tracking-wider font-bold',
    headingDisplay: 'font-condensed uppercase tracking-tight font-black',
    body: 'font-sans antialiased text-[#F5F5F5]',
    mono: 'font-mono text-xs',
  },
  borderRadius: {
    card: 'rounded-2xl sm:rounded-3xl',
    panel: 'rounded-2xl',
    button: 'rounded-xl',
    input: 'rounded-xl',
    badge: 'rounded-full',
  },
  shadows: {
    subtle: 'shadow-[0_4px_20px_rgba(0,0,0,0.5)]',
    elevated: 'shadow-[0_10px_30px_rgba(0,0,0,0.7)]',
    modal: 'shadow-[0_25px_60px_rgba(0,0,0,0.9)]',
    spotlight: 'radial-gradient(circle at center, rgba(198,161,91,0.12) 0%, transparent 70%)',
  }
};

export default theme;
