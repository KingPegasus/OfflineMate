const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  ...expoConfig,
  {
    // .claude/worktrees holds other branches checked out by Claude Code sessions.
    ignores: ["dist/*", "coverage/*", ".claude/**"],
  },
]);

