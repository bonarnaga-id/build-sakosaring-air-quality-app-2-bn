/**
 * Dev tool: hapus baris stasiun dengan nama lokasi lama (prefix "BMKG • " / "CAMS Global • ")
 * yang sudah diganti dengan badge sumber terpisah di UI.
 *
 * Jalankan: npx tsx scripts/cleanup-old-stations.ts
 */
import { config as dotenvConfig } from "dotenv";
import { ilike } from "drizzle-orm";
import { stasiunSako } from "../src/db/schema";

dotenvConfig({ path: ".env.local" });

const OLD_PATTERNS = ["BMKG • %", "CAMS Global • %"];

async function main() {
  // db/index.ts melempar error saat di-import bila DATABASE_URL belum termuat,
  // jadi kita import setelah dotenv selesai membaca .env.local.
  const { db } = await import("../src/db");

  for (const pattern of OLD_PATTERNS) {
    const deleted = await db.delete(stasiunSako).where(ilike(stasiunSako.location, pattern));
    console.log(`deleted ${deleted.rowCount ?? 0} rows matching ${pattern}`);
  }
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
