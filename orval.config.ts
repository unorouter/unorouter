import "dotenv/config";
import { defineConfig } from "orval";

const apiUrl = process.env.NEXT_PUBLIC_API_URL;
if (!apiUrl) throw new Error("Missing required env: NEXT_PUBLIC_API_URL");

export default defineConfig({
  api: {
    input: `${apiUrl}/openapi.json`,
    output: {
      target: "./src/openapi.ts",
      client: "fetch",
      override: {
        mutator: { path: "./src/lib/custom-fetch.ts", name: "customFetch" },
        aliasCombinedTypes: true,
      },
    },
    hooks: { afterAllFilesWrite: "prettier --write" },
  },
  // Called straight from the browser: the import endpoints take no token and
  // allow this origin, so there is no BFF route in front of them.
  unoImport: {
    input: "https://cards.unorouter.com/openapi/json",
    output: {
      target: "./src/lib/api/uno-import.ts",
      client: "fetch",
      override: {
        mutator: {
          path: "./src/lib/api/uno-import-fetch.ts",
          name: "unoImportFetch",
        },
        aliasCombinedTypes: true,
      },
    },
    hooks: { afterAllFilesWrite: "prettier --write" },
  },
});
