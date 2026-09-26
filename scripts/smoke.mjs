// Quick render check used while editing: console errors and a screenshot per route.
import { chromium } from 'playwright';
const BASE = process.env.BASE || 'http://localhost:5173';
const routes = process.argv.slice(2).length ? process.argv.slice(2) : ['/'];
const [w, h] = (process.env.VP || '1440x900').split('x').map(Number);
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: w, height: h }, isMobile: w < 768, hasTouch: w < 768 });
const logs = [];
p.on('console', m => { if (['error','warning'].includes(m.type())) logs.push(`${m.type()}: ${m.text().slice(0, 300)}`); });
p.on('pageerror', e => logs.push('pageerror: ' + e.message));
for (const r of routes) {
  logs.length = 0;
  await p.goto(BASE + r, { waitUntil: 'networkidle' }).catch(() => {});
  await p.waitForTimeout(2500);
  const H = await p.evaluate(() => document.documentElement.scrollHeight);
  const slug = (r === '/' ? 'home' : r.replace(/\W+/g, '-').replace(/^-|-$/g, ''));
  if (process.env.FULL) await p.screenshot({ path: `/tmp/smoke-${slug}-${w}.png`, fullPage: true });
  else await p.screenshot({ path: `/tmp/smoke-${slug}-${w}.png` });
  console.log(r, 'height', H, 'title', await p.title());
  console.log(logs.filter(l => !/GL Driver|swiftshader|GroupMarkerNotSet|React DevTools|\[vite\]/i.test(l)).join('\n'));
}
await b.close();
