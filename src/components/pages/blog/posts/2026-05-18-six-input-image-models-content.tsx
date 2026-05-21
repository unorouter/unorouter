import { CodeBlock } from "@/components/elements/code/code-block";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";

const FIXTURE_PROMPT = `Compose a single anime-style illustration combining the six reference images: place Sara, the blonde girl with the side braid (image 01), inside the tavern (image 00), interacting with four NPCs - the blonde male hero Trevor (image 02), the bearded ranger Puck (image 03), the bald knight in gold armor (image 04), and the brunette adventurer woman (image 05). Preserve each character's distinctive appearance. Single output image.`;

const METADATA_SNIPPET = `{
  "model": "gemini-3.1-flash-image-preview",
  "metadata": {
    "maxImageInputs": 6
  }
}`;

const FAMILY_ROWS = [
  { family: "gpt-image-*", verified: 6, providerSum: 26 },
  { family: "gemini-*-image", verified: 3, providerSum: 22 },
  { family: "doubao-seedream-*", verified: 3, providerSum: 6 },
  { family: "flux-*", verified: 7, providerSum: 8 },
  { family: "qwen-image-edit-*", verified: 2, providerSum: 5 },
  { family: "wan2.5-i2i", verified: 1, providerSum: 2 },
];

const TOP_ROWS = [
  ["gemini-3.1-flash-image-preview", 8],
  ["gpt-image-1", 7],
  ["gemini-3-pro-image-preview", 7],
  ["gemini-2.5-flash-image", 7],
  ["gpt-image-2", 6],
  ["gpt-image-1-mini", 4],
  ["gpt-image-1.5", 4],
  ["flux-schnell", 3],
  ["qwen-image-edit-plus", 3],
] as const;

const richMarks = {
  s: (chunks: React.ReactNode) => <strong>{chunks}</strong>,
  c: (chunks: React.ReactNode) => <code>{chunks}</code>,
  em: (chunks: React.ReactNode) => <em>{chunks}</em>,
};

export async function SixInputImageModelsContent() {
  const t = await getTranslations();

  return (
    <>
      <p>{t.rich("BLOG.POSTS.SIX_INPUT_IMAGE_MODELS.INTRO_P1", richMarks)}</p>
      <p>{t.rich("BLOG.POSTS.SIX_INPUT_IMAGE_MODELS.INTRO_P2", richMarks)}</p>

      <h2 id="fixtures">{t("BLOG.POSTS.SIX_INPUT_IMAGE_MODELS.H_FIXTURES")}</h2>
      <p>{t.rich("BLOG.POSTS.SIX_INPUT_IMAGE_MODELS.FIXTURES_P", richMarks)}</p>
      <p>
        {t.rich(
          "BLOG.POSTS.SIX_INPUT_IMAGE_MODELS.FIXTURES_PROMPT_INTRO",
          richMarks,
        )}
      </p>
      <div className="not-prose my-6">
        <CodeBlock language="text" code={FIXTURE_PROMPT} />
      </div>

      <h2 id="method">{t("BLOG.POSTS.SIX_INPUT_IMAGE_MODELS.H_METHOD")}</h2>
      <p>{t.rich("BLOG.POSTS.SIX_INPUT_IMAGE_MODELS.METHOD_P1", richMarks)}</p>
      <p>{t.rich("BLOG.POSTS.SIX_INPUT_IMAGE_MODELS.METHOD_P2", richMarks)}</p>

      <h2 id="results">{t("BLOG.POSTS.SIX_INPUT_IMAGE_MODELS.H_RESULTS")}</h2>
      <p>
        {t.rich("BLOG.POSTS.SIX_INPUT_IMAGE_MODELS.RESULTS_INTRO", richMarks)}
      </p>
      <p>
        {t.rich(
          "BLOG.POSTS.SIX_INPUT_IMAGE_MODELS.RESULTS_FAMILY_INTRO",
          richMarks,
        )}
      </p>

      <div className="not-prose my-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                {t("BLOG.POSTS.SIX_INPUT_IMAGE_MODELS.TABLE_FAMILY")}
              </TableHead>
              <TableHead className="text-right">
                {t("BLOG.POSTS.SIX_INPUT_IMAGE_MODELS.TABLE_VERIFIED")}
              </TableHead>
              <TableHead className="text-right">
                {t("BLOG.POSTS.SIX_INPUT_IMAGE_MODELS.TABLE_PROVIDER_SUM")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {FAMILY_ROWS.map((row) => (
              <TableRow key={row.family}>
                <TableCell className="font-mono text-xs">
                  {row.family}
                </TableCell>
                <TableCell className="text-right">{row.verified}</TableCell>
                <TableCell className="text-right">{row.providerSum}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <p>
        {t.rich(
          "BLOG.POSTS.SIX_INPUT_IMAGE_MODELS.RESULTS_TOP_INTRO",
          richMarks,
        )}
      </p>

      <div className="not-prose my-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                {t("BLOG.POSTS.SIX_INPUT_IMAGE_MODELS.TABLE_MODEL")}
              </TableHead>
              <TableHead className="text-right">
                {t("BLOG.POSTS.SIX_INPUT_IMAGE_MODELS.TABLE_PROVIDER_PASSES")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {TOP_ROWS.map(([model, passes]) => (
              <TableRow key={model}>
                <TableCell className="font-mono text-xs">{model}</TableCell>
                <TableCell className="text-right">{passes}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <h2 id="gotchas">{t("BLOG.POSTS.SIX_INPUT_IMAGE_MODELS.H_GOTCHAS")}</h2>
      <p>{t.rich("BLOG.POSTS.SIX_INPUT_IMAGE_MODELS.GOTCHAS_P1", richMarks)}</p>
      <p>{t.rich("BLOG.POSTS.SIX_INPUT_IMAGE_MODELS.GOTCHAS_P2", richMarks)}</p>

      <h2 id="metadata">{t("BLOG.POSTS.SIX_INPUT_IMAGE_MODELS.H_METADATA")}</h2>
      <p>
        {t.rich("BLOG.POSTS.SIX_INPUT_IMAGE_MODELS.METADATA_P1", richMarks)}
      </p>
      <div className="not-prose my-6">
        <CodeBlock language="json" code={METADATA_SNIPPET} />
      </div>
      <p>
        {t.rich("BLOG.POSTS.SIX_INPUT_IMAGE_MODELS.METADATA_P2", richMarks)}
      </p>

      <h2 id="try">{t("BLOG.POSTS.SIX_INPUT_IMAGE_MODELS.H_TRY")}</h2>
      <p>{t("BLOG.POSTS.SIX_INPUT_IMAGE_MODELS.TRY_P")}</p>
      <p>
        {t.rich("BLOG.POSTS.SIX_INPUT_IMAGE_MODELS.CTA", {
          ...richMarks,
          register: (chunks) => <Link href="/register">{chunks}</Link>,
          models: (chunks) => (
            <Link href={{ pathname: "/models", query: { type: "image" } }}>
              {chunks}
            </Link>
          ),
        })}
      </p>
    </>
  );
}
