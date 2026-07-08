import { createClient } from "@libsql/client";

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const res = await db.execute(`
SELECT
  campaign_id,
  target_count,
  sent_count,
  status,
  created_at
FROM campaigns
ORDER BY id DESC;
`);

console.table(res.rows);
