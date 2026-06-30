import { readLocalMessageMetaForConv } from "@/lib/db/client/data/chat";
import {
  buildDiagnosticsHead,
  readRequestLogsForConvDiag,
  type DiagnosticsOptions,
} from "@/lib/db/client/data/diagnostics";

// Streaming diagnostics encoder. Emits the SAME JSON object buildDiagnostics() returns, but never
// holds the whole document in memory: scalar head blocks are stringified whole (bounded), and the
// two big per-conv maps stream one conversation at a time. The object braces/commas are assembled
// by hand; every VALUE still goes through JSON.stringify so escaping stays correct. Compact (no
// pretty-print) to halve bytes.
export async function* diagnosticsChunks(
  userId: number | undefined,
  opts: DiagnosticsOptions,
): AsyncGenerator<Uint8Array> {
  const enc = new TextEncoder();
  const emit = (s: string) => enc.encode(s);

  const head = await buildDiagnosticsHead(userId, opts);

  // Head keys in buildDiagnostics() order, each value stringified independently.
  yield emit("{");
  yield emit(`"generatedAt":${JSON.stringify(head.generatedAt)},`);
  yield emit(`"tableStorage":${JSON.stringify(head.tableStorage)},`);
  yield emit(`"includeContent":${JSON.stringify(head.includeContent)},`);
  yield emit(`"device":${JSON.stringify(head.device)},`);
  yield emit(`"runtime":${JSON.stringify(head.runtime)},`);
  yield emit(`"dbInfo":${JSON.stringify(head.dbInfo)},`);
  yield emit(`"conversations":${JSON.stringify(head.conversations)},`);

  // messagesByConv: one conv's metadata in memory at a time.
  yield emit(`"messagesByConv":`);
  yield* streamConvMap(head.convIds, (id) =>
    readLocalMessageMetaForConv(userId, id),
  );
  yield emit(",");

  // requestLogsByConv: same per-conv streaming; metadata-only in safe mode, blobs in full mode.
  yield emit(`"requestLogsByConv":`);
  yield* streamConvMap(head.convIds, (id) =>
    readRequestLogsForConvDiag(userId, id, opts.includeContent),
  );
  yield emit(",");

  yield emit(`"debugLog":${JSON.stringify(head.debugLog)}}`);

  // Map keyed by conv id, each value loaded + stringified lazily so peak memory is one conv.
  async function* streamConvMap(
    ids: string[],
    load: (id: string) => Promise<unknown>,
  ): AsyncGenerator<Uint8Array> {
    yield emit("{");
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      const rows = await load(id);
      const sep = i === 0 ? "" : ",";
      yield emit(`${sep}${JSON.stringify(id)}:${JSON.stringify(rows)}`);
    }
    yield emit("}");
  }
}
