import { createClient } from "@libsql/client";

function getDb() {
  return createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  });
}

// ─── Keywords ────────────────────────────────────────────────────────────────

const LANGUAGE_KEYWORDS: Record<string, { native: string[]; english: string[] }> = {
  korean: {
    native: ["한국어 선생님", "한국어 강사", "한국어 배우기", "한국어 수업"],
    english: ["Korean teacher", "Korean tutor", "Learn Korean", "Korean lessons"],
  },
  english: {
    native: ["영어 선생님", "영어 강사", "영어 회화"],
    english: ["English teacher", "English tutor", "ESL teacher", "Learn English"],
  },
  spanish: {
    native: ["profesor de español", "clases de español", "aprender español"],
    english: ["Spanish teacher", "Spanish tutor", "Learn Spanish"],
  },
  french: {
    native: ["professeur de français", "cours de français", "apprendre le français"],
    english: ["French teacher", "French tutor", "Learn French"],
  },
  portuguese: {
    native: ["professor de português", "aulas de português", "aprender português"],
    english: ["Portuguese teacher", "Portuguese tutor", "Learn Portuguese"],
  },
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChannelInfo {
  channel_id: string;
  channel_name: string;
  channel_url: string;
  subscriber_count: number;
  recent_video_date: string | null;
  website: string | null;
  email: string | null;
  instagram: string | null;
  linkedin: string | null;
  language: string;
  country: string | null;
  score: number;
}

// ─── YouTube API helper ───────────────────────────────────────────────────────

const YT_BASE = "https://www.googleapis.com/youtube/v3";

async function ytFetch(path: string, params: Record<string, string>): Promise<any> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) throw new Error("YOUTUBE_API_KEY is not set");

  const qs = new URLSearchParams({ ...params, key: apiKey }).toString();
  const url = `${YT_BASE}${path}?${qs}`;

  const res = await fetch(url, { next: { revalidate: 0 } });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`YouTube API ${res.status}: ${body.slice(0, 200)}`);
  }
  return res.json();
}

// ─── Step 1: Search → channel IDs ────────────────────────────────────────────
// Quota cost: 100 per search call

async function searchChannelIds(query: string): Promise<string[]> {
  try {
    const data = await ytFetch("/search", {
      part: "snippet",
      type: "channel",
      q: query,
      maxResults: "20",
      relevanceLanguage: "ko",
    });
    return (data.items ?? []).map((i: any) => i.snippet?.channelId as string).filter(Boolean);
  } catch (e) {
    console.error(`[YT] search failed for "${query}":`, e);
    return [];
  }
}

// ─── Step 2: Channel details (batch up to 50) ────────────────────────────────
// Quota cost: 1 per channels call (returns up to 50)

async function fetchChannelBatch(ids: string[]): Promise<any[]> {
  if (ids.length === 0) return [];
  const data = await ytFetch("/channels", {
    part: "snippet,statistics,contentDetails,brandingSettings",
    id: ids.join(","),
    maxResults: "50",
  });
  return data.items ?? [];
}

// ─── Step 3: Most recent upload date ─────────────────────────────────────────
// Quota cost: 1 per playlistItems call

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

// ─── Step 4: Extract links from description ───────────────────────────────────

function extractLinks(text: string): {
  website: string | null;
  email: string | null;
  instagram: string | null;
  linkedin: string | null;
} {
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

// ─── Step 5: Contact grade (영업 우선순위) ───────────────────────────────────
// A: 이메일 있음
// B: 이메일 없음 + 인스타 있음
// C: 이메일/인스타 없음 + 웹사이트 있음
// D: 연락수단 없음 → 저장 안 함

function contactGrade(links: ReturnType<typeof extractLinks>): "A" | "B" | "C" | "D" {
  if (links.email)     return "A";
  if (links.instagram) return "B";
  if (links.website)   return "C";
  return "D";
}

// ─── Step 6: Score ────────────────────────────────────────────────────────────

function calcScore(
  subs: number,
  links: ReturnType<typeof extractLinks>,
  recentDays: number
): number {
  let s = 0;
  if (subs > 10000)    s += 20;
  if (links.email)     s += 30;
  if (links.website)   s += 20;
  if (links.instagram) s += 10;
  if (links.linkedin)  s += 10;
  if (recentDays <= 30) s += 20;
  return Math.min(s, 100);
}

// ─── Step 7: lead_status from score ──────────────────────────────────────────

function scoreToStatus(score: number): string {
  if (score >= 70) return "HOT";
  if (score >= 40) return "WARM";
  return "COLD";
}

// ─── Main collector ───────────────────────────────────────────────────────────

export async function collectYouTubeTeachers(language: string): Promise<{
  searched: number;
  inserted: number;
  duplicated: number;
  skipped: number;
}> {
  const langs =
    language === "all" ? Object.keys(LANGUAGE_KEYWORDS) : [language];

  const db = getDb();
  let totalSearched = 0;
  let totalInserted = 0;
  let totalDuplicated = 0;
  let totalSkipped = 0;

  for (const lang of langs) {
    const kw = LANGUAGE_KEYWORDS[lang];
    if (!kw) continue;

    const channelIdSet = new Set<string>();
    const allQueries = [...kw.native, ...kw.english];

    for (const query of allQueries) {
      const ids = await searchChannelIds(query);
      ids.forEach((id) => channelIdSet.add(id));
    }

    const channelIds = Array.from(channelIdSet);
    totalSearched += channelIds.length;

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
          item.brandingSettings?.channel?.description ??
          "";

        const links = extractLinks(desc);

        // ✅ 변경1: 구독자 조건 제거
        // ✅ 변경2: D등급(연락수단 없음)만 버림
        const grade = contactGrade(links);
        if (grade === "D") {
          totalSkipped++;
          continue;
        }

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

        // ✅ 변경3: 180일 → 365일
        if (recentDays > 365) {
          totalSkipped++;
          continue;
        }

        const channelId: string = item.id;
        const score = calcScore(subs, links, recentDays);

        // 중복 체크
        const existing = await db.execute({
          sql: "SELECT id FROM schools WHERE channel_id = ?",
          args: [channelId],
        });

        if (existing.rows.length > 0) {
          totalDuplicated++;
          continue;
        }

        // Insert
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
              lang,
              "PENDING",
              new Date().toISOString(),
            ],
          });
          totalInserted++;
        } catch (e) {
          console.error("[YT] insert error:", e);
        }
      }
    }
  }

  return {
    searched: totalSearched,
    inserted: totalInserted,
    duplicated: totalDuplicated,
    skipped: totalSkipped,
  };
}