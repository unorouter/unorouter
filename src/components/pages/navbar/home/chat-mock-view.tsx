import { CompanyName, LogoImage } from "@/components/elements/brand/brand";
import { VendorIcon } from "@/components/elements/brand/vendor-icon";
import { Icon } from "@/components/ui/icon";

export type MockConv = { vendor: string; label: string; message: string };
export type MockModel = { vendor: string; name: string };
export type MockMenuItem = { icon: string; label: string };
// One RP feature's dialog: a title + a few representative rows (name + subtitle).
export type MockDialog = {
  title: string;
  rows: { name: string; sub: string }[];
};

// Server-resolved content + translated strings; identical for the static shell and the
// animated layer so they paint the same layout.
export type MockData = {
  convs: MockConv[];
  models: MockModel[];
  menu: MockMenuItem[];
  // Per-RP-feature dialog content, indexed parallel to menu + the trailing Local DB row.
  dialogs: MockDialog[];
  strings: {
    newChat: string;
    free: string;
    input: string;
    tokens: string;
    menuLabel: string;
    localDb: string;
    newChatEmpty: string;
    demoUser: string;
    demoAi: string;
  };
};

// What the demo is currently showing. The static shell renders DEFAULT_MOCK_STATE; the
// animated driver mutates this over the timeline.
export type MockState = {
  activeConv: number;
  modelOpen: boolean;
  modelPicked: number;
  rpOpen: boolean;
  rpActive: number;
  isNewChat: boolean;
  // New-chat simulation: text being typed into the composer, the sent user turn, the
  // assistant typing indicator, and the streamed-in assistant reply.
  typedText: string;
  userMsg: string;
  aiTyping: boolean;
  aiMsg: string;
  // Which RP feature dialog is open (index into data.menu + the trailing Local DB row), or
  // null. Opening a menu row pops its real dialog; the demo then closes it.
  rpDialog: number | null;
};

export const DEFAULT_MOCK_STATE: MockState = {
  activeConv: 0,
  modelOpen: false,
  modelPicked: 0,
  rpOpen: true,
  rpActive: 0,
  isNewChat: false,
  typedText: "",
  userMsg: "",
  aiTyping: false,
  aiMsg: "",
  rpDialog: null,
};

export function ChatMockView(props: { data: MockData; state: MockState }) {
  const data = props.data;
  const state = props.state;
  const activeModel = data.models[state.modelPicked] ?? data.models[0];
  const activeConvData = data.convs[state.activeConv] ?? data.convs[0];

  return (
    <div className="bg-card border-border flex h-104 w-full overflow-hidden rounded-xl border font-sans shadow-2xl">
      {/* sidebar */}
      <div className="border-border/60 bg-muted/30 hidden w-40 shrink-0 flex-col border-r p-2.5 sm:flex">
        <div className="mb-3 flex items-center gap-1.5 px-1">
          <LogoImage width={16} height={16} className="h-4 w-4" />
          <CompanyName className="text-[10px]" />
        </div>
        <div
          data-demo="newChat"
          className={`mb-2 flex items-center gap-1.5 rounded border px-2 py-1.5 transition-colors ${
            state.isNewChat
              ? "text-foreground border-purple-500/50 bg-purple-500/10"
              : "bg-background/60 border-border/50 text-muted-foreground"
          }`}
        >
          <Icon name="plus" className="h-2.5 w-2.5" />
          <span className="font-mono text-[9px] tracking-wide">
            {data.strings.newChat}
          </span>
        </div>
        <div className="space-y-0.5">
          {data.convs.map((c, i) => (
            <div
              key={c.label}
              data-demo={`conv${i}`}
              className={`flex items-center gap-1.5 rounded px-2 py-1.5 transition-colors ${
                !state.isNewChat && state.activeConv === i
                  ? "bg-accent text-foreground"
                  : "text-muted-foreground"
              }`}
            >
              <span className="flex size-3 shrink-0 items-center justify-center">
                <VendorIcon vendor={c.vendor} size={12} />
              </span>
              <span className="truncate font-mono text-[9px] tracking-tight">
                {c.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* main pane */}
      <div className="relative flex min-w-0 flex-1 flex-col">
        {/* top bar */}
        <div className="border-border/60 flex items-center gap-2 border-b px-3 py-2.5">
          <div
            data-demo="modelPill"
            className="border-border bg-background/60 flex items-center gap-1.5 rounded border px-2 py-1"
          >
            <span className="flex size-3.5 shrink-0 items-center justify-center">
              <VendorIcon vendor={activeModel?.vendor ?? ""} size={14} />
            </span>
            <span className="text-foreground/80 max-w-28 truncate font-mono text-[9px]">
              {activeModel?.name}
            </span>
            <span className="rounded bg-emerald-500/15 px-1 py-0.5 text-[8px] leading-none font-medium text-emerald-700 dark:text-emerald-300">
              {data.strings.free}
            </span>
          </div>
          <div className="flex-1" />
          <span data-demo="rpToggle">
            <Icon
              name="ellipsis-vertical"
              className="text-muted-foreground h-3.5 w-3.5"
            />
          </span>

          {/* model dropdown */}
          {state.modelOpen ? (
            <div className="border-border bg-popover absolute top-9 left-3 z-20 w-44 overflow-hidden rounded-md border shadow-xl">
              {data.models.map((m, i) => (
                <div
                  key={m.name}
                  data-demo={`model${i}`}
                  className={`flex items-center gap-2 px-3 py-1.5 ${
                    state.modelPicked === i ? "bg-accent" : ""
                  }`}
                >
                  <span className="flex size-3.5 shrink-0 items-center justify-center">
                    <VendorIcon vendor={m.vendor} size={14} />
                  </span>
                  <span className="text-foreground/90 truncate font-mono text-[10px]">
                    {m.name}
                  </span>
                  <span className="ml-auto rounded bg-emerald-500/15 px-1 py-0.5 text-[8px] leading-none font-medium text-emerald-700 dark:text-emerald-300">
                    {data.strings.free}
                  </span>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        {/* message */}
        <div className="flex-1 space-y-2 overflow-hidden px-4 py-3">
          {state.isNewChat ? (
            state.userMsg ? (
              <div className="space-y-3">
                {/* user turn */}
                <div className="flex justify-end">
                  <span className="bg-primary/15 text-foreground/90 max-w-[80%] rounded-lg px-3 py-1.5 text-[12px] leading-relaxed">
                    {state.userMsg}
                  </span>
                </div>
                {/* assistant turn: typing dots, then streamed reply */}
                {state.aiTyping ? (
                  <div className="flex items-center gap-1 px-1">
                    <span className="bg-muted-foreground/50 size-1.5 animate-bounce rounded-full [animation-delay:-0.2s]" />
                    <span className="bg-muted-foreground/50 size-1.5 animate-bounce rounded-full [animation-delay:-0.1s]" />
                    <span className="bg-muted-foreground/50 size-1.5 animate-bounce rounded-full" />
                  </div>
                ) : state.aiMsg ? (
                  <p className="text-foreground/90 text-[13px] leading-relaxed">
                    {state.aiMsg}
                  </p>
                ) : null}
              </div>
            ) : (
              <div className="flex h-full items-center justify-center">
                <span className="text-muted-foreground/50 font-mono text-[11px]">
                  {data.strings.newChatEmpty}
                </span>
              </div>
            )
          ) : (
            <>
              <div className="text-muted-foreground/70 font-mono text-[9px] tracking-wider uppercase">
                {activeConvData?.label}
              </div>
              <p className="text-foreground/90 line-clamp-5 text-[13px] leading-relaxed">
                {activeConvData?.message}
              </p>
              <div className="text-muted-foreground/60 flex items-center gap-2 pt-1 font-mono text-[9px]">
                <Icon name="copy" className="h-3 w-3" />
                <Icon name="refresh-cw" className="h-3 w-3" />
                <Icon name="pencil" className="h-3 w-3" />
                <span className="ml-auto tabular-nums">
                  {data.strings.tokens}
                </span>
              </div>
            </>
          )}
        </div>

        {/* input - shows the message being "typed" during the new-chat sim */}
        <div className="border-border/60 border-t px-3 py-2.5">
          <div
            data-demo="input"
            className="border-border bg-background/60 rounded border px-3 py-2 font-mono text-[10px]"
          >
            {state.typedText ? (
              <span className="text-foreground/90">
                {state.typedText}
                <span className="bg-foreground/70 ml-px inline-block h-3 w-px animate-pulse align-middle" />
              </span>
            ) : (
              <span className="text-muted-foreground">
                {data.strings.input}
              </span>
            )}
          </div>
        </div>

        {/* RP feature menu, floating like the real one */}
        {state.rpOpen ? (
          <div className="border-border bg-popover absolute top-9 right-2 z-20 w-44 overflow-hidden rounded-md border shadow-xl">
            <div className="border-border/50 text-muted-foreground border-b px-3 py-1.5 font-mono text-[8px] tracking-[0.2em] uppercase">
              {data.strings.menuLabel}
            </div>
            {data.menu.map((m, i) => (
              <div
                key={m.label}
                data-demo={`rp${i}`}
                className={`flex items-center gap-2.5 px-3 py-1.5 ${
                  state.rpActive === i ? "bg-accent" : ""
                }`}
              >
                <Icon
                  name={m.icon}
                  className="text-muted-foreground h-3 w-3 shrink-0"
                />
                <span className="text-foreground/90 font-sans text-[11px]">
                  {m.label}
                </span>
              </div>
            ))}
            <div
              data-demo={`rp${data.menu.length}`}
              className={`border-border/50 flex items-center gap-2.5 border-t px-3 py-1.5 ${
                state.rpActive === data.menu.length ? "bg-accent" : ""
              }`}
            >
              <Icon name="database" className="text-muted-foreground h-3 w-3" />
              <span className="text-foreground/90 font-sans text-[11px]">
                {data.strings.localDb}
              </span>
            </div>
          </div>
        ) : null}

        {/* RP feature dialog: opening a menu row pops its real panel over the pane */}
        {state.rpDialog !== null && data.dialogs[state.rpDialog] ? (
          <div className="bg-background/70 absolute inset-0 z-30 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="border-border bg-card animate-in fade-in zoom-in-95 flex max-h-full w-full max-w-72 flex-col overflow-hidden rounded-lg border shadow-2xl duration-150">
              <div className="border-border/60 flex items-center justify-between border-b px-3 py-2">
                <div className="flex items-center gap-2">
                  <Icon
                    name={rpIcon(data, state.rpDialog)}
                    className="text-muted-foreground h-3 w-3"
                  />
                  <span className="text-foreground text-[11px] font-medium">
                    {data.dialogs[state.rpDialog].title}
                  </span>
                </div>
                <Icon
                  name="circle-x"
                  className="text-muted-foreground h-3 w-3"
                />
              </div>
              <div className="divide-border/40 min-h-0 flex-1 divide-y overflow-hidden">
                {data.dialogs[state.rpDialog].rows.map((row) => (
                  <div
                    key={row.name}
                    className="flex items-center gap-2.5 px-3 py-2"
                  >
                    <span className="bg-accent flex size-6 shrink-0 items-center justify-center rounded">
                      <Icon
                        name={rpIcon(data, state.rpDialog!)}
                        className="text-muted-foreground h-3 w-3"
                      />
                    </span>
                    <span className="min-w-0">
                      <span className="text-foreground/90 block truncate text-[11px]">
                        {row.name}
                      </span>
                      <span className="text-muted-foreground block truncate text-[9px]">
                        {row.sub}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

// Icon for an RP dialog index: menu rows use their own icon; the trailing Local DB
// dialog uses the database icon.
function rpIcon(data: MockData, index: number): string {
  return data.menu[index]?.icon ?? "database";
}
