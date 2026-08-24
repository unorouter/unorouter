export const TRIGGER_EVENT_MODES = [
  "start", // before send (server, during assembly)
  "input", // after user input (client)
  "output", // after AI output (client)
  "display", // render time, sandboxed (client)
  "request", // on the formated array, sandboxed (server)
  "manual", // invoked by name
] as const;

export type TriggerEventMode = (typeof TRIGGER_EVENT_MODES)[number];

export function isTriggerEventMode(v: unknown): v is TriggerEventMode {
  return TRIGGER_EVENT_MODES.some((m) => m === v);
}

export type ConditionType = "var" | "value" | "chatindex" | "exists";
export type ConditionOperator =
  "=" | "!=" | ">" | "<" | ">=" | "<=" | "null" | "true";

export type TriggerCondition =
  | {
      type: "var" | "value" | "chatindex";
      var: string;
      value: string;
      operator: ConditionOperator;
    }
  | {
      type: "exists";
      value: string;
      type2: "strict" | "loose" | "regex";
      depth: number;
    };

export type TriggerEffect = {
  type: string;
  indent?: number;
  endOfLoop?: boolean;
  var?: string;
  varType?: "value" | "var";
  value?: string | boolean;
  valueType?: "value" | "var";
  operator?: string;
  condition?: string;
  index?: string;
  indexType?: "value" | "var";
  key?: string;
  keyType?: "value" | "var";
  outputVar?: string;
  inputVar?: string;
  source?: string;
  sourceType?: "value" | "var";
  target?: string;
  targetType?: "value" | "var";
  source1?: string;
  source1Type?: "value" | "var";
  source2?: string;
  source2Type?: "value" | "var";
  start?: string;
  startType?: "value" | "var";
  end?: string;
  endType?: "value" | "var";
  min?: string;
  minType?: "value" | "var";
  max?: string;
  maxType?: "value" | "var";
  item?: string;
  itemType?: "value" | "var";
  depth?: string;
  depthType?: "value" | "var";
  delimiter?: string;
  delimiterType?: "value" | "var" | "regex";
  regex?: string;
  regexType?: "value" | "var";
  flags?: string;
  flagsType?: "value" | "var";
  result?: string;
  resultType?: "value" | "var";
  replacement?: string;
  replacementType?: "value" | "var";
  expression?: string;
  expressionType?: "value" | "var";
  display?: string;
  displayType?: "value" | "var";
  role?: "user" | "assistant" | "system" | "char";
  location?: "start" | "historyend" | "promptend";
  content?: string;
  contentType?: "value" | "var";
  name?: string;
  nameType?: "value" | "var";
  insertOrder?: string;
  insertOrderType?: "value" | "var";
  model?: "model" | "submodel";
  [k: string]: unknown;
};

export type TriggerScript = {
  comment: string;
  type: TriggerEventMode;
  conditions: TriggerCondition[];
  effect: TriggerEffect[];
  lowLevelAccess?: boolean;
};

export type TriggerMessage = {
  role: "user" | "assistant" | "system";
  data: string;
};

export type TriggerLore = {
  id?: string;
  comment: string;
  content: string;
  key: string;
  alwaysActive: boolean;
  insertOrder?: number;
};

export type TriggerContext = {
  mode: TriggerEventMode;
  vars: Record<string, string>;
  globalVars: Record<string, string>;
  chat: TriggerMessage[];
  charDesc: string;
  personaDesc: string;
  authorNote: string;
  replaceGlobalNote: string;
  lore: TriggerLore[];
  additionalSysPrompt: { start: string; historyend: string; promptend: string };
  formated?: { role: string; content: string }[];
  displayData?: string;
  stopSending?: boolean;
  sendAIprompt?: boolean;
  lowLevelAccess?: boolean;
  ops?: TriggerOps;
  parse?: (s: string) => string;
  defaultVars?: Record<string, string>;
  charName: string;
  userName: string;
  firstMessage?: string;
};

export type TriggerOps = {
  runLLM?: (prompt: string) => Promise<string>;
  similarity?: (source: string, values: string[]) => Promise<string[]>;
  imgGen?: (prompt: string, negative: string) => Promise<string>;
  alert?: (
    kind: "normal" | "error" | "input" | "select",
    text: string,
    options?: string[],
  ) => Promise<string>;
  runLua?: (code: string) => Promise<void>;
};

export type TriggerRunResult = {
  context: TriggerContext;
  stopped: boolean;
};
