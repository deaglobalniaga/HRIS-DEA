/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#1e293b', 
        secondary: '#f1f5f9', 
        accent: '#10b981', 
      },
    },
  },
  plugins: [],
}
