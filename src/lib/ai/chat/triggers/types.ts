    // Trigger engine types (RisuAI V2 effect VM port). Isomorphic: no server-only imports, so stream service and client runtime share the VM.

export type TriggerEventMode =
  | "start" // before send (server, during assembly)
  | "input" // after user input (client)
  | "output" // after AI output (client)
  | "display" // render time, sandboxed (client)
  | "request" // on the formated array, sandboxed (server)
  | "manual"; // invoked by name

export type ConditionType = "var" | "value" | "chatindex" | "exists";
export type ConditionOperator =
  | "="
  | "!="
  | ">"
  | "<"
  | ">="
  | "<="
  | "null"
  | "true";

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

    // A V2 effect (opcode invocation), loose since each opcode reads a different subset. An operand's <field>Type sibling defaults to a var lookup unless 'value'.
export type TriggerEffect = {
  type: string;
  indent?: number;
  // Loop-closing v2EndIndent marker.
  endOfLoop?: boolean;
  // Common operand fields across opcodes.
  var?: string;
  varType?: "value" | "var";
  value?: string | boolean;
  valueType?: "value" | "var";
  operator?: string;
  // v2If/v2IfAdvanced comparison operator (Risu field name).
  condition?: string;
  index?: string;
  indexType?: "value" | "var";
  key?: string;
  keyType?: "value" | "var";
  outputVar?: string;
  inputVar?: string;
  // Conditional / advanced-if operands.
  source?: string;
  sourceType?: "value" | "var";
  target?: string;
  targetType?: "value" | "var";
  source1?: string;
  source1Type?: "value" | "var";
  source2?: string;
  source2Type?: "value" | "var";
  // Range / numeric operands.
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
  // String / regex operands.
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
  // Chat / lorebook / role operands. Risu v1/v2 use 'char' for assistant.
  role?: "user" | "assistant" | "system" | "char";
  location?: "start" | "historyend" | "promptend";
  content?: string;
  contentType?: "value" | "var";
  name?: string;
  nameType?: "value" | "var";
  insertOrder?: string;
  insertOrderType?: "value" | "var";
  model?: "model" | "submodel";
  // Catch-all for opcode-specific extras.
  [k: string]: unknown;
};

export type TriggerScript = {
  comment: string;
  type: TriggerEventMode;
  conditions: TriggerCondition[];
  effect: TriggerEffect[];
  lowLevelAccess?: boolean;
};

// Chat message as the VM sees it (minimal projection of the app's messages).
export type TriggerMessage = {
  role: "user" | "assistant" | "system";
  data: string;
};

// A lorebook entry the VM can read/CRUD.
export type TriggerLore = {
  id?: string;
  comment: string;
  content: string;
  key: string;
  alwaysActive: boolean;
  insertOrder?: number;
};

    // Mutable VM state: reads inputs, records mutations as outputs the caller persists. Side-effect opcodes gated on lowLevelAccess + an async bridge.
export type TriggerContext = {
  mode: TriggerEventMode;
  // Per-conversation variable store (mutated in place).
  vars: Record<string, string>;
  // Per-user global var store (mutated in place).
  globalVars: Record<string, string>;
  // Chat history (mutated by cutchat/modifychat/impersonate).
  chat: TriggerMessage[];
  // Character/persona/note mutable fields.
  charDesc: string;
  personaDesc: string;
  authorNote: string;
  replaceGlobalNote: string;
  // Lorebook entries (mutated by lorebook CRUD opcodes).
  lore: TriggerLore[];
  // System-prompt injections collected for the assembler.
  additionalSysPrompt: { start: string; historyend: string; promptend: string };
  // request-mode formated array (role + content), mutated by Get/SetRequestState.
  formated?: { role: string; content: string }[];
  // display-mode buffer.
  displayData?: string;
  // Flags the VM can raise.
  stopSending?: boolean;
  sendAIprompt?: boolean;
  // Optional async bridge for LLM/imggen/similarity (lowLevelAccess only).
  lowLevelAccess?: boolean;
  ops?: TriggerOps;
      // Optional CBS macro expansion applied to every operand + outputVar name. Identity when absent.
  parse?: (s: string) => string;
  // Default variables seeded behind chat/global vars (Risu defaultVariables).
  defaultVars?: Record<string, string>;
  // Field tokens for {{char}}/{{user}} resolution inside operands.
  charName: string;
  userName: string;
  // Primary character's greeting (Lua getCharacterFirstMessage; in-memory only).
  firstMessage?: string;
};

    // Async bridge for lowLevelAccess V1 effects: server modes call services, client modes call the BFF endpoint. Absent op resolves to an Error: string, never throws.
export type TriggerOps = {
  // {type:'runLLM'} ChatML-or-plain prompt -> completion text.
  runLLM?: (prompt: string) => Promise<string>;
  // {type:'checkSimilarity'}: rank `values` by similarity to `source`.
  similarity?: (source: string, values: string[]) => Promise<string[]>;
  // {type:'runImgGen'}: prompt/negative -> {{inlay::id}} token.
  imgGen?: (prompt: string, negative: string) => Promise<string>;
  // {type:'showAlert'}: input/select resolve the user's answer; normal/error ''.
  alert?: (
    kind: "normal" | "error" | "input" | "select",
    text: string,
    options?: string[],
  ) => Promise<string>;
  // {type:'triggerlua'}: run Lua code against the trigger context.
  runLua?: (code: string) => Promise<void>;
};

export type TriggerRunResult = {
  context: TriggerContext;
  stopped: boolean;
};
