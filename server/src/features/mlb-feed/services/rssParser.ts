/**
 * Shared RSS feed parser. Extracts items from RSS/XML feeds with CDATA support.
 * Replaces 4 duplicated parsing blocks in routes.ts (Trade Rumors, Yahoo, MLB.com, ESPN).
 */
import { logger } from "../../../lib/logger.js";

// ─── In-memory cache for RSS feeds (5-minute TTL) ───
const FEED_CACHE_TTL = 5 * 60 * 1000;
const feedCache = new Map<string, { articles: RssArticle[]; expiresAt: number }>();

export interface RssArticle {
  title: string;
  link: string;
  pubDate: string;
  description: string;
  categories: string[];
}

const DECODE_ENTITIES: Record<string, string> = {
  "&amp;": "&", "&lt;": "<", "&gt;": ">", "&#39;": "'", "&quot;": '"',
};

function decodeHtml(s: string): string {
  return s.replace(/&amp;|&lt;|&gt;|&#39;|&quot;/g, m => DECODE_ENTITIES[m] || m);
}

/**
 * Fetch and parse an RSS feed URL. Returns up to `maxItems` articles.
 * Validates that link URLs start with https:// to prevent javascript: injection.
 */
export async function fetchRssFeed(
  url: string,
  options: { maxItems?: number; sourceName?: string } = {},
): Promise<RssArticle[]> {
  const { maxItems = 15, sourceName = url } = options;

  // Check in-memory cache first (5-minute TTL)
  const cached = feedCache.get(url);
  if (cached && cached.expiresAt > Date.now()) return cached.articles;

  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "FBST/1.0 Fantasy Baseball App" },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return [];
    const xml = await response.text();
    // Guard against abnormally large payloads that could slow regex parsing
    if (xml.length > 2_000_000) {
      logger.warn({ source: sourceName, size: xml.length }, "RSS feed too large, skipping");
      return [];
    }
    const articles = parseRssXml(xml, maxItems);
    feedCache.set(url, { articles, expiresAt: Date.now() + FEED_CACHE_TTL });
    return articles;
  } catch (err) {
    logger.warn({ error: String(err), source: sourceName }, "Failed to fetch RSS feed");
    return [];
  }
}

/**
 * Parse RSS XML string into articles. Handles CDATA-wrapped and plain fields.
 */
export function parseRssXml(xml: string, maxItems = 15): RssArticle[] {
  const articles: RssArticle[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;

  while ((match = itemRegex.exec(xml)) !== null && articles.length < maxItems) {
    const block = match[1];

    const title = extractField(block, "title");
    const rawLink = extractField(block, "link");
    const pubDate = extractField(block, "pubDate");
    const rawDesc = extractField(block, "description");

    // Validate link URL — must start with https:// to prevent javascript: injection
    const link = rawLink.startsWith("https://") ? rawLink : "";

    if (title && link) {
      // Extract categories (Trade Rumors uses these for player/team tags)
      const categories: string[] = [];
      const catRegex = /<category><!\[CDATA\[(.*?)\]\]><\/category>/g;
      let catMatch;
      while ((catMatch = catRegex.exec(block)) !== null) {
        categories.push(catMatch[1]);
      }

      articles.push({
        title: decodeHtml(title),
        link,
        pubDate,
        description: rawDesc.replace(/<[^>]*>/g, "").slice(0, 150),
        categories,
      });
    }
  }

  return articles;
}

// Pre-compiled regex cache to avoid re-compiling per field per item (4 fields x 15 items = 60 compilations)
const fieldRegexCache = new Map<string, { cdata: RegExp; plain: RegExp }>();
function getFieldRegex(field: string) {
  let cached = fieldRegexCache.get(field);
  if (!cached) {
    cached = {
      cdata: new RegExp(`<${field}><!\\[CDATA\\[(.*?)\\]\\]></${field}>`),
      plain: new RegExp(`<${field}>(.*?)</${field}>`),
    };
    fieldRegexCache.set(field, cached);
  }
  return cached;
}

function extractField(block: string, field: string): string {
  const { cdata, plain } = getFieldRegex(field);
  return block.match(cdata)?.[1] ?? block.match(plain)?.[1] ?? "";
}
