export enum StoreId {
  DATA_TABLES_STORE = "DATA_TABLES_STORE",
}

export enum ModelTypeFilter {
  ALL = "all",
  TEXT = "text",
  IMAGE = "image",
  VIDEO = "video",
  AUDIO = "audio",
  EMBEDDING = "embedding",
}

export enum Vendor {
  OPENAI = "openai",
  ANTHROPIC = "anthropic",
  GOOGLE = "google",
  GOOGLE_DEEPMIND = "google deepmind",
  BAILIAN = "bailian",
  BYTEDANCE = "bytedance",
  DEEPSEEK = "deepseek",
  FLUX = "flux",
  KLING = "kling",
  META = "meta",
  MISTRAL = "mistral",
  MISTRAL_AI = "mistral ai",
  COHERE = "cohere",
  XAI = "xai",
  X_AI = "x.ai",
  MOONSHOT = "moonshot",
  ZHIPU = "zhipu",
  STABILITY = "stability",
  STABILITY_AI = "stability ai",
  ALIBABA = "alibaba",
  IFLOW = "iflow",
  KUAISHOU = "kuaishou",
  SAP = "sap ai core",
  VERTEX = "vertex",
  AIHUBMIX = "aihubmix",
  OPENCODE = "opencode zen",
  XUNFEI = "xunfei",
  XUNFEI_CN = "讯飞",
  ZHIPU_CN = "智谱",
  ZHIPU_AI_CODING = "zhipu ai coding plan",
  XIAOMI = "xiaomi",
  MINIMAX = "minimax",
  NVIDIA = "nvidia",
  TENCENT = "tencent",
  HUNYUAN = "hunyuan",
  BAIDU = "baidu",
  QIANFAN = "qianfan",
  LIQUID = "liquid",
  INCLUSIONAI = "inclusionai",
  LING = "ling",
}

export enum OS {
  WINDOWS = "windows",
  MACOS = "macos",
  LINUX = "linux",
}

export const OS_VALUES = Object.values(OS);

export enum DataTableId {
  TOKENS = "TOKENS",
  LOGS = "LOGS",
  MIDJOURNEY_LOGS = "MIDJOURNEY_LOGS",
  TASK_LOGS = "TASK_LOGS",
  AFFILIATE_INVITEES = "AFFILIATE_INVITEES",
  AFFILIATE_COMMISSIONS = "AFFILIATE_COMMISSIONS",
}
