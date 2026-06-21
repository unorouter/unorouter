"use client";

import {
  ChatMockView,
  DEFAULT_MOCK_STATE,
  type MockData,
  type MockState,
} from "@/components/pages/navbar/home/chat-mock-view";
import { useAnimate, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";

const BASE: MockState = { ...DEFAULT_MOCK_STATE, rpOpen: false, rpActive: 0 };

export function ChatMockAnimated(props: { data: MockData }) {
  const reduced = useReducedMotion();
  const [scope, animate] = useAnimate();
  const [state, setState] = useState<MockState>(DEFAULT_MOCK_STATE);
  const [clicking, setClicking] = useState(false);
  const [cursorShown, setCursorShown] = useState(false);

  const visibleRef = useRef(true);
  // Latest data without retriggering the effect (server-static per page anyway).
  const dataRef = useRef(props.data);
  dataRef.current = props.data;

  useEffect(() => {
    if (reduced) return;
    const root = scope.current as HTMLElement | null;
    if (!root) return;

    const data = dataRef.current;
    const menuLen = data.menu.length;
    const modelCount = data.models.length;
    let alive = true;

    const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
    // Resolve when the demo is allowed to keep running (visible + tab focused).
    const waitVisible = async () => {
      while (alive && !(visibleRef.current && !document.hidden)) {
        await sleep(200);
      }
    };

    const cursor = () => root.querySelector<HTMLElement>("[data-cursor]");

    const moveTo = async (key: string) => {
      const el = root.querySelector<HTMLElement>(`[data-demo="${key}"]`);
      const cur = cursor();
      if (!el || !cur) return;
      const c = root.getBoundingClientRect();
      const r = el.getBoundingClientRect();
      setCursorShown(true);
      await animate(
        cur,
        { x: r.left - c.left + r.width / 2, y: r.top - c.top + r.height / 2 },
        { type: "spring", stiffness: 220, damping: 26 },
      );
    };

    const click = async () => {
      setClicking(true);
      await sleep(220);
      setClicking(false);
    };

    // Snap to a UI state, glide+click a target, hold.
    const beat = async (next: MockState, target: string, hold: number) => {
      if (!alive) return;
      setState(next);
      await sleep(90);
      if (!alive) return;
      await moveTo(target);
      if (!alive) return;
      await click();
      await sleep(hold);
    };

    const demoUser = data.strings.demoUser;
    const demoAi = data.strings.demoAi;

    // Type the user message into the composer, send, show typing, stream the reply in.
    const chatSim = async (base: MockState) => {
      await moveTo("input");
      for (let i = 1; i <= demoUser.length && alive; i++) {
        setState({ ...base, isNewChat: true, typedText: demoUser.slice(0, i) });
        await sleep(38);
      }
      await sleep(350);
      // Send: clear composer, show the user turn + typing indicator.
      setState({
        ...base,
        isNewChat: true,
        typedText: "",
        userMsg: demoUser,
        aiTyping: true,
      });
      await sleep(1100);
      // Stream the reply word by word.
      const words = demoAi.split(" ");
      for (let w = 1; w <= words.length && alive; w++) {
        setState({
          ...base,
          isNewChat: true,
          userMsg: demoUser,
          aiTyping: false,
          aiMsg: words.slice(0, w).join(" "),
        });
        await sleep(85);
      }
      await sleep(1600);
    };

    const loop = async () => {
      while (alive) {
        await waitVisible();
        // 1. Walk the three chats.
        await beat({ ...BASE, activeConv: 0 }, "conv0", 1500);
        await beat({ ...BASE, activeConv: 1 }, "conv1", 1700);
        await beat({ ...BASE, activeConv: 2 }, "conv2", 1700);
        if (!alive) break;

        // 2. New chat, then simulate a full exchange.
        await beat({ ...BASE, isNewChat: true }, "newChat", 700);
        await waitVisible();
        await chatSim(BASE);
        if (!alive) break;

        // 3. Model dropdown - cycle the real free models, pick the last.
        await beat(
          { ...BASE, modelOpen: true, modelPicked: 0 },
          "modelPill",
          900,
        );
        for (let i = 0; i < modelCount && alive; i++) {
          await beat(
            { ...BASE, modelOpen: true, modelPicked: i },
            `model${i}`,
            750,
          );
        }
        await beat({ ...BASE, modelPicked: modelCount - 1 }, "modelPill", 900);
        if (!alive) break;

        // 4. RP menu - open each feature's real dialog, then close it.
        const picked = modelCount - 1;
        await beat(
          { ...BASE, modelPicked: picked, rpOpen: true, rpActive: 0 },
          "rpToggle",
          800,
        );
        for (let i = 0; i <= menuLen && alive; i++) {
          // highlight the row
          await beat(
            { ...BASE, modelPicked: picked, rpOpen: true, rpActive: i },
            `rp${i}`,
            350,
          );
          // open its dialog
          setState({ ...BASE, modelPicked: picked, rpDialog: i });
          await sleep(1500);
          if (!alive) break;
          // close, reopen the menu for the next feature
          setState({
            ...BASE,
            modelPicked: picked,
            rpOpen: true,
            rpActive: Math.min(i + 1, menuLen),
          });
          await sleep(300);
        }
        // reset back to the first chat before looping
        setState({ ...BASE, activeConv: 0 });
        await sleep(900);
      }
    };

    const io = new IntersectionObserver(
      (entries) => {
        visibleRef.current = entries[0]?.isIntersecting ?? false;
      },
      { threshold: 0.25 },
    );
    io.observe(root);

    void loop();

    return () => {
      alive = false;
      io.disconnect();
    };
  }, [reduced, scope, animate]);

  // Reduced motion: the static, fully-open look, no cursor, no timers.
  if (reduced) {
    return <ChatMockView data={props.data} state={DEFAULT_MOCK_STATE} />;
  }

  return (
    <div ref={scope} className="relative">
      <ChatMockView data={props.data} state={state} />
      <div
        data-cursor
        className="pointer-events-none absolute top-0 left-0 z-40"
        style={{ opacity: cursorShown ? 1 : 0 }}
      >
        <div className="relative -translate-x-1/2 -translate-y-1/2">
          {clicking ? (
            <span className="absolute top-1/2 left-1/2 size-6 -translate-x-1/2 -translate-y-1/2 animate-ping rounded-full bg-purple-500/40" />
          ) : null}
          <svg
            viewBox="0 0 24 24"
            aria-hidden
            className={`h-4 w-4 drop-shadow transition-transform ${
              clicking ? "scale-90" : "scale-100"
            }`}
          >
            <path
              d="M5 3l14 7-6 2-2 6-6-15z"
              className="fill-purple-600 stroke-white dark:fill-white dark:stroke-purple-900"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}
