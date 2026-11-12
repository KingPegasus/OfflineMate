// Render a use-case video from video/usecases.html and a timeline JSON.
//   node render-uc.mjs <timeline.json> <format> <out.mp4> [fps]     format: vertical|landscape|square
//   node render-uc.mjs <timeline.json> <format> --stills <outDir> 1,5,10
// Paths are relative to marketing/. The screen recording plays inside the page, so each frame seeks the
// <video> and is screenshotted opaque; ffmpeg encodes the JPEG stream (no audio; uc-build.sh adds it).
// Env: FFMPEG, PW_MODULE (playwright package), PW_EXECUTABLE (Chrome binary; needed for H.264 playback).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PW_MODULE || 'playwright');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [tl, format = 'vertical', a1, a2, a3] = process.argv.slice(2);
const MIME = { '.html': 'text/html', '.png': 'image/png', '.json': 'application/json', '.mp4': 'video/mp4' };
const server = http.createServer((req, res) => {
  const file = path.join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end(); }
  const size = fs.statSync(file).size, type = MIME[path.extname(file)] || 'application/octet-stream';
  // Range support so the <video> can seek.
  const m = /bytes=(\d*)-(\d*)/.exec(req.headers.range || '');
  if (m) {
    const start = m[1] ? Number(m[1]) : 0, endB = m[2] ? Number(m[2]) : size - 1;
    res.writeHead(206, { 'Content-Type': type, 'Content-Range': `bytes ${start}-${endB}/${size}`, 'Accept-Ranges': 'bytes', 'Content-Length': endB - start + 1 });
    return fs.createReadStream(file, { start, end: endB }).pipe(res);
  }
  res.writeHead(200, { 'Content-Type': type, 'Content-Length': size, 'Accept-Ranges': 'bytes' });
  fs.createReadStream(file).pipe(res);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const size = { vertical: [1080, 1920], square: [1080, 1080], landscape: [1920, 1080] }[format];
const browser = await chromium.launch({
  args: ['--force-color-profile=srgb', '--hide-scrollbars', '--font-render-hinting=none', '--autoplay-policy=no-user-gesture-required'],
  ...(process.env.PW_EXECUTABLE && { executablePath: process.env.PW_EXECUTABLE }),
});
const page = await browser.newPage({ viewport: { width: size[0], height: size[1] }, deviceScaleFactor: 1 });
page.on('pageerror', e => console.error('page error:', e.message));
await page.goto(`http://127.0.0.1:${server.address().port}/video/usecases.html?f=${format}&tl=${encodeURIComponent(tl)}`, { waitUntil: 'networkidle' });
await page.evaluate(() => window.READY);
const duration = await page.evaluate(() => window.DURATION);
const shot = async (t, type = 'jpeg') => {
  await page.evaluate(t => window.renderFrame(t), t);
  return page.screenshot(type === 'png' ? { type } : { type, quality: 95 });
};

if (a1 === '--stills') {
  fs.mkdirSync(a2, { recursive: true });
  const base = path.basename(tl, '.json');
  for (const t of a3.split(',').map(Number)) fs.writeFileSync(path.join(a2, `${base}-${format}-t${t}.png`), await shot(t, 'png'));
  console.log('stills in', a2);
} else {
  const [out, fpsArg] = [a1, a2];
  const fps = Number(fpsArg || 30), frames = Math.round(duration * fps);
  fs.mkdirSync(path.dirname(path.resolve(root, out)), { recursive: true });
  const ff = spawn(process.env.FFMPEG || 'ffmpeg', ['-y', '-loglevel', 'error',
    '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', path.resolve(root, out)],
    { stdio: ['pipe', 'inherit', 'inherit'] });
  const started = Date.now();
  for (let i = 0; i < frames; i++) {
    const buf = await shot(i / fps);
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (i % fps === 0) process.stdout.write(`\r${path.basename(tl)} ${format}: ${i}/${frames} frames, ${((Date.now() - started) / 1000).toFixed(0)}s`);
  }
  ff.stdin.end();
  await new Promise(r => ff.on('close', r));
  console.log(`\ndone: ${out}`);
}
await browser.close();
server.close();
