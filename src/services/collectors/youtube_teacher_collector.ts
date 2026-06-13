import { createClient } from "@libsql/client";
import { youtubeConfigs, youtubeConfigMap, YouTubeLanguageConfig } from "@/src/config/youtube";

function getDb() {
  return createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  });
}

const YT_BASE = "https://www.googleapis.com/youtube/v3";

async function ytFetch(path: string, params: Record<string, string>): Promise<any> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) throw new Error("YOUTUBE_API_KEY is not set");
  const qs = new URLSearchParams({ ...params, key: apiKey }).toString();
  const res = await fetch(`${YT_BASE}${path}?${qs}`, { next: { revalidate: 0 } });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`YouTube API ${res.status}: ${body.slice(0, 200)}`);
  }
  return res.json();
}

async function searchChannelIds(query: string): Promise<string[]> {
  try {
    const data = await ytFetch("/search", {
      part: "snippet",
      type: "channel",
      q: query,
      maxResults: "20",
    });
    return (data.items ?? []).map((i: any) => i.snippet?.channelId as string).filter(Boolean);
  } catch (e) {
    console.error(`[YT] search failed for "${query}":`, e);
    return [];
  }
}

async function fetchChannelBatch(ids: string[]): Promise<any[]> {
  if (ids.length === 0) return [];
  const data = await ytFetch("/channels", {
    part: "snippet,statistics,contentDetails,brandingSettings",
    id: ids.join(","),
    maxResults: "50",
  });
  return data.items ?? [];
}

async function fetchRecentVideoDate(uploadsPlaylistId: string): Promise<string | null> {
  try {
    const data = await ytFetch("/playlistItems", {
      part: "snippet",
      playlistId: uploadsPlaylistId,
      maxResults: "1",
    });
    const publishedAt: string | undefined = data.items?.[0]?.snippet?.publishedAt;
    return publishedAt ? publishedAt.slice(0, 10) : null;
  } catch {
    return null;
  }
}

function extractLinks(text: string) {
  const email = text.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/)?.[0] ?? null;
  const igMatch = text.match(/instagram\.com\/([A-Za-z0-9._]+)/i);
  const instagram = igMatch ? `https://instagram.com/${igMatch[1]}` : null;
  const liMatch = text.match(/linkedin\.com\/in\/([A-Za-z0-9._\-]+)/i);
  const linkedin = liMatch ? `https://linkedin.com/in/${liMatch[1]}` : null;
  const excludeDomains = /youtube|instagram|linkedin|twitter|facebook|tiktok|bit\.ly|linktr\.ee|youtu\.be/i;
  const allUrls = text.match(/https?:\/\/[^\s<>"']+/gi) ?? [];
  const website = allUrls.find((u) => !excludeDomains.test(u)) ?? null;
  return { email, instagram, linkedin, website };
}

function contactGrade(links: ReturnType<typeof extractLinks>): "A" | "B" | "C" | "D" {
  if (links.email)     return "A";
  if (links.instagram) return "B";
  if (links.website)   return "C";
  return "D";
}

function calcScore(subs: number, links: ReturnType<typeof extractLinks>, recentDays: number): number {
  let s = 0;
  if (subs > 10000)     s += 20;
  if (links.email)      s += 30;
  if (links.website)    s += 20;
  if (links.instagram)  s += 10;
  if (links.linkedin)   s += 10;
  if (recentDays <= 30) s += 20;
  return Math.min(s, 100);
}

function scoreToStatus(score: number): string {
  if (score >= 70) return "HOT";
  if (score >= 40) return "WARM";
  return "COLD";
}

async function collectOneLanguage(config: YouTubeLanguageConfig, db: ReturnType<typeof getDb>) {
  const allQueries = [...config.nativeSearchKeywords, ...config.englishSearchKeywords];
  const channelIdSet = new Set<string>();

  for (const query of allQueries) {
    const ids = await searchChannelIds(query);
    ids.forEach((id) => channelIdSet.add(id));
  }

  const channelIds = Array.from(channelIdSet);
  let inserted = 0, duplicated = 0, skipped = 0;

  for (let i = 0; i < channelIds.length; i += 50) {
    const batch = channelIds.slice(i, i + 50);
    let items: any[] = [];
    try {
      items = await fetchChannelBatch(batch);
    } catch (e) {
      console.error("[YT] fetchChannelBatch error:", e);
      continue;
    }

    for (const item of items) {
      const subs = Number(item.statistics?.subscriberCount ?? 0);
      const desc: string =
        item.snippet?.description ??
        item.brandingSettings?.channel?.description ?? "";

      const links = extractLinks(desc);

      if (contactGrade(links) === "D") { skipped++; continue; }

      const uploadsPlaylistId: string | undefined =
        item.contentDetails?.relatedPlaylists?.uploads;
      let recentVideoDate: string | null = null;
      let recentDays = 9999;

      if (uploadsPlaylistId) {
        recentVideoDate = await fetchRecentVideoDate(uploadsPlaylistId);
        if (recentVideoDate) {
          recentDays = Math.floor(
            (Date.now() - new Date(recentVideoDate).getTime()) / 86400000
          );
        }
      }

      if (recentDays > 365) { skipped++; continue; }

      const channelId: string = item.id;
      const score = calcScore(subs, links, recentDays);

      const existing = await db.execute({
        sql: "SELECT id FROM schools WHERE channel_id = ?",
        args: [channelId],
      });
      if (existing.rows.length > 0) { duplicated++; continue; }

      try {
        await db.execute({
          sql: `INSERT INTO schools (
            school_name, website, email, country,
            source, lead_type, lead_score, lead_status,
            channel_id, channel_name, channel_url,
            subscriber_count, recent_video_date,
            instagram, linkedin, language,
            campaign_status, created_at
          ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          args: [
            item.snippet?.title ?? "",
            links.website ?? "",
            links.email ?? "",
            item.snippet?.country ?? "",
            "YOUTUBE",
            "TEACHER",
            score,
            scoreToStatus(score),
            channelId,
            item.snippet?.title ?? "",
            `https://youtube.com/channel/${channelId}`,
            subs,
            recentVideoDate ?? "",
            links.instagram ?? "",
            links.linkedin ?? "",
            config.language,
            "PENDING",
            new Date().toISOString(),
          ],
        });
        inserted++;
      } catch (e) {
        console.error("[YT] insert error:", e);
      }
    }
  }

  return { searched: channelIds.length, inserted, duplicated, skipped };
}

export async function collectYouTubeTeachers(language: string): Promise<{
  searched: number;
  inserted: number;
  duplicated: number;
  skipped: number;
}> {
  const db = getDb();

  if (language === "all") {
    let totalSearched = 0, totalInserted = 0, totalDuplicated = 0, totalSkipped = 0;
    for (const config of youtubeConfigs) {
      const r = await collectOneLanguage(config, db);
      totalSearched   += r.searched;
      totalInserted   += r.inserted;
      totalDuplicated += r.duplicated;
      totalSkipped    += r.skipped;
    }
    return { searched: totalSearched, inserted: totalInserted, duplicated: totalDuplicated, skipped: totalSkipped };
  }

  const config = youtubeConfigMap[language];
  if (!config) throw new Error(`Unknown language: ${language}`);
  return collectOneLanguage(config, db);
}

export { youtubeConfigs };
