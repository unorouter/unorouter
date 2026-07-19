/* eslint-disable react-hooks/refs */
"use client";

import { sleep } from "@/lib/utils/base";
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
  const dataRef = useRef(props.data);
  dataRef.current = props.data;

  useEffect(() => {
    if (reduced) return;
    const root = scope.current as HTMLElement | null;
    if (!root) return;

    const data = dataRef.current;
    const menuLen = data.menu.length;
    let alive = true;

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

    const chatSim = async (
      base: MockState,
      user: string,
      ai: string,
      newTitle?: string,
    ) => {
      const typingBase: MockState = newTitle
        ? { ...base, newConvTitle: data.strings.newChat }
        : base;
      const sentBase: MockState = newTitle
        ? { ...base, newConvTitle: newTitle }
        : base;
      await moveTo("input");
      for (let i = 1; i <= user.length && alive; i++) {
        setState({ ...typingBase, typedText: user.slice(0, i) });
        await sleep(34);
      }
      await sleep(300);
      setState({ ...sentBase, typedText: "", userMsg: user, aiTyping: true });
      await sleep(1000);
      const words = ai.split(" ");
      for (let w = 1; w <= words.length && alive; w++) {
        setState({
          ...sentBase,
          userMsg: user,
          aiTyping: false,
          aiMsg: words.slice(0, w).join(" "),
        });
        await sleep(80);
      }
      await sleep(1400);
    };

    const convCount = data.convs.length;

    const loop = async () => {
      while (alive) {
        await waitVisible();
        await chatSim(
          { ...BASE, activeConv: 0 },
          data.convs[0].demoUser,
          data.convs[0].demoAi,
        );
        if (!alive) break;

        for (let c = 1; c < convCount && alive; c++) {
          const last = c === convCount - 1;
          await beat({ ...BASE, activeConv: c }, `conv${c}`, last ? 900 : 1600);
          if (last) {
            await waitVisible();
            await chatSim(
              { ...BASE, activeConv: c },
              data.convs[c].demoUser,
              data.convs[c].demoAi,
            );
          }
        }
        if (!alive) break;

        await moveTo("newChat");
        await click();
        setState({
          ...BASE,
          isNewChat: true,
          newConvTitle: data.strings.newChat,
        });
        await sleep(700);
        await waitVisible();
        await chatSim(
          { ...BASE, isNewChat: true },
          data.newChat.demoUser,
          data.newChat.demoAi,
          data.newChat.title,
        );
        if (!alive) break;

        const picked = 0;
        await beat(
          { ...BASE, modelOpen: true, modelPicked: picked },
          "modelPill",
          1600,
        );
        if (!alive) break;

        await beat(
          { ...BASE, modelPicked: picked, rpOpen: true, rpActive: 0 },
          "rpToggle",
          800,
        );
        for (let i = 0; i <= menuLen && alive; i++) {
          await beat(
            { ...BASE, modelPicked: picked, rpOpen: true, rpActive: i },
            `rp${i}`,
            350,
          );
          setState({ ...BASE, modelPicked: picked, rpDialog: i });
          await sleep(1500);
          if (!alive) break;
          setState({
            ...BASE,
            modelPicked: picked,
            rpOpen: true,
            rpActive: Math.min(i + 1, menuLen),
          });
          await sleep(300);
        }
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
