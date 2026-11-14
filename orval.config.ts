import "dotenv/config";
import { defineConfig } from "orval";
import {
  NEW_API_OPERATIONS,
  pruneSpec,
  UNO_IMPORT_OPERATIONS,
} from "./openapi-surface";

const apiUrl = process.env.NEXT_PUBLIC_API_URL;
if (!apiUrl) throw new Error("Missing required env: NEXT_PUBLIC_API_URL");

export default defineConfig({
  api: {
    input: {
      target: `${apiUrl}/openapi.json`,
      override: { transformer: pruneSpec(NEW_API_OPERATIONS) },
    },
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
    input: {
      target: "https://cards.unorouter.com/openapi/json",
      override: { transformer: pruneSpec(UNO_IMPORT_OPERATIONS) },
    },
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
