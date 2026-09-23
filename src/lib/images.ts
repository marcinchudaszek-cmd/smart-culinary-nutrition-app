import type { SyntheticEvent } from 'react';

// Awaryjny obrazek przepisu jako inline SVG (data URI) — zawsze się wyświetli,
// nawet bez internetu. Zdjęcia przepisów pochodzą z zewnętrznego CDN (Unsplash),
// który czasem usuwa lub zmienia zdjęcia; ten fallback chroni przed "dziurami".
export const RECIPE_FALLBACK =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300">` +
      `<rect width="100%" height="100%" fill="#fed7aa"/>` +
      `<text x="50%" y="50%" font-size="120" text-anchor="middle" dominant-baseline="central">🍳</text>` +
    `</svg>`
  );

// Handler onError dla <img>: podmienia zepsute źródło na fallback (raz, bez pętli).
export function onImgError(e: SyntheticEvent<HTMLImageElement>) {
  const img = e.currentTarget;
  if (img.src !== RECIPE_FALLBACK) {
    img.src = RECIPE_FALLBACK;
  }
}
