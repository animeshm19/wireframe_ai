// Lists interactive elements under 40 px on a 390 px screen (the audit's touch-target rule).
import { chromium } from 'playwright';
const BASE = process.env.BASE || 'http://localhost:5173';
const routes = process.argv.slice(2).length ? process.argv.slice(2) : ['/'];
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
for (const r of routes) {
  await p.goto(BASE + r, { waitUntil: 'networkidle' }).catch(() => {});
  await p.waitForTimeout(1500);
  const out = await p.evaluate(() => [...document.querySelectorAll('a,button,input,select,textarea')]
    .map(e => { const b = e.getBoundingClientRect(); return { b, e }; })
    .filter(({ b }) => b.width > 0 && (b.height < 40 || b.width < 40))
    .map(({ b, e }) => `${e.tagName.toLowerCase()} ${Math.round(b.width)}x${Math.round(b.height)} "${(e.innerText || e.getAttribute('aria-label') || e.id || e.type || '').slice(0, 40).replace(/\n/g, ' ')}"`));
  console.log(r, out.length); out.forEach(l => console.log('  ' + l));
}
await b.close();
