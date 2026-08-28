import { NextRequest, NextResponse } from "next/server";
import { findNearbyLocations, fetchLatestByLocation, toStationInput } from "@/lib/openaq";
import { upsertStasiun } from "@/lib/airQuality";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 20;

/**
 * GET /api/cron/ingest — sinkronisasi data real-time dari OpenAQ v3 ke Neon.
 *
 * Dijadwalkan lewat `vercel.json` (Vercel Cron) tiap 5 menit.
 * Tanpa key (dev), mengembalikan 503. Set env `OPENAQ_API_KEY` untuk aktif.
 *
 * Catatan keamanan ringan: endpoint ini hanya menulis data publik OpenAQ ke
 * tabel lokal, jadi terbuka. Jika ingin membatasi di produksi, tambahkan
 * pengecekan `x-cron-secret` atau pindah ke path berparameter rahasia.
 */
export async function GET(_request: NextRequest) {
  if (!process.env.OPENAQ_API_KEY) {
    return NextResponse.json(
      { ok: false, error: "OPENAQ_API_KEY belum diset." },
      { status: 503 }
    );
  }

  const summary = {
    upserted: 0,
    skipped: 0,
    errors: 0,
    locations: 0,
  };

  try {
    const locations = await findNearbyLocations();
    summary.locations = locations.length;

    for (const loc of locations) {
      try {
        // jeda kecil hormati rate limit OpenAQ (60 req/men)
        await new Promise((r) => setTimeout(r, 250));
        const readings = await fetchLatestByLocation(loc.id);
        const input = toStationInput(loc, readings);
        if (!input) {
          summary.skipped++;
          continue;
        }
        await upsertStasiun(input);
        summary.upserted++;
      } catch (err) {
        summary.errors++;
        console.error(`ingest error for location ${loc.id}:`, err);
      }
    }
  } catch (err) {
    console.error("ingest fetch failed:", err);
    summary.errors++;
  }

  return NextResponse.json({ ok: true, summary });
}
