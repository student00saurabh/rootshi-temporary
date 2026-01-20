/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class", // Add this line
  content: ["./views/**/*.ejs", "./public/**/*.js"],
  theme: {
    extend: {
      colors: {
        "shield-blue": "#1000FF",
        "shield-red": "#FF3232",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
