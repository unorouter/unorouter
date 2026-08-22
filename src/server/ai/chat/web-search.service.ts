import { freeModelRace } from "@/lib/ai/chat/free-model-race";
import {
  GUEST_USER_ID,
  TAVILY_TIMEOUT_MS,
  WEB_SEARCH_CLASSIFIER_SYSTEM_PROMPT,
} from "@/lib/config/constants";
import { logger } from "@/lib/utils/logger";
import { serverFreeModelRaceDeps } from "@/server/ai/chat/free-model-race.service";
import { serverEnv } from "@/server/env";

const MAX_RESULTS = 5;

type TavilyResult = {
  title: string;
  url: string;
  content: string;
};

type TavilySearchResponse = {
  query: string;
  results: TavilyResult[];
};

async function needsWebSearch(
  apiKey: string,
  userText: string,
): Promise<boolean> {
  try {
    const result = await freeModelRace({
      ...serverFreeModelRaceDeps(apiKey),
      systemPrompt: WEB_SEARCH_CLASSIFIER_SYSTEM_PROMPT,
      prompt: userText,
      maxOutputTokens: 3,
      abortSignal: AbortSignal.timeout(TAVILY_TIMEOUT_MS),
    });
    return result.text.trim().toLowerCase().startsWith("yes");
  } catch (err) {
    logger.warn("Web search classification failed, skipping search", {
      context: "tavily.classify",
      error: String(err),
    });
    return false;
  }
}

async function searchTavily(
  query: string,
): Promise<TavilySearchResponse | null> {
  const apiKey = serverEnv.tavilyApiKey;
  if (!apiKey) return null;

  try {
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(TAVILY_TIMEOUT_MS),
      body: JSON.stringify({
        api_key: apiKey,
        query,
        max_results: MAX_RESULTS,
        include_answer: false,
      }),
    });

    if (!res.ok) {
      logger.warn("Tavily search request failed", {
        context: "tavily.search",
        status: res.status,
        query: query.slice(0, 100),
      });
      return null;
    }

    const data = await res.json();
    return {
      query: data.query ?? query,
      results: (data.results ?? [])
        .slice(0, MAX_RESULTS)
        .map((r: { title?: string; url?: string; content?: string }) => ({
          title: r.title ?? "",
          url: r.url ?? "",
          content: r.content ?? "",
        })),
    };
  } catch (err) {
    logger.warn("Tavily search failed", {
      context: "tavily.search",
      error: String(err),
    });
    return null;
  }
}

export async function resolveWebSearch(
  apiKey: string,
  userId: number,
  text: string,
): Promise<string | null> {
  if (userId === GUEST_USER_ID) return null;
  if (!text || !(await needsWebSearch(apiKey, text))) return null;
  const result = await searchTavily(text);
  if (!result || result.results.length === 0) return null;
  return formatSearchContext(result);
}

function formatSearchContext(search: TavilySearchResponse): string {
  const entries = search.results
    .map((r, i) => `[${i + 1}] ${r.title}\nURL: ${r.url}\n${r.content}`)
    .join("\n\n");

  return [
    "The following web search results are provided as context for the user's query.",
    "Use this information to provide an accurate, up-to-date response.",
    "Cite sources by referencing the URL when relevant.",
    "",
    `Search query: "${search.query}"`,
    "",
    entries,
  ].join("\n");
}
