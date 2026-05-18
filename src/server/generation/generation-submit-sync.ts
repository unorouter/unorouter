import {
  buildBody,
  extractResultUris,
  fetchAllRefs,
} from "@/lib/api/generation-dispatch";
import { getModelMetadata } from "@/lib/api/pricing-cache";
import { downloadAndUploadGeneration } from "@/lib/config/r2";
import { type SyncImageEndpoint } from "@/lib/api/generation-models-dynamic";
import { getDb } from "@/lib/db/server/client";
import { generations } from "@/lib/db/schema";
import type { GenerationSubmitBody } from "@/lib/validation/generation";
import { upstreamApiUrl } from "@/server/constants";
import dayjs from "dayjs";
import { eq } from "drizzle-orm";
import {
  finalizeRowSuccess,
  paramsToSize,
  type ImagePayload,
} from "./generation-finalize";

export async function submitSyncImage(args: {
  db: ReturnType<typeof getDb>;
  id: string;
  sessionId: string;
  apiKey: string;
  body: GenerationSubmitBody;
  endpoint: SyncImageEndpoint;
  n: number;
}) {
  const { db, id, sessionId, apiKey, body, endpoint, n } = args;
  const params = body.params ?? {};
  const size = paramsToSize(body.params);

  const meta = await getModelMetadata(body.model);
  const cap = meta.maxImageInputs ?? 6;
  const refUrls = (body.references ?? []).slice(0, cap).map((r) => r.url);
  const refs = refUrls.length > 0 ? await fetchAllRefs(refUrls) : [];

  const supportsNativeBatch = endpoint === "image-generation";
  const callsToMake = supportsNativeBatch ? 1 : n;
  const perCallN = supportsNativeBatch ? n : 1;

  const collected: ImagePayload[] = [];
  for (let i = 0; i < callsToMake; i++) {
    const built = buildBody(endpoint, {
      model: body.model,
      prompt: body.prompt,
      size,
      refs,
      n: perCallN,
      quality: params.quality,
      outputFormat: params.outputFormat,
      watermark: params.watermark,
      background: params.background,
      strength: params.strength,
      seed: params.seed,
    });

    const headers: Record<string, string> = {
      Authorization: `Bearer ${apiKey}`,
    };
    let res: Response;
    if (built.kind === "json") {
      headers["Content-Type"] = "application/json";
      res = await fetch(`${upstreamApiUrl}${built.path}`, {
        method: "POST",
        headers,
        body: built.body,
      });
    } else {
      res = await fetch(`${upstreamApiUrl}${built.path}`, {
        method: "POST",
        headers,
        body: built.form,
      });
    }

    const text = await res.text();
    if (!res.ok) {
      throw new Error(`upstream ${res.status}: ${text.slice(0, 300)}`);
    }
    let payload: unknown;
    try {
      payload = JSON.parse(text);
    } catch {
      throw new Error(`upstream returned non-JSON: ${text.slice(0, 200)}`);
    }

    const uris = extractResultUris(endpoint, payload);
    if (uris.length === 0) {
      throw new Error(
        `no image in upstream response (${endpoint}): ${text.slice(0, 200)}`,
      );
    }
    for (const uri of uris) {
      const uploaded = await downloadAndUploadGeneration(uri, id, apiKey);
      collected.push({ resultUri: uri, uploaded });
      if (!supportsNativeBatch && collected.length < n) {
        await db
          .update(generations)
          .set({
            status: "in_progress",
            progress: `${collected.length}/${n}`,
            updatedAt: dayjs().toDate(),
          })
          .where(eq(generations.id, id));
      }
    }
  }

  await finalizeRowSuccess(db, id, sessionId, collected);
}
