import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import pngToIco from "png-to-ico";
import sharp from "sharp";

const ROOT = process.cwd();
const SRC = join(ROOT, "public", "images", "logo", "logo.svg");
const ICONS_DIR = join(ROOT, "public", "images", "icons");
const FAVICON = join(ROOT, "public", "favicon.ico");

const ICO_SIZES = [16, 32, 48, 64];
const PNG_OUTPUTS = [
  { size: 192, path: join(ICONS_DIR, "icon-192.png") },
  { size: 512, path: join(ICONS_DIR, "icon-512.png") },
  { size: 180, path: join(ICONS_DIR, "apple-icon.png") },
];

async function rasterize(size: number, svg: Buffer): Promise<Buffer> {
  return sharp(svg, { density: Math.max(300, size * 3) })
    .resize(size, size)
    .png()
    .toBuffer();
}

async function main() {
  const svg = readFileSync(SRC);

  for (const out of PNG_OUTPUTS) {
    const buf = await rasterize(out.size, svg);
    writeFileSync(out.path, buf);
    console.log(`wrote ${out.path}`);
  }

  const icoBuffers = await Promise.all(
    ICO_SIZES.map((size) => rasterize(size, svg)),
  );
  const ico = await pngToIco(icoBuffers);
  writeFileSync(FAVICON, ico);
  console.log(`wrote ${FAVICON}`);

  writeFileSync(join(ICONS_DIR, "icon.svg"), svg);
  console.log(`wrote ${join(ICONS_DIR, "icon.svg")}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
