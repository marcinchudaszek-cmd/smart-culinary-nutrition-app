import puppeteer from 'puppeteer-core';
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = __dirname;

const browser = await puppeteer.launch({
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
await page.goto('http://localhost:5173', { waitUntil: 'networkidle2' });
await new Promise(r => setTimeout(r, 1500));

// 1. Główna
await page.screenshot({ path: join(OUT, 'screenshot-1-home.png'), fullPage: false });
console.log('screenshot-1-home.png');

// 2. Kalorie (kliknij Kalorie w nav)
await page.evaluate(() => {
  const btns = [...document.querySelectorAll('nav button')];
  btns.find(b => b.textContent.includes('Kalorie'))?.click();
});
await new Promise(r => setTimeout(r, 800));
await page.screenshot({ path: join(OUT, 'screenshot-2-calories.png') });
console.log('screenshot-2-calories.png');

// 3. Historia
await page.evaluate(() => {
  const btns = [...document.querySelectorAll('button')];
  btns.find(b => b.textContent.includes('Historia'))?.click();
});
await new Promise(r => setTimeout(r, 500));
await page.screenshot({ path: join(OUT, 'screenshot-3-history.png') });
console.log('screenshot-3-history.png');

// 4. AI Kuchnia - Skaner
await page.evaluate(() => {
  const btns = [...document.querySelectorAll('nav button')];
  btns.find(b => b.textContent.includes('Skaner'))?.click();
});
await new Promise(r => setTimeout(r, 800));
await page.screenshot({ path: join(OUT, 'screenshot-4-scanner.png') });
console.log('screenshot-4-scanner.png');

// 5. AI Kuchnia - Kod EAN
await page.evaluate(() => {
  const btns = [...document.querySelectorAll('button')];
  btns.find(b => b.textContent.includes('Kod EAN'))?.click();
});
await new Promise(r => setTimeout(r, 500));
await page.screenshot({ path: join(OUT, 'screenshot-5-barcode.png') });
console.log('screenshot-5-barcode.png');

// 6. Moje przepisy
await page.evaluate(() => {
  const btns = [...document.querySelectorAll('nav button')];
  btns.find(b => b.textContent.includes('Moje'))?.click();
});
await new Promise(r => setTimeout(r, 800));
await page.screenshot({ path: join(OUT, 'screenshot-6-recipes.png') });
console.log('screenshot-6-recipes.png');

await browser.close();
console.log('Done! All screenshots saved.');
