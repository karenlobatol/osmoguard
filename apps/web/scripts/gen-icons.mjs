// Genera los iconos PNG de la PWA y Android a partir del logotipo SVG (usa Chromium de Playwright).
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";

const mark = (pad) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="${pad ? 0 : 14}" fill="#0B4F83"/>
  <g transform="${pad ? "translate(12.8 12.8) scale(0.6)" : ""}">
    <path d="M32 12c-7 9-14 17.5-14 25a14 14 0 0 0 28 0c0-7.5-7-16-14-25z" fill="#EAF4FA"/>
    <path d="M24 38h5l2.5-5 4 9 2.5-4h2" fill="none" stroke="#0D9488" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
  </g></svg>`;

const out = process.argv[2] ?? "public";
mkdirSync(`${out}/icons`, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage();
const render = async (svg, size, file, transparent = true) => {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<html><body style="margin:0;background:transparent">${svg.replace("<svg ", `<svg width="${size}" height="${size}" `)}</body></html>`);
  await page.screenshot({ path: file, omitBackground: transparent });
};
await render(mark(false), 192, `${out}/icons/icon-192.png`);
await render(mark(false), 512, `${out}/icons/icon-512.png`);
await render(mark(true), 512, `${out}/icons/icon-maskable-512.png`, false);
await render(mark(true), 180, `${out}/apple-touch-icon.png`, false);
await render(mark(true), 1024, `${out}/icons/icon-1024.png`, false);
await browser.close();
console.log("iconos generados");
