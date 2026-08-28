import { NextRequest, NextResponse } from "next/server";
import { rateLimitMock, sanitizeText } from "@/lib/security";
import { computeComfort, computeIspu, categoryFromIspu } from "@/lib/air";
import { getLatestStations, upsertStasiun } from "@/lib/airQuality";

export const dynamic = "force-dynamic";

const secureHeaders: Record<string, string> = {
  "Content-Security-Policy":
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; frame-ancestors 'none';",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-XSS-Protection": "1; mode=block",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
};

function num(v: unknown): number | undefined {
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

/** GET /api/air-quality — data stasiun kualitas udara dari Neon PostgreSQL. */
export async function GET(request: NextRequest) {
  const ip = clientIp(request);
  if (!rateLimitMock(ip, 20, 60_000)) {
    return NextResponse.json(
      { ok: false, error: "Terlalu banyak permintaan. Coba lagi sebentar." },
      { status: 429, headers: secureHeaders }
    );
  }
  try {
    const data = await getLatestStations();
    return NextResponse.json({ ok: true, data }, { headers: secureHeaders });
  } catch (err) {
    console.error("air-quality fetch failed", err);
    return NextResponse.json(
      { ok: false, error: "Gagal mengambil data kualitas udara." },
      { status: 500, headers: secureHeaders }
    );
  }
}

interface StationBody {
  location?: unknown;
  pm25?: unknown;
  pm10?: unknown;
  co?: unknown;
  so2?: unknown;
  temperature?: unknown;
  humidity?: unknown;
  ispu?: unknown;      // opsional; dihitung otomatis bila tidak diberikan
  comfort_index?: unknown;
  status?: unknown;
}

/**
 * POST /api/air-quality — *push* pembacaan sensor (real-time).
 * Sensor / sistem eksternal memakai endpoint ini untuk menulis data terbaru;
 * UPSERT berdasarkan `location` (setiap lokasi = 1 baris terbaru).
 *
 * Body JSON: { location, pm25, pm10, co, so2, temperature, humidity }
 */
export async function POST(request: NextRequest) {
  const ip = clientIp(request);
  if (!rateLimitMock(ip, 60, 60_000)) {
    return NextResponse.json(
      { ok: false, error: "Terlalu banyak permintaan." },
      { status: 429, headers: secureHeaders }
    );
  }

  // (Opsional) batasi push hanya dari sensor yang terotentikasi.
  // Cek token via header x-sensor-key jika env SENSOR_API_KEY diset.
  const expectedKey = process.env.SENSOR_API_KEY;
  if (expectedKey) {
    const got = request.headers.get("x-sensor-key");
    if (got !== expectedKey) {
      return NextResponse.json(
        { ok: false, error: "Tidak terotorisasi." },
        { status: 401, headers: secureHeaders }
      );
    }
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
  const rec = (body ?? {}) as StationBody;

  const location = sanitizeText(rec.location, 120);
  if (location.length < 2) {
    return NextResponse.json(
      { ok: false, error: "location wajib diisi (min. 2 karakter)." },
      { status: 400, headers: secureHeaders }
    );
  }

  const pm25 = num(rec.pm25);
  const pm10 = num(rec.pm10);
  const co = num(rec.co);
  const so2 = num(rec.so2);
  const temperature = num(rec.temperature);
  const humidity = num(rec.humidity);

  if ([pm25, pm10, co, so2, temperature, humidity].some((n) => n == null)) {
    return NextResponse.json(
      { ok: false, error: "Field pm25, pm10, co, so2, temperature, humidity wajib angka valid." },
      { status: 400, headers: secureHeaders }
    );
  }

  const ispu = Number.isFinite(Number(rec.ispu))
    ? Number(rec.ispu)
    : computeIspu({ pm25: pm25!, pm10: pm10!, so2: so2!, co: co! });
  const comfort = Number.isFinite(Number(rec.comfort_index))
    ? Number(rec.comfort_index)
    : computeComfort(temperature!, humidity!);
  const status = typeof rec.status === "string" && rec.status.length
    ? rec.status
    : categoryFromIspu(ispu).label;

  try {
    const row = await upsertStasiun({
      location,
      pm25: pm25!,
      pm10: pm10!,
      co: co!,
      so2: so2!,
      ispu,
      comfort_index: comfort,
      status,
      temperature: temperature!,
      humidity: humidity!,
    });
    return NextResponse.json({ ok: true, data: row }, { status: 201, headers: secureHeaders });
  } catch (err) {
    console.error("air-quality upsert failed", err);
    return NextResponse.json(
      { ok: false, error: "Gagal menyimpan pembacaan stasiun." },
      { status: 500, headers: secureHeaders }
    );
  }
}

function clientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}
