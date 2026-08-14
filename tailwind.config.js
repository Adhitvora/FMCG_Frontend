/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  important: '#root',
  corePlugins: {
    preflight: false, // Disable Tailwind's reset so MUI styles work correctly
  },
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0D1B2A',
          50: '#1B3A5C',
          100: '#183350',
          200: '#152C44',
          300: '#122538',
          400: '#0F1E2C',
          500: '#0D1B2A',
          600: '#0A1520',
          700: '#070F16',
          800: '#04090C',
          900: '#010302',
        },
        secondary: {
          DEFAULT: '#C8A95B',
          50: '#F5EFD9',
          100: '#F0E7C8',
          200: '#E5D8A6',
          300: '#DBC984',
          400: '#D1B96F',
          500: '#C8A95B',
          600: '#B5933D',
          700: '#8D7230',
          800: '#655223',
          900: '#3E3215',
        },
        accent: '#1F4E79',
        background: '#F7F8FA',
        surface: '#FFFFFF',
      },
      fontFamily: {
        sans: ['Inter', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
