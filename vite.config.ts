import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Numer wersji bierzemy z build.gradle (versionName) — jedno źródło prawdy,
// więc ekran Ustawień nie pokazuje już nieaktualnej wersji wpisanej ręcznie.
function readVersionName(): string {
  try {
    const gradle = fs.readFileSync(path.resolve(__dirname, "android/app/build.gradle"), "utf8");
    return gradle.match(/versionName\s+"([^"]+)"/)?.[1] ?? "?";
  } catch {
    return "?";
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: "./",
  define: {
    __APP_VERSION__: JSON.stringify(readVersionName()),
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  build: {
    outDir: "dist",
  },
});
