/**
 * Production build: minify website HTML/CSS into website-dist/ for GitHub Pages.
 * Run: npm run website:build
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { minify } from "html-minifier-terser";
import * as esbuild from "esbuild";
import { PARTIALS_DIR, renderIncludes } from "./website-includes.mjs";

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
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });

  // Search Console verification files must ship byte-for-byte, so they are copied below, not minified.
  const htmlFiles = fs.readdirSync(srcDir).filter((name) => name.endsWith(".html") && !/^google[0-9a-f]+\.html$/.test(name));

  for (const name of htmlFiles) {
    const p = path.join(srcDir, name);
    // Shared parts (the footer) are inserted before minifying, since minifying strips the markers.
    const html = renderIncludes(fs.readFileSync(p, "utf8"), srcDir);
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

  const skipRootFiles = new Set([...htmlFiles, "styles.css", "README.md"]);
  for (const ent of fs.readdirSync(srcDir, { withFileTypes: true })) {
    const name = ent.name;
    const from = path.join(srcDir, name);
    const to = path.join(outDir, name);
    if (ent.isFile()) {
      if (skipRootFiles.has(name)) continue;
      fs.copyFileSync(from, to);
      continue;
    }
    if (ent.isDirectory()) {
      if (name === PARTIALS_DIR) continue; // already inlined into the pages
      fs.cpSync(from, to, { recursive: true, force: true });
    }
  }

  console.log("website-dist ready:", outDir);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
