/** Default Tailwind v3 theme (same as the Play CDN it replaces); scans markup + JS templates. */
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/js/**/*.js'],
  theme: { extend: {} },
  plugins: [],
};
