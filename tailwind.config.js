/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: 'class',
    content: ["./src/**/*.{html,ts}"],
    theme: {
        extend: {
            keyframes: {
                floatX: {
                    '0%, 100%': { transform: 'translateX(-10px)' },
                    '50%': { transform: 'translateX(10px)' },
                },
                slideIn: {
                    '0%': {transform: 'translateX(-100%)', opacity: '0'},
                    '100%': {transform: 'translateX(0)', opacity: '1'},
                },
                slideOut: {
                    '0%': {transform: 'translateX(50%)', opacity: '0'},
                    '100%': {transform: 'translateX(0)', opacity: '1'},
                },
                prominence: {
                    '0%': {transform: 'translate(0%)', opacity: '0'},
                    '100%': {transform: 'translate(100)', opacity: '1'},
                },
                fadeOut: {
                    'from': {opacity: '1'},
                    'to': {opacity: '0'},
                },
                slideInLeft: {
                    '0%': {transform: 'translateX(-100%)', opacity: '0'},
                    '100%': {transform: 'translateX(0)', opacity: '1'},
                },
                slideOutRight: {
                    'from': {transform: 'translateX(0)', opacity: '1'},
                    'to': {transform: 'translateX(100%)', opacity: '0'},
                },
                slideDown: {
                    '0%': {transform: 'translateY(-100%)', opacity: '0'},
                    '100%': {transform: 'translateY(0)', opacity: '1'},
                },
                slideUp: {
                    'from': {transform: 'translateY(0)', opacity: '1'},
                    'to': {transform: 'translateY(-100%)', opacity: '0'},
                },
                slideDownTextPoll: {
                    '0%': { opacity: '0', transform: 'translateY(-20px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },

            },
            animation: {
                floatX: 'floatX 1.5s ease-in-out infinite',
                slideDownTextPoll: 'slideDown 0.7s ease-out forwards',
                fadeIn: 'fadeIn 0.7s ease-out forwards',
                slideIn: 'slideIn 1s ease-in-out',
                slideOut: 'slideOut 1s ease-in-out',
                prominence: 'prominence 1.5s ease-in-out',
                fadeOut: 'fadeOut 1s ease-in-out forwards',
                slideInLeft: 'slideInLeft 1s ease-in-out forwards',
                slideOutRight: 'slideOutRight 0.5s ease-in-out forwards',
                slideDown: 'slideDown 0.5s ease-in-out forwards',
                slideUp: 'slideUp 0.5s ease-in-out forwards',
            },
        },
    },
    plugins: [],
};
