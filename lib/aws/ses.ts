import {
    SESv2Client,
    SendEmailCommand,
} from "@aws-sdk/client-sesv2";

import { rewriteLinksForClickTracking } from "@/lib/tracking/click-links";

export const ses = new SESv2Client({
    region: process.env.AWS_REGION!,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
});

// HTML-escape된 텍스트 안의 URL을 클릭 가능한 링크로 변환
// Gmail / Naver / Outlook / Apple Mail 호환성을 위해
// 가장 단순한 <a href="..."> 형태만 사용한다.
function linkifyUrls(html: string): string {
    const urlRegex = /(https?:\/\/[^\s<]+)/gi;

    return html.replace(urlRegex, (raw) => {
        let url = raw;
        let trailing = "";

        // URL 끝 문장부호 제외
        while (/[.,;:!?)]$/.test(url)) {
            trailing = url.slice(-1) + trailing;
            url = url.slice(0, -1);
        }

        return `<a href="${url}">${url}</a>${trailing}`;
    });
}

export async function sendEmail(
    to: string,
    subject: string,
    text: string,
    trackingId?: string
) {
    // HTML Escape + 줄바꿈 유지
    const escaped = text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\r\n/g, "\n")
        .replace(/\n/g, "<br>");

    // URL → 클릭 가능한 링크
    let bodyHtml = `
<div style="
  font-family:Arial,sans-serif;
  font-size:15px;
  line-height:1.7;
  color:#222;
">
${linkifyUrls(escaped)}
</div>
`;

    // 클릭 트래킹 링크 치환
    if (trackingId) {
        bodyHtml = rewriteLinksForClickTracking(bodyHtml, trackingId);
    }

    // Open Tracking Pixel
    const htmlBody = `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
</head>
<body style="margin:24px;font-family:Arial,sans-serif;line-height:1.7;color:#222;">
  ${bodyHtml}

  ${
      trackingId
          ? `<img src="https://manylangs.studio/api/track/open?id=${trackingId}" width="1" height="1" style="display:none;" alt="" />`
          : ""
  }
</body>
</html>
`;

    await ses.send(
        new SendEmailCommand({
            FromEmailAddress: process.env.SES_FROM_EMAIL!,
            Destination: {
                ToAddresses: [to],
            },
            Content: {
                Simple: {
                    Subject: {
                        Data: subject,
                    },
                    Body: {
                        Text: {
                            Data: text,
                        },
                        Html: {
                            Data: htmlBody,
                        },
                    },
                },
            },
        })
    );
}