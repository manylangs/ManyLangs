import { createClient } from "@libsql/client";

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const sqls = [
  `ALTER TABLE campaigns ADD COLUMN send_runs INTEGER DEFAULT 0;`,
  `ALTER TABLE campaigns ADD COLUMN latest_opened INTEGER DEFAULT 0;`,
  `ALTER TABLE campaigns ADD COLUMN latest_clicked INTEGER DEFAULT 0;`,
];

for (const sql of sqls) {
  try {
    await db.execute(sql);
    console.log("OK :", sql);
  } catch (e) {
    console.log("SKIP :", e.message);
  }
}

const res = await db.execute(`PRAGMA table_info(campaigns);`);
console.table(res.rows);
