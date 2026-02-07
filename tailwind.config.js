/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: '#5A67D8',
                'primary-light': '#7F9CF5',
                secondary: '#ED8936',
                accent: '#38B2AC',
                background: '#EDF2F7',
                surface: '#FFFFFF',
            },
            fontFamily: {
                outfit: ['Outfit', 'sans-serif'],
            },
            animation: {
                'bounce-slow': 'bounce 3s infinite',
            }
        },
    },
    plugins: [],
}
