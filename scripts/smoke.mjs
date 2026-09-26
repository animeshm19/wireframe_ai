// Quick render check used while editing: console output, page height and
// viewport-by-viewport screenshots per route. RM=1 emulates reduced motion.
import { chromium } from 'playwright';
const BASE = process.env.BASE || 'http://localhost:5173';
const routes = process.argv.slice(2).length ? process.argv.slice(2) : ['/'];
const [w, h] = (process.env.VP || '1440x900').split('x').map(Number);
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] });
const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: w < 768, hasTouch: w < 768, reducedMotion: process.env.RM ? 'reduce' : 'no-preference' });
const p = await ctx.newPage();
const logs = [];
p.on('console', m => { if (['error', 'warning'].includes(m.type())) logs.push(`${m.type()}: ${m.text().slice(0, 300)}`); });
p.on('pageerror', e => logs.push('pageerror: ' + e.message));
for (const r of routes) {
  logs.length = 0;
  await p.goto(BASE + r, { waitUntil: 'networkidle' }).catch(() => {});
  await p.waitForTimeout(2500);
  const H = await p.evaluate(() => document.documentElement.scrollHeight);
  const slug = (r === '/' ? 'home' : r.replace(/\W+/g, '-').replace(/^-|-$/g, ''));
  const n = process.env.SHOTS ? Math.min(Math.ceil(H / h), 14) : 1;
  for (let i = 0; i < n; i++) {
    await p.evaluate(y => scrollTo(0, y), i * h); await p.waitForTimeout(900);
    await p.screenshot({ path: `/tmp/shot-${slug}-${w}-${String(i).padStart(2, '0')}.png` });
  }
  console.log(r, 'height', H, 'title', await p.title());
  const app = logs.filter(l => !/GL Driver|swiftshader|GroupMarkerNotSet|React DevTools|\[vite\]/i.test(l));
  if (app.length) console.log(app.join('\n'));
}
await b.close();
