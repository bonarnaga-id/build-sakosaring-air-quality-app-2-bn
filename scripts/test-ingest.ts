/**
 * Uji cepat (dev only): jalankan ingest multi-sumber langsung tanpa server.
 * Memverifikasi bahwa cron akan menyimpan data real BMKG + CAMS ke Neon.
 * Jalankan dengan: npx tsx scripts/test-ingest.ts
 */
import { config as dotenvConfig } from "dotenv";
import { resolve } from "node:path";

// db/index.ts melempar saat di-import jika DATABASE_URL kosong, jadi dotenv
// harus jalan SEBELU import modul yang memakai db. tsx meng-emit ulang file
// (import di-eval setelah deklarasi), jadi kita pakai require() eksplisit.
dotenvConfig({ path: resolve(process.cwd(), ".env.local") });

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { fetchBmkgStations } = require("../src/lib/waqi");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { fetchCamsStations, fetchCamsTren } = require("../src/lib/cams");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { upsertStasiun, insertTrenMassal } = require("../src/lib/airQuality");

async function main() {
  const summary = { upserted: 0, bmkg: 0, cams: 0, tren: 0, errors: 0 };

  try {
    for (const input of await fetchBmkgStations()) {
      try {
        const row = await upsertStasiun(input);
        summary.upserted++;
        summary.bmkg++;
        console.log(`✓ ${row.location} | ISPU ${row.ispu} | ${row.status}`);
      } catch (e) {
        summary.errors++;
        console.error(`✗ ${input.location}:`, e instanceof Error ? e.message : e);
      }
    }
  } catch (e) {
    summary.errors++;
    console.error("BMKG fetch gagal:", e instanceof Error ? e.message : e);
  }

  try {
    for (const input of await fetchCamsStations()) {
      try {
        const row = await upsertStasiun(input);
        summary.upserted++;
        summary.cams++;
        console.log(
          `✓ ${row.location} | PM2.5 ${row.pm25} | ISPU ${row.ispu} | ${row.status}`
        );
      } catch (e) {
        summary.errors++;
        console.error(`✗ ${input.location}:`, e instanceof Error ? e.message : e);
      }
    }
  } catch (e) {
    summary.errors++;
    console.error("CAMS fetch gagal:", e instanceof Error ? e.message : e);
  }

  try {
    summary.tren = await insertTrenMassal(await fetchCamsTren());
  } catch (e) {
    summary.errors++;
    console.error("Tren fetch gagal:", e instanceof Error ? e.message : e);
  }

  console.log("\n=== Ringkasan ===");
  console.log(JSON.stringify(summary, null, 2));
}

void main().catch((e) => {
  console.error(e);
  process.exit(1);
});
