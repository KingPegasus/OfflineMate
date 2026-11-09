// Render marketing/video/overlay.html frame by frame (transparent PNGs) and composite it
// over the edited screen recording with ffmpeg.
//   node render.mjs video <format> <screen.mp4> <out.mp4> [fps]    format: vertical|landscape|square
//   node render.mjs stills <format> <outDir> 1,5,10
// Env: FFMPEG (ffmpeg path), PW_MODULE (path to the playwright package).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PW_MODULE || 'playwright');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'video');
const [mode, format = 'vertical', a1, a2, a3] = process.argv.slice(2);
const MIME = { '.html': 'text/html', '.png': 'image/png', '.js': 'text/javascript', '.css': 'text/css' };
const server = http.createServer((req, res) => {
  const file = path.join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const size = { vertical: [1080, 1920], square: [1080, 1080], landscape: [1920, 1080] }[format];
const browser = await chromium.launch({ args: ['--force-color-profile=srgb', '--hide-scrollbars', '--font-render-hinting=none'] });
const page = await browser.newPage({ viewport: { width: size[0], height: size[1] }, deviceScaleFactor: 1 });
page.on('pageerror', e => console.error('page error:', e.message));
await page.goto(`http://127.0.0.1:${server.address().port}/overlay.html?f=${format}`, { waitUntil: 'networkidle' });
await page.evaluate(() => window.READY);
const { duration, screen } = await page.evaluate(() => ({ duration: window.DURATION, screen: window.SCREEN }));
const shot = async t => { await page.evaluate(t => window.renderFrame(t), t); return page.screenshot({ type: 'png', omitBackground: true }); };

if (mode === 'stills') {
  fs.mkdirSync(a1, { recursive: true });
  for (const t of a2.split(',').map(Number)) fs.writeFileSync(path.join(a1, `${format}-t${t}.png`), await shot(t));
  console.log(JSON.stringify(screen));
} else {
  const [screenMp4, out, fpsArg] = [a1, a2, a3];
  const fps = Number(fpsArg || 30), frames = Math.round(duration * fps);
  const { x, y, w, h } = screen;
  // Black canvas, screen recording scaled into the phone rect, overlay (with alpha) on top.
  const filter = `color=c=0x020617:s=${size[0]}x${size[1]}:r=${fps}:d=${duration}[base];` +
    `[1:v]fps=${fps},scale=${w}:${h}:flags=lanczos,setsar=1[scr];` +
    `[base][scr]overlay=${x}:${y}:shortest=0:eof_action=repeat[b2];` +
    `[b2][0:v]overlay=0:0:format=auto,format=yuv420p[v]`;
  const ff = spawn(process.env.FFMPEG || 'ffmpeg', ['-y', '-loglevel', 'error',
    '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'png', '-i', '-',
    '-i', screenMp4, '-filter_complex', filter, '-map', '[v]', '-t', String(duration),
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out],
    { stdio: ['pipe', 'inherit', 'inherit'] });
  const started = Date.now();
  for (let i = 0; i < frames; i++) {
    const buf = await shot(i / fps);
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (i % fps === 0) process.stdout.write(`\r${format}: ${i}/${frames} frames, ${((Date.now() - started) / 1000).toFixed(0)}s`);
  }
  ff.stdin.end();
  await new Promise(r => ff.on('close', r));
  console.log(`\ndone: ${out}`);
}
await browser.close();
server.close();
