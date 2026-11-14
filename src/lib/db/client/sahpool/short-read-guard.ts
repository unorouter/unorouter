// Safari on iOS has answered SyncAccessHandle.read() with 0 bytes for data the
// file holds. sqlite-wasm takes any short read as end of file and zero-fills,
// so the pager would see a healthy database as corrupt; upstream declined a
// library fix as a browser bug (sqlite.org/bugs/forumpost/7418667df7), so the
// read itself fails here and xRead reports it as an I/O error.
// Self-contained: test/sahpool loads this file as-is in its worker.
const INSTALLED = Symbol.for("unorouter.shortReadGuard");

export function installShortReadGuard(): void {
  if (typeof FileSystemSyncAccessHandle === "undefined") return;
  const proto: FileSystemSyncAccessHandle & { [INSTALLED]?: true } =
    FileSystemSyncAccessHandle.prototype;
  if (proto[INSTALLED]) return;
  proto[INSTALLED] = true;
  const read = proto.read;
  proto.read = function (buffer, options) {
    const want = buffer.byteLength;
    const at = options?.at ?? 0;
    let got = read.call(this, buffer, options);
    if (got < want && this.getSize() >= at + want) {
      got = read.call(this, buffer, options);
      if (got < want)
        throw new DOMException(
          `Short read of ${got} of ${want} bytes at ${at} inside the file`,
          "NotReadableError",
        );
    }
    return got;
  };
}
