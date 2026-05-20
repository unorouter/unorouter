// Shapes of the on-disk conversation export envelopes. Import data is untrusted
// JSON, so every field is optional; a single boundary cast in each importer
// turns the parsed `unknown` into one of these, typed access follows.

// A row as it appears inside an export file: a record with a string id plus
// arbitrary columns. Field access still needs narrowing, but the id is known.
export type ExportRow = Record<string, unknown> & { id: string };

export type NativeImport = {
  version?: string;
  conversation: { id?: string; title?: string | null };
  settings: Record<string, unknown> | null;
  messages: ExportRow[];
  items: ExportRow[];
  characters: ExportRow[];
  persona: ExportRow | null;
  preset: ExportRow | null;
  lorebooks: ExportRow[];
  lorebookEntries: ExportRow[];
  bindings: {
    characters: Array<Record<string, unknown>>;
    lorebooks: Array<Record<string, unknown>>;
  };
};

export type OrpgImport = {
  version?: string;
  title?: string;
  characters?: Record<string, Record<string, unknown>>;
  messages?: Record<string, Record<string, unknown>>;
  items?: Record<string, { id?: string; data?: unknown }>;
  _unorouter_extension?: {
    lorebooks?: ExportRow[];
    lorebookEntries?: ExportRow[];
  };
};

export type StMetadata = {
  user_name: string;
  character_name: string;
  create_date: string;
  chat_metadata?: Record<string, unknown>;
};

export type StMessage = {
  name: string;
  is_user: boolean;
  is_system?: boolean;
  send_date: string;
  mes: string;
  extra?: {
    reasoning?: string;
    token_count?: number;
    model?: string;
    [k: string]: unknown;
  };
  swipe_id?: number;
  swipes?: string[];
};
