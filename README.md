# Sprint Performance Calculator

A static, GitHub-Pages-friendly sprint estimation tool for athletes,
parents, coaches, and trainers. No backend, no database, no accounts,
no email capture. All math runs in the browser.

> **Educational only.** Estimates are not official marks, not exact
> percentiles, and should not be used as the sole basis for recruiting,
> scholarship, roster, medical, or training decisions.

Live: https://mwcordell3.github.io/SprintConvert/

---

## Run locally

```bash
python3 -m http.server 8080         # then open http://localhost:8080
# or:  npx --yes http-server -p 8080 .
```

---

## Publish on GitHub Pages

The `main` branch is served from the repo root. Push and Pages
auto-rebuilds within ~30 seconds.

To enable Pages from scratch: repo Settings -> Pages -> Source
"Deploy from a branch" -> `main` / `(root)` -> Save.

---

## Custom domain

When you buy a domain (Namecheap, Cloudflare Registrar, etc.):

1. Rename `CNAME.example` -> `CNAME` and put your domain in it
   (one line, no `https://`, e.g. `sprintconvert.com`).
2. At your registrar, add a `CNAME` DNS record pointing
   `www` to `mwcordell3.github.io`.
3. For the apex (`sprintconvert.com` without www) add four `A` records
   to GitHub's IPs:
   `185.199.108.153`, `185.199.109.153`,
   `185.199.110.153`, `185.199.111.153`.
4. Push the `CNAME` change. GitHub Pages will provision an SSL cert
   automatically within ~15 minutes.
5. Search-and-replace `mwcordell3.github.io/SprintConvert/` ->
   `<your-domain>/` in every HTML file, `sitemap.xml`, and
   `robots.txt` so canonical URLs and structured data match the new
   home. Push again; Pages will rebuild.

---

## Search engines (do this on launch day)

1. Google Search Console — https://search.google.com/search-console
   * "Add property" -> URL prefix -> paste your URL
   * Verify with the HTML-tag method: paste the
     `<meta name="google-site-verification" ...>` they give you into
     the `<head>` of `index.html`. Push.
   * Submit `sitemap.xml`.
2. Bing Webmaster Tools — https://www.bing.com/webmasters
   * Same drill, or import directly from Google Search Console.
3. The sitemap now includes `<lastmod>` for every URL — search
   engines use it to decide re-crawl frequency, so update those
   dates whenever you ship meaningful changes (a tiny script is
   the easiest way; otherwise edit by hand).

---

## Project layout

```
.
+- index.html                              <- homepage (main calculator)
+- 40-yard-dash-calculator.html            <- 9 sport-specific pages
+- 30-yard-to-40-yard-converter.html
+- 100m-to-40-yard-converter.html
+- sprint-speed-calculator.html
+- hand-time-to-fat-converter.html
+- flying-10-flying-20-calculator.html
+- baseball-60-yard-dash-calculator.html
+- soccer-30m-sprint-calculator.html
+- track-100m-calculator.html
+- methodology.html
+- privacy.html
+- terms.html
+- accessibility.html
+- contact.html
+- 404.html
+- css/styles.css                          <- single stylesheet
+- js/calculator.js                        <- core math (REF male+female)
+- js/validation.js
+- js/benchmarks.js                        <- result + benchmark rendering
+- js/share.js                             <- bootstrap, copy, share
+- data/benchmarks.js                      <- cited benchmark dataset
+- img/og-image.png                        <- social preview image
+- sitemap.xml
+- robots.txt
+- CNAME.example                           <- rename to CNAME for custom domain
+- README.md
```

---

## Editing things

### Sprint reference values

`js/calculator.js` exposes two reference tables:
`REF_MALE` and `REF_FEMALE`. The `refFor(profile)` helper picks
the right one based on `profile.sex`. To recalibrate against new
test data, edit those tables and the corresponding entries in
`topSpeedFactor()` and `subScoreAnchors()`.

### Benchmark data

`data/benchmarks.js`. Each entry needs `sourceName`, `sourceUrl`,
and a `confidence` of `"verified"`, `"general"`, or
`"placeholder"`. **Placeholder entries are never displayed for
comparison.** Do not invent data — if you can't cite it, don't
publish it.

### Legal pages

Edit `privacy.html`, `terms.html`, and `accessibility.html`
directly. Current language is starter text. Have an attorney review
before scaling, before adding ads or affiliate links, and before
adding any kind of email capture. The Texas governing-law clause
in `terms.html` is a placeholder; update to your actual jurisdiction.

### Adding analytics later

There is no analytics in v1. If you add some:
1. Update `privacy.html` first to disclose the provider, what is
   collected, retention, and opt-out.
2. Add the snippet (use `defer` or `async` to keep CWV intact).

### Adding affiliate links later

There are none in v1. If you add any:
1. Update both `privacy.html` and `terms.html` to disclose the
   relationship.
2. Show a visible disclosure near the link itself.
3. Never gate calculator output behind affiliate clicks.

---

## Important reminders

- **No personal data from minors.** No exact age, exact birthday,
  name, school, location, or email anywhere.
- **No fabricated benchmarks.** Cite a source. Mark confidence honestly.
- **Female estimates use a separate reference table** so the result
  reflects female sprint performance norms, not male-calibrated math.
  When you find better cited female data, update `REF_FEMALE` and
  the female anchors in `subScoreAnchors()`.
- **Replace the contact email** in `contact.html` if you need a
  different inbox. Default: `sprintconvert@outlook.com`.
- **No "ADA Compliant" badge.** No accessibility-overlay widgets.
- **Don't publish weak benchmark claims.** Better to show no benchmark.

---

## License

Source code in this repo is released under the MIT License. Benchmark
data is cited from third-party sources; those sources retain their own
rights. Treat the dataset as fair-use educational reference only.
