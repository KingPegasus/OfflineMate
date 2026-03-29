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

**`offlinemate-s.png`** is the **favicon** (small PNG for browser tabs). **`offlinemate.png`** is used for the hero, Apple touch icon, and Open Graph / Twitter images.

## Logo / social image

**`website/offlinemate.png`** is the main logo on the site (hero, privacy page, Open Graph / Twitter, JSON-LD). Replace that file when you update branding. The mobile app icon in `assets/icon.png` can differ; keep them in sync manually if you want parity.

## Production build (minify)

HTML and CSS are **minified** for GitHub Pages (`website-dist/`). Local source stays readable in `website/`.

```bash
npm run website:build
npx --yes serve website-dist -p 3333
```

CI runs `website:build` before upload; `website-dist/` is gitignored.

## Local preview (source)

```bash
npx --yes serve website -p 3333
```

## Repo links in HTML

`index.html` and `privacy.html` link to [`https://github.com/KingPegasus/OfflineMate`](https://github.com/KingPegasus/OfflineMate).

## Play / App Store

You can set the **privacy policy URL** to:

- `https://offlinemate.com/privacy.html`, or  
- The GitHub-rendered markdown policy (same content as `docs/legal/privacy-policy.md`).

Keep wording in sync when you change the legal docs.
