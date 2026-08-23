// Non-standard browser APIs the DOM lib does not model.
// showSaveFilePicker: File System Access, Chromium-only (and truncating on iOS 26).
// performance.memory: Chromium-only heap reading, used to spot iOS jetsam kills.
type SaveFilePickerFn = (opts: {
  suggestedName?: string;
  types?: { description?: string; accept: Record<string, string[]> }[];
}) => Promise<{
  createWritable: () => Promise<WritableStream<Uint8Array>>;
  getFile?: () => Promise<File>;
}>;

declare global {
  interface Window {
    showSaveFilePicker?: SaveFilePickerFn;
  }

  interface Performance {
    memory?: { usedJSHeapSize?: number };
  }
}

export {};
