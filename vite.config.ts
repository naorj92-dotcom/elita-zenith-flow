import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    mode === "production" &&
      VitePWA({
        registerType: "autoUpdate",
        devOptions: { enabled: false },
        manifest: {
          name: "Elita Medical Spa",
          short_name: "Elita",
          start_url: "/dashboard",
          display: "standalone",
          background_color: "#FAF7F2",
          theme_color: "#3B2A1E",
          icons: [
            { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
            { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" },
          ],
        },
        workbox: {
          navigateFallbackDenylist: [/^\/~oauth/],
          globPatterns: ["**/*.{js,css,html,ico,png,svg,woff,woff2}"],
          runtimeCaching: [
            {
              // Cache Supabase API calls for appointments (today's schedule)
              urlPattern: /\/rest\/v1\/appointments/,
              handler: "NetworkFirst",
              options: {
                cacheName: "elita-appointments",
                expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 }, // 1 hour
                networkTimeoutSeconds: 5,
              },
            },
            {
              // Cache client list
              urlPattern: /\/rest\/v1\/clients/,
              handler: "NetworkFirst",
              options: {
                cacheName: "elita-clients",
                expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 4 }, // 4 hours
                networkTimeoutSeconds: 5,
              },
            },
            {
              // Cache services, staff, rooms
              urlPattern: /\/rest\/v1\/(services|staff|rooms)/,
              handler: "StaleWhileRevalidate",
              options: {
                cacheName: "elita-reference-data",
                expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 }, // 24 hours
              },
            },
            {
              // Cache Google Fonts
              urlPattern: /^https:\/\/fonts\.googleapis\.com/,
              handler: "StaleWhileRevalidate",
              options: {
                cacheName: "google-fonts-stylesheets",
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com/,
              handler: "CacheFirst",
              options: {
                cacheName: "google-fonts-webfonts",
                expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
              },
            },
          ],
        },
      }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
