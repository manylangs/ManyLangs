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
      ADD COLUMN city TEXT DEFAULT 'ALL'
    `);

    console.log("✅ Added: city");
  } catch (e: any) {
    if (e.message?.includes("duplicate column")) {
      console.log("⏭️ Already exists: city");
    } else {
      console.error("❌ Failed:", e.message);
    }
  }

  console.log("\n✅ Migration complete.");
}

migrate().catch(console.error);