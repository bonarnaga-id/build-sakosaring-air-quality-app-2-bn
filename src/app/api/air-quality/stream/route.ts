import { NextRequest } from "next/server";
import { getLatestStations } from "@/lib/airQuality";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const INTERVAL_MS = 10_000;

/**
 * GET /api/air-quality/stream — Server-Sent Events.
 * Mendorong pembaruan stasiun ke semua koneksi terbuka secara instan
 * (berganti dengan polling tiap 60s di Dashboard). Browser
 * (EventSource) otomatis reconnect bila putus.
 *
 * Data yang didorong adalah hasil gabungan multi-sumber (BMKG + CAMS Global)
 * yang sudah disimpan ke Neon oleh cron /api/cron/ingest.
 */
export async function GET(request: NextRequest) {
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      const push = async () => {
        try {
          const data = await getLatestStations();
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ ok: true, data })}\n\n`)
          );
        } catch (err) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ ok: false, error: "stream error" })}\n\n`
            )
          );
        }
      };

      await push(); // kirim data pertama segera
      const iv = setInterval(push, INTERVAL_MS);

      // berhenti saat klien putus
      request.signal.addEventListener("abort", () => {
        clearInterval(iv);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform, max-age=0",
      Connection: "keep-alive",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
