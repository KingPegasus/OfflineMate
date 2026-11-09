/**
 * Generates the website's icons and logos from assets/icon.png.
 * The social image (og-image.jpg) comes from marketing/ (see marketing/README.md).
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
  console.log("Website images written to", web);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
