import { NextRequest } from "next/server";
import { db } from "@/db";
import { sql } from "drizzle-orm";
import { rateLimitMock } from "@/lib/security";

export const dynamic = "force-dynamic";

/**
 * GET /api/air-quality
 * Mengembalikan data stasiun kualitas udara dari Neon PostgreSQL.
 * Dilengkapi rate-limiting mock dan header keamanan.
 */
export async function GET(request: NextRequest) {
  // Rate limiting mock berbasis IP
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";

  if (!rateLimitMock(ip, 20, 60_000)) {
    return Response.json(
      { error: "Terlalu banyak permintaan. Coba lagi sebentar." },
      { status: 429, headers: securityHeaders() }
    );
  }

  try {
    const rows = await db.execute(sql`
      SELECT id, location, pm25, pm10, co, so2, ispu, comfort_index,
             status, temperature, humidity, recorded_at
      FROM stasiun_sako
      ORDER BY id ASC
    `);
    return Response.json({ ok: true, data: rows.rows }, { headers: securityHeaders() });
  } catch (err) {
    console.error("air-quality fetch failed", err);
    return Response.json(
      { ok: false, error: "Gagal mengambil data kualitas udara." },
      { status: 500, headers: securityHeaders() }
    );
  }
}

function securityHeaders(): Record<string, string> {
  return {
    "Content-Security-Policy":
      "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self';",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  };
}
