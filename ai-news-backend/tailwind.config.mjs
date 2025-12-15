/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-satoshi)', 'sans-serif'], // Connects to your custom font
      },
      colors: {
        // You can add custom brand colors here if needed
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'), // 👈 CRITICAL: Enables 'prose' classes
  ],
};