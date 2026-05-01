import { getFreeTextModels } from "@/lib/api/pricing-cache";
import { logger } from "@/lib/utils/logger";
import { getProvider } from "@/server/constants";
import { serverEnv } from "@/server/env";
import { generateText } from "ai";

const TAVILY_TIMEOUT = 5_000;
const CLASSIFIER_SYSTEM_PROMPT = `Decide if this query needs current or real-time web information to answer accurately. Reply only "yes" or "no".`;

type TavilyResult = {
  title: string;
  url: string;
  content: string;
};

type TavilySearchResponse = {
  query: string;
  results: TavilyResult[];
};

/**
 * Ask the cheapest available model whether the query needs live web data.
 * Returns false on error (fail closed to save Tavily quota).
 */
export async function needsWebSearch(
  apiKey: string,
  userText: string,
): Promise<boolean> {
  try {
    const freeModels = await getFreeTextModels(3);
    if (freeModels.length === 0) return false;

    const provider = getProvider(serverEnv.guestApiKey ?? apiKey);
    const signal = AbortSignal.timeout(TAVILY_TIMEOUT);

    const attempts = freeModels.map((modelName) =>
      generateText({
        model: provider.chatModel(modelName),
        system: CLASSIFIER_SYSTEM_PROMPT,
        prompt: userText,
        maxOutputTokens: 3,
        maxRetries: 0,
        abortSignal: signal,
      }),
    );

    const result = await Promise.any(attempts);
    return result.text.trim().toLowerCase().startsWith("yes");
  } catch (err) {
    logger.warn("Web search classification failed, skipping search", {
      context: "tavily.classify",
      error: String(err),
    });
    return false;
  }
}

/**
 * Search Tavily for web results relevant to the query.
 * Returns null if the API key is missing or the request fails.
 */
export async function searchTavily(
  query: string,
): Promise<TavilySearchResponse | null> {
  const apiKey = serverEnv.tavilyApiKey;
  if (!apiKey) return null;

  try {
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(TAVILY_TIMEOUT),
      body: JSON.stringify({
        api_key: apiKey,
        query,
        max_results: 5,
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
        .slice(0, 5)
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

/**
 * Format Tavily search results into a system message for LLM context injection.
 */
export function formatSearchContext(search: TavilySearchResponse): string {
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
