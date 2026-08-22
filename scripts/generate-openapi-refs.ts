import { error, log } from "node:console";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import Module from "node:module";
import { dirname, join } from "node:path";

// TypeScript 7 ships no compiler API; one returns in 7.1. fromTypes walks the
// TypeChecker, so its bare `typescript` require is sent to the 6.x compat
// package while the rest of the repo builds on 7.
type ResolveFilename = (request: string, ...rest: unknown[]) => string;
const patchable = Module as unknown as { _resolveFilename: ResolveFilename };
const resolveFilename = patchable._resolveFilename;
patchable._resolveFilename = function (request, ...rest) {
  return resolveFilename.call(
    this,
    request === "typescript" ? "@typescript/typescript6" : request,
    ...rest,
  );
};

const { fromTypes } = await import("@elysiajs/openapi/gen");

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
