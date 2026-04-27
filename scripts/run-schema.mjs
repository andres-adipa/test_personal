import postgres from "postgres";
import { readFileSync } from "node:fs";

const url = process.env.DATABASE_URL;
if (!url) { console.error("Falta DATABASE_URL"); process.exit(1); }

const sql = readFileSync("./sql/schema.sql", "utf-8");
const db = postgres(url, { ssl: "require", max: 1, prepare: false });

try {
  await db.unsafe(sql);
  console.log("Schema creado OK");
  const tablas = await db`SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name LIKE '%_juegos' ORDER BY table_name`;
  console.log("Tablas:", tablas.map(t => t.table_name).join(", "));
} catch (e) {
  console.error("Error:", e.message);
  process.exit(1);
} finally {
  await db.end();
}
