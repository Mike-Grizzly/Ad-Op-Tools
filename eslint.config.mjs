import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Not application source — do not lint with the Next.js/TS ruleset:
    // vendored Claude Design mockups (HTML/JS) and CommonJS Node tooling scripts.
    "Ad Op Tools UI Design/**",
    "scripts/**",
  ]),
]);

export default eslintConfig;
