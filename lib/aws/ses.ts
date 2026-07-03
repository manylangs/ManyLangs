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
    // HTML 본문 생성
    let bodyHtml = `
<pre style="white-space:pre-wrap;font-family:inherit">${text}</pre>
`;

    // 클릭 트래킹 링크 치환 (HTML만)
    if (trackingId) {
        bodyHtml = rewriteLinksForClickTracking(bodyHtml, trackingId);
    }

    // Open Pixel 추가
    const htmlBody = `
<html>
  <body style="font-family:Arial,sans-serif;line-height:1.6">
    ${bodyHtml}

    ${trackingId
            ? `<img src="https://manylangs.studio/api/track/open?id=${trackingId}" width="1" height="1" style="display:none" />`
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
                        // TEXT는 그대로 유지
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