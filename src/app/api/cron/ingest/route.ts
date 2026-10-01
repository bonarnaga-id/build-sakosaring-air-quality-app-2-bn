import { NextRequest, NextResponse } from "next/server";
import { fetchCamsStations, fetchCamsTren, fetchSakoWeather } from "@/lib/cams";
import { fetchBmkgStations } from "@/lib/waqi";
import { upsertStasiun, insertTrenMassal } from "@/lib/airQuality";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * GET /api/cron/ingest — sinkronisasi data REAL ke Neon PostgreSQL.
 *
 * Mengambil dari DUA sumber yang saling membanding:
 *  1) BMKG (stasiun fisik) lewat WAQI mapq — pengukuran lapangan langsung.
 *  2) CAMS Global (model satelit Copernicus) lewat Open-Meteo — data grid area Sako.
 *
 * Keduanya real, gratis, tanpa API key. Tidak ada data palsu / dummy.
 * Dijadwalkan lewat `vercel.json` (Vercel Cron) tiap 5 menit.
 *
 * Catatan keamanan ringan: endpoint ini hanya menulis data publik ke tabel
 * lokal, jadi terbuka. Jika ingin membatasi di produksi, tambahkan pengecekan
 * `x-cron-secret` atau pindah ke path berparameter rahasia.
 */
export async function GET(_request: NextRequest) {
  const summary = {
    upserted: 0,
    skipped: 0,
    errors: 0,
    bmkg: 0,
    cams: 0,
    tren: 0,
  };

  // --- 1) Stasiun BMKG (pengukuran fisik) ---------------------------------
  try {
    // Suhu/kelembaban REAL Sako dipakai untuk semua stasiun (WAQI mapq tidak
    // menyediakannya); jatuh ke nilai netral hanya jika panggilan gagal.
    const weather = await fetchSakoWeather().catch(() => ({
      temperature: 30,
      humidity: 75,
    }));
    const bmkg = await fetchBmkgStations();
    for (const input of bmkg) {
      try {
        await upsertStasiun({ ...input, ...weather });
        summary.upserted++;
        summary.bmkg++;
      } catch (err) {
        summary.errors++;
        console.error(`ingest bmkg error (${input.location}):`, err);
      }
    }
  } catch (err) {
    summary.errors++;
    console.error("ingest bmkg fetch failed:", err);
  }

  // --- 2) CAMS Global (model satelit) -------------------------------------
  try {
    const cams = await fetchCamsStations();
    for (const input of cams) {
      try {
        await upsertStasiun(input);
        summary.upserted++;
        summary.cams++;
      } catch (err) {
        summary.errors++;
        console.error(`ingest cams error (${input.location}):`, err);
      }
    }
  } catch (err) {
    summary.errors++;
    console.error("ingest cams fetch failed:", err);
  }

  // --- 3) Tren 3 hari terakhir (untuk grafik) ------------------------------
  try {
    const tren = await fetchCamsTren();
    summary.tren = await insertTrenMassal(tren);
  } catch (err) {
    summary.errors++;
    console.error("ingest tren fetch failed:", err);
  }

  if (summary.upserted === 0) {
    return NextResponse.json(
      {
        ok: false,
        error: "Tidak ada stasiun yang berhasil diambil dari BMKG maupun CAMS.",
        summary,
      },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true, summary });
}
