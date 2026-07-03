// lib/tracking/click-links.ts
//
// HTML 메일 본문의 링크를 Click Tracking URL로 치환하는 헬퍼.
// sendEmail() 안에서 HTML 본문에 대해 1줄만 호출하면 됩니다.
//
//   htmlBody = rewriteLinksForClickTracking(htmlBody, tracking_id);
//
// 규칙
// - <a href="http(s)://..."> 형태의 href 속성만 치환 (정규식)
// - 이미 /api/track/ 을 가리키는 URL은 건너뜀 → Open Pixel과 절대 충돌하지 않음
// - mailto:, tel:, # 앵커 등 http(s)가 아닌 href는 그대로 유지
// - <img src="...">는 건드리지 않음 (href만 매칭하므로 Open Pixel 안전)
// - TEXT 본문에는 절대 사용하지 말 것 (스펙: TEXT 메일은 그대로 유지)

const TRACK_BASE = "https://manylangs.studio/api/track/click";

export function rewriteLinksForClickTracking(
    html: string,
    trackingId: string
): string {
    if (!html || !trackingId) return html;

    // href="..." 또는 href='...' 안의 http(s) URL만 매칭
    return html.replace(
        /href=(["'])(https?:\/\/[^"']+)\1/gi,
        (match, quote: string, url: string) => {
            // 자체 트래킹 URL(open pixel 포함)은 이중 래핑 방지
            if (url.includes("/api/track/")) return match;

            const tracked =
                `${TRACK_BASE}?id=${encodeURIComponent(trackingId)}` +
                `&url=${encodeURIComponent(url)}`;

            return `href=${quote}${tracked}${quote}`;
        }
    );
}