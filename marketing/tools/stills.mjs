// Render marketing stills (store screenshots, feature graphic, website frames) from video/stills.html.
//   node stills.mjs jobs.json
// jobs.json: [{ "out": "path.png", "w": 1080, "h": 1920, "page": "stills.html", "params": { "layout": "store", "shot": "chat", "head": "..." }, "transparent": false }]
// "page" is optional (default stills.html); video thumbnails use thumb.html (see uc-thumbs.json).
// Env: PW_MODULE (path to the playwright package), PW_EXECUTABLE (optional Chromium binary).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PW_MODULE || 'playwright');
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..', 'video');
const jobs = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const MIME = { '.html': 'text/html', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  const file = path.join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
// PW_EXECUTABLE: a Chromium binary to use when the playwright package's own browser isn't downloaded.
const browser = await chromium.launch({
  args: ['--force-color-profile=srgb', '--hide-scrollbars'],
  ...(process.env.PW_EXECUTABLE && { executablePath: process.env.PW_EXECUTABLE }),
});
for (const j of jobs) {
  const page = await browser.newPage({ viewport: { width: j.w, height: j.h }, deviceScaleFactor: 1 });
  const qs = new URLSearchParams(j.params).toString();
  await page.goto(`http://127.0.0.1:${server.address().port}/${j.page || 'stills.html'}?${qs}`, { waitUntil: 'networkidle' });
  await page.evaluate(() => window.READY);
  fs.mkdirSync(path.dirname(j.out), { recursive: true });
  fs.writeFileSync(j.out, await page.screenshot({ type: 'png', omitBackground: !!j.transparent }));
  console.log('wrote', j.out);
  await page.close();
}
await browser.close();
server.close();
