import {
    SESv2Client,
    SendEmailCommand,
} from "@aws-sdk/client-sesv2";

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
    text: string
) {
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
                    },
                },
            },
        })
    );
}