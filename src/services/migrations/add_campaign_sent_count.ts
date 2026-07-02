import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { createClient } from "@libsql/client";

async function migrate() {
  const db = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  });

  try {
    await db.execute(`
      ALTER TABLE campaigns
      ADD COLUMN sent_count INTEGER DEFAULT 0
    `);

    console.log("✅ Added: sent_count");
  } catch (e: any) {
    if (e.message?.includes("duplicate column")) {
      console.log("⏭️ Already exists: sent_count");
    } else {
      console.error("❌ Failed:", e.message);
    }
  }

  console.log("\n✅ Migration complete.");
}

migrate().catch(console.error);