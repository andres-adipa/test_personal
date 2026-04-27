import postgres from "postgres";

const globalForDb = global as unknown as { db?: ReturnType<typeof postgres> };

export const db =
  globalForDb.db ??
  postgres(process.env.DATABASE_URL!, {
    ssl: "require",
    max: 5,
    prepare: false, // requerido por pgbouncer (Supabase pooler)
  });

if (process.env.NODE_ENV !== "production") globalForDb.db = db;
