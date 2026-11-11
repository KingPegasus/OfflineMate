# OfflineMate static website

Minimal **HTML/CSS** site for [offlinemate.com](https://offlinemate.com). Deployed from this folder via **GitHub Actions** → **GitHub Pages**.

## One-time GitHub setup

1. Push the repo to GitHub (if not already).
2. **Settings → Pages**
   - **Build and deployment → Source:** GitHub Actions (not “Deploy from a branch”).
3. Run the workflow: push a change under `website/` or use **Actions → Deploy site to Pages → Run workflow**.
4. **Settings → Pages → Custom domain:** `offlinemate.com`  
   - Enforce HTTPS after DNS validates (checkbox on the same page).

`website/CNAME` contains `offlinemate.com` so Pages serves the correct host header.

## DNS (your registrar)

Point the apex domain to GitHub Pages ([current IPs in GitHub docs](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site#configuring-an-apex-domain)):

- **A records** for `offlinemate.com` → GitHub’s documented IPv4 addresses.
- Optional: **AAAA** for IPv6 if GitHub lists them.

Or use **CNAME** for a subdomain (e.g. `www`) → `kingpegasus.github.io` (see [GitHub Pages custom domain docs](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site)).

Propagation can take up to 48 hours.

## Favicon (browser tab)

**`favicon.ico`** (48x48) and **`icon-192.png`** are the favicons, because Google Search requires a square icon sized in multiples of 48px. **`apple-touch-icon.png`** and **`icon-512.png`** cover iOS, the web manifest, and the JSON-LD logo.

## Logo / social image

**`offlinemate.png`** is the hero logo and **`offlinemate-s.png`** is the nav logo. **`og-image.jpg`** (1200x630) is the Open Graph / Twitter image on every page. All of these, plus the favicons, are generated from `assets/icon.png`. To regenerate them after a branding change, run `npm install --no-save sharp`, then `node scripts/generate-website-images.cjs`.

## Search Console

**`google2f9bf60a126ee13b.html`** proves ownership of the site to Google Search Console. Don't delete it, or the site loses its verified status. The build copies it without minifying it.

When you add a page, add it to **`sitemap.xml`** and link to it from the nav or footer. Update `lastmod` when a page's content changes.

## Production build (minify)

HTML and CSS are **minified** for GitHub Pages (`website-dist/`). Local source stays readable in `website/`.

```bash
npm run website:build
npx --yes serve website-dist -p 3333
```

CI runs `website:build` before upload; `website-dist/` is gitignored.

## Shared footer

The footer is written once, in [`_partials/footer.html`](_partials/footer.html). Each page has only a marker where it goes:

```html
<!--#include footer.html -->
```

`npm run website:build` replaces the marker with the partial (see `scripts/website-includes.mjs`), and `_partials/` itself isn't published. Edit the footer in that one file; a test fails if a page gets its own copy.

## Local preview (source)

```bash
npx --yes serve website -p 3333
```

The raw source has no footer (only the marker). To see the finished pages, preview the build instead (`npm run website:build`, then serve `website-dist`).

## Repo links in HTML

Every page links to [`https://github.com/KingPegasus/OfflineMate`](https://github.com/KingPegasus/OfflineMate).

## Play / App Store

You can set the **privacy policy URL** to:

- `https://offlinemate.com/privacy.html`, or  
- The GitHub-rendered markdown policy (same content as `docs/legal/privacy-policy.md`).

Keep wording in sync when you change the legal docs.
