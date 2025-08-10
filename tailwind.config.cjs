/**** Tailwind CSS Configuration ****/
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,vue}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef6ff',
          100: '#d9eaff',
          200: '#bcd9ff',
          300: '#8fc0ff',
          400: '#5b9dff',
          500: '#3e83ff',
          600: '#2d66db',
          700: '#254fb1',
          800: '#223f8c',
          900: '#203772',
        },
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
}; 