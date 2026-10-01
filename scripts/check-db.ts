/**
 * Dev tool: cek nullability kolom stasiun_sako + isi baris terbaru.
 *
 * Jalankan: npx tsx scripts/check-db.ts
 */
import { config as dotenvConfig } from "dotenv";
import { resolve } from "node:path";
import { Pool } from "pg";

dotenvConfig({ path: resolve(process.cwd(), ".env.local") });

async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  const client = await pool.connect();
  try {
    const cols = await client.query(
      `SELECT column_name, data_type, is_nullable, column_default
       FROM information_schema.columns
       WHERE table_name = 'stasiun_sako'
       ORDER BY ordinal_position`
    );
    console.log("=== stasiun_sako columns ===");
    for (const c of cols.rows) {
      console.log(
        `  ${c.column_name.padEnd(14)} ${String(c.data_type).padEnd(12)} ` +
          `nullable=${c.is_nullable}`
      );
    }

    const rows = await client.query(
      `SELECT location, pm25, pm10, co, so2, ispu, temperature, humidity,
              source, distance_km, source_name, lat, lon
       FROM stasiun_sako ORDER BY id`
    );
    console.log("\n=== rows ===");
    for (const r of rows.rows) {
      console.log(JSON.stringify(r));
    }
  } finally {
    client.release();
    await pool.end();
  }
  process.exit(0);
}

void main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
