/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        dark: '#212224',
        white: '#F8FCFF',
        primary: '#ffffff',
        error: '#ef4444',
      },
    },
  },
  plugins: [],
};
