// tailwind.config.js

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    // Ensure all source files are included here
    "./src/**/*.{js,jsx,ts,tsx}", 
    // ...
  ],
  theme: {
    extend: {},
  },
  plugins: [
    // ------------------------------------
    require('tailwindcss-animate'), // <--- ADD THIS LINE
    // ------------------------------------
  ],
}