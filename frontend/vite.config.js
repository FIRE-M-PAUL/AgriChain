import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { nodePolyfills } from "vite-plugin-node-polyfills";

/**
 * Browser polyfills for @solana/web3.js (Buffer, process).
 * MVP data layer: Supabase (no Django /api proxy).
 */
export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      protocolImports: true,
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
    }),
  ],
  define: {
    global: "globalThis",
  },
  optimizeDeps: {
    include: ["buffer", "process"],
    esbuildOptions: {
      define: {
        global: "globalThis",
      },
    },
  },
  server: {
    port: 5170,
    allowedHosts: [".ngrok-free.dev", "localhost", "127.0.0.1"],
  },
});
