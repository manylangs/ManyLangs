import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { createClient } from "@libsql/client";

async function migrate() {
    const db = createClient({
        url: process.env.TURSO_DATABASE_URL!,
        authToken: process.env.TURSO_AUTH_TOKEN!,
    });

    await db.execute(`
    CREATE TABLE IF NOT EXISTS email_tracking (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tracking_id TEXT UNIQUE NOT NULL,
      campaign_id TEXT NOT NULL,
      email TEXT NOT NULL,
      open_count INTEGER DEFAULT 0,
      click_count INTEGER DEFAULT 0,
      opened_at TEXT,
      clicked_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

    console.log("✅ email_tracking table ready");
}

migrate().catch(console.error);