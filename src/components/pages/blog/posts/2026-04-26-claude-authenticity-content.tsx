import { CodeBlock } from "@/components/elements/code/code-block";
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
        Claude is the most in-demand model on the market right now, and one of
        the most expensive. That gap has created a thriving market of
        third-party resellers offering &quot;the same Claude&quot; at a
        fraction of the official price. Some are legitimate. A lot
        aren&apos;t.
      </p>

      <p>
        Over 17 days of automated probing across{" "}
        <strong>8 upstream resellers</strong>, we found{" "}
        <strong>183 (channel, model) pairs</strong> that fail authenticity
        checks against models marketed as <code>claude-opus-4-7</code>,{" "}
        <code>claude-sonnet-4-6</code>, <code>claude-haiku-4-5</code>, and
        friends. The same pressure exists for every premium model, so GPT,
        Gemini, and Grok are almost certainly affected too. Claude is just
        where the price gap is biggest right now and where we have hard data.
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
                Contains <code>anthropic</code>; no foreign-vendor names
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
                foreign-vendor names
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      <p>Three failure types:</p>
      <ul>
        <li>
          <code>coding-tool-refusal</code>: response matches a Kiro Cascade or
          Codeium / Windsurf Droid refusal pattern (
          <em>&quot;I&apos;m here to help with coding&quot;</em>,{" "}
          <em>&quot;I&apos;m Droid&quot;</em>, etc.). The upstream is routing
          to an IDE-assistant product, which refuses the prompt because
          it&apos;s not coding.
        </li>
        <li>
          <code>foreign-identity</code>: response identifies as a non-Anthropic
          vendor (OpenAI, Meta, DeepSeek, Moonshot, etc.).
        </li>
        <li>
          <code>failed</code>: wrong-style output without those signals (no
          kitten story, no haiku, generic &quot;AI assistant&quot; reply).
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
        is not spoofing. Those platforms host real Anthropic Claude weights
        under license. Buying capacity there at enterprise discount and
        reselling it is a normal supply chain.
      </p>
      <p>
        One known false positive: cloud-hosted Claude sometimes answers the
        identity probe with <code>Amazon</code> / <code>Google</code> /{" "}
        <code>Microsoft</code> instead of <code>Anthropic</code>, because of
        host system prompts. A channel flagged <em>only</em> by{" "}
        <code>foreign-identity</code> against cloud-host names warrants a
        manual second look. <code>coding-tool-refusal</code> and non-cloud
        foreign vendors are unambiguous, real Bedrock/Vertex/Foundry Claude
        never produces those responses.
      </p>

      <h2 id="results">What 17 days of probing turned up</h2>
      <p>
        8 upstream resellers (anonymized as <code>provider-1</code>..
        <code>provider-8</code>), 183 (channel, model) entries between
        2026-04-08 and 2026-04-24.
      </p>

      <div className="not-prose my-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Failure type</TableHead>
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
        Real Claude doesn&apos;t refuse to write a 2-sentence sad story about a
        kitten. A coding-tool backend dressed as Claude does, every time.
      </p>

      <div className="not-prose my-6 grid gap-4 md:grid-cols-2">
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
        Older Claude variants have higher counts only because they&apos;ve been
        on the market longer. Opus 4.7 hit 16 spoofed channels within weeks of
        release. This isn&apos;t a static snapshot, either, resellers rotate
        upstreams and a channel that passes today can start serving Kiro
        tomorrow.{" "}
        <strong>Authenticity has to be checked continuously.</strong>
      </p>

      <h2 id="why">Why this happens</h2>
      <p>
        Real Claude is expensive whether you buy from Anthropic or from a
        licensed cloud reseller. A reseller advertising Claude below the
        cheapest licensed price has four options:
      </p>
      <ol>
        <li>Eat the loss (sustainable only with deep funding).</li>
        <li>
          Buy Bedrock/Vertex/Foundry capacity at enterprise discount and
          resell. <strong>Legitimate</strong>, but bounded by what those clouds
          charge.
        </li>
        <li>
          Run a fraction of traffic through real Claude and route the rest
          cheaper, banking on users not noticing.
        </li>
        <li>Route everything to a non-Anthropic backend and hope nobody checks.</li>
      </ol>
      <p>
        Options 3 and 4 are what the probes catch. Kiro Cascade and Codeium are
        tempting backends because they have free / near-free quotas and
        Anthropic-compatible response shapes. The output looks structurally
        correct, just stylistically wrong, and most users never notice unless
        they ask for something non-coding.
      </p>

      <h2 id="test">Test your own provider in 5 minutes</h2>
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
      <p>
        If the response refuses or redirects to coding, your &quot;Claude&quot;
        is not Claude. For a second check, send{" "}
        <em>
          &quot;What company created you? Reply with only the company name, one
          word.&quot;
        </em>{" "}
        — anything other than <code>Anthropic</code> is your answer.
      </p>
    </>
  );
}
