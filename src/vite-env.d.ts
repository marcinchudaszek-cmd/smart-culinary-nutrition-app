/// <reference types="vite/client" />

// Wczytywanie assetów jako URL (np. worker pdf.js): import x from '...?url'
declare module '*?url' {
  const src: string;
  export default src;
}
