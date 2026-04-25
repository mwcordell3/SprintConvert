# Sprint Performance Calculator

A static, GitHub-Pages-friendly sprint estimation tool for athletes, parents,
coaches, and trainers. No backend, no database, no accounts, no email capture.
All math runs in the browser.

> **Educational only.** Estimates are not official marks, not exact percentiles,
> and should not be used as the sole basis for recruiting, scholarship, roster,
> medical, or training decisions.

---

## Run locally

The site is plain HTML, CSS, and vanilla JavaScript. No build step is required.

Any static-file server will do. A few quick options from the project root:

```bash
# Python 3 (built-in)
python3 -m http.server 8080

# Node (one-shot, no install)
npx --yes http-server -p 8080 .

# Or just double-click index.html
```

Then visit <http://localhost:8080> and the calculators all work.

> **Tip:** when opening `index.html` directly with `file://`, the share-link
> "copy" button copies a `file://` URL. Use a local server when testing share
> links.

---

## Publish on GitHub Pages

1. Push the project to a public GitHub repo (e.g. `SprintConvert`).
2. In the repo, go to **Settings → Pages**.
3. Under **Build and deployment**, set **Source** to `Deploy from a branch`.
4. Pick the branch (usually `main`) and folder (`/` root).
5. Save. Within a minute the site is live at
   `https://<your-user>.github.io/<repo>/`.
6. The site is already configured for the canonical URL
   `https://mwcordell3.github.io/SprintConvert/`. If you fork to a different
   repo or domain, search-and-replace that URL across the project (see
   "Editing things" below).

---

## Project layout

```
.
├─ index.html                              ← homepage with main calculator
├─ 40-yard-dash-calculator.html            ← sport-specific pages
├─ 30-yard-to-40-yard-converter.html
├─ 100m-to-40-yard-converter.html
├─ sprint-speed-calculator.html
├─ hand-time-to-fat-converter.html
├─ flying-10-flying-20-calculator.html
├─ baseball-60-yard-dash-calculator.html
├─ soccer-30m-sprint-calculator.html
├─ track-100m-calculator.html
├─ methodology.html                        ← static info pages
├─ privacy.html
├─ terms.html
├─ accessibility.html
├─ contact.html
├─ css/
│   └─ styles.css                          ← single stylesheet
├─ js/
│   ├─ calculator.js                       ← core math (sprint conversion model)
│   ├─ validation.js                       ← input parsing + error messages
│   ├─ benchmarks.js                       ← results + benchmark tier rendering
│   └─ share.js                            ← copy / share-link / form bootstrap
├─ data/
│   └─ benchmarks.js                       ← cited benchmark dataset (verified only)
├─ sitemap.xml
├─ robots.txt
└─ README.md
```

---

## Editing things

### Change benchmark data

Edit `data/benchmarks.js`. Each entry must include a `sourceName`,
`sourceUrl`, and a `confidence` of `"verified"`, `"general"`, or
`"placeholder"`. **Placeholder entries are never used for comparison.**

> **Do not invent data.** It is better to show no benchmark than a misleading
> one. Do not publish weak or unsourced ranges. Do not invent age-specific or
> sex-specific tables without strong cited sources. Do not present any
> benchmark as an exact percentile or as a recruiting prediction.

### Update legal pages

Edit `privacy.html`, `terms.html`, and `accessibility.html` directly. The
language used in those files is starter language for an early-stage site and
should be reviewed by a qualified attorney before scaling.

### Add analytics later

There is no analytics in v1. If you add analytics:

1. Update `privacy.html` first to disclose what is collected, by which
   provider, for what purpose, and how to opt out.
2. Add the analytics snippet to the bottom of each HTML page (or, more
   maintainably, add a single shared script and include it on every page).
3. Confirm the snippet does not break Core Web Vitals (defer / async).

### Add affiliate disclosures later

There are no affiliate links in v1. If you add any:

1. Update `privacy.html` and `terms.html` to disclose the affiliate
   relationship.
2. Add a visible disclosure near the link itself, for example:
   > "Some links may be affiliate links. If you buy through them, we may earn
   > a commission at no extra cost to you."
3. Do not gate calculator results behind affiliate clicks.
4. Do not insert affiliate links into the methodology page or anywhere they
   could be mistaken for editorial recommendations.

### Add email capture later

There is no email capture in v1. If you add it:

1. Update `privacy.html` first to disclose the storage, sharing, retention,
   and unsubscribe policies.
2. Make the field optional and useful (for example: save my sprint report,
   track times over the season, get a testing template).
3. Do not require email to see calculator output. Do not use manipulative
   email gates.

### Change the canonical URL

Search-and-replace `https://mwcordell3.github.io/SprintConvert/` across all
HTML files, `sitemap.xml`, and `robots.txt`.

### Change the contact email

The contact email is in `contact.html`. Replace `sprintconvert@outlook.com`
with whatever address you want to receive corrections, source suggestions,
and accessibility issue reports at.

### Add a new sport calculator page

Copy one of the existing sport-specific pages (for example
`40-yard-dash-calculator.html`), update the title, meta description, hero
copy, FAQs, and the bootstrap defaults at the bottom of the file. Add the new
page to `sitemap.xml` and to the navigation lists in the homepage and footer.

---

## Important reminders

- **Do not knowingly collect personal information from children under 13.** No
  exact age, exact birthday, name, school, location, or email anywhere.
- **Do not publish unsupported benchmark claims.** Cite a source. Mark the
  confidence honestly.
- **Replace the contact email** in `contact.html` if you need a different
  inbox. The default is `sprintconvert@outlook.com`.
- **Legal pages are starter language.** Have an attorney review before
  scaling, before adding ads or affiliates, and before adding any kind of
  email capture.
- **No fake authority.** Do not present estimates as official marks. Do not
  imply affiliation with the NFL, NCAA, MLB, MLS, any school, team, recruiting
  service, or timing company.

---

## License

Source code in this repo is released under the MIT License. Benchmark data is
cited from third-party sources — those sources retain their own rights;
treat the dataset as fair-use educational reference only.
