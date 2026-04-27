const summaryCache = new Map<string, string | null>();

export interface WikipediaSummary {
  extract: string;
  url: string;
}

export async function fetchWikipediaSummary(
  title: string,
  signal?: AbortSignal
): Promise<WikipediaSummary | null> {
  const key = title.trim();
  if (!key) return null;

  if (summaryCache.has(key)) {
    const cached = summaryCache.get(key);
    if (cached === null) return null;
    return { extract: cached as string, url: buildUrl(key) };
  }

  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(
    key
  )}?redirect=true`;

  try {
    const res = await fetch(url, { signal });
    if (!res.ok) {
      summaryCache.set(key, null);
      return null;
    }
    const data = (await res.json()) as {
      extract?: string;
      content_urls?: { desktop?: { page?: string } };
      type?: string;
    };
    if (data.type === "disambiguation") {
      summaryCache.set(key, null);
      return null;
    }
    if (!data.extract) {
      summaryCache.set(key, null);
      return null;
    }
    summaryCache.set(key, data.extract);
    return {
      extract: data.extract,
      url: data.content_urls?.desktop?.page ?? buildUrl(key),
    };
  } catch (err) {
    if ((err as Error)?.name === "AbortError") throw err;
    summaryCache.set(key, null);
    return null;
  }
}

function buildUrl(title: string): string {
  return `https://en.wikipedia.org/wiki/${encodeURIComponent(title)}`;
}
