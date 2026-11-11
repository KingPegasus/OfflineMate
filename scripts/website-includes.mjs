/**
 * Shared page parts for the static site. A page writes `<!--#include footer.html -->` and the
 * build replaces it with `website/_partials/footer.html`, so the footer lives in one file instead
 * of being copied into every page. Used by scripts/minify-website.mjs and the website tests.
 */
import fs from "node:fs";
import path from "node:path";

export const PARTIALS_DIR = "_partials";

const INCLUDE = /^([ \t]*)<!--#include ([\w.-]+) -->[ \t]*$/gm;

/** Replaces every include marker in `html` with that partial, indented to the marker's column. */
export function renderIncludes(html, websiteDir) {
  return html.replace(INCLUDE, (_marker, indent, name) => {
    const file = path.join(websiteDir, PARTIALS_DIR, name);
    if (!fs.existsSync(file)) throw new Error(`Missing partial ${PARTIALS_DIR}/${name}`);
    return fs
      .readFileSync(file, "utf8")
      .replace(/\r\n/g, "\n")
      .trimEnd()
      .split("\n")
      .map((line) => (line ? indent + line : line))
      .join("\n");
  });
}
