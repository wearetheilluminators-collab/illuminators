# copperpipe.in pre-launch QA report

Audit date: 24 October 2026. Site: https://copperpipe.in (WordPress 7.1.3, Blocksy + Elementor 4.3.5, WPForms Lite, LiteSpeed Cache).

**Final status: READY WITH MINOR FIXES.** Nothing in the site as served blocks launch. The items under High are owner actions to complete before or at launch.

## What was audited, and how

- The `illuminators` repo contains only `rea-main.zip`, an unrelated open-source reverse-engineering toolkit. There is no copperpipe source in it, so the site was audited live through the connected WordPress (Novamira) connector: all 24 published pages, the 404 page, menus, forms, the sitemap, robots.txt, llms.txt, the custom code in `wp-content/novamira-sandbox/`, DNS and server files.
- The sandbox's network policy denies `copperpipe.in:443`, so a browser could not load the live URL. Instead the rendered HTML and every local CSS, JS and image file (over 400 files, each SHA-1 verified) were copied losslessly into the sandbox and rendered in headless Chromium with the real fonts. Each fixed state was re-copied and re-tested.
- Test matrix: 25 pages (24 + 404) x 12 viewports (320x568, 375x667, 390x844, 430x932, 768x1024, 1024x768, 1280x800, 1440x900, 1920x1080, plus landscape phones 568x320, 667x375, 844x390) = 300 renders, with axe-core (WCAG 2.2 AA + best practice) at 375 and 1280, console/network capture, and viewable screenshots reviewed by eye.
- Functional tests with hand-computed expectations: weight calculator (6 numeric cases + 4 invalid inputs), Copeland filter/finder/quote form (endpoint mocked, nothing sent), Insulation WhatsApp composers, contact form validation, mobile drawer (open, Escape, X, overlay, navigate) at 6 sizes, keyboard focus on 4 pages.
- Server-side: every internal link (61 URLs) and `#fragment` (193) status-tested, external links tested, W3C Nu validator, structured data, DNS (SPF/DMARC/MX), exposed files, headers.

**Not verified (cannot be, from here):** the live URL in a real browser; iOS Safari, Firefox and Samsung Internet engines (Chromium mobile emulation only); delivery of form emails; the Google Maps embed (blocked in the sandbox); Google Ads conversions; Facebook/Instagram/JustDial/IndiaMART profile URLs and two external links that block bots (Fujitsu, Google Ads settings). `live-check.js` in this folder repeats the browser checks against production; see the README section below.

## Critical (launch-blocking)

None found.

## High

1. **Production features live in the Novamira sandbox.** 13 PHP files (`rc-seo.php` titles/meta/Open Graph/schema, `rc-form.php` contact-form WhatsApp redirect and enquiry log, `rc-ads.php` Google Ads tag, `rc-copeland.php` quote endpoint, `rc-hardening.php`, `rc-byline.php`, `rc-lang.php`, image-size filters, `rc-qa-fixes.php`) only run while the Novamira plugin is active. Novamira also gives an authenticated endpoint unrestricted PHP and file access, which should not stay on a public production site. Before launch: move these files into a site-specific plugin, then deactivate Novamira and revoke its OAuth connections and application passwords. Not done here because a mistake takes the site down.
2. **Enquiry delivery is unproven and the form receives spam.** A valid submit saves a private "Enquiry", emails sales@chennaihvac.com (from noreply@copperpipe.in), and sends the visitor to WhatsApp with the message prefilled. The code comments record that notification email "did not arrive in testing" on 5 Oct; SPF is now set and no mail error is recorded, but arrival cannot be confirmed from here. One bot message (14 Oct) passed the honeypot. Send a real test from a phone, confirm it lands in the inbox, add SMTP and a CAPTCHA (Cloudflare Turnstile, hCaptcha or reCAPTCHA), and check Enquiries in wp-admin regularly.
3. **Real-device pass.** Run `live-check.js` and spot-check one iPhone (Safari) and one Android (Chrome) on Home, Contact, Insulation, Copeland and the weight calculator.

## Medium

- Product photos and specifications are copied from worldvalue.cn (VALUE), plus Copeland catalogue data and brand logos. Confirm you have written permission; the pages already carry trademark notes.
- The Google Ads tag is live (`rc_ads_on = 1`) with no consent banner. The Privacy Policy discloses it. If you advertise to EU/UK visitors, add consent; for India, review DPDP Act notice requirements.
- `wp-login.php` and `xmlrpc.php` are public. Add login rate limiting or 2FA, and consider disabling XML-RPC.
- Structured data lists Facebook, Instagram, JustDial and IndiaMART profiles as `sameAs`, but there are no visible social links. Confirm the URLs are correct, and add visible links if wanted.
- DMARC is `p=none` on copperpipe.in and absent on chennaihvac.com, the domain that receives the form mail. Tighten once mail flow is confirmed.

## Low

- Wording to confirm: Brands page "One price for the trade, whatever the order size" vs the copper-pipe FAQ "priced per kg, per coil or per metre depending on quantity"; founder "Suresh Kumar Nahata" and son "Saurabh Jain" (different surnames, left unchanged).
- Terminology: "swedging" (5) vs "swaging" (11); straight apostrophes (19) vs curly (85); `1/4"` vs `1/4″` in a few places; `6mm` vs `6 mm` in page titles.
- The theme's header, footer, search and 404 use the system font while page content uses Barlow. Optional one-line change: `:root{--theme-font-family:"Barlow",sans-serif}`. Tested, no overflow, left as a design decision.
- "RANGE / COPPER PIPE" eyebrow labels are not links (the BreadcrumbList schema is present).
- Link lists such as "Other lines" are 39px tall (above the WCAG 24px minimum, under the 44px comfort size).
- 404 page: axe "region" notice for the theme's "No results" status node. Theme logo link carries `itemprop="url"` (W3C validator error, harmless). Header phone button's aria-label could read "Call +91 89399 93555".
- Housekeeping: `novamira-sandbox` holds 321 backup/payload files (11.3 MB, web access blocked); `uploads/rc-share` (IndiaMART import; its own `.htaccess` says delete afterwards); `.htaccess.bk`; `upgrade-temp-backup/plugins`; site timezone unset (UTC, set to Asia/Kolkata with care because byline dates derive from it); jQuery Migrate still loaded (13 KB).
- `/Contact/` (capitalised) serves 200 rather than redirecting; the canonical tag points to the lowercase URL, so no SEO harm.

## Fixed

**Copy and data** (Elementor data and the stored `post_content` copies; guide "Updated" dates untouched)
- 41 "upto" to "up to" (Home, Range, Copper fittings, Brass fittings).
- Refrigerant names: R410a, R404a, R407c, R508b to R410A, R404A, R407C, R508B (Home, Range, Refrigerant gases).
- "Fiber glass sheet" to "Fibre glass sheet" (2); Home card "6mm to 32mm THK" to "6 mm to 32 mm wall".
- Insulation page WhatsApp enquiry arrived run together ("following:Product: ...tubes)Please share"). Elementor strips line breaks from button URLs, so the message now uses punctuation (2 links).
- AWS reference link updated to its current URL (it redirected).

**Links, markup, security**
- 24 `tel:` buttons across 21 pages no longer open a blank tab; 33 external buttons and 2 policy links gained `rel="noopener"`.
- 26 rendered `<img>` tags had two `loading` attributes (invalid HTML) on Home, Brands, Insulation, Tools and VALUE; the 29 hand-written attributes behind them were removed.
- Map iframe had the coordinates as its accessible name; it now reads "Map: Refrigeration Centre, Armenian Street, Parrys, Chennai".
- Deleted the Hostinger one-time autologin script (an unused admin-login file in the web root) and the public Hostinger placeholder `default.php`; permanently deleted 3 trashed QA test enquiries.
- Google Fonts are now self-hosted (Elementor local-fonts setting plus pre-warm). The Privacy Policy states fonts are served from this site; they were not. No page requests Google's font servers now.
- 404 page: added links to Range, Guides, Brands, About, Contact and phone/WhatsApp, in the site's button style.
- Footer logo given width/height; footer phone number uses the site's mono font instead of generic `monospace`.

**Accessibility (axe-core: 4 violation types down to 1, a theme-generated node on the 404 page)**
- Inline links underlined (they differed from body text by colour only, 1.12:1).
- 6 VALUE "View range" links: accessible name now starts with the visible words.
- Scrollable data tables are keyboard-reachable (tab stop and name added only while they actually scroll).
- Visible keyboard focus on the form submit button.

**Mobile and consistency** (CSS block "Pre-launch QA, 24 Oct 2026" in Additional CSS)
- All Elementor buttons 44px tall (the hero pair was 39px beside 43px).
- Contact details: icon and text stay on one line on phones.
- Contact form: site font, site button (navy, uppercase, 4px radius; it was off-palette blue), full width on phones.
- Footer Privacy/Terms links 24px to 32px (44px on touch widths); footer link rows comfortable on phones.
- "Clear choices" 17px to 44px; calculator chips 44px; 11px caption to 12px; the tube select 15px to 16px at every width (stops iOS zoom on focus).
- Table captions no longer cut off while a table scrolls sideways.
- `viewport-fit=cover` removed from the viewport meta (hard-coded by the theme) so notched iPhones in landscape do not hide edge content; no safe-area CSS existed.

**Result of the final run:** 300 of 300 renders with zero horizontal overflow at every size; no broken or distorted images; every table in a scroll container; header (logo, phone button, hamburger) fits at 320px; drawer menu items 44px, closes by Escape, X, overlay and navigation; one remaining axe notice (404 theme node); no `console.*`, `alert()`, `debugger`, TODO or placeholder text in the site's code or visible text.

## Still requires external configuration

- Email: SMTP credentials, test of sales@chennaihvac.com, DMARC; CAPTCHA site/secret keys.
- Google Ads: confirm the three conversion actions fire; consent banner if needed. Google Search Console / Bing: submit `https://copperpipe.in/wp-sitemap.xml` (verification tags are already present).
- Hostinger/DNS: SSL is valid and http, www and trailing-slash redirects are correct; confirm hosting backups and any CDN/WAF rules.
- Social profile URLs and the Fujitsu / Google Ads settings external links (bot-blocked from the server): open them once in a browser.

## Where the changes are, and how to undo them

All edits are on the live site. Backups are in `wp-content/novamira-sandbox/` (web-blocked):
- `elementor-<pageID>.bak-20261024-qa.json` (Elementor data and post_content for 23 pages), `widget_custom_html.bak-20261024-qa.json` (footer), `custom-css.css.bak-20261024-qa` (Additional CSS before the QA block), `rc-qa-fixes.php.bak-20261024-v1`.
- New code: `rc-qa-fixes.php` (404 links, map title, table keyboard access, viewport meta). Deleting it undoes those four items. Elementor "Load Google Fonts locally" (Elementor > Settings > Performance) can be switched off to return to Google Fonts.

## Live-check script

```
cd copperpipe-qa
npm install playwright axe-core && npx playwright install chromium
node live-check.js                 # every page in the sitemap at 11 viewports
node live-check.js https://copperpipe.in/contact/
```
It reports horizontal overflow (with the offending elements), console errors, failed requests, broken images, tap targets under 24px, text under 12px, form inputs under 16px and axe violations, and exits non-zero if any are found.
