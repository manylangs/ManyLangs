import { createClient } from "@libsql/client";

async function migrate() {
  const db = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  });

  await db.execute(`
    CREATE TABLE IF NOT EXISTS campaigns (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      campaign_id  TEXT UNIQUE,
      subject      TEXT,
      body         TEXT,
      target_type  TEXT,
      country      TEXT DEFAULT 'ALL',
      status       TEXT DEFAULT 'DRAFT',
      target_count INTEGER DEFAULT 0,
      created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  console.log("✅ campaigns table ready.");
}

migrate().catch(console.error);