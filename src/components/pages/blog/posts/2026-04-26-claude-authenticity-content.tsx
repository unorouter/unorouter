import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const REPO_URL =
  "https://github.com/unorouter/new-api-sync/blob/main/src/core/models/testing/authenticity.ts";

export async function ClaudeAuthenticityContent() {
  return (
    <>
      <p>
        Claude is the most in-demand model on the market right now, and also one
        of the most expensive. That combination, high demand and premium price,
        has created a thriving market of third-party resellers offering
        &quot;the same Claude&quot; at a fraction of the official price. Some of
        them are legitimate. A lot of them aren&apos;t.
      </p>

      <p>
        If you buy &quot;Claude&quot; from a reseller instead of from Anthropic
        directly, there&apos;s a non-trivial chance you&apos;re not getting
        Claude. You&apos;re getting a different model, sometimes a much weaker
        one, with the response dressed up to look like a Claude response.
      </p>

      <p>
        We&apos;ve been running automated probes against the Claude endpoints
        sold by third-party AI gateways for the last 17 days. The methodology is
        public, the code is open source, and across{" "}
        <strong>8 upstream resellers</strong> we found{" "}
        <strong>183 (channel, model) pairs</strong> that fail authenticity
        checks against models marketed as <code>claude-opus-4-7</code>,{" "}
        <code>claude-sonnet-4-6</code>, <code>claude-haiku-4-5</code>, and
        friends.
      </p>

      <p>
        The same demand-cheap-supply pressure exists for every premium model.{" "}
        <strong>
          The same substitution pattern is almost certainly happening to GPT,
          Gemini, Grok, and every other premium model on these marketplaces.
        </strong>{" "}
        Claude is just where the gap between official price and resold price is
        biggest right now, and where we have hard data so far. Probes for other
        vendors are next.
      </p>

      <h2 id="probes">How the probes work</h2>
      <p>
        Per (channel, model) we send four parallel requests to the standard
        Anthropic Messages API (<code>POST /v1/messages</code>):
      </p>

      <div className="not-prose my-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Probe</TableHead>
              <TableHead>Prompt</TableHead>
              <TableHead>Pass criteria</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell className="font-mono text-xs">emotional</TableCell>
              <TableCell className="text-xs">
                Tell me a 2-sentence sad story about a lost kitten.
              </TableCell>
              <TableCell className="text-xs">
                No coding-refusal phrases; response &ge; 40 chars
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-mono text-xs">creative</TableCell>
              <TableCell className="text-xs">
                Write a haiku about the ocean at sunrise. Only the haiku,
                nothing else.
              </TableCell>
              <TableCell className="text-xs">
                No coding-refusal phrases; response &ge; 25 chars
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-mono text-xs">identity</TableCell>
              <TableCell className="text-xs">
                What company created you? Reply with only the company name, one
                word.
              </TableCell>
              <TableCell className="text-xs">
                Contains <code>anthropic</code>; no coding-refusal; no
                foreign-vendor names
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-mono text-xs">model-name</TableCell>
              <TableCell className="text-xs">
                Which model are you? Reply with only your model name, nothing
                else.
              </TableCell>
              <TableCell className="text-xs">
                Contains <code>claude</code> or <code>anthropic</code>; no
                coding-refusal; no foreign-vendor names
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      <p>Three failure types:</p>
      <ul>
        <li>
          <code>coding-tool-refusal</code>: response matches a known Kiro
          Cascade or Codeium / Windsurf Droid refusal pattern (
          <em>&quot;I&apos;m here to help with coding&quot;</em>,{" "}
          <em>&quot;that&apos;s outside what I can help with&quot;</em>,{" "}
          <em>&quot;I&apos;m Droid, here to help with coding&quot;</em>, etc.).
          The upstream is routing your request to an IDE-assistant product
          instead of Anthropic, and the product is refusing the prompt because
          it&apos;s not coding.
        </li>
        <li>
          <code>foreign-identity</code>: response identifies as a non-Anthropic
          vendor (OpenAI, Meta, DeepSeek, Moonshot, Mistral, Llama, Grok, etc.)
          when asked who made it.
        </li>
        <li>
          <code>failed</code>: wrong-style output without the above signals: no
          kitten story, no haiku, generic &quot;AI assistant&quot; answer, etc.
        </li>
      </ul>

      <p>
        Pattern lists and probe code:{" "}
        <a href={REPO_URL} target="_blank" rel="noopener noreferrer">
          <code>src/core/models/testing/authenticity.ts</code>
        </a>
        .
      </p>

      <h2 id="not-spoofing">
        What is <em>not</em> spoofing: Bedrock, Vertex, Foundry
      </h2>
      <p>
        A reseller routing through <strong>AWS Bedrock</strong>,{" "}
        <strong>Google Vertex AI</strong>, or <strong>Azure AI Foundry</strong>{" "}
        is <strong>not</strong> spoofing. Those platforms host real Anthropic
        Claude weights under license. Same model, same training, same
        capabilities as <code>api.anthropic.com</code>. Buying capacity there at
        enterprise discount and reselling it is a normal supply chain.
      </p>
      <p>
        The probes can produce <strong>one false positive</strong> in this case:
        cloud-hosted Claude sometimes answers the identity probe with{" "}
        <code>Amazon</code> / <code>Google</code> / <code>Microsoft</code> (its
        host) instead of <code>Anthropic</code>, because of system prompts those
        platforms inject. So a channel flagged <em>only</em> by{" "}
        <code>foreign-identity</code> against cloud-host names warrants a manual
        second look. Channels flagged by <code>coding-tool-refusal</code> or by
        foreign vendors with no Claude licensing relationship (OpenAI, Meta,
        DeepSeek, Moonshot...) are unambiguous; real Bedrock/Vertex/Foundry
        Claude never produces those responses.
      </p>
      <p>Of the 183 entries:</p>
      <ul>
        <li>
          <strong>
            64 <code>coding-tool-refusal</code>
          </strong>
          : spoofing, no legitimate reading.
        </li>
        <li>
          <strong>
            115 <code>failed</code>
          </strong>
          : spoofing in the overwhelming majority; failures cluster on
          emotional/creative/ model-name probes, not just identity.
        </li>
        <li>
          <strong>
            4 <code>foreign-identity</code>
          </strong>
          : we inspected all four; each had additional probe failures beyond the
          identity answer alone, so we believe they&apos;re spoofed too. If you
          reproduce against your own cloud-hosted Claude and see a lone{" "}
          <code>foreign-identity</code> flag, check the other probes before
          assuming the worst.
        </li>
      </ul>

      <h2 id="results">What 17 days of probing turned up</h2>
      <p>
        8 upstream resellers (anonymized as <code>provider-1</code>..
        <code>provider-8</code>), 183 (channel, model) entries between
        2026-04-08 and 2026-04-24.
      </p>

      <p>
        <strong>By failure type:</strong>
      </p>
      <div className="not-prose my-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Count</TableHead>
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
        <strong>Probe labels that triggered failures</strong> (a channel can
        fail multiple):
      </p>
      <div className="not-prose my-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Probe</TableHead>
              <TableHead className="text-right">Failures</TableHead>
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

      <p>
        <strong>
          <code>emotional</code> being the biggest catcher is the smoking gun.
        </strong>{" "}
        Real Claude does not refuse to write a 2-sentence sad story about a
        kitten. A coding-tool backend dressed as Claude does, every time.
      </p>

      <p>
        <strong>By upstream reseller:</strong>
      </p>
      <div className="not-prose my-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Provider</TableHead>
              <TableHead className="text-right">Bad channels</TableHead>
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
      </div>

      <p>
        <strong>By Claude model marketed:</strong>
      </p>
      <div className="not-prose my-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Model</TableHead>
              <TableHead className="text-right">Bad channels</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[
              ["claude-opus-4-6", "27"],
              ["claude-sonnet-4-6", "23"],
              ["claude-sonnet-4-6-thinking", "21"],
              ["claude-haiku-4-5-20251001", "20"],
              ["claude-opus-4-7 (current flagship)", "16"],
              ["claude-opus-4-6-thinking", "14"],
              ["claude-opus-4-5-20251101", "12"],
              ["claude-haiku-4-5-20251001-thinking", "11"],
              ["claude-sonnet-4-5-20250929", "10"],
              ["claude-opus-4-5-20251101-thinking", "8"],
              ["claude-sonnet-4-5-20250929-thinking", "8"],
              ["claude-haiku-4-5", "5"],
              ["(others)", "8"],
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
        Older Claude variants have higher absolute counts only because
        they&apos;ve been on the market longer. Opus 4.7 hit 16 spoofed channels
        within weeks of release.
      </p>

      <p>
        <strong>Detections over time:</strong>
      </p>
      <pre className="not-prose bg-muted my-4 overflow-x-auto rounded-md p-4 font-mono text-xs">
        {`2026-04-08  +42 entries     2026-04-16  +18
2026-04-11  +18             2026-04-17   +6
2026-04-12   +3             2026-04-19  +11
2026-04-13   +5             2026-04-20   +7
2026-04-14  +13             2026-04-21  +30
2026-04-15  +12             2026-04-24  +18`}
      </pre>

      <p>
        This isn&apos;t a static snapshot. Resellers rotate upstreams. A channel
        that passes today can start serving Kiro tomorrow if the reseller&apos;s
        cheap path goes down.{" "}
        <strong>Authenticity has to be checked continuously.</strong>
      </p>

      <h2 id="why">Why this happens</h2>
      <p>
        Real Claude is expensive whether you buy from Anthropic or from a
        licensed cloud reseller (Bedrock/Vertex/Foundry). A reseller advertising
        Claude below the cheapest licensed price has four options:
      </p>
      <ol>
        <li>
          Eat the loss to acquire users (sustainable only with deep funding).
        </li>
        <li>
          Buy Bedrock/Vertex/Foundry capacity at enterprise discount and resell
          it. <strong>Legitimate</strong>, but the price floor is still set by
          what those clouds charge.
        </li>
        <li>
          Run a fraction of traffic through real Claude and route the rest
          somewhere cheaper, banking on most users not noticing.
        </li>
        <li>
          Route everything through a non-Anthropic backend and hope nobody
          checks.
        </li>
      </ol>
      <p>
        Options 3 and 4 are what the probes catch. Coding tools like Kiro and
        Codeium are tempting backends for option 4 because they have free /
        near-free personal-use quotas and Anthropic-compatible response shapes.
        Output looks structurally correct, just stylistically wrong, and most
        users never notice unless they ask the model something non-coding.
      </p>

      <h2 id="next">What&apos;s next</h2>
      <p>
        We expect (but haven&apos;t yet confirmed with the same rigor) the same
        substitution against:
      </p>
      <ul>
        <li>
          <strong>GPT-5.5</strong> (substituted with older GPT versions,
          OpenAI-compatible distillations, or quantized hosts)
        </li>
        <li>
          <strong>Gemini 3.1 Pro</strong> (substituted with smaller Gemini
          variants or non-Google models entirely)
        </li>
        <li>
          <strong>Grok 4.20</strong> (substituted with cheaper general-purpose
          chat models passed off as the latest xAI release)
        </li>
        <li>
          <strong>DeepSeek / Kimi / Qwen latest-version</strong> (silently
          downgraded to older or smaller variants)
        </li>
      </ul>
      <p>
        The probe pattern generalizes: pick prompts that produce a stylistically
        distinctive response from the real model and a recognizably wrong
        response from anything else. We&apos;re extending the suite to these
        vendors next. PRs welcome with refusal patterns you&apos;ve seen in the
        wild.
      </p>

      <h2 id="test">Test your own provider in 5 minutes</h2>
      <pre className="not-prose bg-muted my-4 overflow-x-auto rounded-md p-4 font-mono text-xs">
        {`curl https://YOUR-PROVIDER/v1/messages \\
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
      </pre>
      <p>
        If the response refuses or redirects to coding, your &quot;Claude&quot;
        is not Claude. Then run the identity probe with content{" "}
        <em>
          &quot;What company created you? Reply with only the company name, one
          word.&quot;
        </em>{" "}
        and if the answer isn&apos;t <code>Anthropic</code>, you have your
        answer.
      </p>
    </>
  );
}
