// lib/tracking/click-links.ts
//
// HTML 메일 본문의 링크를 Click Tracking URL로 치환하는 헬퍼.
//
// sendEmail()에서 HTML 본문 생성 후 호출:
//   htmlBody = rewriteLinksForClickTracking(htmlBody, trackingId);

const TRACK_BASE = "https://manylangs.studio/api/track/click";

export function rewriteLinksForClickTracking(
    html: string,
    trackingId: string
): string {
    if (!html || !trackingId) return html;

    return html.replace(
        /href=(["'])(https?:\/\/[^"']+)\1/gi,
        (match, quote: string, url: string) => {
            // 이미 Tracking URL이면 다시 감싸지 않음
            if (url.includes("/api/track/")) {
                return match;
            }

            const tracked =
                `${TRACK_BASE}?id=${encodeURIComponent(trackingId)}` +
                `&amp;url=${encodeURIComponent(url)}`;

            return `href=${quote}${tracked}${quote}`;
        }
    );
}