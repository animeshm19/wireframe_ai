// Behaviour checks from section 8.3. Needs the dev server. Stubs requestDemo; sends nothing real.
import { chromium } from 'playwright';
const BASE = process.env.BASE || 'http://localhost:5173';
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  ' + detail : ''}`); };

// --- parametric duel -------------------------------------------------------
{
  const p = await b.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  await p.goto(BASE + '/#how', { waitUntil: 'networkidle' }); await p.waitForTimeout(1500);
  const cols = () => p.$$eval('#how .grid.grid-cols-2 > div', els => els.map(e => e.innerText.replace(/\s+/g, ' ')));
  let [mesh, brep] = await cols();
  check('duel 6.5: columns identical', mesh.replace('Scaled as a mesh', '').replace(/Every length times 1\.000/, '') === brep.replace('Rebuilt from the spec', '').replace('Only the inner diameter changes', ''), `${mesh} || ${brep}`);
  check('duel 6.5: no failing verdict', (mesh + brep).match(/Same ring\. Move the slider\./g)?.length === 2 && !/no longer fits|below casting/.test(mesh + brep));
  await p.fill('#duel-size', '9'); await p.waitForTimeout(300);
  [mesh, brep] = await cols();
  check('duel 9: mesh seat 8.29, 2.11 ct, stone no longer fits', /Seat 8\.29 mm/.test(mesh) && /2\.11 ct/.test(mesh) && /Stone no longer fits the seat \(seat 8\.29 mm, stone 7\.40 mm\)/.test(mesh), mesh);
  check('duel 9: rebuilt stays 7.40 mm and 1.50 ct', /Seat 7\.40 mm/.test(brep) && /1\.50 ct/.test(brep) && /Stone fits/.test(brep), brep);
  await p.fill('#duel-size', '4'); await p.waitForTimeout(300);
  [mesh] = await cols();
  check('duel 4: seat mismatch first (6.51 mm), prongs 0.79 mm', /Stone no longer fits the seat \(seat 6\.51 mm/.test(mesh) && /Prongs 0\.79 mm/.test(mesh), mesh);
  await p.close();
}

// --- hero -------------------------------------------------------------------
{
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await p.goto(BASE + '/', { waitUntil: 'networkidle' }); await p.waitForTimeout(2500);
  await p.fill('#hero-prompt', '18k white gold oval 2 ct size 7');
  await p.evaluate(() => [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Preview').click());
  await p.waitForTimeout(3000);
  const stats = await p.evaluate(() => document.querySelector('section').innerText.replace(/\s+/g, ' '));
  check('hero Preview updates metal and stone', /Approx\. weight \(750 White\)/.test(stats) && /2\.00 ct/.test(stats), stats.slice(stats.indexOf('Approx. metal')));
  await p.evaluate(() => [...document.querySelectorAll('button')].find(b => b.textContent.trim().startsWith('Open the Studio')).click());
  await p.waitForFunction(() => document.querySelector('h1')?.textContent === 'Sign in to open the Studio', null, { timeout: 15000 }).catch(() => {});
  const h1 = await p.textContent('h1');
  const state = await p.evaluate(() => history.state?.usr);
  check('Open the Studio signed out shows the sign-in gate', h1 === 'Sign in to open the Studio', h1);
  check('hero prompt and spec travel in the route state', state?.initialPrompt === '18k white gold oval 2 ct size 7' && state?.initialSpec?.metalType === 'white_gold', JSON.stringify(state));
  await p.close();
}

// --- pricing ------------------------------------------------------------------
{
  const p = await b.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  await p.goto(BASE + '/#pricing', { waitUntil: 'networkidle' }); await p.waitForTimeout(1200);
  const spoken = () => p.$$eval('#pricing .sr-only', els => els.map(e => e.textContent));
  const monthly = await spoken();
  await p.evaluate(() => [...document.querySelectorAll('#pricing [role=radio]')].find(b => b.textContent.trim() === 'yearly').click());
  await p.waitForTimeout(500);
  const yearly = await spoken();
  const sub = await p.evaluate(() => document.querySelector('#pricing').innerText);
  check('pricing monthly 25 / 99', monthly.join('|') === '25 dollars per seat per month|99 dollars per seat per month', monthly.join('|'));
  check('pricing yearly 20 / 79, $240 billed yearly', yearly.join('|') === '20 dollars per seat per month|79 dollars per seat per month' && /\$240 billed yearly/.test(sub) && /\$948 billed yearly/.test(sub), yearly.join('|'));
  await p.evaluate(() => [...document.querySelectorAll('#pricing [role=radio]')].find(b => b.textContent.trim() === 'monthly').click());
  await p.waitForTimeout(500);
  const copied = await p.evaluate(() => {
    const price = document.querySelector('#pricing .sr-only').parentElement;
    const r = document.createRange(); r.selectNodeContents(price);
    const s = getSelection(); s.removeAllRanges(); s.addRange(r); return s.toString().replace(/\s+/g, '');
  });
  check('copying the price gives $25', copied === '$25', JSON.stringify(copied));
  await p.close();
}

// --- contact form (callable stubbed) --------------------------------------------
{
  const p = await b.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  let called = null;
  await p.route('**/requestDemo', async (route) => {
    called = JSON.parse(route.request().postData() || '{}');
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ result: { status: 'success' } }) });
  });
  await p.goto(BASE + '/#contact', { waitUntil: 'networkidle' }); await p.waitForTimeout(1200);
  await p.evaluate(() => [...document.querySelectorAll('#contact button[type=submit]')][0].click());
  await p.waitForTimeout(300);
  const focused = await p.evaluate(() => document.activeElement?.getAttribute('name'));
  check('empty submit focuses the first invalid field', focused === 'fullName', String(focused));
  await p.fill('#fullName', 'Test Person'); await p.fill('#email', 'test@example.com'); await p.fill('#company', 'Test Studio');
  await p.selectOption('#teamSize', { index: 1 });
  await p.evaluate(() => [...document.querySelectorAll('#contact button[type=submit]')][0].click());
  await p.waitForTimeout(2500);
  const text = await p.evaluate(() => document.querySelector('#contact').innerText);
  check('valid submit calls requestDemo (stubbed)', !!called && called.data?.email === 'test@example.com' && /Request sent/.test(text), JSON.stringify(called?.data));
  await p.close();
}

// --- keyboard ----------------------------------------------------------------------
{
  const p = await b.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  await p.goto(BASE + '/', { waitUntil: 'networkidle' }); await p.bringToFront(); await p.waitForTimeout(1500);
  await p.keyboard.press('Tab'); await p.waitForTimeout(100);
  const skip = await p.evaluate(() => { const a = document.activeElement; const r = a.getBoundingClientRect(); return { text: a.textContent, top: r.top }; });
  check('first Tab lands on a visible skip link', skip.text === 'Skip to content' && skip.top >= 0, JSON.stringify(skip));
  await p.keyboard.press('Enter'); await p.waitForTimeout(200);
  check('skip link moves to #main', await p.evaluate(() => location.hash === '#main'));
  let missing = [], seen = 0;
  for (let i = 0; i < 70; i++) {
    await p.keyboard.press('Tab'); await p.waitForTimeout(60);
    const info = await p.evaluate(() => { const a = document.activeElement; if (!a || a === document.body) return null; const cs = getComputedStyle(a); return { tag: a.tagName, text: (a.textContent || a.getAttribute('aria-label') || a.id || '').trim().slice(0, 30), outline: cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0 || cs.boxShadow !== 'none' }; });
    if (!info) continue; seen++;
    if (!info.outline) missing.push(`${info.tag}:${info.text}`);
  }
  check('every focused control shows a focus ring', missing.length === 0, `${seen} stops; missing: ${missing.join(', ')}`);
  await p.close();

  const m = await b.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
  await m.goto(BASE + '/', { waitUntil: 'networkidle' }); await m.waitForTimeout(1000);
  await m.click('button[aria-controls=mobile-menu]'); await m.waitForTimeout(400);
  const inside = [];
  for (let i = 0; i < 14; i++) { await m.keyboard.press('Tab'); inside.push(await m.evaluate(() => !!document.activeElement.closest('#mobile-menu') || document.activeElement.getAttribute('aria-controls') === 'mobile-menu')); }
  check('mobile menu keeps focus inside', inside.every(Boolean), inside.join(','));
  await m.keyboard.press('Escape'); await m.waitForTimeout(400);
  check('Escape closes the mobile menu', !(await m.$('#mobile-menu')));
  await m.close();
}

// --- reduced motion ------------------------------------------------------------------
{
  const p = await b.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  await p.goto(BASE + '/', { waitUntil: 'networkidle' }); await p.waitForTimeout(3000);
  const canvas = await p.$('section canvas');
  const a = await canvas.screenshot(); await p.waitForTimeout(2500); const c = await canvas.screenshot();
  check('reduced motion: hero ring does not turn by itself', Buffer.compare(a, c) === 0);
  await p.evaluate(() => document.getElementById('how').scrollIntoView()); await p.waitForTimeout(400);
  const demo = await p.inputValue('#demo-prompt');
  check('reduced motion: prompt demo shows a full example, no typing', demo === 'platinum solitaire, 1.5 ct oval, cathedral setting, size 6.5', demo);
  await p.close();
}

// --- routes -----------------------------------------------------------------------------
{
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  for (const r of ['/careers', '/partners']) {
    await p.goto(BASE + r, { waitUntil: 'networkidle' }); await p.waitForTimeout(500);
    check(`${r} redirects to /`, new URL(p.url()).pathname === '/', p.url());
  }
  await p.goto(BASE + '/no-such-page', { waitUntil: 'networkidle' }); await p.waitForTimeout(800);
  const s = await p.evaluate(() => ({ h1: document.querySelector('h1')?.textContent, nav: !!document.querySelector('nav[aria-label=Main]'), footer: !!document.querySelector('footer'), title: document.title }));
  check('unknown URL shows the 404 inside nav and footer', s.h1 === 'Page not found' && s.nav && s.footer && s.title === 'Page not found · wireframe', JSON.stringify(s));
  await p.close();
}

await b.close();
const failed = results.filter(r => !r.ok).length;
console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exitCode = failed ? 1 : 0;
