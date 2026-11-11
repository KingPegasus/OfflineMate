import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const readJson = (file: string) => JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));

/**
 * npm 11 runs a dependency's install script only if `allowScripts` approves that exact version.
 * react-native-executorch's postinstall downloads the ExecuTorch native libraries (iOS xcframeworks,
 * Android .so files); if a version bump leaves the approval behind, `npm ci` silently skips it and
 * native builds lose those libraries. This fails first, with the fix in the message.
 */
describe("npm install-script approvals", () => {
  it("approves the installed react-native-executorch version", () => {
    const allowScripts: Record<string, boolean> = readJson("package.json").allowScripts ?? {};
    const installed: string = readJson("package-lock.json").packages["node_modules/react-native-executorch"].version;
    const approved = Object.keys(allowScripts).filter((key) => key.startsWith("react-native-executorch"));

    expect(
      approved.some((key) => key === "react-native-executorch" || key === `react-native-executorch@${installed}`),
      `allowScripts approves ${approved.join(", ") || "nothing"} but react-native-executorch@${installed} is installed. ` +
        "Run: npx npm@11 install-scripts approve react-native-executorch",
    ).toBe(true);
  });
});
