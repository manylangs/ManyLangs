import { createClient } from "@libsql/client";

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

for (const table of ["campaigns", "email_tracking", "schools"]) {
  console.log("\n======================================");
  console.log(table.toUpperCase());
  console.log("======================================");

  const res = await db.execute(`PRAGMA table_info(${table});`);
  console.table(res.rows);
}
