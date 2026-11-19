import type { CreateDocumentInput, DocSlide } from "./schema";
import { plain, slidesOf } from "./normalize";

const MAX_BULLETS = 8;
// 16:9 at 13.33 x 7.5 in. The model names content, never positions, so text
// cannot be placed off the slide.
const W = 13.33;

const bodySize = (count: number) => (count <= 4 ? 24 : count <= 6 ? 20 : 16);

// Long bullet lists continue on a "(2)" slide instead of overflowing the box.
function splitLong(slides: DocSlide[]): DocSlide[] {
  return slides.flatMap((s) => {
    const bullets = s.bullets ?? [];
    if (bullets.length <= MAX_BULLETS) return [s];
    const parts: DocSlide[] = [];
    for (let i = 0; i < bullets.length; i += MAX_BULLETS)
      parts.push({
        ...s,
        title:
          i === 0 || !s.title ? s.title : `${s.title} (${i / MAX_BULLETS + 1})`,
        bullets: bullets.slice(i, i + MAX_BULLETS),
        notes: i === 0 ? s.notes : undefined,
      });
    return parts;
  });
}

export async function buildPptx(input: CreateDocumentInput): Promise<Blob> {
  const { default: PptxGenJS } = await import("pptxgenjs");
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.title = input.title ?? input.filename;
  if (input.title) {
    const cover = pptx.addSlide();
    cover.addText(plain(input.title), {
      x: 0.6,
      y: 2.6,
      w: W - 1.2,
      h: 1.6,
      fontSize: 40,
      bold: true,
      align: "center",
      fit: "shrink",
    });
  }
  for (const s of splitLong(slidesOf(input))) {
    const slide = pptx.addSlide();
    const bullets = (s.bullets ?? []).map(plain);
    let top = 0.5;
    if (s.title) {
      slide.addText(plain(s.title), {
        x: 0.6,
        y: top,
        w: W - 1.2,
        h: 1.0,
        fontSize: 32,
        bold: true,
        fit: "shrink",
      });
      top += 1.1;
    }
    if (s.subtitle) {
      slide.addText(plain(s.subtitle), {
        x: 0.6,
        y: top,
        w: W - 1.2,
        h: 0.6,
        fontSize: 18,
        color: "666666",
        fit: "shrink",
      });
      top += 0.7;
    }
    if (bullets.length > 0)
      slide.addText(
        bullets.map((b) => ({ text: b, options: { bullet: true } })),
        {
          x: 0.6,
          y: top,
          w: W - 1.2,
          h: 7.5 - top - 0.5,
          fontSize: bodySize(bullets.length),
          valign: "top",
          paraSpaceAfter: 6,
          fit: "shrink",
        },
      );
    if (s.notes) slide.addNotes(s.notes);
  }
  const out = await pptx.write({ outputType: "blob" });
  if (out instanceof Blob) return out;
  throw new Error("pptx: no blob output");
}
