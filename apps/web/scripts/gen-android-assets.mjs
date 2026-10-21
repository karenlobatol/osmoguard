// Sustituye iconos adaptativos y splash de Android por la identidad de Osmoguard.
import { chromium } from "@playwright/test";
import { readFileSync, readdirSync, existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const res = "android/app/src/main/res";
const size = (f) => { const b = readFileSync(f); return [b.readUInt32BE(16), b.readUInt32BE(20)]; };
const drop = `<path d="M32 12c-7 9-14 17.5-14 25a14 14 0 0 0 28 0c0-7.5-7-16-14-25z" fill="#EAF4FA"/>
  <path d="M24 38h5l2.5-5 4 9 2.5-4h2" fill="none" stroke="#0D9488" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`;
const svg = {
  legacy: (round) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="${round ? 32 : 14}" fill="#0B4F83"/>${drop}</svg>`,
  // Zona segura del icono adaptativo: 66/108 del lienzo.
  foreground: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 108 108"><g transform="translate(22 22)">${drop}</g></svg>`,
};
const splash = (w, h) => `<div style="width:${w}px;height:${h}px;background:#0B4F83;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:${Math.round(Math.min(w,h)*0.04)}px;font-family:'Inter','DejaVu Sans',sans-serif">
  <svg width="${Math.round(Math.min(w, h) * 0.28)}" height="${Math.round(Math.min(w, h) * 0.28)}" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#103B5C"/>${drop}</svg>
  <div style="color:#fff;font-size:${Math.round(Math.min(w, h) * 0.075)}px;font-weight:600;letter-spacing:-0.5px">Osmoguard</div>
  <div style="color:#A9CFE8;font-size:${Math.round(Math.min(w, h) * 0.032)}px;letter-spacing:2px;text-transform:uppercase">Simulador educativo</div></div>`;

const browser = await chromium.launch();
const page = await browser.newPage();
const shot = async (html, w, h, file, transparent) => {
  await page.setViewportSize({ width: w, height: h });
  await page.setContent(`<html><body style="margin:0;background:transparent">${html}</body></html>`);
  await page.screenshot({ path: file, omitBackground: transparent });
};
const sized = (s, w, h) => s.replace("<svg ", `<svg width="${w}" height="${h}" `);
for (const dir of readdirSync(res)) {
  for (const name of ["ic_launcher.png", "ic_launcher_round.png", "ic_launcher_foreground.png", "splash.png"]) {
    const f = join(res, dir, name);
    if (!existsSync(f)) continue;
    const [w, h] = size(f);
    if (name === "splash.png") await shot(splash(w, h), w, h, f, false);
    else if (name === "ic_launcher_foreground.png") await shot(sized(svg.foreground, w, h), w, h, f, true);
    else await shot(sized(svg.legacy(name.includes("round")), w, h), w, h, f, true);
  }
}
writeFileSync(join(res, "values/ic_launcher_background.xml"), `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#0B4F83</color>\n</resources>\n`);
await browser.close();
console.log("recursos Android generados");
