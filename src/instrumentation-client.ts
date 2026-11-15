import "./lib/utils/format/date";

// Safari before 18 has no Response.bytes(), which Shiki's inlined WASM loader
// calls at module evaluation, so every code block threw there.
if (typeof Response !== "undefined" && !("bytes" in Response.prototype)) {
  Object.defineProperty(Response.prototype, "bytes", {
    configurable: true,
    writable: true,
    value: async function bytes(this: Response) {
      return new Uint8Array(await this.arrayBuffer());
    },
  });
}
