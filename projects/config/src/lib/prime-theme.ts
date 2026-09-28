import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';

export const GymPreset = definePreset(Aura, {
  semantic: {
    primary: {
      50: '{zinc.50}',
      100: '{zinc.100}',
      200: '{zinc.200}',
      300: '{zinc.300}',
      400: '{zinc.400}',
      500: '{zinc.500}',
      600: '{zinc.600}',
      700: '{zinc.700}',
      800: '{zinc.800}',
      900: '{zinc.900}',
      950: '{zinc.950}',
    },

    colorScheme: {
      light: {
        surface: {
          0: '#ffffff',
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617',
        },
      },
    },
  },

  components: {
    inputtext: {
      root: {
        borderRadius: '0.7rem',
      },
    },

    button: {
      root: {
        borderRadius: '0.7rem',
      },
    },

    message: {
      root: {
        borderRadius: '0.7rem',
      },
    },
  },
});
