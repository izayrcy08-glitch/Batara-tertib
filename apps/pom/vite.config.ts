import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import { VitePWA } from "vite-plugin-pwa"
import path from "path"

export default defineConfig(({ mode }) => ({
  base: mode === "production" ? "/pom/" : "/",
  envDir: "../../",
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico"],
      manifest: {
        name: "Batara Tertib — Petugas SPBU",
        short_name: "Batara Tertib",
        description: "Aplikasi petugas SPBU Batara Tertib",
        theme_color: "#0F3D2E",
        background_color: "#161814",
        display: "standalone",
        start_url: mode === "production" ? "/pom/" : "/",
        scope: mode === "production" ? "/pom/" : "/",
        icons: [
          {
            src: mode === "production" ? "/pom/pwa-192.png" : "/pwa-192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: mode === "production" ? "/pom/pwa-512.png" : "/pwa-512.png",
            sizes: "512x512",
            type: "image/png",
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@batara/ui": path.resolve(__dirname, "../../packages/ui/src"),
      "@batara/tokens": path.resolve(__dirname, "../../packages/tokens"),
    },
  },
}))
