// scripts/audit.mjs — rendered-text, layout and console audit for the marketing site.
import { chromium } from 'playwright';
import fs from 'node:fs';

const TAG = process.argv[2] || 'after';
const BASE = process.env.BASE || 'http://localhost:5173';
const ROUTES = ['/', '/technology', '/blog', '/about', '/changelog', '/docs', '/support', '/privacy', '/chat', '/careers', '/partners', '/this-page-does-not-exist'];
const VIEWPORTS = { d1440: [1440, 900], d1024: [1024, 768], m390: [390, 844], m320: [320, 640] };
const OUT = `audit/${TAG}`; fs.mkdirSync(OUT, { recursive: true });

const RULES = [
  ['em dash', /—/g, 1],
  ['X, not Y', /\b[\w' ]{2,40}, (not|never) (a |an |the )?[\w'-]+/gi, null],   // site-wide budget 2, summed below
  ['hype', /\b(mathematical precision|synthesi[sz]e|algebraic|micron-accurate|seamless|unlock|elevate|empower|cutting-edge|revolution|harness|leverage|robust|next-gen|game-changer|effortless|rigorous)\b/gi, 0],
  ['atelier', /\batelier\b/gi, null],                                            // site-wide budget 1
  ['emoji', /[\u{1F300}-\u{1FAFF}✅❌✔✖]/gu, 0],
  ['founder placeholder', /Animesh|EAJ Concepts/g, 0],
  ['template legal', /general template|does not constitute legal/gi, 0],
  ['mesh engine', /mesh (engine|presets|ring presets)/gi, 0],
  ['waitlist', /waiting list|secure your spot|feature activation/gi, 0],
  ['US spelling', /\bjewelry\b|\bcenter\b|\bcolor\b|\bcustomi[sz]e\b/gi, 0],       // flip if D1 = US
];

const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] });
const report = { routes: {}, siteTotals: { 'X, not Y': 0, atelier: 0 }, failures: [] };

for (const [vpName, [w, h]] of Object.entries(VIEWPORTS)) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, isMobile: w < 768, hasTouch: w < 768 });
  const p = await ctx.newPage();
  let consoleLines = [];
  p.on('console', m => { if (['error', 'warning'].includes(m.type())) consoleLines.push(`${m.type()}: ${m.text().slice(0, 160)}`); });
  p.on('pageerror', e => consoleLines.push(`pageerror: ${e.message.slice(0, 160)}`));

  for (const r of ROUTES) {
    consoleLines = [];
    await p.goto(BASE + r, { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {});
    await p.waitForTimeout(2500);
    const H = await p.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y < H; y += h / 2) { await p.evaluate(y => scrollTo(0, y), y); await p.waitForTimeout(200); }

    const checks = await p.evaluate(() => {
      const overflowX = document.documentElement.scrollWidth - innerWidth;
      const nav = document.querySelector('nav [class*="rounded-full"][class*="border"]');
      let navOverflow = 0;
      if (nav) {
        const nb = nav.getBoundingClientRect();
        for (const el of nav.querySelectorAll('a,button')) {
          const eb = el.getBoundingClientRect();
          if (eb.width && (eb.right > nb.right + 1 || eb.left < nb.left - 1)) navOverflow++;
        }
      }
      const tooSmall = [...document.querySelectorAll('a,button,input,select,textarea')]
        .filter(e => { const b = e.getBoundingClientRect(); return b.width > 0 && innerWidth < 768 && (b.height < 40 || b.width < 40); }).length;
      const deadLinks = [...document.querySelectorAll('a[href="#"], a:not([href])')].length;
      const attrText = [...document.querySelectorAll('[placeholder],[aria-label],[title],img[alt]')]
        .map(e => [e.getAttribute('placeholder'), e.getAttribute('aria-label'), e.getAttribute('title'), e.getAttribute('alt')].filter(Boolean).join(' ')).join('\n');
      return { overflowX, navOverflow, tooSmall, deadLinks, title: document.title,
               text: document.title + '\n' + document.body.innerText + '\n' + attrText, height: document.documentElement.scrollHeight };
    });

    const key = `${r} @${vpName}`;
    const hits = {};
    for (const [name, re, budget] of RULES) {
      const m = checks.text.match(re) || [];
      hits[name] = m.length;
      if (vpName === 'd1440' && name in report.siteTotals) report.siteTotals[name] += m.length;
      if (budget !== null && m.length > budget) report.failures.push(`${key}: ${name} ×${m.length} (budget ${budget}) e.g. "${m[0]}"`);
    }
    if (checks.overflowX > 0) report.failures.push(`${key}: horizontal overflow ${checks.overflowX}px`);
    if (checks.navOverflow > 0) report.failures.push(`${key}: ${checks.navOverflow} nav items outside the pill`);
    if (checks.deadLinks > 0) report.failures.push(`${key}: ${checks.deadLinks} dead links`);
    if (checks.tooSmall > 0 && vpName === 'm390') report.failures.push(`${key}: ${checks.tooSmall} touch targets under 40px (check each; inline text links in paragraphs are acceptable, list them in the report)`);
    if (vpName === 'm390' && r === '/' && checks.height > 8500) report.failures.push(`${key}: home is ${checks.height}px tall (target ≤ 8500)`);
    const appConsole = consoleLines.filter(l => !/GL Driver|swiftshader|React DevTools|\[vite\]|GroupMarkerNotSet/i.test(l));
    if (appConsole.length) report.failures.push(`${key}: console → ${appConsole.join(' | ')}`);

    report.routes[key] = { hits, overflowX: checks.overflowX, navOverflow: checks.navOverflow, tooSmall: checks.tooSmall, height: checks.height, title: checks.title };

    const slug = (r === '/' ? 'home' : r.replace(/\W+/g, '-').replace(/^-|-$/g, '')) + `-${vpName}`;
    const shots = Math.min(Math.ceil(checks.height / h), 12);
    for (let i = 0; i < shots; i++) {
      await p.evaluate(y => scrollTo(0, y), i * h); await p.waitForTimeout(700);
      await p.screenshot({ path: `${OUT}/${slug}-${String(i).padStart(2, '0')}.png` });
    }
  }
  await ctx.close();
}
if (report.siteTotals['X, not Y'] > 2) report.failures.push(`site: "X, not Y" ×${report.siteTotals['X, not Y']} (budget 2)`);
if (report.siteTotals.atelier > 1) report.failures.push(`site: "atelier" ×${report.siteTotals.atelier} (budget 1)`);
fs.writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 2));
console.log(report.failures.length ? `FAIL (${report.failures.length})\n` + report.failures.join('\n') : 'PASS');
await b.close();
