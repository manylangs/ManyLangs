import { createClient } from "@libsql/client";

async function migrate() {
  const db = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  });

  const columns = [
    { name: "channel_id",         def: "TEXT" },
    { name: "channel_name",       def: "TEXT" },
    { name: "channel_url",        def: "TEXT" },
    { name: "subscriber_count",   def: "INTEGER DEFAULT 0" },
    { name: "recent_video_date",  def: "TEXT" },
    { name: "instagram",          def: "TEXT" },
    { name: "linkedin",           def: "TEXT" },
    { name: "language",           def: "TEXT" },
  ];

  for (const col of columns) {
    try {
      await db.execute(`ALTER TABLE schools ADD COLUMN ${col.name} ${col.def}`);
      console.log(`✅ Added: ${col.name}`);
    } catch (e: any) {
      // SQLite: column already exists → safe to ignore
      if (e.message?.includes("duplicate column")) {
        console.log(`⏭️  Already exists: ${col.name}`);
      } else {
        console.error(`❌ Failed: ${col.name} —`, e.message);
      }
    }
  }

  console.log("\n✅ Migration complete.");
}

migrate().catch(console.error);