import { getTren3Hari } from "@/lib/airQuality";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/air-quality/tren — data tren kualitas udara 3 hari terakhir
 * (per jam, sumber CAMS Global) untuk grafik di Dashboard.
 */
export async function GET() {
  try {
    const data = await getTren3Hari();
    return Response.json({ ok: true, data });
  } catch (err) {
    console.error("tren fetch failed", err);
    return Response.json(
      { ok: false, error: "Gagal mengambil tren kualitas udara." },
      { status: 500 }
    );
  }
}
