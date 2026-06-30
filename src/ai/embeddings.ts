import { config } from "../config";
import { logger } from "../logger";

const VOYAGE_URL = "https://api.voyageai.com/v1/embeddings";

interface VoyageResponse {
  data: { embedding: number[] }[];
}

/**
 * Calls the Voyage embeddings REST API. `input_type` enables asymmetric
 * retrieval ("query" for user questions, "document" for stored KB entries).
 */
const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

async function embed(
  texts: string[],
  inputType: "query" | "document",
  maxRetries = 6,
): Promise<number[][]> {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(VOYAGE_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.ai.VOYAGE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        input: texts,
        model: config.ai.EMBEDDING_MODEL,
        input_type: inputType,
      }),
    });

    if (res.ok) {
      const body = (await res.json()) as VoyageResponse;
      return body.data.map((d) => d.embedding);
    }

    // Retry on rate limiting (429), respecting Retry-After when present.
    if (res.status === 429 && attempt < maxRetries) {
      const retryAfter = Number(res.headers.get("retry-after"));
      const waitMs = Number.isFinite(retryAfter) && retryAfter > 0
        ? retryAfter * 1000
        : Math.min(60_000, 2_000 * 2 ** attempt);
      logger.warn({ waitMs, attempt }, "Voyage 429 — backing off");
      await sleep(waitMs);
      continue;
    }

    const detail = await res.text();
    logger.error({ status: res.status, detail }, "Voyage embeddings failed");
    throw new Error(`Voyage embeddings failed: ${res.status}`);
  }
}

/** Embeds a single user query. */
export async function embedQuery(text: string): Promise<number[]> {
  const [vector] = await embed([text], "query");
  return vector;
}

/** Embeds a batch of knowledge-base documents. */
export async function embedDocuments(texts: string[]): Promise<number[][]> {
  return embed(texts, "document");
}
