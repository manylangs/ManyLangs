import { createClient } from "@libsql/client";

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const res = await db.execute(`
SELECT
    c.campaign_id,
    c.target_count,
    c.sent_count AS campaign_sent,
    COUNT(t.tracking_id) AS tracking_sent,
    SUM(CASE WHEN t.open_count > 0 THEN 1 ELSE 0 END) AS opened,
    SUM(CASE WHEN t.click_count > 0 THEN 1 ELSE 0 END) AS clicked
FROM campaigns c
LEFT JOIN email_tracking t
ON c.campaign_id = t.campaign_id
GROUP BY c.campaign_id
ORDER BY c.created_at DESC;
`);

console.table(res.rows);
