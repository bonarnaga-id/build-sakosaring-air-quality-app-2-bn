/**
 * Uji cepat (dev only): pastikan fetcher BMKG & CAMS menghasilkan data real,
 * bukan dummy. Jalankan dengan: npx tsx scripts/test-sources.ts
 */
import { fetchBmkgStations } from "../src/lib/waqi";
import { fetchCamsStations, fetchCamsTren } from "../src/lib/cams";

async function main() {
  console.log("=== BMKG (WAQI mapq) ===");
  try {
    const bmkg = await fetchBmkgStations();
    if (!bmkg.length) console.log("  (tidak ada stasiun)");
    for (const b of bmkg) {
      console.log(
        `  ${b.location} | PM2.5 ${b.pm25} | ISPU ${b.ispu} | ${b.status} | ${b.distance_km} km`
      );
    }
  } catch (e) {
    console.error("  GAGAL:", e instanceof Error ? e.message : e);
  }

  console.log("\n=== CAMS Global (Open-Meteo) ===");
  try {
    const cams = await fetchCamsStations();
    if (!cams.length) console.log("  (tidak ada data)");
    for (const c of cams) {
      console.log(
        `  ${c.location} | PM2.5 ${c.pm25} | PM10 ${c.pm10} | CO ${c.co.toFixed(2)} ppm | SO2 ${c.so2.toFixed(1)} ppb | ISPU ${c.ispu} | ${c.status}`
      );
    }
  } catch (e) {
    console.error("  GAGAL:", e instanceof Error ? e.message : e);
  }

  console.log("\n=== Tren 3 hari (CAMS Global) ===");
  try {
    const tren = await fetchCamsTren();
    console.log(`  total titik: ${tren.length}`);
    if (tren.length) {
      console.log(`  pertama: ${tren[0].observed_at} AQI ${tren[0].us_aqi}`);
      console.log(`  terakhir: ${tren[tren.length - 1].observed_at} AQI ${tren[tren.length - 1].us_aqi}`);
    }
  } catch (e) {
    console.error("  GAGAL:", e instanceof Error ? e.message : e);
  }
}

void main();
