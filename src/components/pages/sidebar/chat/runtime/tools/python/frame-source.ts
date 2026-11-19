import { PYODIDE_BASE } from "./manifest";

const PRELUDE = `
import os, sys
os.environ["MPLBACKEND"] = "Agg"
os.makedirs("/work/output", exist_ok=True)
os.makedirs("/work/inputs", exist_ok=True)
os.chdir("/work/output")

def _uno_save_figures():
    plt = sys.modules.get("matplotlib.pyplot")
    if plt is None:
        return
    import warnings
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        for n in plt.get_fignums():
            plt.figure(n).savefig(f"/work/output/figure_{n}.png", dpi=110, bbox_inches="tight")
    plt.close("all")
`;

// Runs in the worker. Files are reported by diffing /work/output, so a file the
// model claims to have written but did not never shows up.
// Classic, not module: a module worker from a blob fails to start inside an
// opaque-origin sandbox, a classic one does.
const WORKER = `
importScripts("${PYODIDE_BASE}pyodide.js");
let py = null;
let out = [];
let err = [];
const MAX_TEXT = 6000;
const clip = (s) => s.length > MAX_TEXT ? s.slice(0, MAX_TEXT / 2) + "\\n...[" + (s.length - MAX_TEXT) + " chars cut]...\\n" + s.slice(-MAX_TEXT / 2) : s;
function walk(dir, acc) {
  for (const name of py.FS.readdir(dir)) {
    if (name === "." || name === "..") continue;
    const path = dir + "/" + name;
    const st = py.FS.stat(path);
    if (py.FS.isDir(st.mode)) walk(path, acc);
    else acc.set(path, st.mtime + ":" + st.size);
  }
  return acc;
}
self.onmessage = async (e) => {
  const job = e.data;
  out = []; err = [];
  try {
    if (!py) {
      py = await loadPyodide({ indexURL: ${JSON.stringify(PYODIDE_BASE)} });
      py.setStdout({ batched: (s) => out.push(s) });
      py.setStderr({ batched: (s) => err.push(s) });
      await py.runPythonAsync(${JSON.stringify(PRELUDE)});
    }
    const quiet = { messageCallback: () => {}, errorCallback: (m) => err.push(m) };
    await py.loadPackagesFromImports(job.code, quiet);
    if (job.packages.length > 0) await py.loadPackage(job.packages, quiet);
    self.postMessage({ type: "ready", id: job.id });
    const before = walk("/work/output", new Map());
    let value = await py.runPythonAsync(job.code);
    await py.runPythonAsync("_uno_save_figures()");
    let repr = null;
    if (value !== undefined && value !== null) {
      repr = String(value);
      if (value && typeof value.destroy === "function") value.destroy();
    }
    const files = [];
    const transfer = [];
    for (const [path, sig] of walk("/work/output", new Map())) {
      if (before.get(path) === sig) continue;
      const bytes = py.FS.readFile(path);
      files.push({ name: path.slice("/work/output/".length), bytes });
      transfer.push(bytes.buffer);
    }
    self.postMessage({ type: "done", id: job.id, ok: true, stdout: clip(out.join("\\n")), stderr: clip(err.join("\\n")), result: repr ? clip(repr) : null, files }, transfer);
  } catch (ex) {
    const msg = String(ex && ex.message || ex);
    self.postMessage({ type: "done", id: job.id, ok: false, stdout: clip(out.join("\\n")), stderr: clip(err.join("\\n")), error: clip(msg) });
  }
};
`;

// The frame's own CSP bounds the worker too (a blob worker inherits it): code
// can load the pinned runtime and wheels and reach nothing else.
const CSP = [
  "default-src 'none'",
  `script-src 'unsafe-inline' blob: 'unsafe-eval' 'wasm-unsafe-eval' ${PYODIDE_BASE}`,
  "worker-src blob:",
  `connect-src ${PYODIDE_BASE} https://files.pythonhosted.org/packages/`,
].join("; ");

export function frameSrcdoc(): string {
  return `<!DOCTYPE html><html><head><meta http-equiv="Content-Security-Policy" content="${CSP}"></head><body><script>
const src = ${JSON.stringify(WORKER)};
const worker = new Worker(URL.createObjectURL(new Blob([src], { type: "text/javascript" })));
worker.onmessage = (e) => parent.postMessage(e.data, "*", (e.data.files || []).map((f) => f.bytes.buffer));
worker.onerror = (e) => parent.postMessage({ type: "fatal", error: String(e.message || "worker failed to start") }, "*");
addEventListener("message", (e) => { if (e.source === parent) worker.postMessage(e.data); });
parent.postMessage({ type: "frame-ready" }, "*");
</script></body></html>`;
}
