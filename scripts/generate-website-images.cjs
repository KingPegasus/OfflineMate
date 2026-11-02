/**
 * Generates the website's icons, logos, and social image from assets/icon.png.
 * sharp is not a project dependency. Run:
 *   npm install --no-save sharp
 *   node scripts/generate-website-images.cjs
 */
/* global __dirname, Buffer */
const fs = require("node:fs");
const path = require("node:path");
const sharp = require("sharp");

const root = path.join(__dirname, "..");
const web = path.join(root, "website");
const icon = path.join(root, "assets", "icon.png");

const palettePng = (size) => sharp(icon).resize(size, size).png({ palette: true, quality: 90, compressionLevel: 9 });

async function writeFavicon() {
  // ICO container holding one 48x48 PNG (Google's favicon guideline: multiple of 48px).
  const png = await sharp(icon).resize(48, 48).png().toBuffer();
  const header = Buffer.alloc(22);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(1, 4);
  header.writeUInt8(48, 6);
  header.writeUInt8(48, 7);
  header.writeUInt16LE(1, 10);
  header.writeUInt16LE(32, 12);
  header.writeUInt32LE(png.length, 14);
  header.writeUInt32LE(header.length, 18);
  fs.writeFileSync(path.join(web, "favicon.ico"), Buffer.concat([header, png]));
}

async function writeSocialImage() {
  const text = (y, size, fill, content, weight = 400) =>
    `<text x="470" y="${y}" font-family="Segoe UI, Arial, sans-serif" font-size="${size}" font-weight="${weight}" fill="${fill}">${content}</text>`;
  const card = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
    <defs>
      <radialGradient id="g" cx="20%" cy="0%" r="90%"><stop offset="0" stop-color="#0c4a6e"/><stop offset="1" stop-color="#020617"/></radialGradient>
    </defs>
    <rect width="1200" height="630" fill="url(#g)"/>
    ${text(235, 74, "#f8fafc", "OfflineMate", 700)}
    ${text(315, 42, "#e8eef5", "Private AI assistant")}
    ${text(370, 42, "#e8eef5", "that runs offline on Android")}
    ${text(440, 28, "#5ac8fa", "Free and open source")}
  </svg>`;
  const mask = Buffer.from(`<svg width="340" height="340"><rect width="340" height="340" rx="64" ry="64"/></svg>`);
  const logo = await sharp(icon).resize(340, 340).composite([{ input: mask, blend: "dest-in" }]).png().toBuffer();
  await sharp(Buffer.from(card))
    .composite([{ input: logo, left: 85, top: 145 }])
    .flatten({ background: "#020617" })
    .jpeg({ quality: 86, mozjpeg: true })
    .toFile(path.join(web, "og-image.jpg"));
}

async function main() {
  await palettePng(192).toFile(path.join(web, "icon-192.png"));
  await palettePng(512).toFile(path.join(web, "icon-512.png"));
  await palettePng(384).toFile(path.join(web, "offlinemate.png"));
  await palettePng(64).toFile(path.join(web, "offlinemate-s.png"));
  await sharp(icon)
    .resize(180, 180)
    .flatten({ background: "#020617" })
    .png({ palette: true, quality: 90 })
    .toFile(path.join(web, "apple-touch-icon.png"));
  await writeFavicon();
  await writeSocialImage();
  console.log("Website images written to", web);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
