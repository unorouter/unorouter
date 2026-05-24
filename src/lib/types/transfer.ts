// On-disk conversation export envelopes. Untrusted JSON: every field optional,
// per-importer boundary cast.

// Export row: arbitrary columns + known string id.
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
