/**
 * Dev tool: cek apakah WAQI memberi rincian per-polutan untuk stasiun BMKG
 * Palembang. Jika ya, PM10 tidak perlu lagi difabrikasi dari rasio PM2.5.
 *
 * Jalankan: npx tsx scripts/audit-waqi-feed.ts
 */
export {};

async function runAudit() {
  for (const idx of [4987, 5271]) {
    console.log(`\n=== /feed/${idx}/ (demo token) ===`);
    const r = await fetch(`https://api.waqi.info/feed/${idx}/?token=demo`);
    const j = (await r.json()) as {
      status?: string;
      data?: {
        city?: { name?: string };
        aqi?: number;
        time?: { s?: string; tz?: string };
        iaqi?: Record<string, { v: number }>;
        forecast?: { daily?: Record<string, Array<{ avg: number; day: string }>> };
      };
    };
    console.log("status:", j.status);
    if (j.data) {
      console.log("city:", j.data.city?.name, "| aqi:", j.data.aqi);
      console.log("time:", JSON.stringify(j.data.time));
      console.log("iaqi:", JSON.stringify(j.data.iaqi, null, 1));
    }
  }

  console.log("\n=== /feed/geo:-2.9734;104.7754/ (demo token) ===");
  const g = await fetch("https://api.waqi.info/feed/geo:-2.9734;104.7754/?token=demo");
  const gj = (await g.json()) as { status?: string; data?: { city?: { name?: string }; aqi?: number } };
  console.log("status:", gj.status, "| city:", gj.data?.city?.name, "| aqi:", gj.data?.aqi);

  process.exit(0);
}

runAudit().catch((e) => {
  console.error(e);
  process.exit(1);
});
