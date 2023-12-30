/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{html,ts}"],
  theme: {
    extend: {
      keyframes: {
        slideIn: {
          '0%': { transform: 'translateX(-100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        slideOut: {
          '0%': { transform: 'translateX(100%)', opacity: '0' }, // Módosítás: translateX(100%)
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        prominence: {
          '0%': { transform: 'translate(0%)', opacity: '0' },
          '100%': { transform: 'translate(100)', opacity: '1' },
        },
      },
      animation: {
        slideIn: 'slideIn 1s ease-in-out',
        slideOut: 'slideOut 1s ease-in-out', // Módosítás: slideOut
        prominence: 'prominence 1.5s ease-in-out', // Módosítás: slideOut
        // További animációk hozzárendelése itt
      },
    },
  },
  plugins: [],
};
