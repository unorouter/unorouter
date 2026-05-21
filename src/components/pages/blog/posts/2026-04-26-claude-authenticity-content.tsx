import { CodeBlock } from "@/components/elements/code/code-block";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getTranslations } from "next-intl/server";

const REPO_URL =
  "https://github.com/unorouter/new-api-sync/blob/main/src/core/models/testing/authenticity.ts";

const richMarks = {
  s: (chunks: React.ReactNode) => <strong>{chunks}</strong>,
  c: (chunks: React.ReactNode) => <code>{chunks}</code>,
  em: (chunks: React.ReactNode) => <em>{chunks}</em>,
};

export async function ClaudeAuthenticityContent() {
  const t = await getTranslations();

  return (
    <>
      <p>{t("BLOG.POSTS.CLAUDE_AUTHENTICITY.INTRO_P1")}</p>

      <p>{t.rich("BLOG.POSTS.CLAUDE_AUTHENTICITY.INTRO_P2", richMarks)}</p>

      <h2 id="probes">{t("BLOG.POSTS.CLAUDE_AUTHENTICITY.H_PROBES")}</h2>
      <p>{t.rich("BLOG.POSTS.CLAUDE_AUTHENTICITY.PROBES_P", richMarks)}</p>

      <div className="not-prose my-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                {t("BLOG.POSTS.CLAUDE_AUTHENTICITY.TABLE_PROBE")}
              </TableHead>
              <TableHead>
                {t("BLOG.POSTS.CLAUDE_AUTHENTICITY.TABLE_PROMPT")}
              </TableHead>
              <TableHead>
                {t("BLOG.POSTS.CLAUDE_AUTHENTICITY.TABLE_PASS")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell className="font-mono text-xs">emotional</TableCell>
              <TableCell className="text-xs">
                {t("BLOG.POSTS.CLAUDE_AUTHENTICITY.PROBE_EMOTIONAL_PROMPT")}
              </TableCell>
              <TableCell className="text-xs">
                {t("BLOG.POSTS.CLAUDE_AUTHENTICITY.PROBE_EMOTIONAL_PASS")}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-mono text-xs">creative</TableCell>
              <TableCell className="text-xs">
                {t("BLOG.POSTS.CLAUDE_AUTHENTICITY.PROBE_CREATIVE_PROMPT")}
              </TableCell>
              <TableCell className="text-xs">
                {t("BLOG.POSTS.CLAUDE_AUTHENTICITY.PROBE_CREATIVE_PASS")}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-mono text-xs">identity</TableCell>
              <TableCell className="text-xs">
                {t("BLOG.POSTS.CLAUDE_AUTHENTICITY.PROBE_IDENTITY_PROMPT")}
              </TableCell>
              <TableCell className="text-xs">
                {t.rich(
                  "BLOG.POSTS.CLAUDE_AUTHENTICITY.PROBE_IDENTITY_PASS",
                  richMarks,
                )}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-mono text-xs">model-name</TableCell>
              <TableCell className="text-xs">
                {t("BLOG.POSTS.CLAUDE_AUTHENTICITY.PROBE_MODELNAME_PROMPT")}
              </TableCell>
              <TableCell className="text-xs">
                {t.rich(
                  "BLOG.POSTS.CLAUDE_AUTHENTICITY.PROBE_MODELNAME_PASS",
                  richMarks,
                )}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      <p>{t("BLOG.POSTS.CLAUDE_AUTHENTICITY.FAILURE_INTRO")}</p>
      <ul>
        <li>
          {t.rich("BLOG.POSTS.CLAUDE_AUTHENTICITY.FAILURE_CODING", richMarks)}
        </li>
        <li>
          {t.rich("BLOG.POSTS.CLAUDE_AUTHENTICITY.FAILURE_FOREIGN", richMarks)}
        </li>
        <li>
          {t.rich("BLOG.POSTS.CLAUDE_AUTHENTICITY.FAILURE_FAILED", richMarks)}
        </li>
      </ul>

      <p>
        {t.rich("BLOG.POSTS.CLAUDE_AUTHENTICITY.REPO_LINK", {
          ...richMarks,
          repo: (chunks) => (
            <a href={REPO_URL} target="_blank" rel="noopener noreferrer">
              {chunks}
            </a>
          ),
        })}
      </p>

      <h2 id="not-spoofing">
        {t("BLOG.POSTS.CLAUDE_AUTHENTICITY.H_NOT_SPOOFING")}
      </h2>
      <p>
        {t.rich("BLOG.POSTS.CLAUDE_AUTHENTICITY.NOT_SPOOFING_P1", richMarks)}
      </p>
      <p>
        {t.rich("BLOG.POSTS.CLAUDE_AUTHENTICITY.NOT_SPOOFING_P2", richMarks)}
      </p>

      <h2 id="results">{t("BLOG.POSTS.CLAUDE_AUTHENTICITY.H_RESULTS")}</h2>
      <p>{t.rich("BLOG.POSTS.CLAUDE_AUTHENTICITY.RESULTS_INTRO", richMarks)}</p>

      <div className="not-prose my-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                {t("BLOG.POSTS.CLAUDE_AUTHENTICITY.TABLE_FAILURE_TYPE")}
              </TableHead>
              <TableHead className="text-right">
                {t("BLOG.POSTS.CLAUDE_AUTHENTICITY.TABLE_COUNT")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell className="font-mono text-xs">failed</TableCell>
              <TableCell className="text-right">115</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-mono text-xs">
                coding-tool-refusal
              </TableCell>
              <TableCell className="text-right">64</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-mono text-xs">
                foreign-identity
              </TableCell>
              <TableCell className="text-right">4</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      <p>
        {t.rich(
          "BLOG.POSTS.CLAUDE_AUTHENTICITY.RESULTS_LABELS_INTRO",
          richMarks,
        )}
      </p>
      <div className="not-prose my-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                {t("BLOG.POSTS.CLAUDE_AUTHENTICITY.TABLE_PROBE")}
              </TableHead>
              <TableHead className="text-right">
                {t("BLOG.POSTS.CLAUDE_AUTHENTICITY.TABLE_FAILURES")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell className="font-mono text-xs">emotional</TableCell>
              <TableCell className="text-right">110</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-mono text-xs">model-name</TableCell>
              <TableCell className="text-right">88</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-mono text-xs">identity</TableCell>
              <TableCell className="text-right">79</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-mono text-xs">creative</TableCell>
              <TableCell className="text-right">47</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      <p>{t.rich("BLOG.POSTS.CLAUDE_AUTHENTICITY.EMOTIONAL_GUN", richMarks)}</p>

      <div className="not-prose my-6 grid gap-4 md:grid-cols-2">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                {t("BLOG.POSTS.CLAUDE_AUTHENTICITY.TABLE_PROVIDER")}
              </TableHead>
              <TableHead className="text-right">
                {t("BLOG.POSTS.CLAUDE_AUTHENTICITY.TABLE_BAD_CHANNELS")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[
              ["provider-1", 58],
              ["provider-2", 30],
              ["provider-3", 29],
              ["provider-4", 21],
              ["provider-5", 17],
              ["provider-6", 15],
              ["provider-7", 8],
              ["provider-8", 5],
            ].map(([name, count]) => (
              <TableRow key={name}>
                <TableCell className="font-mono text-xs">{name}</TableCell>
                <TableCell className="text-right">{count}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                {t("BLOG.POSTS.CLAUDE_AUTHENTICITY.TABLE_MODEL")}
              </TableHead>
              <TableHead className="text-right">
                {t("BLOG.POSTS.CLAUDE_AUTHENTICITY.TABLE_BAD_CHANNELS")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[
              ["claude-opus-4-6", "27"],
              ["claude-sonnet-4-6", "23"],
              ["claude-sonnet-4-6-thinking", "21"],
              ["claude-haiku-4-5-20251001", "20"],
              ["claude-opus-4-7 (flagship)", "16"],
              ["claude-opus-4-6-thinking", "14"],
              ["claude-opus-4-5-20251101", "12"],
              ["claude-haiku-4-5-20251001-thinking", "11"],
              ["claude-sonnet-4-5-20250929", "10"],
              ["others", "29"],
            ].map(([model, count]) => (
              <TableRow key={model}>
                <TableCell className="font-mono text-xs">{model}</TableCell>
                <TableCell className="text-right">{count}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <p>
        {t.rich("BLOG.POSTS.CLAUDE_AUTHENTICITY.OLDER_VARIANTS", richMarks)}
      </p>

      <h2 id="why">{t("BLOG.POSTS.CLAUDE_AUTHENTICITY.H_WHY")}</h2>
      <p>{t("BLOG.POSTS.CLAUDE_AUTHENTICITY.WHY_INTRO")}</p>
      <ol>
        <li>{t("BLOG.POSTS.CLAUDE_AUTHENTICITY.WHY_OPT1")}</li>
        <li>{t.rich("BLOG.POSTS.CLAUDE_AUTHENTICITY.WHY_OPT2", richMarks)}</li>
        <li>{t("BLOG.POSTS.CLAUDE_AUTHENTICITY.WHY_OPT3")}</li>
        <li>{t("BLOG.POSTS.CLAUDE_AUTHENTICITY.WHY_OPT4")}</li>
      </ol>
      <p>{t("BLOG.POSTS.CLAUDE_AUTHENTICITY.WHY_OUTRO")}</p>

      <h2 id="test">{t("BLOG.POSTS.CLAUDE_AUTHENTICITY.H_TEST")}</h2>
      <div className="not-prose my-6">
        <CodeBlock
          language="bash"
          code={`curl https://YOUR-PROVIDER/v1/messages \\
  -H "x-api-key: $YOUR_KEY" \\
  -H "anthropic-version: 2023-06-01" \\
  -H "content-type: application/json" \\
  -d '{
    "model": "claude-opus-4-7",
    "max_tokens": 150,
    "messages": [{
      "role": "user",
      "content": "Tell me a 2-sentence sad story about a lost kitten."
    }]
  }'`}
        />
      </div>
      <p>{t.rich("BLOG.POSTS.CLAUDE_AUTHENTICITY.TEST_OUTRO", richMarks)}</p>
    </>
  );
}
