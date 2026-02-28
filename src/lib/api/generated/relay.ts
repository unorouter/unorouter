// @ts-nocheck
// Duplicate types from duplicate endpoints in OpenAPI spec
import { fetcher } from "../client";
export type ErrorResponseError = {
  /** 错误信息 */
  message?: string;
  /** 错误类型 */
  type?: string;
  /**
   * 相关参数
   * @nullable
   */
  param?: string | null;
  /**
   * 错误代码
   * @nullable
   */
  code?: string | null;
};

export interface ErrorResponse {
  error?: ErrorResponseError;
}

export type UsagePromptTokensDetails = {
  cached_tokens?: number;
  text_tokens?: number;
  audio_tokens?: number;
  image_tokens?: number;
};

export type UsageCompletionTokensDetails = {
  text_tokens?: number;
  audio_tokens?: number;
  reasoning_tokens?: number;
};

export interface Usage {
  /** 提示词 Token 数 */
  prompt_tokens?: number;
  /** 补全 Token 数 */
  completion_tokens?: number;
  /** 总 Token 数 */
  total_tokens?: number;
  prompt_tokens_details?: UsagePromptTokensDetails;
  completion_tokens_details?: UsageCompletionTokensDetails;
}

export interface Model {
  /** 模型 ID */
  id?: string;
  /** 对象类型 */
  object?: string;
  /** 创建时间戳 */
  created?: number;
  /** 模型所有者 */
  owned_by?: string;
}

export interface ModelsResponse {
  object?: string;
  data?: Model[];
}

export type GeminiModelsResponseModelsItem = {
  name?: string;
  version?: string;
  displayName?: string;
  description?: string;
  inputTokenLimit?: number;
  outputTokenLimit?: number;
  supportedGenerationMethods?: string[];
};

export interface GeminiModelsResponse {
  models?: GeminiModelsResponseModelsItem[];
}

/**
 * 消息角色
 */
export type MessageRole = (typeof MessageRole)[keyof typeof MessageRole];

export const MessageRole = {
  system: "system",
  user: "user",
  assistant: "assistant",
  tool: "tool",
  developer: "developer",
} as const;

export type MessageContentType =
  (typeof MessageContentType)[keyof typeof MessageContentType];

export const MessageContentType = {
  text: "text",
  image_url: "image_url",
  input_audio: "input_audio",
  file: "file",
  video_url: "video_url",
} as const;

export type MessageContentImageUrlDetail =
  (typeof MessageContentImageUrlDetail)[keyof typeof MessageContentImageUrlDetail];

export const MessageContentImageUrlDetail = {
  low: "low",
  high: "high",
  auto: "auto",
} as const;

export type MessageContentInputAudioFormat =
  (typeof MessageContentInputAudioFormat)[keyof typeof MessageContentInputAudioFormat];

export const MessageContentInputAudioFormat = {
  wav: "wav",
  mp3: "mp3",
} as const;

export type MessageContentImageUrl = {
  /** 图片 URL 或 base64 */
  url?: string;
  detail?: MessageContentImageUrlDetail;
};

export type MessageContentInputAudio = {
  /** Base64 编码的音频数据 */
  data?: string;
  format?: MessageContentInputAudioFormat;
};

export type MessageContentFile = {
  filename?: string;
  file_data?: string;
  file_id?: string;
};

export type MessageContentVideoUrl = {
  url?: string;
};

export interface MessageContent {
  type?: MessageContentType;
  text?: string;
  image_url?: MessageContentImageUrl;
  input_audio?: MessageContentInputAudio;
  file?: MessageContentFile;
  video_url?: MessageContentVideoUrl;
}

export type ToolCallFunction = {
  name?: string;
  arguments?: string;
};

export interface ToolCall {
  id?: string;
  type?: string;
  function?: ToolCallFunction;
}

export interface Message {
  /** 消息角色 */
  role: MessageRole;
  /** 消息内容 */
  content: string | MessageContent[];
  /** 发送者名称 */
  name?: string;
  tool_calls?: ToolCall[];
  /** 工具调用 ID（用于 tool 角色消息） */
  tool_call_id?: string;
  /** 推理内容 */
  reasoning_content?: string;
}

/**
 * JSON Schema 格式的参数定义
 */
export type ToolFunctionParameters = { [key: string]: unknown };

export type ToolFunction = {
  name?: string;
  description?: string;
  /** JSON Schema 格式的参数定义 */
  parameters?: ToolFunctionParameters;
};

export interface Tool {
  type?: string;
  function?: ToolFunction;
}

export type ResponseFormatType =
  (typeof ResponseFormatType)[keyof typeof ResponseFormatType];

export const ResponseFormatType = {
  text: "text",
  json_object: "json_object",
  json_schema: "json_schema",
} as const;

/**
 * JSON Schema 定义
 */
export type ResponseFormatJsonSchema = { [key: string]: unknown };

export interface ResponseFormat {
  type?: ResponseFormatType;
  /** JSON Schema 定义 */
  json_schema?: ResponseFormatJsonSchema;
}

export type ChatCompletionRequestStreamOptions = {
  include_usage?: boolean;
};

export type ChatCompletionRequestLogitBias = { [key: string]: number };

export type ChatCompletionRequestToolChoice =
  | "none"
  | "auto"
  | "required"
  | {
      type?: string;
      function?: {
        name?: string;
      };
    };

/**
 * 推理强度 (用于支持推理的模型)
 */
export type ChatCompletionRequestReasoningEffort =
  (typeof ChatCompletionRequestReasoningEffort)[keyof typeof ChatCompletionRequestReasoningEffort];

export const ChatCompletionRequestReasoningEffort = {
  low: "low",
  medium: "medium",
  high: "high",
} as const;

export type ChatCompletionRequestModalitiesItem =
  (typeof ChatCompletionRequestModalitiesItem)[keyof typeof ChatCompletionRequestModalitiesItem];

export const ChatCompletionRequestModalitiesItem = {
  text: "text",
  audio: "audio",
} as const;

export type ChatCompletionRequestAudio = {
  voice?: string;
  format?: string;
};

export interface ChatCompletionRequest {
  /** 模型 ID */
  model: string;
  /** 对话消息列表 */
  messages: Message[];
  /**
   * 采样温度
   * @minimum 0
   * @maximum 2
   */
  temperature?: number;
  /**
   * 核采样参数
   * @minimum 0
   * @maximum 1
   */
  top_p?: number;
  /**
   * 生成数量
   * @minimum 1
   */
  n?: number;
  /** 是否流式响应 */
  stream?: boolean;
  stream_options?: ChatCompletionRequestStreamOptions;
  /** 停止序列 */
  stop?: string | string[];
  /** 最大生成 Token 数 */
  max_tokens?: number;
  /** 最大补全 Token 数 */
  max_completion_tokens?: number;
  /**
   * @minimum -2
   * @maximum 2
   */
  presence_penalty?: number;
  /**
   * @minimum -2
   * @maximum 2
   */
  frequency_penalty?: number;
  logit_bias?: ChatCompletionRequestLogitBias;
  user?: string;
  tools?: Tool[];
  tool_choice?: ChatCompletionRequestToolChoice;
  response_format?: ResponseFormat;
  seed?: number;
  /** 推理强度 (用于支持推理的模型) */
  reasoning_effort?: ChatCompletionRequestReasoningEffort;
  modalities?: ChatCompletionRequestModalitiesItem[];
  audio?: ChatCompletionRequestAudio;
}

export type ChatCompletionResponseChoicesItemFinishReason =
  (typeof ChatCompletionResponseChoicesItemFinishReason)[keyof typeof ChatCompletionResponseChoicesItemFinishReason];

export const ChatCompletionResponseChoicesItemFinishReason = {
  stop: "stop",
  length: "length",
  tool_calls: "tool_calls",
  content_filter: "content_filter",
} as const;

export type ChatCompletionResponseChoicesItem = {
  index?: number;
  message?: Message;
  finish_reason?: ChatCompletionResponseChoicesItemFinishReason;
};

export interface ChatCompletionResponse {
  id?: string;
  object?: string;
  created?: number;
  model?: string;
  choices?: ChatCompletionResponseChoicesItem[];
  usage?: Usage;
  system_fingerprint?: string;
}

export type ChatCompletionStreamResponseChoicesItemDelta = {
  role?: string;
  content?: string;
  reasoning_content?: string;
  tool_calls?: ToolCall[];
};

export type ChatCompletionStreamResponseChoicesItem = {
  index?: number;
  delta?: ChatCompletionStreamResponseChoicesItemDelta;
  /** @nullable */
  finish_reason?: string | null;
};

export interface ChatCompletionStreamResponse {
  id?: string;
  object?: string;
  created?: number;
  model?: string;
  choices?: ChatCompletionStreamResponseChoicesItem[];
  usage?: Usage;
}

export interface CompletionRequest {
  model: string;
  prompt: string | string[];
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  n?: number;
  stream?: boolean;
  stop?: string | string[];
  suffix?: string;
  echo?: boolean;
}

export type CompletionResponseChoicesItem = {
  text?: string;
  index?: number;
  finish_reason?: string;
};

export interface CompletionResponse {
  id?: string;
  object?: string;
  created?: number;
  model?: string;
  choices?: CompletionResponseChoicesItem[];
  usage?: Usage;
}

/**
 * 输入内容，可以是字符串或消息数组
 */
export type ResponsesRequestInput = string | { [key: string]: unknown }[];

export type ResponsesRequestToolsItem = { [key: string]: unknown };

export type ResponsesRequestToolChoice = string | { [key: string]: unknown };

export type ResponsesRequestReasoningEffort =
  (typeof ResponsesRequestReasoningEffort)[keyof typeof ResponsesRequestReasoningEffort];

export const ResponsesRequestReasoningEffort = {
  low: "low",
  medium: "medium",
  high: "high",
} as const;

export type ResponsesRequestReasoning = {
  effort?: ResponsesRequestReasoningEffort;
  summary?: string;
};

export type ResponsesRequestTruncation =
  (typeof ResponsesRequestTruncation)[keyof typeof ResponsesRequestTruncation];

export const ResponsesRequestTruncation = {
  auto: "auto",
  disabled: "disabled",
} as const;

export interface ResponsesRequest {
  model: string;
  /** 输入内容，可以是字符串或消息数组 */
  input?: ResponsesRequestInput;
  instructions?: string;
  max_output_tokens?: number;
  temperature?: number;
  top_p?: number;
  stream?: boolean;
  tools?: ResponsesRequestToolsItem[];
  tool_choice?: ResponsesRequestToolChoice;
  reasoning?: ResponsesRequestReasoning;
  previous_response_id?: string;
  truncation?: ResponsesRequestTruncation;
}

export type ResponsesResponseStatus =
  (typeof ResponsesResponseStatus)[keyof typeof ResponsesResponseStatus];

export const ResponsesResponseStatus = {
  completed: "completed",
  failed: "failed",
  in_progress: "in_progress",
  incomplete: "incomplete",
} as const;

export type ResponsesResponseOutputItemContentItem = {
  type?: string;
  text?: string;
};

export type ResponsesResponseOutputItem = {
  type?: string;
  id?: string;
  status?: string;
  role?: string;
  content?: ResponsesResponseOutputItemContentItem[];
};

export interface ResponsesResponse {
  id?: string;
  object?: string;
  created_at?: number;
  status?: ResponsesResponseStatus;
  model?: string;
  output?: ResponsesResponseOutputItem[];
  usage?: Usage;
}

export type ResponsesCompactionResponseOutputItem = { [key: string]: unknown };

export type ResponsesCompactionResponseError = { [key: string]: unknown };

export interface ResponsesCompactionResponse {
  id?: string;
  object?: string;
  created_at?: number;
  output?: ResponsesCompactionResponseOutputItem[];
  usage?: Usage;
  error?: ResponsesCompactionResponseError;
}

/**
 * 输入内容，可以是字符串或消息数组
 */
export type ResponsesCompactionRequestInput =
  | string
  | { [key: string]: unknown }[];

export interface ResponsesCompactionRequest {
  model: string;
  /** 输入内容，可以是字符串或消息数组 */
  input?: ResponsesCompactionRequestInput;
  instructions?: string;
  previous_response_id?: string;
}

export type ResponsesStreamResponseItem = { [key: string]: unknown };

export interface ResponsesStreamResponse {
  type?: string;
  response?: ResponsesResponse;
  delta?: string;
  item?: ResponsesStreamResponseItem;
}

export type ClaudeRequestSystem = string | { [key: string]: unknown }[];

export type ClaudeRequestToolsItemInputSchema = { [key: string]: unknown };

export type ClaudeRequestToolsItem = {
  name?: string;
  description?: string;
  input_schema?: ClaudeRequestToolsItemInputSchema;
};

export type ClaudeRequestToolChoice = {
  type?: "auto" | "any" | "tool";
  name?: string;
};

export type ClaudeRequestThinkingType =
  (typeof ClaudeRequestThinkingType)[keyof typeof ClaudeRequestThinkingType];

export const ClaudeRequestThinkingType = {
  enabled: "enabled",
  disabled: "disabled",
} as const;

export type ClaudeRequestThinking = {
  type?: ClaudeRequestThinkingType;
  budget_tokens?: number;
};

export type ClaudeRequestMetadata = {
  user_id?: string;
};

export type ClaudeMessageRole =
  (typeof ClaudeMessageRole)[keyof typeof ClaudeMessageRole];

export const ClaudeMessageRole = {
  user: "user",
  assistant: "assistant",
} as const;

export type ClaudeMessageContent =
  | string
  | {
      type?: "text" | "image" | "tool_use" | "tool_result";
      text?: string;
      source?: {
        type?: "base64" | "url";
        media_type?: string;
        data?: string;
        url?: string;
      };
      id?: string;
      name?: string;
      input?: { [key: string]: unknown };
      tool_use_id?: string;
      content?: string;
    }[];

export interface ClaudeMessage {
  role: ClaudeMessageRole;
  content: ClaudeMessageContent;
}

export interface ClaudeRequest {
  model: string;
  messages: ClaudeMessage[];
  system?: ClaudeRequestSystem;
  /** @minimum 1 */
  max_tokens: number;
  /**
   * @minimum 0
   * @maximum 1
   */
  temperature?: number;
  top_p?: number;
  top_k?: number;
  stream?: boolean;
  stop_sequences?: string[];
  tools?: ClaudeRequestToolsItem[];
  tool_choice?: ClaudeRequestToolChoice;
  thinking?: ClaudeRequestThinking;
  metadata?: ClaudeRequestMetadata;
}

export type ClaudeResponseContentItem = {
  type?: string;
  text?: string;
};

export type ClaudeResponseStopReason =
  (typeof ClaudeResponseStopReason)[keyof typeof ClaudeResponseStopReason];

export const ClaudeResponseStopReason = {
  end_turn: "end_turn",
  max_tokens: "max_tokens",
  stop_sequence: "stop_sequence",
  tool_use: "tool_use",
} as const;

export type ClaudeResponseUsage = {
  input_tokens?: number;
  output_tokens?: number;
  cache_creation_input_tokens?: number;
  cache_read_input_tokens?: number;
};

export interface ClaudeResponse {
  id?: string;
  type?: string;
  role?: string;
  content?: ClaudeResponseContentItem[];
  model?: string;
  stop_reason?: ClaudeResponseStopReason;
  usage?: ClaudeResponseUsage;
}

export type EmbeddingRequestEncodingFormat =
  (typeof EmbeddingRequestEncodingFormat)[keyof typeof EmbeddingRequestEncodingFormat];

export const EmbeddingRequestEncodingFormat = {
  float: "float",
  base64: "base64",
} as const;

export interface EmbeddingRequest {
  model: string;
  /** 要嵌入的文本 */
  input: string | string[];
  encoding_format?: EmbeddingRequestEncodingFormat;
  /** 输出向量维度 */
  dimensions?: number;
}

export type EmbeddingResponseDataItem = {
  object?: string;
  index?: number;
  embedding?: number[];
};

export type EmbeddingResponseUsage = {
  prompt_tokens?: number;
  total_tokens?: number;
};

export interface EmbeddingResponse {
  object?: string;
  data?: EmbeddingResponseDataItem[];
  model?: string;
  usage?: EmbeddingResponseUsage;
}

export type ImageGenerationRequestSize =
  (typeof ImageGenerationRequestSize)[keyof typeof ImageGenerationRequestSize];

export const ImageGenerationRequestSize = {
  "256x256": "256x256",
  "512x512": "512x512",
  "1024x1024": "1024x1024",
  "1792x1024": "1792x1024",
  "1024x1792": "1024x1792",
} as const;

export type ImageGenerationRequestQuality =
  (typeof ImageGenerationRequestQuality)[keyof typeof ImageGenerationRequestQuality];

export const ImageGenerationRequestQuality = {
  standard: "standard",
  hd: "hd",
} as const;

export type ImageGenerationRequestStyle =
  (typeof ImageGenerationRequestStyle)[keyof typeof ImageGenerationRequestStyle];

export const ImageGenerationRequestStyle = {
  vivid: "vivid",
  natural: "natural",
} as const;

export type ImageGenerationRequestResponseFormat =
  (typeof ImageGenerationRequestResponseFormat)[keyof typeof ImageGenerationRequestResponseFormat];

export const ImageGenerationRequestResponseFormat = {
  url: "url",
  b64_json: "b64_json",
} as const;

export interface ImageGenerationRequest {
  model?: string;
  /** 图像描述 */
  prompt: string;
  /**
   * @minimum 1
   * @maximum 10
   */
  n?: number;
  size?: ImageGenerationRequestSize;
  quality?: ImageGenerationRequestQuality;
  style?: ImageGenerationRequestStyle;
  response_format?: ImageGenerationRequestResponseFormat;
  user?: string;
}

export interface ImageEditRequest {
  image: Blob;
  mask?: Blob;
  prompt: string;
  model?: string;
  n?: number;
  size?: string;
  response_format?: string;
}

export type ImageResponseDataItem = {
  url?: string;
  b64_json?: string;
  revised_prompt?: string;
};

export interface ImageResponse {
  created?: number;
  data?: ImageResponseDataItem[];
}

export type AudioTranscriptionRequestResponseFormat =
  (typeof AudioTranscriptionRequestResponseFormat)[keyof typeof AudioTranscriptionRequestResponseFormat];

export const AudioTranscriptionRequestResponseFormat = {
  json: "json",
  text: "text",
  srt: "srt",
  verbose_json: "verbose_json",
  vtt: "vtt",
} as const;

export type AudioTranscriptionRequestTimestampGranularitiesItem =
  (typeof AudioTranscriptionRequestTimestampGranularitiesItem)[keyof typeof AudioTranscriptionRequestTimestampGranularitiesItem];

export const AudioTranscriptionRequestTimestampGranularitiesItem = {
  word: "word",
  segment: "segment",
} as const;

export interface AudioTranscriptionRequest {
  /** 音频文件 */
  file: Blob;
  model: string;
  /** ISO-639-1 语言代码 */
  language?: string;
  prompt?: string;
  response_format?: AudioTranscriptionRequestResponseFormat;
  temperature?: number;
  timestamp_granularities?: AudioTranscriptionRequestTimestampGranularitiesItem[];
}

export interface AudioTranslationRequest {
  file: Blob;
  model: string;
  prompt?: string;
  response_format?: string;
  temperature?: number;
}

export interface AudioTranscriptionResponse {
  text?: string;
}

export type SpeechRequestVoice =
  (typeof SpeechRequestVoice)[keyof typeof SpeechRequestVoice];

export const SpeechRequestVoice = {
  alloy: "alloy",
  echo: "echo",
  fable: "fable",
  onyx: "onyx",
  nova: "nova",
  shimmer: "shimmer",
} as const;

export type SpeechRequestResponseFormat =
  (typeof SpeechRequestResponseFormat)[keyof typeof SpeechRequestResponseFormat];

export const SpeechRequestResponseFormat = {
  mp3: "mp3",
  opus: "opus",
  aac: "aac",
  flac: "flac",
  wav: "wav",
  pcm: "pcm",
} as const;

export interface SpeechRequest {
  model: string;
  /**
   * 要转换的文本
   * @maxLength 4096
   */
  input: string;
  voice: SpeechRequestVoice;
  response_format?: SpeechRequestResponseFormat;
  /**
   * @minimum 0.25
   * @maximum 4
   */
  speed?: number;
}

export type RerankRequestDocumentsItem = string | { [key: string]: unknown };

export interface RerankRequest {
  model: string;
  /** 查询文本 */
  query: string;
  /** 要重排序的文档列表 */
  documents: RerankRequestDocumentsItem[];
  /** 返回前 N 个结果 */
  top_n?: number;
  return_documents?: boolean;
}

export type RerankResponseResultsItemDocument = { [key: string]: unknown };

export type RerankResponseResultsItem = {
  index?: number;
  relevance_score?: number;
  document?: RerankResponseResultsItemDocument;
};

export type RerankResponseMeta = { [key: string]: unknown };

export interface RerankResponse {
  id?: string;
  results?: RerankResponseResultsItem[];
  meta?: RerankResponseMeta;
}

export interface ModerationRequest {
  input: string | string[];
  model?: string;
}

export type ModerationResponseResultsItemCategories = {
  [key: string]: unknown;
};

export type ModerationResponseResultsItemCategoryScores = {
  [key: string]: unknown;
};

export type ModerationResponseResultsItem = {
  flagged?: boolean;
  categories?: ModerationResponseResultsItemCategories;
  category_scores?: ModerationResponseResultsItemCategoryScores;
};

export interface ModerationResponse {
  id?: string;
  model?: string;
  results?: ModerationResponseResultsItem[];
}

export type GeminiRequestContentsItemRole =
  (typeof GeminiRequestContentsItemRole)[keyof typeof GeminiRequestContentsItemRole];

export const GeminiRequestContentsItemRole = {
  user: "user",
  model: "model",
} as const;

export type GeminiRequestContentsItemPartsItemInlineData = {
  mimeType?: string;
  data?: string;
};

export type GeminiRequestContentsItemPartsItem = {
  text?: string;
  inlineData?: GeminiRequestContentsItemPartsItemInlineData;
};

export type GeminiRequestContentsItem = {
  role?: GeminiRequestContentsItemRole;
  parts?: GeminiRequestContentsItemPartsItem[];
};

export type GeminiRequestGenerationConfig = {
  temperature?: number;
  topP?: number;
  topK?: number;
  maxOutputTokens?: number;
  stopSequences?: string[];
};

export type GeminiRequestSafetySettingsItem = {
  category?: string;
  threshold?: string;
};

export type GeminiRequestToolsItem = { [key: string]: unknown };

export type GeminiRequestSystemInstructionPartsItem = {
  [key: string]: unknown;
};

export type GeminiRequestSystemInstruction = {
  parts?: GeminiRequestSystemInstructionPartsItem[];
};

export interface GeminiRequest {
  contents?: GeminiRequestContentsItem[];
  generationConfig?: GeminiRequestGenerationConfig;
  safetySettings?: GeminiRequestSafetySettingsItem[];
  tools?: GeminiRequestToolsItem[];
  systemInstruction?: GeminiRequestSystemInstruction;
}

export type GeminiResponseCandidatesItemContentPartsItem = {
  [key: string]: unknown;
};

export type GeminiResponseCandidatesItemContent = {
  role?: string;
  parts?: GeminiResponseCandidatesItemContentPartsItem[];
};

export type GeminiResponseCandidatesItemSafetyRatingsItem = {
  [key: string]: unknown;
};

export type GeminiResponseCandidatesItem = {
  content?: GeminiResponseCandidatesItemContent;
  finishReason?: string;
  safetyRatings?: GeminiResponseCandidatesItemSafetyRatingsItem[];
};

export type GeminiResponseUsageMetadata = {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  totalTokenCount?: number;
};

export interface GeminiResponse {
  candidates?: GeminiResponseCandidatesItem[];
  usageMetadata?: GeminiResponseUsageMetadata;
}

/**
 * 扩展参数 (如 negative_prompt, style, quality_level 等)
 */
export type VideoRequestMetadata = { [key: string]: unknown };

/**
 * 视频生成请求
 */
export interface VideoRequest {
  /** 模型/风格 ID */
  model?: string;
  /** 文本描述提示词 */
  prompt?: string;
  /** 图片输入 (URL 或 Base64) */
  image?: string;
  /** 视频时长（秒） */
  duration?: number;
  /** 视频宽度 */
  width?: number;
  /** 视频高度 */
  height?: number;
  /** 视频帧率 */
  fps?: number;
  /** 随机种子 */
  seed?: number;
  /** 生成视频数量 */
  n?: number;
  /** 响应格式 */
  response_format?: string;
  /** 用户标识 */
  user?: string;
  /** 扩展参数 (如 negative_prompt, style, quality_level 等) */
  metadata?: VideoRequestMetadata;
}

/**
 * 视频生成任务提交响应
 */
export interface VideoResponse {
  /** 任务 ID */
  task_id?: string;
  /** 任务状态 */
  status?: string;
}

/**
 * 任务状态
 */
export type VideoTaskResponseStatus =
  (typeof VideoTaskResponseStatus)[keyof typeof VideoTaskResponseStatus];

export const VideoTaskResponseStatus = {
  queued: "queued",
  in_progress: "in_progress",
  completed: "completed",
  failed: "failed",
} as const;

/**
 * 视频任务元数据
 */
export interface VideoTaskMetadata {
  /** 实际生成的视频时长 */
  duration?: number;
  /** 实际帧率 */
  fps?: number;
  /** 实际宽度 */
  width?: number;
  /** 实际高度 */
  height?: number;
  /** 使用的随机种子 */
  seed?: number;
}

/**
 * 视频任务错误信息
 */
export interface VideoTaskError {
  /** 错误码 */
  code?: number;
  /** 错误信息 */
  message?: string;
}

/**
 * 视频任务状态查询响应
 */
export interface VideoTaskResponse {
  /** 任务 ID */
  task_id?: string;
  /** 任务状态 */
  status?: VideoTaskResponseStatus;
  /** 视频资源 URL（成功时） */
  url?: string;
  /** 视频格式 */
  format?: string;
  metadata?: VideoTaskMetadata;
  error?: VideoTaskError;
}

/**
 * 任务状态
 */
export type OpenAIVideoStatus =
  (typeof OpenAIVideoStatus)[keyof typeof OpenAIVideoStatus];

export const OpenAIVideoStatus = {
  queued: "queued",
  in_progress: "in_progress",
  completed: "completed",
  failed: "failed",
} as const;

/**
 * 额外元数据
 */
export type OpenAIVideoMetadata = { [key: string]: unknown };

/**
 * OpenAI 视频错误信息
 */
export interface OpenAIVideoError {
  /** 错误信息 */
  message?: string;
  /** 错误码 */
  code?: string;
}

/**
 * OpenAI 兼容的视频对象
 */
export interface OpenAIVideo {
  /** 视频 ID */
  id?: string;
  /**
   * 任务 ID (兼容旧接口)
   * @deprecated
   */
  task_id?: string;
  /** 对象类型 */
  object?: string;
  /** 使用的模型 */
  model?: string;
  /** 任务状态 */
  status?: OpenAIVideoStatus;
  /** 进度百分比 */
  progress?: number;
  /** 创建时间戳 */
  created_at?: number;
  /** 完成时间戳 */
  completed_at?: number;
  /** 过期时间戳 */
  expires_at?: number;
  /** 视频时长 */
  seconds?: string;
  /** 视频尺寸 */
  size?: string;
  /** 源视频 ID（如果是基于其他视频生成） */
  remixed_from_video_id?: string;
  error?: OpenAIVideoError;
  /** 额外元数据 */
  metadata?: OpenAIVideoMetadata;
}

export interface ApiResponse {
  success?: boolean;
  message?: string;
  data?: unknown;
}

export interface PageInfo {
  page?: number;
  page_size?: number;
  total?: number;
  items?: unknown[];
}

export interface User {
  id?: number;
  username?: string;
  display_name?: string;
  role?: number;
  status?: number;
  email?: string;
  group?: string;
  quota?: number;
  used_quota?: number;
  request_count?: number;
}

export interface Channel {
  id?: number;
  name?: string;
  type?: number;
  status?: number;
  models?: string;
  groups?: string;
  priority?: number;
  weight?: number;
  base_url?: string;
  tag?: string;
}

export interface Token {
  id?: number;
  user_id?: number;
  name?: string;
  key?: string;
  status?: number;
  expired_time?: number;
  remain_quota?: number;
  unlimited_quota?: boolean;
}

export interface Redemption {
  id?: number;
  name?: string;
  key?: string;
  status?: number;
  quota?: number;
  created_time?: number;
  redeemed_time?: number;
}

export interface Log {
  id?: number;
  user_id?: number;
  type?: number;
  content?: string;
  created_at?: number;
}

export type ListModelsParams = {
  /**
   * Google API Key (用于 Gemini 格式)
   */
  key?: string;
};

export type CreateImageBodyInputMessagesItemContentItem = {
  text?: string;
};

export type CreateImageBodyInputMessagesItem = {
  role?: string;
  content?: CreateImageBodyInputMessagesItemContentItem[];
};

export type CreateImageBodyInput = {
  messages: CreateImageBodyInputMessagesItem[];
};

export type CreateImageBodyParameters = {
  negative_prompt?: string;
  prompt_extend?: boolean;
  watermark?: boolean;
  size?: string;
};

export type CreateImageBody = {
  model: string;
  input: CreateImageBodyInput;
  parameters?: CreateImageBodyParameters;
};

export type CreateImageBodyInputMessagesItemContentItem = {
  image?: string;
  text?: string;
};

export type CreateImageBodyInputMessagesItem = {
  role?: string;
  content?: CreateImageBodyInputMessagesItemContentItem[];
};

export type CreateImageBodyInput = {
  messages: CreateImageBodyInputMessagesItem[];
};

export type CreateImageBodyParameters = {
  n?: number;
  negative_prompt?: string;
  prompt_extend?: boolean;
  watermark?: boolean;
  size?: string;
};

export type CreateImageBody = {
  model: string;
  input: CreateImageBodyInput;
  parameters?: CreateImageBodyParameters;
};

export type CreateVideoBody = {
  /** 模型名称 */
  model?: string;
  /** 提示词 */
  prompt?: string;
  /** 生成秒数 */
  seconds?: string;
  /** 参考图片文件 */
  input_reference?: Blob;
};

/**
 * 额外元数据
 */
export type CreateVideo200Metadata = { [key: string]: unknown };

export type CreateVideo200 = {
  /** 视频 ID */
  id: string;
  /** 对象类型 */
  object: string;
  /** 使用的模型 */
  model: string;
  /** 任务状态 */
  status: string;
  /** 进度百分比 */
  progress: number;
  /** 创建时间戳 */
  created_at: number;
  /** 视频时长 */
  seconds: string;
  /** 完成时间戳 */
  completed_at?: number;
  /** 过期时间戳 */
  expires_at?: number;
  /** 视频尺寸 */
  size?: string;
  error?: OpenAIVideoError;
  /** 额外元数据 */
  metadata?: CreateVideo200Metadata;
};

export type GetVideo200 = {
  id: string;
  object: string;
  model: string;
  status: string;
  progress: number;
  created_at: number;
  seconds: string;
};

export type CreateJimengVideoParams = {
  /**
   * API 操作类型
   */
  Action: CreateJimengVideoAction;
  /**
   * API 版本
   */
  Version: string;
};

export type CreateJimengVideoAction =
  (typeof CreateJimengVideoAction)[keyof typeof CreateJimengVideoAction];

export const CreateJimengVideoAction = {
  CVSync2AsyncSubmitTask: "CVSync2AsyncSubmitTask",
  CVSync2AsyncGetResult: "CVSync2AsyncGetResult",
} as const;

/**
 * 即梦官方 API 请求格式
 */
export type CreateJimengVideoBody = {
  /** 请求类型标识 */
  req_key?: string;
  /** 文本描述 */
  prompt?: string;
  /** Base64 编码的图片数据 */
  binary_data_base64?: string[];
};

/**
 * 响应数据
 */
export type CreateJimengVideo200Data = { [key: string]: unknown };

export type CreateJimengVideo200 = {
  /** 响应码 */
  code?: number;
  /** 响应消息 */
  message?: string;
  /** 响应数据 */
  data?: CreateJimengVideo200Data;
};

export type GeminiRelayV1BetaBodyContentsItemPartsItem = {
  text?: string;
};

export type GeminiRelayV1BetaBodyContentsItem = {
  role?: string;
  parts?: GeminiRelayV1BetaBodyContentsItemPartsItem[];
};

export type GeminiRelayV1BetaBodyGenerationConfigImageConfig = {
  aspectRatio?: string;
  imageSize?: string;
};

export type GeminiRelayV1BetaBodyGenerationConfig = {
  responseModalities: string[];
  imageConfig?: GeminiRelayV1BetaBodyGenerationConfigImageConfig;
};

export type GeminiRelayV1BetaBody = {
  contents: GeminiRelayV1BetaBodyContentsItem[];
  generationConfig: GeminiRelayV1BetaBodyGenerationConfig;
};

export type CreateTranscriptionBodyResponseFormat =
  (typeof CreateTranscriptionBodyResponseFormat)[keyof typeof CreateTranscriptionBodyResponseFormat];

export const CreateTranscriptionBodyResponseFormat = {
  json: "json",
  text: "text",
  srt: "srt",
  verbose_json: "verbose_json",
  vtt: "vtt",
} as const;

export type CreateTranscriptionBodyTimestampGranularitiesItem =
  (typeof CreateTranscriptionBodyTimestampGranularitiesItem)[keyof typeof CreateTranscriptionBodyTimestampGranularitiesItem];

export const CreateTranscriptionBodyTimestampGranularitiesItem = {
  word: "word",
  segment: "segment",
} as const;

export type CreateTranscriptionBody = {
  /** 音频文件 */
  file: Blob;
  model: string;
  /** ISO-639-1 语言代码 */
  language?: string;
  prompt?: string;
  response_format?: CreateTranscriptionBodyResponseFormat;
  temperature?: number;
  timestamp_granularities?: CreateTranscriptionBodyTimestampGranularitiesItem[];
};

export type CreateTranslationBody = {
  file: Blob;
  model: string;
  prompt?: string;
  response_format?: string;
  temperature?: number;
};

export type CreateRealtimeSessionParams = {
  /**
   * 要使用的模型
   */
  model?: string;
};

export type CreateFineTuneBody = { [key: string]: unknown };

export type CreateFileBody = {
  file?: Blob;
  purpose?: string;
};

/**
 * 获取当前可用的模型列表。

根据请求头自动识别返回格式：
- 包含 `x-api-key` 和 `anthropic-version` 头时返回 Anthropic 格式
- 包含 `x-goog-api-key` 头或 `key` 查询参数时返回 Gemini 格式
- 其他情况返回 OpenAI 格式

 * @summary 获取模型列表
 */
export type listModelsResponse200 = {
  data: ModelsResponse;
  status: 200;
};

export type listModelsResponse401 = {
  data: ErrorResponse;
  status: 401;
};

export type listModelsResponseSuccess = listModelsResponse200 & {
  headers: Headers;
};
export type listModelsResponseError = listModelsResponse401 & {
  headers: Headers;
};

export type listModelsResponse =
  | listModelsResponseSuccess
  | listModelsResponseError;

export const getListModelsUrl = (params?: ListModelsParams) => {
  const normalizedParams = new URLSearchParams();

  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined) {
      normalizedParams.append(key, value === null ? "null" : value.toString());
    }
  });

  const stringifiedParams = normalizedParams.toString();

  return stringifiedParams.length > 0
    ? `/v1/models?${stringifiedParams}`
    : `/v1/models`;
};

export const listModels = async (
  params?: ListModelsParams,
  options?: RequestInit,
): Promise<listModelsResponse> => {
  return fetcher<listModelsResponse>(getListModelsUrl(params), {
    ...options,
    method: "GET",
  });
};

/**
 * 以 Gemini API 格式返回可用模型列表
 * @summary Gemini 格式获取
 */
export type listModelsGeminiResponse200 = {
  data: GeminiModelsResponse;
  status: 200;
};

export type listModelsGeminiResponseSuccess = listModelsGeminiResponse200 & {
  headers: Headers;
};
export type listModelsGeminiResponse = listModelsGeminiResponseSuccess;

export const getListModelsGeminiUrl = () => {
  return `/v1beta/models`;
};

export const listModelsGemini = async (
  options?: RequestInit,
): Promise<listModelsGeminiResponse> => {
  return fetcher<listModelsGeminiResponse>(getListModelsGeminiUrl(), {
    ...options,
    method: "GET",
  });
};

/**
 * 根据对话历史创建模型响应。支持流式和非流式响应。

兼容 OpenAI Chat Completions API。

 * @summary 创建聊天对话
 */
export type createChatCompletionResponse200 = {
  data: ChatCompletionResponse;
  status: 200;
};

export type createChatCompletionResponse400 = {
  data: ErrorResponse;
  status: 400;
};

export type createChatCompletionResponse429 = {
  data: ErrorResponse;
  status: 429;
};

export type createChatCompletionResponseSuccess =
  createChatCompletionResponse200 & {
    headers: Headers;
  };
export type createChatCompletionResponseError = (
  | createChatCompletionResponse400
  | createChatCompletionResponse429
) & {
  headers: Headers;
};

export type createChatCompletionResponse =
  | createChatCompletionResponseSuccess
  | createChatCompletionResponseError;

export const getCreateChatCompletionUrl = () => {
  return `/v1/chat/completions`;
};

export const createChatCompletion = async (
  chatCompletionRequest: ChatCompletionRequest,
  options?: RequestInit,
): Promise<createChatCompletionResponse> => {
  return fetcher<createChatCompletionResponse>(getCreateChatCompletionUrl(), {
    ...options,
    method: "POST",
    headers: { "Content-Type": "application/json", ...options?.headers },
    body: JSON.stringify(chatCompletionRequest),
  });
};

/**
 * OpenAI Responses API，用于创建模型响应。
支持多轮对话、工具调用、推理等功能。

 * @summary 创建响应 (OpenAI Responses API)
 */
export type createResponseResponse200 = {
  data: ResponsesResponse;
  status: 200;
};

export type createResponseResponseSuccess = createResponseResponse200 & {
  headers: Headers;
};
export type createResponseResponse = createResponseResponseSuccess;

export const getCreateResponseUrl = () => {
  return `/v1/responses`;
};

export const createResponse = async (
  responsesRequest: ResponsesRequest,
  options?: RequestInit,
): Promise<createResponseResponse> => {
  return fetcher<createResponseResponse>(getCreateResponseUrl(), {
    ...options,
    method: "POST",
    headers: { "Content-Type": "application/json", ...options?.headers },
    body: JSON.stringify(responsesRequest),
  });
};

/**
 * OpenAI Responses API，用于对长对话进行 compaction。
 * @summary 压缩对话 (OpenAI Responses API)
 */
export type compactResponseResponse200 = {
  data: ResponsesCompactionResponse;
  status: 200;
};

export type compactResponseResponseSuccess = compactResponseResponse200 & {
  headers: Headers;
};
export type compactResponseResponse = compactResponseResponseSuccess;

export const getCompactResponseUrl = () => {
  return `/v1/responses/compact`;
};

export const compactResponse = async (
  responsesCompactionRequest: ResponsesCompactionRequest,
  options?: RequestInit,
): Promise<compactResponseResponse> => {
  return fetcher<compactResponseResponse>(getCompactResponseUrl(), {
    ...options,
    method: "POST",
    headers: { "Content-Type": "application/json", ...options?.headers },
    body: JSON.stringify(responsesCompactionRequest),
  });
};

/**
 *  百炼qwen-image系列图片生成
 * @summary 编辑图像(qwen-image-edit)
 */
export type createImageResponse200 = {
  data: ImageResponse;
  status: 200;
};

export type createImageResponseSuccess = createImageResponse200 & {
  headers: Headers;
};
export type createImageResponse = createImageResponseSuccess;

export const getCreateImageUrl = () => {
  return `/v1/images/edits`;
};

export const createImage = async (
  createImageBody: CreateImageBody,
  options?: RequestInit,
): Promise<createImageResponse> => {
  return fetcher<createImageResponse>(getCreateImageUrl(), {
    ...options,
    method: "POST",
    headers: { "Content-Type": "application/json", ...options?.headers },
    body: JSON.stringify(createImageBody),
  });
};

/**
 * OpenAI 兼容的视频生成接口。

参考文档: https://platform.openai.com/docs/api-reference/videos/create

 * @summary 创建视频 
 */
export type createVideoResponse200 = {
  data: CreateVideo200;
  status: 200;
};

export type createVideoResponse400 = {
  data: ErrorResponse;
  status: 400;
};

export type createVideoResponseSuccess = createVideoResponse200 & {
  headers: Headers;
};
export type createVideoResponseError = createVideoResponse400 & {
  headers: Headers;
};

export type createVideoResponse =
  | createVideoResponseSuccess
  | createVideoResponseError;

export const getCreateVideoUrl = () => {
  return `/v1/videos`;
};

export const createVideo = async (
  createVideoBody: CreateVideoBody,
  options?: RequestInit,
): Promise<createVideoResponse> => {
  const formData = new FormData();
  if (createVideoBody.model !== undefined) {
    formData.append(`model`, createVideoBody.model);
  }
  if (createVideoBody.prompt !== undefined) {
    formData.append(`prompt`, createVideoBody.prompt);
  }
  if (createVideoBody.seconds !== undefined) {
    formData.append(`seconds`, createVideoBody.seconds);
  }
  if (createVideoBody.input_reference !== undefined) {
    formData.append(`input_reference`, createVideoBody.input_reference);
  }

  return fetcher<createVideoResponse>(getCreateVideoUrl(), {
    ...options,
    method: "POST",
    body: formData,
  });
};

/**
 * OpenAI 兼容的视频任务状态查询接口。

返回视频任务的详细状态信息。

 * @summary 获取视频任务状态 
 */
export type getVideoResponse200 = {
  data: GetVideo200;
  status: 200;
};

export type getVideoResponse404 = {
  data: ErrorResponse;
  status: 404;
};

export type getVideoResponseSuccess = getVideoResponse200 & {
  headers: Headers;
};
export type getVideoResponseError = getVideoResponse404 & {
  headers: Headers;
};

export type getVideoResponse = getVideoResponseSuccess | getVideoResponseError;

export const getGetVideoUrl = (taskId: string) => {
  return `/v1/videos/${taskId}`;
};

export const getVideo = async (
  taskId: string,
  options?: RequestInit,
): Promise<getVideoResponse> => {
  return fetcher<getVideoResponse>(getGetVideoUrl(taskId), {
    ...options,
    method: "GET",
  });
};

/**
 * 获取已完成视频任务的视频文件内容。

此接口会代理返回视频文件流。

 * @summary 获取视频内容
 */
export type getVideoContentResponse200 = {
  data: Blob;
  status: 200;
};

export type getVideoContentResponse404 = {
  data: ErrorResponse;
  status: 404;
};

export type getVideoContentResponseSuccess = getVideoContentResponse200 & {
  headers: Headers;
};
export type getVideoContentResponseError = getVideoContentResponse404 & {
  headers: Headers;
};

export type getVideoContentResponse =
  | getVideoContentResponseSuccess
  | getVideoContentResponseError;

export const getGetVideoContentUrl = (taskId: string) => {
  return `/v1/videos/${taskId}/content`;
};

export const getVideoContent = async (
  taskId: string,
  options?: RequestInit,
): Promise<getVideoContentResponse> => {
  return fetcher<getVideoContentResponse>(getGetVideoContentUrl(taskId), {
    ...options,
    method: "GET",
  });
};

/**
 * 使用 Kling 模型从文本描述生成视频。

支持的模型：kling-v1, kling-v1-5 等

 * @summary Kling 文生视频
 */
export type createKlingText2VideoResponse200 = {
  data: VideoResponse;
  status: 200;
};

export type createKlingText2VideoResponse400 = {
  data: ErrorResponse;
  status: 400;
};

export type createKlingText2VideoResponseSuccess =
  createKlingText2VideoResponse200 & {
    headers: Headers;
  };
export type createKlingText2VideoResponseError =
  createKlingText2VideoResponse400 & {
    headers: Headers;
  };

export type createKlingText2VideoResponse =
  | createKlingText2VideoResponseSuccess
  | createKlingText2VideoResponseError;

export const getCreateKlingText2VideoUrl = () => {
  return `/kling/v1/videos/text2video`;
};

export const createKlingText2Video = async (
  videoRequest: VideoRequest,
  options?: RequestInit,
): Promise<createKlingText2VideoResponse> => {
  return fetcher<createKlingText2VideoResponse>(getCreateKlingText2VideoUrl(), {
    ...options,
    method: "POST",
    headers: { "Content-Type": "application/json", ...options?.headers },
    body: JSON.stringify(videoRequest),
  });
};

/**
 * 查询 Kling 文生视频任务的状态和结果。
 * @summary 获取 Kling 文生视频任务状态
 */
export type getKlingText2VideoResponse200 = {
  data: VideoTaskResponse;
  status: 200;
};

export type getKlingText2VideoResponse404 = {
  data: ErrorResponse;
  status: 404;
};

export type getKlingText2VideoResponseSuccess =
  getKlingText2VideoResponse200 & {
    headers: Headers;
  };
export type getKlingText2VideoResponseError = getKlingText2VideoResponse404 & {
  headers: Headers;
};

export type getKlingText2VideoResponse =
  | getKlingText2VideoResponseSuccess
  | getKlingText2VideoResponseError;

export const getGetKlingText2VideoUrl = (taskId: string) => {
  return `/kling/v1/videos/text2video/${taskId}`;
};

export const getKlingText2Video = async (
  taskId: string,
  options?: RequestInit,
): Promise<getKlingText2VideoResponse> => {
  return fetcher<getKlingText2VideoResponse>(getGetKlingText2VideoUrl(taskId), {
    ...options,
    method: "GET",
  });
};

/**
 * 使用 Kling 模型从图片生成视频。

支持通过 image 参数传入图片 URL 或 Base64 编码的图片数据。

 * @summary Kling 图生视频
 */
export type createKlingImage2VideoResponse200 = {
  data: VideoResponse;
  status: 200;
};

export type createKlingImage2VideoResponse400 = {
  data: ErrorResponse;
  status: 400;
};

export type createKlingImage2VideoResponseSuccess =
  createKlingImage2VideoResponse200 & {
    headers: Headers;
  };
export type createKlingImage2VideoResponseError =
  createKlingImage2VideoResponse400 & {
    headers: Headers;
  };

export type createKlingImage2VideoResponse =
  | createKlingImage2VideoResponseSuccess
  | createKlingImage2VideoResponseError;

export const getCreateKlingImage2VideoUrl = () => {
  return `/kling/v1/videos/image2video`;
};

export const createKlingImage2Video = async (
  videoRequest: VideoRequest,
  options?: RequestInit,
): Promise<createKlingImage2VideoResponse> => {
  return fetcher<createKlingImage2VideoResponse>(
    getCreateKlingImage2VideoUrl(),
    {
      ...options,
      method: "POST",
      headers: { "Content-Type": "application/json", ...options?.headers },
      body: JSON.stringify(videoRequest),
    },
  );
};

/**
 * 查询 Kling 图生视频任务的状态和结果。
 * @summary 获取 Kling 图生视频任务状态
 */
export type getKlingImage2VideoResponse200 = {
  data: VideoTaskResponse;
  status: 200;
};

export type getKlingImage2VideoResponse404 = {
  data: ErrorResponse;
  status: 404;
};

export type getKlingImage2VideoResponseSuccess =
  getKlingImage2VideoResponse200 & {
    headers: Headers;
  };
export type getKlingImage2VideoResponseError =
  getKlingImage2VideoResponse404 & {
    headers: Headers;
  };

export type getKlingImage2VideoResponse =
  | getKlingImage2VideoResponseSuccess
  | getKlingImage2VideoResponseError;

export const getGetKlingImage2VideoUrl = (taskId: string) => {
  return `/kling/v1/videos/image2video/${taskId}`;
};

export const getKlingImage2Video = async (
  taskId: string,
  options?: RequestInit,
): Promise<getKlingImage2VideoResponse> => {
  return fetcher<getKlingImage2VideoResponse>(
    getGetKlingImage2VideoUrl(taskId),
    {
      ...options,
      method: "GET",
    },
  );
};

/**
 * 即梦官方 API 格式的视频生成接口。

支持通过 Action 参数指定操作类型：
- `CVSync2AsyncSubmitTask`: 提交视频生成任务
- `CVSync2AsyncGetResult`: 获取任务结果

需要在查询参数中指定 Action 和 Version。

 * @summary 即梦视频生成
 */
export type createJimengVideoResponse200 = {
  data: CreateJimengVideo200;
  status: 200;
};

export type createJimengVideoResponse400 = {
  data: ErrorResponse;
  status: 400;
};

export type createJimengVideoResponseSuccess = createJimengVideoResponse200 & {
  headers: Headers;
};
export type createJimengVideoResponseError = createJimengVideoResponse400 & {
  headers: Headers;
};

export type createJimengVideoResponse =
  | createJimengVideoResponseSuccess
  | createJimengVideoResponseError;

export const getCreateJimengVideoUrl = (params: CreateJimengVideoParams) => {
  const normalizedParams = new URLSearchParams();

  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined) {
      normalizedParams.append(key, value === null ? "null" : value.toString());
    }
  });

  const stringifiedParams = normalizedParams.toString();

  return stringifiedParams.length > 0
    ? `/jimeng/?${stringifiedParams}`
    : `/jimeng/`;
};

export const createJimengVideo = async (
  createJimengVideoBody: CreateJimengVideoBody,
  params: CreateJimengVideoParams,
  options?: RequestInit,
): Promise<createJimengVideoResponse> => {
  return fetcher<createJimengVideoResponse>(getCreateJimengVideoUrl(params), {
    ...options,
    method: "POST",
    headers: { "Content-Type": "application/json", ...options?.headers },
    body: JSON.stringify(createJimengVideoBody),
  });
};

/**
 * 提交视频生成任务，支持文生视频和图生视频。

返回任务 ID，可通过 GET 接口查询任务状态。

 * @summary 创建视频生成任务
 */
export type createVideoGenerationResponse200 = {
  data: VideoResponse;
  status: 200;
};

export type createVideoGenerationResponse400 = {
  data: ErrorResponse;
  status: 400;
};

export type createVideoGenerationResponseSuccess =
  createVideoGenerationResponse200 & {
    headers: Headers;
  };
export type createVideoGenerationResponseError =
  createVideoGenerationResponse400 & {
    headers: Headers;
  };

export type createVideoGenerationResponse =
  | createVideoGenerationResponseSuccess
  | createVideoGenerationResponseError;

export const getCreateVideoGenerationUrl = () => {
  return `/v1/video/generations`;
};

export const createVideoGeneration = async (
  videoRequest: VideoRequest,
  options?: RequestInit,
): Promise<createVideoGenerationResponse> => {
  return fetcher<createVideoGenerationResponse>(getCreateVideoGenerationUrl(), {
    ...options,
    method: "POST",
    headers: { "Content-Type": "application/json", ...options?.headers },
    body: JSON.stringify(videoRequest),
  });
};

/**
 * 查询视频生成任务的状态和结果。

任务状态：
- `queued`: 排队中
- `in_progress`: 生成中
- `completed`: 已完成
- `failed`: 失败

 * @summary 获取视频生成任务状态
 */
export type getVideoGenerationResponse200 = {
  data: VideoTaskResponse;
  status: 200;
};

export type getVideoGenerationResponse404 = {
  data: ErrorResponse;
  status: 404;
};

export type getVideoGenerationResponseSuccess =
  getVideoGenerationResponse200 & {
    headers: Headers;
  };
export type getVideoGenerationResponseError = getVideoGenerationResponse404 & {
  headers: Headers;
};

export type getVideoGenerationResponse =
  | getVideoGenerationResponseSuccess
  | getVideoGenerationResponseError;

export const getGetVideoGenerationUrl = (taskId: string) => {
  return `/v1/video/generations/${taskId}`;
};

export const getVideoGeneration = async (
  taskId: string,
  options?: RequestInit,
): Promise<getVideoGenerationResponse> => {
  return fetcher<getVideoGenerationResponse>(getGetVideoGenerationUrl(taskId), {
    ...options,
    method: "GET",
  });
};

/**
 * Anthropic Claude Messages API 格式的请求。
需要在请求头中包含 `anthropic-version`。

 * @summary Claude 聊天
 */
export type createMessageResponse200 = {
  data: ClaudeResponse;
  status: 200;
};

export type createMessageResponseSuccess = createMessageResponse200 & {
  headers: Headers;
};
export type createMessageResponse = createMessageResponseSuccess;

export const getCreateMessageUrl = () => {
  return `/v1/messages`;
};

export const createMessage = async (
  claudeRequest: ClaudeRequest,
  options?: RequestInit,
): Promise<createMessageResponse> => {
  return fetcher<createMessageResponse>(getCreateMessageUrl(), {
    ...options,
    method: "POST",
    headers: { "Content-Type": "application/json", ...options?.headers },
    body: JSON.stringify(claudeRequest),
  });
};

/**
 * Gemini 图片生成
 * @summary Gemini 图片(Nano Banana)
 */
export type geminiRelayV1BetaResponse200 = {
  data: GeminiResponse;
  status: 200;
};

export type geminiRelayV1BetaResponseSuccess = geminiRelayV1BetaResponse200 & {
  headers: Headers;
};
export type geminiRelayV1BetaResponse = geminiRelayV1BetaResponseSuccess;

export const getGeminiRelayV1BetaUrl = (model: string) => {
  return `/v1beta/models/${model}:generateContent`;
};

export const geminiRelayV1Beta = async (
  model: string,
  geminiRelayV1BetaBody: GeminiRelayV1BetaBody,
  options?: RequestInit,
): Promise<geminiRelayV1BetaResponse> => {
  return fetcher<geminiRelayV1BetaResponse>(getGeminiRelayV1BetaUrl(model), {
    ...options,
    method: "POST",
    headers: { "Content-Type": "application/json", ...options?.headers },
    body: JSON.stringify(geminiRelayV1BetaBody),
  });
};

/**
 * 使用指定引擎/模型创建嵌入
 * @summary Gemini 嵌入(Embeddings)
 */
export type createEngineEmbeddingResponse200 = {
  data: EmbeddingResponse;
  status: 200;
};

export type createEngineEmbeddingResponseSuccess =
  createEngineEmbeddingResponse200 & {
    headers: Headers;
  };
export type createEngineEmbeddingResponse =
  createEngineEmbeddingResponseSuccess;

export const getCreateEngineEmbeddingUrl = (model: string) => {
  return `/v1/engines/${model}/embeddings`;
};

export const createEngineEmbedding = async (
  model: string,
  embeddingRequest: EmbeddingRequest,
  options?: RequestInit,
): Promise<createEngineEmbeddingResponse> => {
  return fetcher<createEngineEmbeddingResponse>(
    getCreateEngineEmbeddingUrl(model),
    {
      ...options,
      method: "POST",
      headers: { "Content-Type": "application/json", ...options?.headers },
      body: JSON.stringify(embeddingRequest),
    },
  );
};

/**
 * 将文本转换为向量嵌入
 * @summary 创建文本嵌入
 */
export type createEmbeddingResponse200 = {
  data: EmbeddingResponse;
  status: 200;
};

export type createEmbeddingResponseSuccess = createEmbeddingResponse200 & {
  headers: Headers;
};
export type createEmbeddingResponse = createEmbeddingResponseSuccess;

export const getCreateEmbeddingUrl = () => {
  return `/v1/embeddings`;
};

export const createEmbedding = async (
  embeddingRequest: EmbeddingRequest,
  options?: RequestInit,
): Promise<createEmbeddingResponse> => {
  return fetcher<createEmbeddingResponse>(getCreateEmbeddingUrl(), {
    ...options,
    method: "POST",
    headers: { "Content-Type": "application/json", ...options?.headers },
    body: JSON.stringify(embeddingRequest),
  });
};

/**
 * 基于给定提示创建文本补全
 * @summary 创建文本补全
 */
export type createCompletionResponse200 = {
  data: CompletionResponse;
  status: 200;
};

export type createCompletionResponseSuccess = createCompletionResponse200 & {
  headers: Headers;
};
export type createCompletionResponse = createCompletionResponseSuccess;

export const getCreateCompletionUrl = () => {
  return `/v1/completions`;
};

export const createCompletion = async (
  completionRequest: CompletionRequest,
  options?: RequestInit,
): Promise<createCompletionResponse> => {
  return fetcher<createCompletionResponse>(getCreateCompletionUrl(), {
    ...options,
    method: "POST",
    headers: { "Content-Type": "application/json", ...options?.headers },
    body: JSON.stringify(completionRequest),
  });
};

/**
 * 将音频转换为文本
 * @summary 音频转录
 */
export type createTranscriptionResponse200 = {
  data: AudioTranscriptionResponse;
  status: 200;
};

export type createTranscriptionResponseSuccess =
  createTranscriptionResponse200 & {
    headers: Headers;
  };
export type createTranscriptionResponse = createTranscriptionResponseSuccess;

export const getCreateTranscriptionUrl = () => {
  return `/v1/audio/transcriptions`;
};

export const createTranscription = async (
  createTranscriptionBody: CreateTranscriptionBody,
  options?: RequestInit,
): Promise<createTranscriptionResponse> => {
  const formData = new FormData();
  formData.append(`file`, createTranscriptionBody.file);
  formData.append(`model`, createTranscriptionBody.model);
  if (createTranscriptionBody.language !== undefined) {
    formData.append(`language`, createTranscriptionBody.language);
  }
  if (createTranscriptionBody.prompt !== undefined) {
    formData.append(`prompt`, createTranscriptionBody.prompt);
  }
  if (createTranscriptionBody.response_format !== undefined) {
    formData.append(`response_format`, createTranscriptionBody.response_format);
  }
  if (createTranscriptionBody.temperature !== undefined) {
    formData.append(
      `temperature`,
      createTranscriptionBody.temperature.toString(),
    );
  }
  if (createTranscriptionBody.timestamp_granularities !== undefined) {
    createTranscriptionBody.timestamp_granularities.forEach((value) =>
      formData.append(`timestamp_granularities`, value),
    );
  }

  return fetcher<createTranscriptionResponse>(getCreateTranscriptionUrl(), {
    ...options,
    method: "POST",
    body: formData,
  });
};

/**
 * 将音频翻译为英文文本
 * @summary 音频翻译
 */
export type createTranslationResponse200 = {
  data: AudioTranscriptionResponse;
  status: 200;
};

export type createTranslationResponseSuccess = createTranslationResponse200 & {
  headers: Headers;
};
export type createTranslationResponse = createTranslationResponseSuccess;

export const getCreateTranslationUrl = () => {
  return `/v1/audio/translations`;
};

export const createTranslation = async (
  createTranslationBody: CreateTranslationBody,
  options?: RequestInit,
): Promise<createTranslationResponse> => {
  const formData = new FormData();
  formData.append(`file`, createTranslationBody.file);
  formData.append(`model`, createTranslationBody.model);
  if (createTranslationBody.prompt !== undefined) {
    formData.append(`prompt`, createTranslationBody.prompt);
  }
  if (createTranslationBody.response_format !== undefined) {
    formData.append(`response_format`, createTranslationBody.response_format);
  }
  if (createTranslationBody.temperature !== undefined) {
    formData.append(
      `temperature`,
      createTranslationBody.temperature.toString(),
    );
  }

  return fetcher<createTranslationResponse>(getCreateTranslationUrl(), {
    ...options,
    method: "POST",
    body: formData,
  });
};

/**
 * 将文本转换为音频
 * @summary 文本转语音
 */
export type createSpeechResponse200 = {
  data: Blob;
  status: 200;
};

export type createSpeechResponseSuccess = createSpeechResponse200 & {
  headers: Headers;
};
export type createSpeechResponse = createSpeechResponseSuccess;

export const getCreateSpeechUrl = () => {
  return `/v1/audio/speech`;
};

export const createSpeech = async (
  speechRequest: SpeechRequest,
  options?: RequestInit,
): Promise<createSpeechResponse> => {
  return fetcher<createSpeechResponse>(getCreateSpeechUrl(), {
    ...options,
    method: "POST",
    headers: { "Content-Type": "application/json", ...options?.headers },
    body: JSON.stringify(speechRequest),
  });
};

/**
 * 根据查询对文档列表进行相关性重排序
 * @summary 文档重排序
 */
export type createRerankResponse200 = {
  data: RerankResponse;
  status: 200;
};

export type createRerankResponseSuccess = createRerankResponse200 & {
  headers: Headers;
};
export type createRerankResponse = createRerankResponseSuccess;

export const getCreateRerankUrl = () => {
  return `/v1/rerank`;
};

export const createRerank = async (
  rerankRequest: RerankRequest,
  options?: RequestInit,
): Promise<createRerankResponse> => {
  return fetcher<createRerankResponse>(getCreateRerankUrl(), {
    ...options,
    method: "POST",
    headers: { "Content-Type": "application/json", ...options?.headers },
    body: JSON.stringify(rerankRequest),
  });
};

/**
 * 检查文本内容是否违反使用政策
 * @summary 内容审核
 */
export type createModerationResponse200 = {
  data: ModerationResponse;
  status: 200;
};

export type createModerationResponseSuccess = createModerationResponse200 & {
  headers: Headers;
};
export type createModerationResponse = createModerationResponseSuccess;

export const getCreateModerationUrl = () => {
  return `/v1/moderations`;
};

export const createModeration = async (
  moderationRequest: ModerationRequest,
  options?: RequestInit,
): Promise<createModerationResponse> => {
  return fetcher<createModerationResponse>(getCreateModerationUrl(), {
    ...options,
    method: "POST",
    headers: { "Content-Type": "application/json", ...options?.headers },
    body: JSON.stringify(moderationRequest),
  });
};

/**
 * 建立 WebSocket 连接用于实时对话。

**注意**: 这是一个 WebSocket 端点，需要使用 WebSocket 协议连接。

连接 URL 示例: `wss://api.example.com/v1/realtime?model=gpt-4o-realtime`

 * @summary 实时 WebSocket 连接
 */
export type createRealtimeSessionResponse101 = {
  data: void;
  status: 101;
};

export type createRealtimeSessionResponse400 = {
  data: ErrorResponse;
  status: 400;
};
export type createRealtimeSessionResponseError = (
  | createRealtimeSessionResponse101
  | createRealtimeSessionResponse400
) & {
  headers: Headers;
};

export type createRealtimeSessionResponse = createRealtimeSessionResponseError;

export const getCreateRealtimeSessionUrl = (
  params?: CreateRealtimeSessionParams,
) => {
  const normalizedParams = new URLSearchParams();

  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined) {
      normalizedParams.append(key, value === null ? "null" : value.toString());
    }
  });

  const stringifiedParams = normalizedParams.toString();

  return stringifiedParams.length > 0
    ? `/v1/realtime?${stringifiedParams}`
    : `/v1/realtime`;
};

export const createRealtimeSession = async (
  params?: CreateRealtimeSessionParams,
  options?: RequestInit,
): Promise<createRealtimeSessionResponse> => {
  return fetcher<createRealtimeSessionResponse>(
    getCreateRealtimeSessionUrl(params),
    {
      ...options,
      method: "GET",
    },
  );
};

/**
 * 此接口尚未实现
 * @summary 列出微调任务 (未实现)
 */
export type listFineTunesResponse501 = {
  data: ErrorResponse;
  status: 501;
};
export type listFineTunesResponseError = listFineTunesResponse501 & {
  headers: Headers;
};

export type listFineTunesResponse = listFineTunesResponseError;

export const getListFineTunesUrl = () => {
  return `/v1/fine-tunes`;
};

export const listFineTunes = async (
  options?: RequestInit,
): Promise<listFineTunesResponse> => {
  return fetcher<listFineTunesResponse>(getListFineTunesUrl(), {
    ...options,
    method: "GET",
  });
};

/**
 * 此接口尚未实现
 * @summary 创建微调任务 (未实现)
 */
export type createFineTuneResponse501 = {
  data: ErrorResponse;
  status: 501;
};
export type createFineTuneResponseError = createFineTuneResponse501 & {
  headers: Headers;
};

export type createFineTuneResponse = createFineTuneResponseError;

export const getCreateFineTuneUrl = () => {
  return `/v1/fine-tunes`;
};

export const createFineTune = async (
  createFineTuneBody: CreateFineTuneBody,
  options?: RequestInit,
): Promise<createFineTuneResponse> => {
  return fetcher<createFineTuneResponse>(getCreateFineTuneUrl(), {
    ...options,
    method: "POST",
    headers: { "Content-Type": "application/json", ...options?.headers },
    body: JSON.stringify(createFineTuneBody),
  });
};

/**
 * 此接口尚未实现
 * @summary 获取微调任务详情 (未实现)
 */
export type retrieveFineTuneResponse501 = {
  data: ErrorResponse;
  status: 501;
};
export type retrieveFineTuneResponseError = retrieveFineTuneResponse501 & {
  headers: Headers;
};

export type retrieveFineTuneResponse = retrieveFineTuneResponseError;

export const getRetrieveFineTuneUrl = (fineTuneId: string) => {
  return `/v1/fine-tunes/${fineTuneId}`;
};

export const retrieveFineTune = async (
  fineTuneId: string,
  options?: RequestInit,
): Promise<retrieveFineTuneResponse> => {
  return fetcher<retrieveFineTuneResponse>(getRetrieveFineTuneUrl(fineTuneId), {
    ...options,
    method: "GET",
  });
};

/**
 * 此接口尚未实现
 * @summary 取消微调任务 (未实现)
 */
export type cancelFineTuneResponse501 = {
  data: ErrorResponse;
  status: 501;
};
export type cancelFineTuneResponseError = cancelFineTuneResponse501 & {
  headers: Headers;
};

export type cancelFineTuneResponse = cancelFineTuneResponseError;

export const getCancelFineTuneUrl = (fineTuneId: string) => {
  return `/v1/fine-tunes/${fineTuneId}/cancel`;
};

export const cancelFineTune = async (
  fineTuneId: string,
  options?: RequestInit,
): Promise<cancelFineTuneResponse> => {
  return fetcher<cancelFineTuneResponse>(getCancelFineTuneUrl(fineTuneId), {
    ...options,
    method: "POST",
  });
};

/**
 * 此接口尚未实现
 * @summary 获取微调任务事件 (未实现)
 */
export type listFineTuneEventsResponse501 = {
  data: ErrorResponse;
  status: 501;
};
export type listFineTuneEventsResponseError = listFineTuneEventsResponse501 & {
  headers: Headers;
};

export type listFineTuneEventsResponse = listFineTuneEventsResponseError;

export const getListFineTuneEventsUrl = (fineTuneId: string) => {
  return `/v1/fine-tunes/${fineTuneId}/events`;
};

export const listFineTuneEvents = async (
  fineTuneId: string,
  options?: RequestInit,
): Promise<listFineTuneEventsResponse> => {
  return fetcher<listFineTuneEventsResponse>(
    getListFineTuneEventsUrl(fineTuneId),
    {
      ...options,
      method: "GET",
    },
  );
};

/**
 * 此接口尚未实现
 * @summary 列出文件 (未实现)
 */
export type listFilesResponse501 = {
  data: ErrorResponse;
  status: 501;
};
export type listFilesResponseError = listFilesResponse501 & {
  headers: Headers;
};

export type listFilesResponse = listFilesResponseError;

export const getListFilesUrl = () => {
  return `/v1/files`;
};

export const listFiles = async (
  options?: RequestInit,
): Promise<listFilesResponse> => {
  return fetcher<listFilesResponse>(getListFilesUrl(), {
    ...options,
    method: "GET",
  });
};

/**
 * 此接口尚未实现
 * @summary 上传文件 (未实现)
 */
export type createFileResponse501 = {
  data: ErrorResponse;
  status: 501;
};
export type createFileResponseError = createFileResponse501 & {
  headers: Headers;
};

export type createFileResponse = createFileResponseError;

export const getCreateFileUrl = () => {
  return `/v1/files`;
};

export const createFile = async (
  createFileBody: CreateFileBody,
  options?: RequestInit,
): Promise<createFileResponse> => {
  const formData = new FormData();
  if (createFileBody.file !== undefined) {
    formData.append(`file`, createFileBody.file);
  }
  if (createFileBody.purpose !== undefined) {
    formData.append(`purpose`, createFileBody.purpose);
  }

  return fetcher<createFileResponse>(getCreateFileUrl(), {
    ...options,
    method: "POST",
    body: formData,
  });
};

/**
 * 此接口尚未实现
 * @summary 获取文件信息 (未实现)
 */
export type retrieveFileResponse501 = {
  data: ErrorResponse;
  status: 501;
};
export type retrieveFileResponseError = retrieveFileResponse501 & {
  headers: Headers;
};

export type retrieveFileResponse = retrieveFileResponseError;

export const getRetrieveFileUrl = (fileId: string) => {
  return `/v1/files/${fileId}`;
};

export const retrieveFile = async (
  fileId: string,
  options?: RequestInit,
): Promise<retrieveFileResponse> => {
  return fetcher<retrieveFileResponse>(getRetrieveFileUrl(fileId), {
    ...options,
    method: "GET",
  });
};

/**
 * 此接口尚未实现
 * @summary 删除文件 (未实现)
 */
export type deleteFileResponse501 = {
  data: ErrorResponse;
  status: 501;
};
export type deleteFileResponseError = deleteFileResponse501 & {
  headers: Headers;
};

export type deleteFileResponse = deleteFileResponseError;

export const getDeleteFileUrl = (fileId: string) => {
  return `/v1/files/${fileId}`;
};

export const deleteFile = async (
  fileId: string,
  options?: RequestInit,
): Promise<deleteFileResponse> => {
  return fetcher<deleteFileResponse>(getDeleteFileUrl(fileId), {
    ...options,
    method: "DELETE",
  });
};

/**
 * 此接口尚未实现
 * @summary 获取文件内容 (未实现)
 */
export type downloadFileResponse501 = {
  data: ErrorResponse;
  status: 501;
};
export type downloadFileResponseError = downloadFileResponse501 & {
  headers: Headers;
};

export type downloadFileResponse = downloadFileResponseError;

export const getDownloadFileUrl = (fileId: string) => {
  return `/v1/files/${fileId}/content`;
};

export const downloadFile = async (
  fileId: string,
  options?: RequestInit,
): Promise<downloadFileResponse> => {
  return fetcher<downloadFileResponse>(getDownloadFileUrl(fileId), {
    ...options,
    method: "GET",
  });
};
