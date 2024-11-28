import type { Config } from 'tailwindcss'
import forms from "@tailwindcss/forms";

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,vue}"
  ],
  theme: {
    extend: {},
  },
  plugins: [
    forms()
  ],
} satisfies Config

