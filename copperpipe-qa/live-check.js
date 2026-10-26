#!/usr/bin/env node
/*
 * copperpipe.in live-site check. Run from any machine that can reach the site.
 *
 *   npm install playwright axe-core   (once)
 *   npx playwright install chromium   (once)
 *   node live-check.js                 -> every page in the sitemap, all viewports
 *   node live-check.js https://copperpipe.in/contact/ https://copperpipe.in/range/
 *
 * For each page x viewport it records: horizontal overflow (and the elements causing it), console errors,
 * failed requests, broken images, tap targets under 24px, text under 12px, form inputs under 16px
 * (iOS zoom) and axe-core WCAG 2.2 AA violations. It exits non-zero if anything is found.
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = 'https://copperpipe.in';
const VIEWPORTS = [
  ['320x568', 320, 568, 2, true], ['375x667', 375, 667, 2, true], ['390x844', 390, 844, 3, true], ['430x932', 430, 932, 3, true],
  ['768x1024', 768, 1024, 2, true], ['1024x768', 1024, 768, 1, false], ['1280x800', 1280, 800, 1, false],
  ['1440x900', 1440, 900, 1, false], ['1920x1080', 1920, 1080, 1, false],
  ['568x320 (landscape)', 568, 320, 2, true], ['844x390 (landscape)', 844, 390, 3, true],
];

async function urlsFromSitemap() {
  const res = await fetch(BASE + '/wp-sitemap-posts-page-1.xml');
  const xml = await res.text();
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
}

function inPage() {
  const vw = innerWidth, de = document.documentElement;
  const sel = (e) => e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (typeof e.className === 'string' && e.className.trim() ? '.' + e.className.trim().split(/\s+/).slice(0, 2).join('.') : '');
  const visible = (e) => { const c = getComputedStyle(e); return c.display !== 'none' && c.visibility !== 'hidden'; };
  const closed = (e) => { const p = e.closest('#offcanvas'); return !!p && !p.classList.contains('active'); };
  const clipped = (e) => { for (let p = e.parentElement; p && p !== document.body; p = p.parentElement) { if (/(hidden|clip|auto|scroll)/.test(getComputedStyle(p).overflowX)) { const r = p.getBoundingClientRect(); if (r.right <= vw + 1 && r.left >= -1) return true; } } return false; };
  const out = { overflow: de.scrollWidth > vw, scrollW: de.scrollWidth, vw, offenders: [], smallTargets: [], smallText: [], zoomInputs: [], brokenImages: [] };
  for (const e of document.body.querySelectorAll('*')) {
    if (closed(e) || !visible(e)) continue;
    const r = e.getBoundingClientRect(); if (!r.width && !r.height) continue;
    if ((r.right > vw + 1 || r.left < -1) && !clipped(e)) out.offenders.push(sel(e) + ' [' + Math.round(r.left) + '..' + Math.round(r.right) + ']');
  }
  out.offenders = out.offenders.slice(0, 10);
  for (const e of document.querySelectorAll('a[href],button,input:not([type=hidden]),select,textarea,summary,[role=button]')) {
    if (!visible(e) || closed(e) || e.closest('.screen-reader-text,.skip-link')) continue;
    const r = e.getBoundingClientRect(); if (!r.width || !r.height) continue;
    const c = getComputedStyle(e), par = e.parentElement;
    if (c.display === 'inline' && par && (par.innerText || '').length > (e.innerText || '').length + 12) continue; // link inside a sentence
    const t = e.matches('input[type=radio],input[type=checkbox]') ? (e.closest('label') || (e.labels && e.labels[0]) || e) : e; // the label is the touch target for custom radios and checkboxes
    const b = t.getBoundingClientRect();
    if (Math.min(b.width, b.height) < 24) out.smallTargets.push(sel(e) + ' ' + Math.round(b.width) + 'x' + Math.round(b.height) + ' "' + (e.innerText || '').trim().slice(0, 24) + '"');
  }
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (w.nextNode()) { const n = w.currentNode; if (!n.nodeValue.trim()) continue; const e = n.parentElement; if (!e || e.closest('script,style,noscript,svg') || !visible(e) || closed(e)) continue; const r = e.getBoundingClientRect(); if (!r.width) continue; const fs = parseFloat(getComputedStyle(e).fontSize); if (fs < 12) out.smallText.push(sel(e) + ' ' + fs + 'px'); }
  out.smallText = [...new Set(out.smallText)].slice(0, 8);
  for (const f of document.querySelectorAll('input:not([type=hidden]):not([type=radio]):not([type=checkbox]):not([type=submit]),select,textarea')) if (visible(f) && !closed(f) && parseFloat(getComputedStyle(f).fontSize) < 16) out.zoomInputs.push(sel(f));
  for (const i of document.images) if (i.complete && i.naturalWidth === 0 && i.currentSrc) out.brokenImages.push(i.currentSrc);
  return out;
}

(async () => {
  const urls = process.argv.length > 2 ? process.argv.slice(2) : await urlsFromSitemap();
  const axePath = require.resolve('axe-core/axe.min.js');
  const browser = await chromium.launch();
  const problems = [];
  const outDir = path.join(__dirname, 'live-results'); fs.mkdirSync(outDir, { recursive: true });
  for (const [name, w, h, dpr, mobile] of VIEWPORTS) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dpr, isMobile: mobile, hasTouch: mobile });
    if (process.env.QA_ROUTES) await require(path.resolve(process.env.QA_ROUTES)).setupRoutes(ctx, { missing: new Set(), blocked: new Set() }); // test hook: serve a local mirror
    for (const url of urls) {
      const page = await ctx.newPage(); const errs = [], failed = [];
      page.on('console', (m) => m.type() === 'error' && errs.push(m.text().slice(0, 160)));
      page.on('pageerror', (e) => errs.push(String(e).slice(0, 160)));
      page.on('response', (r) => r.status() >= 400 && failed.push(r.status() + ' ' + r.url()));
      try {
        await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 });
        await page.evaluate(async () => { for (let y = 0; y < document.documentElement.scrollHeight; y += 500) { scrollTo({ top: y, behavior: 'instant' }); await new Promise((r) => setTimeout(r, 40)); } scrollTo({ top: 0, behavior: 'instant' }); });
        const m = await page.evaluate(inPage);
        let axe = [];
        if (name === '375x667' || name === '1280x800') {
          await page.addScriptTag({ path: axePath });
          axe = await page.evaluate(async () => (await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] } })).violations.map((v) => v.id + ' x' + v.nodes.length));
          if (name === '375x667') { // the mobile menu drawer is hidden until opened, so scan it open too
            await page.locator('button.ct-header-trigger').first().click();
            await page.waitForFunction(() => document.querySelector('#offcanvas') && document.querySelector('#offcanvas').classList.contains('active'));
            await page.waitForTimeout(1500);
            const drawer = await page.evaluate(async () => (await axe.run(document.querySelector('#offcanvas'), { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] } })).violations.map((v) => 'open drawer: ' + v.id + ' x' + v.nodes.length));
            axe = axe.concat(drawer);
          }
        }
        const bad = [];
        if (m.overflow) bad.push('HORIZONTAL OVERFLOW ' + m.scrollW + ' > ' + m.vw + ' :: ' + m.offenders.join(', '));
        if (errs.length) bad.push('console: ' + [...new Set(errs)].join(' | '));
        if (failed.length) bad.push('failed requests: ' + [...new Set(failed)].slice(0, 5).join(', '));
        if (m.brokenImages.length) bad.push('broken images: ' + m.brokenImages.slice(0, 3).join(', '));
        if (m.smallTargets.length) bad.push('targets <24px: ' + m.smallTargets.slice(0, 4).join('; '));
        if (m.smallText.length) bad.push('text <12px: ' + m.smallText.join('; '));
        if (mobile && w <= 768 && m.zoomInputs.length) bad.push('inputs <16px (iOS zoom): ' + m.zoomInputs.join(', '));
        if (axe.length) bad.push('axe: ' + axe.join(', '));
        if (bad.length) { problems.push({ url, viewport: name, bad }); console.log('FAIL', name, url, '\n   ' + bad.join('\n   ')); }
        else console.log('ok  ', name, url);
        if (['375x667', '1280x800'].includes(name)) await page.screenshot({ path: path.join(outDir, url.replace(/[^a-z0-9]+/gi, '_') + '__' + name + '.jpg'), fullPage: true, type: 'jpeg', quality: 60 });
      } catch (e) { problems.push({ url, viewport: name, bad: ['load error: ' + e.message.slice(0, 120)] }); console.log('FAIL', name, url, e.message.slice(0, 120)); }
      await page.close();
    }
    await ctx.close();
  }
  await browser.close();
  fs.writeFileSync(path.join(outDir, 'problems.json'), JSON.stringify(problems, null, 2));
  console.log('\n' + (problems.length ? problems.length + ' page/viewport combinations have problems (see live-results/problems.json)' : 'No problems found at any viewport.'));
  process.exit(problems.length ? 1 : 0);
})();
