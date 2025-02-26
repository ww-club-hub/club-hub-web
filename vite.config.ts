import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    tailwindcss()
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/@firebase") || id.includes("node_modules/@trpc") || id.includes("utils.ts") || id.includes("schema.ts") || id.includes("firebase.ts") || id.includes("api.ts")) return "common";
          else if (id.includes("views/club")) return "club";
          else if (id.includes("views/OnboardAccountView.vue") || id.includes("views/CreateSchoolView.vue")) return "onboard";
          else if (id.includes("views/Privacy.vue") || id.includes("views/HomeView.vue")) return "static";
          else if (id.includes("views/AccountView.vue") || id.includes("views/LoginView.vue")) return "auth";

          return null;
        }
      }
    }
  }
})
