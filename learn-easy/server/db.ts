import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set. Add it in Vercel → Settings → Environment Variables and redeploy.");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.DATABASE_SSL === "true" ||
    process.env.DATABASE_URL.includes("supabase.co")
      ? { rejectUnauthorized: false }
      : undefined,
});

export const db = drizzle(pool, { schema });
