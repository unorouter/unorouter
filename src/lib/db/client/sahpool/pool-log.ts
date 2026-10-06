// Worker side. The page writes these into the debug log, which is the only
// record a user can export after the pool lost their data.
export type SahPoolLogMessage = {
  type: "sahpool-log";
  event: string;
  data: Record<string, unknown>;
};

export function poolLog(event: string, data: Record<string, unknown> = {}) {
  const message: SahPoolLogMessage = { type: "sahpool-log", event, data };
  self.postMessage(message);
}

export type SlotSnapshot = {
  name: string;
  bytes: number;
  path: string;
  flags: number;
};

// Read through getFile(), so it works while another context holds the slots.
// Header: path at 0 (NUL terminated, 512 bytes), flags u32 at 512.
export async function snapshotSlots(dirName: string): Promise<SlotSnapshot[]> {
  const root = await navigator.storage.getDirectory();
  const dir = await root.getDirectoryHandle(dirName);
  const opaque = await dir.getDirectoryHandle(".opaque");
  const out: SlotSnapshot[] = [];
  for await (const [name, handle] of opaque.entries()) {
    if (handle.kind !== "file") continue;
    const file = await handle.getFile();
    const head = new Uint8Array(await file.slice(0, 516).arrayBuffer());
    const end = head.indexOf(0);
    const path = new TextDecoder().decode(
      head.subarray(0, end < 0 ? Math.min(head.length, 512) : end),
    );
    const flags =
      head.length >= 516
        ? new DataView(head.buffer, head.byteOffset).getUint32(512)
        : -1;
    out.push({ name, bytes: file.size, path, flags });
  }
  return out;
}
