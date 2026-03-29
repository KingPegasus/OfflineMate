/**
 * Production build: minify website HTML/CSS into website-dist/ for GitHub Pages.
 * Run: npm run website:build
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { minify } from "html-minifier-terser";
import * as esbuild from "esbuild";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const srcDir = path.join(root, "website");
const outDir = path.join(root, "website-dist");

const htmlOptions = {
  collapseWhitespace: true,
  conservativeCollapse: true,
  removeComments: true,
  minifyCSS: false,
  minifyJS: false,
  removeRedundantAttributes: true,
  removeScriptTypeAttributes: true,
  removeStyleLinkTypeAttributes: true,
  useShortDoctype: true,
  keepClosingSlash: true,
};

async function main() {
  fs.mkdirSync(outDir, { recursive: true });

  for (const name of ["index.html", "privacy.html"]) {
    const p = path.join(srcDir, name);
    if (!fs.existsSync(p)) continue;
    const html = fs.readFileSync(p, "utf8");
    const result = await minify(html, htmlOptions);
    fs.writeFileSync(path.join(outDir, name), result);
  }

  const cssIn = path.join(srcDir, "styles.css");
  if (fs.existsSync(cssIn)) {
    await esbuild.build({
      entryPoints: [cssIn],
      outfile: path.join(outDir, "styles.css"),
      minify: true,
      bundle: false,
    });
  }

  const skip = new Set(["index.html", "privacy.html", "styles.css", "README.md"]);
  for (const ent of fs.readdirSync(srcDir, { withFileTypes: true })) {
    if (!ent.isFile()) continue;
    const name = ent.name;
    if (skip.has(name)) continue;
    fs.copyFileSync(path.join(srcDir, name), path.join(outDir, name));
  }

  console.log("website-dist ready:", outDir);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
