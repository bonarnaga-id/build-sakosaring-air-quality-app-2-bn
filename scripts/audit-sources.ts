/**
 * Dev tool: cek data MENTAH dari WAQI (mapq/bounds) & CAMS Global untuk
 * memverifikasi bahwa yang disimpan di DB benar-benar berasal dari API.
 *
 * Jalankan: npx tsx scripts/audit-sources.ts
 */
export {};

const WAQI_BOUNDS = "-3.25,104.35,-2.65,105.25";
const SAKO = { lat: -2.9734, lon: 104.7754 };

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

async function runAudit() {
  console.log("=== WAQI mapq/bounds (Palembang) ===");
  const r = await fetch(
    `https://api.waqi.info/mapq/bounds/?token=demo&bounds=${WAQI_BOUNDS}`
  );
  const j = (await r.json()) as Array<{
    city?: string;
    aqi?: string | number;
    pol?: string;
    lat: number;
    lon: number;
    t?: number;
    d?: number;
  }>;
  console.log(`HTTP ${r.status} · ${j.length} stasiun`);
  console.log("RAW stasiun pertama:", JSON.stringify(j[0], null, 1));
  for (const s of j) {
    const aqi = Number(s.aqi);
    const km = haversineKm(SAKO.lat, SAKO.lon, s.lat, s.lon);
    const when = s.t ? new Date(s.t * 1000).toISOString() : "?";
    console.log(
      `  ${String(s.city).padEnd(34)} AQI=${String(aqi).padStart(4)} ` +
        `pol=${String(s.pol).padEnd(6)} ${km.toFixed(1)}km  ${when}`
    );
  }

  console.log("\n=== CAMS Global current (Sako) ===");
  const c = await fetch(
    "https://air-quality-api.open-meteo.com/v1/air-quality" +
      `?latitude=${SAKO.lat}&longitude=${SAKO.lon}` +
      "&current=pm2_5,pm10,carbon_monoxide,sulphur_dioxide,nitrogen_dioxide,ozone,us_aqi" +
      "&timezone=Asia%2FJakarta"
  );
  const cj = (await c.json()) as {
    latitude?: number;
    longitude?: number;
    current?: Record<string, number | string | null>;
  };
  console.log(`HTTP ${c.status} · grid ${cj.latitude}, ${cj.longitude}`);
  console.log(JSON.stringify(cj.current, null, 1));

  console.log("\n=== CAMS Global current + weather (Sako) ===");
  const w = await fetch(
    "https://api.open-meteo.com/v1/forecast" +
      `?latitude=${SAKO.lat}&longitude=${SAKO.lon}` +
      "&current=temperature_2m,relative_humidity_2m&timezone=Asia%2FJakarta"
  );
  const wj = (await w.json()) as {
    current?: { temperature_2m?: number; relative_humidity_2m?: number; time?: string };
  };
  console.log(`HTTP ${w.status}`);
  console.log(JSON.stringify(wj.current, null, 1));

  process.exit(0);
}

runAudit().catch((e) => {
  console.error(e);
  process.exit(1);
});
