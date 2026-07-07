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

    let bodyHtml = `
<div style="
  font-family:Arial,sans-serif;
  font-size:15px;
  line-height:1.7;
  color:#222;
">
${escaped}
</div>
`;

    // 클릭 트래킹 링크 치환 (HTML만)
    if (trackingId) {
        bodyHtml = rewriteLinksForClickTracking(bodyHtml, trackingId);
    }

    // Open Pixel 추가
    const htmlBody = `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
</head>
<body style="margin:24px;font-family:Arial,sans-serif;line-height:1.7;color:#222;">
  ${bodyHtml}

  ${trackingId
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