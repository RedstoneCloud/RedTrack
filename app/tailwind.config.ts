import type { Config } from "tailwindcss";
const {heroui} = require("@heroui/theme");

let colors = {
  'text': {
    50: '#f3f2f2',
    100: '#e6e5e5',
    200: '#cecaca',
    300: '#b5b0b0',
    400: '#9c9696',
    500: '#837c7c',
    600: '#696363',
    700: '#4f4a4a',
    800: '#353131',
    900: '#1a1919',
    950: '#0d0c0c',
  },
  'background': {
    50: '#f2f2f2',
    100: '#e6e6e6',
    200: '#cccccc',
    300: '#b3b3b3',
    400: '#999999',
    500: '#808080',
    600: '#666666',
    700: '#4d4d4d',
    800: '#333333',
    900: '#1a1a1a',
    950: '#0d0d0d',
  },
  'primary': {
    50: '#f1faea',
    100: '#e4f5d6',
    200: '#c9ecac',
    300: '#aee283',
    400: '#93d85a',
    500: '#78cf30',
    600: '#60a527',
    700: '#487c1d',
    800: '#305313',
    900: '#18290a',
    950: '#0c1505',
  },
  'secondary': {
    50: '#f7f0ed',
    100: '#efe0dc',
    200: '#dfc1b9',
    300: '#d0a295',
    400: '#c08372',
    500: '#b0644f',
    600: '#8d503f',
    700: '#6a3c2f',
    800: '#462820',
    900: '#231410',
    950: '#120a08',
  },
  'accent': {
    50: '#f1faeb',
    100: '#e3f5d6',
    200: '#c8eaae',
    300: '#ace085',
    400: '#91d55d',
    500: '#75cb34',
    600: '#5ea22a',
    700: '#467a1f',
    800: '#2f5115',
    900: '#17290a',
    950: '#0c1405',
  },
}

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './node_modules/@heroui/theme/dist/components/(*).js'
  ],
  theme: {
  	extend: {
  		colors: {},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		}
  	}
  },
  darkMode: ["class", 'class'],
  plugins: [heroui({
    addCommonColors: true
  }),
      require("tailwindcss-animate")
],
} satisfies Config;
