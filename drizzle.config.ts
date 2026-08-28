import { defineConfig } from "drizzle-kit";
import { config as dotenvConfig } from "dotenv";

// Pakai .env.local (lokal) atau env yang sudah di-export di shell/Vercel.
dotenvConfig({ path: ".env.local" });

const databaseUrl =
  process.env.DATABASE_URL ??
  "postgresql://postgres:postgres@127.0.0.1:5432/app_db";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  dbCredentials: {
    url: databaseUrl,
  },
  verbose: true,
  strict: true,
});
