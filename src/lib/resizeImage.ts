// Zmniejsza zdjęcie (data URL) do zadanego dłuższego boku i zapisuje jako JPEG.
// Zdjęcie z aparatu telefonu ma kilka MB — w localStorage zjadało cały limit,
// a wysyłane do AI było wolne i bywało odrzucane przez Groq/OpenRouter (limit ~4 MB).
// Przy błędzie dekodowania zwraca oryginał, żeby nie blokować użytkownika.
export function resizeDataUrl(dataUrl: string, maxSide = 1280, quality = 0.82): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve(dataUrl); return; }
      // Białe tło — przezroczysty PNG po konwersji do JPEG nie zrobi się czarny.
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      try {
        resolve(canvas.toDataURL('image/jpeg', quality));
      } catch {
        resolve(dataUrl);
      }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

/** Wczytuje plik z <input type="file"> jako zmniejszony data URL. */
export function readFileResized(file: File, maxSide = 1280, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resizeDataUrl(reader.result as string, maxSide, quality).then(resolve);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
