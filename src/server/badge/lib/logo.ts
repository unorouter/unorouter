import { readFileSync } from "fs";
import { join } from "path";

let cachedLogoUri: string | null = null;

export function logoDataUri(): string {
  if (cachedLogoUri) return cachedLogoUri;
  const path = join(process.cwd(), "public", "logo.png");
  const buffer = readFileSync(path);
  cachedLogoUri = `data:image/png;base64,${buffer.toString("base64")}`;
  return cachedLogoUri;
}
