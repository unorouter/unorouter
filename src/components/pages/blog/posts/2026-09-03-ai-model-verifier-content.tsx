import { CodeBlock } from "@/components/elements/code/code-block";
import { Link } from "@/i18n/navigation";
import { APP_VALUES } from "@/lib/config/constants";
import { getTranslations } from "next-intl/server";

const P = "BLOG.POSTS.AI_MODEL_VERIFIER";
const REPO_URL = "https://github.com/unorouter/ai-model-verifier";
const NPM_URL = "https://www.npmjs.com/package/ai-model-verifier";
const VERIDROP_URL = "https://veridrop.org";

const USAGE = `import { runVerification } from "ai-model-verifier";

const result = await runVerification({
  provider: "anthropic",
  baseUrl: "https://YOUR-PROVIDER",
  apiKey: process.env.YOUR_KEY,
  model: "claude-opus-4-8",
  mode: "server",
  checkSignature: true,
  checkTokenTruth: true,
});

console.log(result.verdict, result.reasons);
// "suspicious" [ "tier-mismatch: requested claude-opus-4-8, served sonnet" ]`;

const external = (href: string) =>
  function ExternalLink(chunks: React.ReactNode) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer">
        {chunks}
      </a>
    );
  };

export async function AiModelVerifierContent() {
  const t = await getTranslations();
  const marks = {
    ...APP_VALUES,
    c: (chunks: React.ReactNode) => <code>{chunks}</code>,
    s: (chunks: React.ReactNode) => <strong>{chunks}</strong>,
    first: (chunks: React.ReactNode) => (
      <Link
        href={{
          pathname: "/blog/[slug]",
          params: { slug: "claude-authenticity" },
        }}
      >
        {chunks}
      </Link>
    ),
    tester: (chunks: React.ReactNode) => (
      <Link href="/ai-api-model-tester">{chunks}</Link>
    ),
    rankings: (chunks: React.ReactNode) => (
      <Link href="/rankings">{chunks}</Link>
    ),
    repo: external(REPO_URL),
    npm: external(NPM_URL),
    veridrop: external(VERIDROP_URL),
  };

  return (
    <>
      <p>{t.rich(`${P}.INTRO_P1`, marks)}</p>
      <p>{t.rich(`${P}.INTRO_P2`, marks)}</p>

      <h2 id="why-a-library">{t(`${P}.H_WHY_A_LIBRARY`)}</h2>
      <p>{t.rich(`${P}.P_WHY_1`, marks)}</p>
      <p>{t.rich(`${P}.P_WHY_2`, marks)}</p>

      <h2 id="what-is-new">{t(`${P}.H_WHAT_IS_NEW`)}</h2>
      <p>{t.rich(`${P}.P_NEW_INTRO`, marks)}</p>
      <ul>
        <li>{t.rich(`${P}.NEW_SIGNATURE`, marks)}</li>
        <li>{t.rich(`${P}.NEW_TOKENS`, marks)}</li>
        <li>{t.rich(`${P}.NEW_TIER`, marks)}</li>
        <li>{t.rich(`${P}.NEW_MIXING`, marks)}</li>
        <li>{t.rich(`${P}.NEW_ENVELOPE`, marks)}</li>
        <li>{t.rich(`${P}.NEW_THROUGHPUT`, marks)}</li>
      </ul>

      <h2 id="what-it-does-not-prove">{t(`${P}.H_WHAT_IT_DOES_NOT_PROVE`)}</h2>
      <p>{t.rich(`${P}.P_NOT_1`, marks)}</p>
      <p>{t.rich(`${P}.P_NOT_2`, marks)}</p>

      <h2 id="use-it">{t(`${P}.H_USE_IT`)}</h2>
      <p>{t.rich(`${P}.P_USE_1`, marks)}</p>
      <div className="not-prose my-6">
        <CodeBlock language="typescript" code={USAGE} />
      </div>
      <p>{t.rich(`${P}.P_USE_2`, marks)}</p>

      <p>{t.rich(`${P}.CTA`, marks)}</p>
    </>
  );
}
