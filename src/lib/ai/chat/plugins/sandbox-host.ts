// Ported from RisuAI's plugin API V3 sandbox (src/ts/plugins/apiV3/factory.ts).
// Copyright (C) 2024 Kwaroran, GPL-3.0. Combined into this AGPL-3.0 work under
// GPLv3 section 13.
//
// User JavaScript runs inside an iframe with `allow-scripts` and NOTHING else,
// so it lands on an opaque origin: no reach into our DOM, cookies, OPFS or
// localStorage. The CSP additionally sets `connect-src 'none'`, so a plugin
// cannot open its own network connections and every request it makes has to go
// through a host API method we chose to expose. postMessage is the only channel,
// and the host answers exactly the method names present on the api object.

/* eslint-disable @typescript-eslint/no-explicit-any */

type MsgType =
  | "CALL_ROOT"
  | "CALL_INSTANCE"
  | "INVOKE_CALLBACK"
  | "CALLBACK_RETURN"
  | "RESPONSE"
  | "RELEASE_INSTANCE"
  | "ABORT_SIGNAL";

type RpcMessage = {
  type: MsgType;
  reqId?: string;
  id?: string;
  method?: string;
  args?: any[];
  result?: any;
  error?: string;
  abortId?: string;
};

type RemoteRef = { __type: "REMOTE_REF"; id: string };
type CallbackRef = { __type: "CALLBACK_REF"; id: string };
type AbortSignalRef = {
  __type: "ABORT_SIGNAL_REF";
  abortId: string;
  aborted: boolean;
};

// Objects carrying this marker are passed to the guest BY REFERENCE (the guest
// gets a proxy that RPCs back per method call) instead of being cloned.
export const REMOTE_REQUIRED = "REMOTE_REQUIRED";

const GUEST_BRIDGE_SCRIPT = `
await (async function() {
    const pendingRequests = new Map();
    const callbackRegistry = new Map();
    const callbackIdByFunction = new WeakMap();
    const proxyRefRegistry = new Map();
    const abortControllers = new Map();

    function serializeArg(arg) {
        if (typeof arg === 'function') {
            const existingId = callbackIdByFunction.get(arg);
            if (existingId) {
                return { __type: 'CALLBACK_REF', id: existingId };
            }
            const id = 'cb_' + Math.random().toString(36).substring(2);
            callbackRegistry.set(id, arg);
            callbackIdByFunction.set(arg, id);
            return { __type: 'CALLBACK_REF', id: id };
        }
        if (arg && typeof arg === 'object') {
            const refId = proxyRefRegistry.get(arg);
            if (refId) {
                return { __type: 'REMOTE_REF', id: refId };
            }
            if (arg.constructor === Object) {
                let out = null;
                for (const [key, val] of Object.entries(arg)) {
                    if (val instanceof AbortSignal) {
                        if (!out) out = { ...arg };
                        const abortId = 'abort_' + Math.random().toString(36).substring(2);
                        if (!val.aborted) {
                            val.addEventListener('abort', () => {
                                send({ type: 'ABORT_SIGNAL', abortId });
                            }, { once: true });
                        }
                        out[key] = { __type: 'ABORT_SIGNAL_REF', abortId, aborted: val.aborted };
                    }
                }
                if (out) return out;
            }
        }
        return arg;
    }

    function deserializeResult(val) {
        if (val && typeof val === 'object' && val.__type === 'REMOTE_REF') {
            const proxy = new Proxy({}, {
                get: (target, prop) => {
                    // Without this, awaiting the proxy would RPC for 'then' and hang.
                    if (prop === 'then') return undefined;
                    if (prop === 'release') {
                        return () => send({ type: 'RELEASE_INSTANCE', id: val.id });
                    }
                    return (...args) => sendRequest('CALL_INSTANCE', {
                        id: val.id,
                        method: prop,
                        args: args
                    });
                }
            });
            proxyRefRegistry.set(proxy, val.id);
            return proxy;
        }
        if (val && typeof val === 'object' && val.__type === 'CALLBACK_STREAMS') {
            if (val.__specialType === 'Response') {
                return new Response(val.value, val.init);
            }
            return val.value;
        }
        return val;
    }

    function collectTransferables(obj, transferables = []) {
        if (!obj || typeof obj !== 'object') return transferables;
        if (obj instanceof ArrayBuffer ||
            obj instanceof MessagePort ||
            obj instanceof ImageBitmap ||
            (typeof OffscreenCanvas !== 'undefined' && obj instanceof OffscreenCanvas)) {
            transferables.push(obj);
        }
        else if (ArrayBuffer.isView(obj) && obj.buffer instanceof ArrayBuffer) {
            transferables.push(obj.buffer);
        }
        else if (Array.isArray(obj)) {
            obj.forEach(item => collectTransferables(item, transferables));
        }
        else if (obj.constructor === Object) {
            Object.values(obj).forEach(value => collectTransferables(value, transferables));
        }
        return transferables;
    }

    function replaceStreamsWithPorts(obj) {
        const ports = [];
        const cleanups = [];
        if (!obj || typeof obj !== 'object') return { result: obj, ports, cleanups };

        function replace(val) {
            if (!(val instanceof ReadableStream)) return val;
            const ch = new MessageChannel();
            ports.push(ch.port2);
            const reader = val.getReader();
            let credits = 0;
            let reading = false;
            let finished = false;

            function finish() {
                finished = true;
                ch.port1.onmessage = null;
                ch.port1.close();
            }

            cleanups.push(() => {
                reader.cancel().catch(() => {});
                finish();
            });

            async function pump() {
                if (reading || finished) return;
                reading = true;
                try {
                    while (credits > 0 && !finished) {
                        credits--;
                        const { done, value } = await reader.read();
                        if (finished) return;
                        if (done) { ch.port1.postMessage({ done: true }); finish(); return; }
                        ch.port1.postMessage({ done: false, value });
                    }
                } catch (e) {
                    try { ch.port1.postMessage({ done: true, error: e.message }); } catch(_) {}
                    finish();
                } finally {
                    reading = false;
                }
            }

            ch.port1.onmessage = (e) => {
                if (e.data?.cancel) {
                    reader.cancel();
                    finish();
                } else if (e.data?.pull) {
                    credits++;
                    pump();
                }
            };

            return { __type: 'STREAM_PORT', portIndex: ports.length - 1 };
        }

        if (obj instanceof ReadableStream) return { result: replace(obj), ports, cleanups };
        if (obj.constructor === Object) {
            const out = {};
            for (const k of Object.keys(obj)) out[k] = replace(obj[k]);
            return { result: out, ports, cleanups };
        }
        return { result: obj, ports, cleanups };
    }

    function reconstructStreamsFromPorts(obj, ports) {
        if (!obj || typeof obj !== 'object') return obj;

        function reconstruct(val) {
            if (!val || val.__type !== 'STREAM_PORT' || typeof val.portIndex !== 'number') return val;
            const port = ports[val.portIndex];
            if (!port) throw new Error('Stream port at index ' + val.portIndex + ' not received');
            return new ReadableStream({
                start(controller) {
                    port.onmessage = (e) => {
                        if (e.data.done) {
                            if (e.data.error) controller.error(new Error(e.data.error));
                            else controller.close();
                            port.onmessage = null;
                            port.close();
                        } else {
                            controller.enqueue(e.data.value);
                        }
                    };
                },
                pull() { port.postMessage({ pull: true }); },
                cancel() {
                    port.postMessage({ cancel: true });
                    port.onmessage = null;
                    port.close();
                }
            });
        }

        if (obj.__type === 'STREAM_PORT') return reconstruct(obj);
        if (obj.constructor === Object) {
            const out = {};
            for (const k of Object.keys(obj)) out[k] = reconstruct(obj[k]);
            return out;
        }
        return obj;
    }

    function send(payload, transferables = []) {
        window.parent.postMessage(payload, '*', transferables);
    }

    function sendRequest(type, payload) {
        return new Promise((resolve, reject) => {
            const reqId = Math.random().toString(36).substring(7);
            pendingRequests.set(reqId, { resolve, reject });
            if (payload.args) {
                payload.args = payload.args.map(serializeArg);
            }
            const message = { type: type, reqId: reqId, ...payload };
            send(message, collectTransferables(message));
        });
    }

    window.addEventListener('message', async (event) => {
        const data = event.data;
        if (!data) return;

        if (data.type === 'RESPONSE' && data.reqId) {
            const req = pendingRequests.get(data.reqId);
            if (req) {
                if (data.error) req.reject(new Error(data.error));
                else {
                    try {
                        req.resolve(deserializeResult(reconstructStreamsFromPorts(data.result, event.ports)));
                    } catch (e) {
                        req.reject(e);
                    }
                }
                pendingRequests.delete(data.reqId);
            }
        }

        else if (data.type === 'EXECUTE_CODE' && data.reqId) {
            const response = { type: 'EXEC_RESULT', reqId: data.reqId };
            try {
                response.result = await eval('(async () => {' + data.code + '})()');
            } catch (e) {
                response.error = e.message || String(e);
            }
            send(response);
        }

        else if (data.type === 'ABORT_SIGNAL' && data.abortId) {
            const controller = abortControllers.get(data.abortId);
            if (controller) {
                controller.abort();
                abortControllers.delete(data.abortId);
            }
        }

        else if (data.type === 'INVOKE_CALLBACK' && data.id) {
            const fn = callbackRegistry.get(data.id);
            const response = { type: 'CALLBACK_RETURN', reqId: data.reqId };
            const usedAbortIds = [];
            let transferables = [];
            let streamCleanups = [];

            const rollbackStreams = () => {
                for (const cleanup of streamCleanups) {
                    try { cleanup(); } catch(_) {}
                }
                streamCleanups = [];
            };

            try {
                if (!fn) throw new Error("Callback not found or released");
                const deserializedArgs = (data.args || []).map(function(a) {
                    if (a && typeof a === 'object' && a.__type === 'ABORT_SIGNAL_REF') {
                        const controller = new AbortController();
                        abortControllers.set(a.abortId, controller);
                        usedAbortIds.push(a.abortId);
                        if (a.aborted) { controller.abort(); }
                        return controller.signal;
                    }
                    return a;
                });
                response.result = await fn(...deserializedArgs);
                const { result: streamResult, ports: streamPorts, cleanups } = replaceStreamsWithPorts(response.result);
                response.result = streamResult;
                streamCleanups = cleanups;
                transferables = collectTransferables(response, streamPorts);
            } catch (e) {
                rollbackStreams();
                delete response.result;
                response.error = (e && e.message) || String(e || "Guest callback error");
            }
            for (const id of usedAbortIds) {
                abortControllers.delete(id);
            }
            try {
                send(response, transferables);
            } catch (e) {
                rollbackStreams();
                try {
                    send({
                        type: 'CALLBACK_RETURN',
                        reqId: data.reqId,
                        error: 'Failed to post message to parent: ' + ((e && e.message) || String(e || "Unknown error"))
                    });
                } catch(_) {}
            }
        }
    });

    const propertyCache = new Map();

    window.uno = new Proxy({}, {
        get: (target, prop) => {
            if (propertyCache.has(prop)) {
                return propertyCache.get(prop);
            }
            return (...args) => sendRequest('CALL_ROOT', { method: prop, args: args });
        }
    });

    try {
        const propsToInit = await window.uno._getPropertiesForInitialization();
        for (let i = 0; i < propsToInit.list.length; i++) {
            const key = propsToInit.list[i];
            propertyCache.set(key, propsToInit[key]);
        }

        const aliases = await window.uno._getAliases();
        for (const aliasKey of Object.keys(aliases)) {
            const aliasObj = {};
            for (const childKey of Object.keys(aliases[aliasKey])) {
                aliasObj[childKey] = window.uno[aliases[aliasKey][childKey]];
            }
            propertyCache.set(aliasKey, aliasObj);
        }
    } catch (e) {
        console.error('Failed to initialize the plugin api:', e);
    }

    Object.freeze(window.postMessage);
})();
`;

// User code is spliced into a <script> block, so a literal closing tag inside a
// plugin would end the element early and run the rest as markup outside the
// nonce. Break the sequence; the escape is invisible to the parsed program.
function escapeForScriptBlock(code: string): string {
  return code.replace(/<\/(script)/gi, "<\\/$1");
}

export class SandboxHost {
  private iframe: HTMLIFrameElement | null = null;
  private apiFactory: Record<string, unknown>;
  private nonce = crypto.randomUUID();
  // 'unsafe-eval' is REQUIRED, not an oversight: running guest code IS this
  // frame's purpose, and both eval and new Function are string evaluation. The
  // meta tag applies the policy at parse and removing it later cannot lift it,
  // so without this every plugin fails with "Evaluating a string as JavaScript
  // violates ... Content Security Policy" and the whole feature is inert.
  // It does not widen the boundary that matters: the frame is an opaque origin
  // with allow-scripts only, and connect-src 'none' still denies all network.
  private csp = `connect-src 'none'; script-src 'nonce-${this.nonce}' 'unsafe-eval' 'wasm-unsafe-eval'; frame-src 'none'; object-src 'none'; style-src * 'unsafe-inline'; default-src 'none'; img-src * data: blob:; font-src * data: blob:; media-src * data: blob:; base-uri 'none';`;

  private instanceRegistry = new Map<string, any>();
  private abortControllers = new Map<string, AbortController>();
  private messageHandlerRef: ((event: MessageEvent) => void) | null = null;
  private callbackWrapperCache = new Map<string, (...a: any[]) => unknown>();
  private pendingCallbacks = new Map<
    string,
    { resolve: (v: unknown) => void; reject: (e: unknown) => void }
  >();

  // MessagePort has no 'close' event, so without an explicit teardown hook the
  // far side of a live stream would wait forever once the iframe is gone.
  private activeStreamCleanups = new Set<() => void>();

  constructor(apiFactory: Record<string, unknown>) {
    this.apiFactory = apiFactory;
  }

  executeInIframe(code: string): Promise<unknown> {
    const frame = this.iframe;
    if (!frame) return Promise.reject(new Error("sandbox not running"));
    return new Promise((resolve, reject) => {
      const reqId = "exec_" + Math.random().toString(36).substring(2);
      const handler = (event: MessageEvent) => {
        if (event.source !== frame.contentWindow) return;
        const data = event.data;
        if (data?.type === "EXEC_RESULT" && data.reqId === reqId) {
          window.removeEventListener("message", handler);
          if (data.error) reject(new Error(data.error));
          else resolve(data.result);
        }
      };
      window.addEventListener("message", handler);
      frame.contentWindow?.postMessage(
        { type: "EXECUTE_CODE", reqId, code },
        "*",
      );
    });
  }

  private collectTransferables(
    obj: any,
    transferables: Transferable[] = [],
  ): Transferable[] {
    if (!obj || typeof obj !== "object") return transferables;
    if (
      obj instanceof ArrayBuffer ||
      obj instanceof MessagePort ||
      obj instanceof ImageBitmap ||
      obj instanceof WritableStream ||
      obj instanceof TransformStream ||
      (typeof OffscreenCanvas !== "undefined" && obj instanceof OffscreenCanvas)
    ) {
      transferables.push(obj);
    } else if (ArrayBuffer.isView(obj) && obj.buffer instanceof ArrayBuffer) {
      transferables.push(obj.buffer);
    } else if (Array.isArray(obj)) {
      obj.forEach((item) => this.collectTransferables(item, transferables));
    } else if (obj.constructor === Object) {
      Object.values(obj).forEach((value) =>
        this.collectTransferables(value, transferables),
      );
    }
    return transferables;
  }

  private serialize(val: any): any {
    if (
      val &&
      (typeof val === "object" || typeof val === "function") &&
      val.__classType === REMOTE_REQUIRED
    ) {
      if (Array.isArray(val)) return val;
      const id = "ref_" + Math.random().toString(36).substring(2);
      this.instanceRegistry.set(id, val);
      return { __type: "REMOTE_REF", id } satisfies RemoteRef;
    }
    if (val instanceof Response) {
      return {
        __type: "CALLBACK_STREAMS",
        __specialType: "Response",
        value: val.body,
        init: {
          status: val.status,
          statusText: val.statusText,
          headers: Array.from(val.headers.entries()),
        },
      };
    }
    if (val instanceof WritableStream || val instanceof TransformStream) {
      return { __type: "CALLBACK_STREAMS", __specialType: "none", value: val };
    }
    return val;
  }

  private deserializeArgs(args: any[], usedAbortIds?: string[]) {
    return args.map((arg) => {
      if (arg && arg.__type === "CALLBACK_REF") {
        const cbRef: CallbackRef = arg;
        const cached = this.callbackWrapperCache.get(cbRef.id);
        if (cached) return cached;

        const wrapper = async (...innerArgs: any[]) =>
          new Promise((resolve, reject) => {
            const reqId = "cb_req_" + Math.random().toString(36).substring(2);
            this.pendingCallbacks.set(reqId, { resolve, reject });

            // AbortSignal is not structured-cloneable; send a ref and forward
            // the abort event as its own message.
            const sanitizedArgs = innerArgs.map((inner) => {
              if (!(inner instanceof AbortSignal)) return inner;
              const abortId =
                "abort_" + Math.random().toString(36).substring(2);
              const ref: AbortSignalRef = {
                __type: "ABORT_SIGNAL_REF",
                abortId,
                aborted: inner.aborted,
              };
              if (!inner.aborted) {
                inner.addEventListener(
                  "abort",
                  () => {
                    try {
                      this.iframe?.contentWindow?.postMessage(
                        { type: "ABORT_SIGNAL", abortId } satisfies RpcMessage,
                        "*",
                      );
                    } catch {
                      // iframe already removed
                    }
                  },
                  { once: true },
                );
              }
              return ref;
            });

            const message = {
              type: "INVOKE_CALLBACK",
              id: cbRef.id,
              reqId,
              args: sanitizedArgs,
            };
            this.iframe?.contentWindow?.postMessage(
              message,
              "*",
              this.collectTransferables(message),
            );
          });

        this.callbackWrapperCache.set(cbRef.id, wrapper);
        return wrapper;
      }
      if (arg && arg.__type === "REMOTE_REF") {
        const remoteRef: RemoteRef = arg;
        const instance = this.instanceRegistry.get(remoteRef.id);
        if (instance) return instance;
      }
      if (arg && typeof arg === "object" && arg.constructor === Object) {
        let out: any = null;
        for (const [key, val] of Object.entries<any>(arg)) {
          if (val && val.__type === "ABORT_SIGNAL_REF") {
            if (!out) out = { ...arg };
            const abortRef: AbortSignalRef = val;
            const controller = new AbortController();
            if (abortRef.aborted) controller.abort();
            else this.abortControllers.set(abortRef.abortId, controller);
            usedAbortIds?.push(abortRef.abortId);
            out[key] = controller.signal;
          }
        }
        if (out) return out;
      }
      return arg;
    });
  }

  private replaceStreamsWithPorts(obj: any): {
    result: any;
    ports: MessagePort[];
    cleanups: (() => void)[];
  } {
    const ports: MessagePort[] = [];
    const cleanups: (() => void)[] = [];
    if (!obj || typeof obj !== "object")
      return { result: obj, ports, cleanups };

    const replace = (val: any): any => {
      if (!(val instanceof ReadableStream)) return val;

      const ch = new MessageChannel();
      ports.push(ch.port2);

      const reader = val.getReader();
      let credits = 0;
      let reading = false;
      let finished = false;

      const finish = () => {
        finished = true;
        ch.port1.onmessage = null;
        ch.port1.close();
        this.activeStreamCleanups.delete(cleanup);
      };

      const cleanup = () => {
        reader.cancel().catch(() => {});
        finish();
      };
      this.activeStreamCleanups.add(cleanup);
      cleanups.push(cleanup);

      const pump = async () => {
        if (reading || finished) return;
        reading = true;
        try {
          while (credits > 0 && !finished) {
            credits--;
            const { done, value } = await reader.read();
            if (finished) return;
            if (done) {
              ch.port1.postMessage({ done: true });
              finish();
              return;
            }
            ch.port1.postMessage({ done: false, value });
          }
        } catch (e: any) {
          try {
            ch.port1.postMessage({ done: true, error: e?.message });
          } catch {
            // port already gone
          }
          finish();
        } finally {
          reading = false;
        }
      };

      ch.port1.onmessage = (e: MessageEvent) => {
        if (e.data?.cancel) {
          reader.cancel();
          finish();
        } else if (e.data?.pull) {
          credits++;
          void pump();
        }
      };

      return { __type: "STREAM_PORT", portIndex: ports.length - 1 };
    };

    if (obj instanceof ReadableStream)
      return { result: replace(obj), ports, cleanups };
    if (obj.constructor === Object) {
      const out: any = {};
      for (const k of Object.keys(obj)) out[k] = replace(obj[k]);
      return { result: out, ports, cleanups };
    }
    return { result: obj, ports, cleanups };
  }

  private reconstructStreamsFromPorts(
    obj: any,
    ports: readonly MessagePort[],
  ): any {
    if (!obj || typeof obj !== "object") return obj;

    const reconstruct = (val: any): any => {
      if (val?.__type !== "STREAM_PORT" || typeof val.portIndex !== "number")
        return val;

      const port = ports[val.portIndex];
      if (!port)
        throw new Error(`Stream port at index ${val.portIndex} not received`);

      const cleanups = this.activeStreamCleanups;
      let cleanup: (() => void) | null = null;
      const unregister = () => {
        if (cleanup) {
          cleanups.delete(cleanup);
          cleanup = null;
        }
      };

      return new ReadableStream({
        start(controller) {
          port.onmessage = (e: MessageEvent) => {
            if (e.data.done) {
              if (e.data.error) controller.error(new Error(e.data.error));
              else controller.close();
              port.onmessage = null;
              port.close();
              unregister();
            } else {
              controller.enqueue(e.data.value);
            }
          };
          cleanup = () => {
            controller.error(new Error("Sandbox terminated"));
            port.onmessage = null;
            port.close();
          };
          cleanups.add(cleanup);
        },
        pull() {
          port.postMessage({ pull: true });
        },
        cancel() {
          port.postMessage({ cancel: true });
          port.onmessage = null;
          port.close();
          unregister();
        },
      });
    };

    if (obj.__type === "STREAM_PORT") return reconstruct(obj);
    if (obj.constructor === Object) {
      const out: any = {};
      for (const k of Object.keys(obj)) out[k] = reconstruct(obj[k]);
      return out;
    }
    return obj;
  }

  private closeActiveStreams() {
    for (const cleanup of [...this.activeStreamCleanups]) {
      try {
        cleanup();
      } catch {
        // a failed cleanup must not stop the rest
      }
    }
    this.activeStreamCleanups.clear();
  }

  run(container: HTMLElement | HTMLIFrameElement, userCode: string) {
    if (container instanceof HTMLIFrameElement) {
      this.iframe = container;
    } else {
      this.iframe = document.createElement("iframe");
      container.appendChild(this.iframe);
    }
    const frame = this.iframe;

    frame.style.width = "100%";
    frame.style.height = "100%";
    frame.style.border = "none";
    frame.style.backgroundColor = "transparent";

    frame.sandbox.add("allow-scripts");
    frame.sandbox.add("allow-modals");

    // Chromium-only; the meta tag in the document below is what enforces the
    // same policy everywhere else.
    frame.setAttribute("csp", this.csp);

    const messageHandler = async (event: MessageEvent) => {
      if (event.source !== frame.contentWindow) return;
      const data = event.data as RpcMessage;

      if (data.type === "CALLBACK_RETURN") {
        const req = this.pendingCallbacks.get(data.reqId!);
        if (req) {
          if (data.error) req.reject(new Error(data.error));
          else {
            try {
              req.resolve(
                this.reconstructStreamsFromPorts(data.result, event.ports),
              );
            } catch (e) {
              req.reject(e);
            }
          }
          this.pendingCallbacks.delete(data.reqId!);
        }
        return;
      }

      if (data.type === "ABORT_SIGNAL") {
        const controller = this.abortControllers.get(data.abortId!);
        if (controller) {
          controller.abort();
          this.abortControllers.delete(data.abortId!);
        }
        return;
      }

      if (data.type === "RELEASE_INSTANCE") {
        this.instanceRegistry.delete(data.id!);
        return;
      }

      if (data.type !== "CALL_ROOT" && data.type !== "CALL_INSTANCE") return;

      const response: RpcMessage = { type: "RESPONSE", reqId: data.reqId };
      const usedAbortIds: string[] = [];
      let transferables: Transferable[] = [];
      let streamCleanups: (() => void)[] = [];

      const rollbackStreams = () => {
        for (const cleanup of streamCleanups) {
          try {
            cleanup();
          } catch {
            // a failed rollback must not mask the original error
          }
        }
        streamCleanups = [];
      };

      try {
        const args = this.deserializeArgs(data.args || [], usedAbortIds);
        let result: unknown;

        if (data.type === "CALL_ROOT") {
          const fn = this.apiFactory[data.method!];
          if (typeof fn !== "function")
            throw new Error(`API method ${data.method} not found`);
          result = await fn(...args);
        } else {
          const instance = this.instanceRegistry.get(data.id!);
          if (!instance) throw new Error("Instance not found or released");
          if (typeof instance[data.method!] !== "function")
            throw new Error(`Method ${data.method} missing on instance`);
          result = await instance[data.method!](...args);
        }

        response.result = this.serialize(result);
        const {
          result: streamResult,
          ports: streamPorts,
          cleanups,
        } = this.replaceStreamsWithPorts(response.result);
        response.result = streamResult;
        streamCleanups = cleanups;
        transferables = this.collectTransferables(response, streamPorts);
      } catch (err: any) {
        rollbackStreams();
        delete response.result;
        response.error = err?.message || String(err || "Host execution error");
      } finally {
        for (const id of usedAbortIds) this.abortControllers.delete(id);
      }

      try {
        frame.contentWindow?.postMessage(response, "*", transferables);
      } catch (error) {
        rollbackStreams();
        try {
          frame.contentWindow?.postMessage(
            {
              type: "RESPONSE",
              reqId: data.reqId,
              error:
                "Failed to post message to iframe: " +
                ((error as Error)?.message || String(error)),
            },
            "*",
          );
        } catch {
          // iframe already torn down
        }
      }
    };

    this.messageHandlerRef = messageHandler;
    window.addEventListener("message", this.messageHandlerRef);

    // The meta CSP is removed by the first guest statement: the policy stays in
    // force once applied, and dropping the tag keeps plugin code from reading
    // the nonce back out of the document.
    frame.srcdoc = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="${this.csp}" id="csp-meta">
</head>
<body>
<script nonce="${this.nonce}">
document.querySelector('meta#csp-meta')?.remove();
(async () => {
${GUEST_BRIDGE_SCRIPT}
(async () => {
${escapeForScriptBlock(userCode)}
})();
})();
</script>
</body>
</html>`;

    return () => this.terminate();
  }

  terminate() {
    if (this.messageHandlerRef) {
      window.removeEventListener("message", this.messageHandlerRef);
      this.messageHandlerRef = null;
    }
    this.iframe?.remove();
    this.iframe = null;
    this.closeActiveStreams();
    this.instanceRegistry.clear();
    this.pendingCallbacks.clear();
    this.abortControllers.clear();
    this.callbackWrapperCache.clear();
  }
}
