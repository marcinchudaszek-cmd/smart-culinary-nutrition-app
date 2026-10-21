/// <reference types="vite/client" />

// Wersja z build.gradle, wstrzykiwana przez `define` w vite.config.ts.
declare const __APP_VERSION__: string;

// Wczytywanie assetów jako URL (np. worker pdf.js): import x from '...?url'
declare module '*?url' {
  const src: string;
  export default src;
}
