// Ported from RisuAI's plugin API V3 sandbox (src/ts/plugins/apiV3/factory.ts).
// Copyright (C) 2024 Kwaroran, GPL-3.0. Combined into this AGPL-3.0 work under
// GPLv3 section 13.

type RpcMessage = {
  type: "CALL_ROOT" | "CALLBACK_RETURN" | "EXEC_RESULT" | "RESPONSE";
  reqId?: string;
  method?: string;
  args?: unknown[];
  result?: unknown;
  error?: string;
};

const GUEST_BRIDGE_SCRIPT = `
await (async function() {
    const pendingRequests = new Map();
    const callbackRegistry = new Map();
    const callbackIdByFunction = new WeakMap();

    function serializeArg(arg) {
        if (typeof arg !== 'function') return arg;
        let id = callbackIdByFunction.get(arg);
        if (!id) {
            id = 'cb_' + Math.random().toString(36).substring(2);
            callbackRegistry.set(id, arg);
            callbackIdByFunction.set(arg, id);
        }
        return { __type: 'CALLBACK_REF', id: id };
    }

    function send(payload) {
        window.parent.postMessage(payload, '*');
    }

    function sendRequest(method, args) {
        return new Promise((resolve, reject) => {
            const reqId = Math.random().toString(36).substring(7);
            pendingRequests.set(reqId, { resolve, reject });
            send({ type: 'CALL_ROOT', reqId, method, args: args.map(serializeArg) });
        });
    }

    window.addEventListener('message', async (event) => {
        const data = event.data;
        if (!data) return;

        if (data.type === 'RESPONSE' && data.reqId) {
            const req = pendingRequests.get(data.reqId);
            if (!req) return;
            pendingRequests.delete(data.reqId);
            if (data.error) req.reject(new Error(data.error));
            else req.resolve(data.result);
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

        else if (data.type === 'INVOKE_CALLBACK' && data.id) {
            const fn = callbackRegistry.get(data.id);
            const response = { type: 'CALLBACK_RETURN', reqId: data.reqId };
            try {
                if (!fn) throw new Error("Callback not found or released");
                response.result = await fn(...(data.args || []));
            } catch (e) {
                response.error = (e && e.message) || String(e || "Guest callback error");
            }
            try {
                send(response);
            } catch (e) {
                send({
                    type: 'CALLBACK_RETURN',
                    reqId: data.reqId,
                    error: 'Failed to post message to parent: ' + ((e && e.message) || String(e))
                });
            }
        }
    });

    const propertyCache = new Map();

    window.uno = new Proxy({}, {
        get: (target, prop) => {
            if (propertyCache.has(prop)) {
                return propertyCache.get(prop);
            }
            return (...args) => sendRequest(prop, args);
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

// SECURITY: a literal closing tag would end the <script> early and run the rest
// as markup outside the nonce.
function escapeForScriptBlock(code: string): string {
  return code.replace(/<\/(script)/gi, "<\\/$1");
}

function isCallbackRef(
  v: unknown,
): v is { __type: "CALLBACK_REF"; id: string } {
  return (
    !!v &&
    typeof v === "object" &&
    "__type" in v &&
    v.__type === "CALLBACK_REF" &&
    "id" in v &&
    typeof v.id === "string"
  );
}

export class SandboxHost {
  private iframe: HTMLIFrameElement | null = null;
  private apiFactory: Record<string, unknown>;
  private nonce = crypto.randomUUID();
  // 'unsafe-eval' is REQUIRED, not an oversight: without it every plugin fails
  // CSP. Network is denied everywhere, not only connect-src: remote img, font, media
  // or style loads carried the whole chat out in a URL past the httpRequest limit.
  // A plugin that needs a remote asset fetches it through httpRequest into a blob.
  private csp = `connect-src 'none'; script-src 'nonce-${this.nonce}' 'unsafe-eval' 'wasm-unsafe-eval'; frame-src 'none'; object-src 'none'; style-src 'unsafe-inline'; default-src 'none'; img-src data: blob:; font-src data: blob:; media-src data: blob:; base-uri 'none'; form-action 'none';`;

  private messageHandlerRef: ((event: MessageEvent) => void) | null = null;
  private callbackWrapperCache = new Map<
    string,
    (...a: unknown[]) => Promise<unknown>
  >();
  private pendingCallbacks = new Map<
    string,
    { resolve: (v: unknown) => void; reject: (e: unknown) => void }
  >();

  constructor(apiFactory: Record<string, unknown>) {
    this.apiFactory = apiFactory;
  }

  executeInIframe(code: string): Promise<unknown> {
    const frame = this.iframe;
    if (!frame) return Promise.reject(new Error("sandbox not running"));
    return new Promise((resolve, reject) => {
      const reqId = "exec_" + Math.random().toString(36).substring(2);
      this.pendingCallbacks.set(reqId, { resolve, reject });
      frame.contentWindow?.postMessage(
        { type: "EXECUTE_CODE", reqId, code },
        "*",
      );
    });
  }

  private deserializeArg(arg: unknown): unknown {
    if (!isCallbackRef(arg)) return arg;
    const cached = this.callbackWrapperCache.get(arg.id);
    if (cached) return cached;
    const wrapper = (...args: unknown[]) =>
      new Promise((resolve, reject) => {
        const reqId = "cb_req_" + Math.random().toString(36).substring(2);
        this.pendingCallbacks.set(reqId, { resolve, reject });
        this.iframe?.contentWindow?.postMessage(
          { type: "INVOKE_CALLBACK", id: arg.id, reqId, args },
          "*",
        );
      });
    this.callbackWrapperCache.set(arg.id, wrapper);
    return wrapper;
  }

  run(frame: HTMLIFrameElement, userCode: string) {
    this.iframe = frame;

    frame.style.width = "100%";
    frame.style.height = "100%";
    frame.style.border = "none";
    frame.style.backgroundColor = "transparent";

    frame.sandbox.add("allow-scripts");

    // Chromium-only; the meta tag below enforces the same policy elsewhere.
    frame.setAttribute("csp", this.csp);

    const messageHandler = async (event: MessageEvent) => {
      if (event.source !== frame.contentWindow) return;
      const data: RpcMessage = event.data;
      if (!data?.reqId) return;

      if (data.type === "CALLBACK_RETURN" || data.type === "EXEC_RESULT") {
        const req = this.pendingCallbacks.get(data.reqId);
        if (!req) return;
        this.pendingCallbacks.delete(data.reqId);
        if (data.error) req.reject(new Error(data.error));
        else req.resolve(data.result);
        return;
      }

      if (data.type !== "CALL_ROOT") return;
      const response: RpcMessage = { type: "RESPONSE", reqId: data.reqId };
      try {
        // Own properties only: constructor/toString/valueOf are functions on
        // Object.prototype and would otherwise satisfy the typeof check.
        const method = data.method ?? "";
        const fn = Object.hasOwn(this.apiFactory, method)
          ? this.apiFactory[method]
          : undefined;
        if (typeof fn !== "function")
          throw new Error(`API method ${method} not found`);
        response.result = await fn(
          ...(data.args ?? []).map((a) => this.deserializeArg(a)),
        );
      } catch (err) {
        response.error =
          err instanceof Error ? err.message : String(err ?? "Host error");
      }

      try {
        frame.contentWindow?.postMessage(response, "*");
      } catch (error) {
        try {
          frame.contentWindow?.postMessage(
            {
              type: "RESPONSE",
              reqId: data.reqId,
              error: `Failed to post message to iframe: ${error instanceof Error ? error.message : String(error)}`,
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

    // A meta CSP stays in force once parsed, so removing the tag does not lift
    // connect-src 'none'. The nonce stays readable off the script element and
    // grants nothing: unsafe-eval is already allowed, and script-src has no
    // host source, so a nonced remote script still cannot load.
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
    for (const pending of this.pendingCallbacks.values())
      pending.reject(new Error("sandbox terminated"));
    this.pendingCallbacks.clear();
    this.callbackWrapperCache.clear();
  }
}
