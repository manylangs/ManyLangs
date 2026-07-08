import { createClient } from "@libsql/client";

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const res = await db.execute(`
SELECT name
FROM sqlite_master
WHERE type='table'
ORDER BY name;
`);

console.table(res.rows);
