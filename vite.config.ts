import { defineConfig } from "vite";
import { federation } from "@module-federation/vite";
import vue from "@vitejs/plugin-vue";
import vueDevTools from "vite-plugin-vue-devtools";

// 3031–3033, 3035, 3039, 3041 and 3043 are taken by the other micro-frontends
// and the portals; strictPort turns a collision into a hard failure rather than
// a silent move to a port the portal's route-manifest does not point at.
const SERVER = {
  port: 3034,
  strictPort: true,
  cors: true,
  headers: {
    "Access-Control-Allow-Origin": "*",
  },
};

export default defineConfig({
  plugins: [
    federation({
      // Unique per remote: the portal addresses remotes by scope, and two
      // remotes sharing one overwrite each other in its container.
      name: "kommuniceringApp",
      filename: "remoteEntry.js",
      exposes: {
        "./Kommunicering": "./src/components/Kommunicering.vue",
      },
      // No requiredVersion: the ranges belong in package.json, and a second
      // copy here drifts on every Renovate bump and breaks the singleton dedup.
      shared: {
        vue: { singleton: true },
        "@fkui/vue": { singleton: true },
        // @fkui/logic holds ValidationService, the registry the portal's
        // ValidationPlugin fills. A second copy validates against nothing.
        "@fkui/logic": { singleton: true },
        // Shared so the remote sees the portal's handlaggareStore, which is
        // where the bearer token for POST /api/task/done comes from.
        pinia: { singleton: true },
      },
      manifest: true,
      publicPath: "auto",
      dts: false,
    }),
    vue(),
    vueDevTools(),
  ],
  preview: SERVER,
  server: {
    ...SERVER,
    // With VITE_BFF_URL unset the app fetches relative "/api/..." paths, which
    // this proxy forwards to the BFF — same origin, so no CORS setup needed.
    proxy: {
      "/api": {
        target: "http://localhost:9009",
        changeOrigin: true,
      },
    },
  },
  base: "./",
  build: {
    target: "esnext",
    // Per-entry CSS, so the standalone entry's @fkui/design reset and font
    // import stay out of the remote's assets and do not restyle the host.
    cssCodeSplit: true,
    // The oversized chunk is Module Federation's fallback copy of the shared
    // @fkui/vue, which a host that provides its own never downloads.
    chunkSizeWarningLimit: 900,
  },
});
