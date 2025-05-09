import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite';

function getFirestoreEmulatorUrl() {
  if (process.env.CODESPACE_NAME) {
    return `["${process.env.CODESPACE_NAME}-8080.${process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}", 443]`;
  } else {
    return `["127.0.0.1", 8080]`
  }
}

function getAuthEmulatorUrl() {
  if (process.env.CODESPACE_NAME) {
    return `"https://${process.env.CODESPACE_NAME}-9099.${process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}"`;
  } else {
    return `"http://127.0.0.1:9099"`;
  }
}

function getBackendEmulatorUrl() {
  if (process.env.CODESPACE_NAME) {
    return `"https://${process.env.CODESPACE_NAME}-8788.${process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}"`;
  } else {
    return `"http://localhost:8788"`;
  }
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [
    vue({
      template: {
        compilerOptions: {
          isCustomElement(tag) {
            return tag.startsWith("drive-picker");
          }
        }
      }
    }),
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
  },
  define: {
    FIRESTORE_EMULATOR: mode === "development" ? getFirestoreEmulatorUrl() : null,
    AUTH_EMULATOR: mode === "development" ? getAuthEmulatorUrl() : null,
    BACKEND_EMULATOR: mode === "development" ? getBackendEmulatorUrl() : null,
  }
}));
