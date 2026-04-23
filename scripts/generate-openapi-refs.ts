import { fromTypes } from "@elysiajs/openapi/gen";
import { error, log } from "node:console";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const REL = ".next/.openapi-types/references.json";

const refs = fromTypes("src/app/api/[[...route]]/route.ts", {
  silent: true,
})();

if (!refs) {
  error("[openapi-refs] fromTypes returned undefined");
  process.exit(1);
}

const payload = JSON.stringify(refs);
const targets = [
  join(process.cwd(), REL),
  join(process.cwd(), ".next/standalone", REL),
].filter((t) => existsSync(dirname(dirname(t))));

for (const target of targets) {
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, payload);
  log(`[openapi-refs] wrote ${target}`);
}
