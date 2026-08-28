import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { sql } from "drizzle-orm";
import {
  sanitizeText,
  validDonorName,
  validAmount,
  rateLimitMock,
} from "@/lib/security";

export const dynamic = "force-dynamic";

const secureHeaders: Record<string, string> = {
  "Content-Security-Policy":
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self';",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
};

/** POST /api/trakteer — simpan donasi donor (simulasi). */
export async function POST(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";

  if (!rateLimitMock(ip, 5, 60_000)) {
    return NextResponse.json(
      { ok: false, error: "Terlalu banyak permintaan. Coba beberapa saat lagi." },
      { status: 429, headers: secureHeaders }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Format JSON tidak valid." },
      { status: 400, headers: secureHeaders }
    );
  }

  const record = (body ?? {}) as { donorName?: unknown; amount?: unknown; message?: unknown };

  if (!validDonorName(record.donorName)) {
    return NextResponse.json(
      { ok: false, error: "Nama donor tidak valid (maks. 80 karakter, huruf/angka/spasi)." },
      { status: 400, headers: secureHeaders }
    );
  }
  if (!validAmount(record.amount)) {
    return NextResponse.json(
      { ok: false, error: "Nominal donasi tidak diizinkan." },
      { status: 400, headers: secureHeaders }
    );
  }

  // Sanitasi semua input terhadap XSS
  const donorName = sanitizeText(record.donorName, 80);
  const message = sanitizeText(record.message, 300);

  try {
    const inserted = await db.execute(sql`
      INSERT INTO riwayat_trakteer (donor_name, amount, message)
      VALUES (${donorName}, ${Number(record.amount)}, ${message || null})
      RETURNING id, donor_name, amount, message, created_at
    `);
    const row = inserted.rows[0];
    return NextResponse.json(
      { ok: true, data: row },
      { status: 201, headers: secureHeaders }
    );
  } catch (err) {
    console.error("trakteer insert failed", err);
    return NextResponse.json(
      { ok: false, error: "Gagal menyimpan donasi." },
      { status: 500, headers: secureHeaders }
    );
  }
}

/** GET /api/trakteer — riwayat donasi. */
export async function GET(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!rateLimitMock(ip, 20, 60_000)) {
    return NextResponse.json(
      { ok: false, error: "Terlalu banyak permintaan." },
      { status: 429, headers: secureHeaders }
    );
  }
  try {
    const rows = await db.execute(sql`
      SELECT id, donor_name, amount, message, created_at
      FROM riwayat_trakteer ORDER BY id DESC LIMIT 20
    `);
    return NextResponse.json(
      { ok: true, data: rows.rows },
      { headers: secureHeaders }
    );
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { ok: false, error: "Gagal memuat riwayat." },
      { status: 500, headers: secureHeaders }
    );
  }
}
