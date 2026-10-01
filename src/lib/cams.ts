/**
 * cams.ts — pengambil data kualitas udara REAL dari Open-Meteo Air Quality
 * (model CAMS Global Copernicus). Tidak butuh API key.
 *
 * Mengapa CAMS Global sebagai pembanding BMKG:
 *  - Satelit/model global, jangkauan seluruh Indonesia (domain `cams_global`
 *    satu-satunya yang jalan untuk Indonesia; domain lain → HTTP 400).
 *  - Memberi PM2.5, PM10, CO, SO₂, NO₂, O₃, dan US EPA AQI di grid ~10km.
 *
 * Catatan unit:
 *  - PM2.5/PM10 → µg/m³ (langsung dipakai)
 *  - CO         → µg/m³, dibagi 1145 ke ppm (25°C, 1 atm)
 *  - SO₂        → µg/m³, dibagi 2.619 ke ppb
 *  - temperature_2m / relative_humidity_2m TIDAK didukung endpoint air-quality
 *    (mengembalikan null), jadi suhu & kelembaban diisi nilai netral.
 */

import { categoryFromIspu, computeComfort, computeIspu } from "@/lib/air";
import type { UpsertStationInput, TrenRow } from "@/lib/airQuality";

const BASE = "https://air-quality-api.open-meteo.com/v1/air-quality";
const FETCH_TIMEOUT_MS = 25_000; // cold start Open-Meteo bisa 19+ detik

/** Pusat Kecamatan Sako, Palembang (Sumatera Selatan). */
export const SAKO_CENTER = { lat: -2.9734, lon: 104.7754 };

/**
 * Titik sampling di pusat Kecamatan Sako, Palembang.
 *
 * CAMS Global punya grid ~10km, jadi beberapa titik yang berdekatan di dalam
 * Sako akan mengembalikan nilai grid yang persis sama. Karena itu cukup satu
 * titik pusat Sako — tidak perlu menduplikasi data identik dengan nama lain.
 */
export const SAKO_GRID: { name: string; lat: number; lon: number }[] = [
  { name: "Sako", lat: -2.9734, lon: 104.7754 },
];

const CURRENT_PARAMS = [
  "pm10",
  "pm2_5",
  "carbon_monoxide",
  "sulphur_dioxide",
  "nitrogen_dioxide",
  "ozone",
  "us_aqi",
].join(",");

const HOURLY_PARAMS = [
  "pm10",
  "pm2_5",
  "carbon_monoxide",
  "sulphur_dioxide",
  "nitrogen_dioxide",
  "ozone",
  "us_aqi",
].join(",");

interface CamsCurrent {
  time?: string;
  pm10?: number | null;
  pm2_5?: number | null;
  carbon_monoxide?: number | null;
  sulphur_dioxide?: number | null;
  us_aqi?: number | null;
}

interface CamsResponse {
  latitude?: number;
  longitude?: number;
  current?: CamsCurrent;
  hourly?: {
    time?: string[];
    pm10?: (number | null)[];
    pm2_5?: (number | null)[];
    us_aqi?: (number | null)[];
  };
}

function num(v: unknown): number | undefined {
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

async function fetchJson(url: string): Promise<CamsResponse> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`CAMS HTTP ${res.status}`);
    return (await res.json()) as CamsResponse;
  } finally {
    clearTimeout(t);
  }
}

/** URL untuk pembacaan CURRENT di beberapa titik grid Sako sekaligus. */
function currentUrl(): string {
  const lats = SAKO_GRID.map((g) => g.lat).join(",");
  const lons = SAKO_GRID.map((g) => g.lon).join(",");
  return (
    `${BASE}?latitude=${lats}&longitude=${lons}` +
    `&current=${CURRENT_PARAMS}` +
    `&timezone=Asia%2FJakarta`
  );
}

/** URL untuk data HOURLY 3 hari terakhir di pusat Sako (untuk grafik tren). */
function hourlyUrl(): string {
  return (
    `${BASE}?latitude=${SAKO_CENTER.lat}&longitude=${SAKO_CENTER.lon}` +
    `&hourly=${HOURLY_PARAMS}` +
    `&past_days=3&forecast_days=1` +
    `&timezone=Asia%2FJakarta`
  );
}

/**
 * Ambil pembacaan real CAMS Global untuk tiap titik grid Sako.
 * Mengembalikan UpsertStationInput siap disimpan, atau [] bila gagal total.
 */
export async function fetchCamsStations(): Promise<UpsertStationInput[]> {
  const json = await fetchJson(currentUrl());
  const arr = Array.isArray(json) ? json : [json];

  const out: UpsertStationInput[] = [];
  arr.forEach((point, i) => {
    const c = point.current;
    if (!c) return;

    const pm25 = num(c.pm2_5);
    const pm10 = num(c.pm10);
    if (pm25 == null || pm10 == null) return;

    // µg/m³ → ppm (CO) dan ppb (SO₂)
    const co = num(c.carbon_monoxide) != null ? num(c.carbon_monoxide)! / 1145 : 0;
    const so2 = num(c.sulphur_dioxide) != null ? num(c.sulphur_dioxide)! / 2.619 : 0;

    // Suhu/kelembaban tidak disediakan endpoint air-quality → netral.
    const temperature = 30;
    const humidity = 75;

    const ispu = computeIspu({ pm25, pm10, so2, co });
    const observedAt = c.time ? new Date(c.time) : null;

    out.push({
      location: "Sako",
      pm25,
      pm10,
      co,
      so2,
      ispu,
      comfort_index: computeComfort(temperature, humidity),
      status: categoryFromIspu(ispu).label,
      temperature,
      humidity,
      source: "cams",
      observed_at: observedAt,
    });
  });

  return out;
}

/**
 * Ambil tren hourly 3 hari terakhir di pusat Sako untuk grafik.
 * Hanya jam yang sudah ter-observasi (bukan ramalan) yang disimpan.
 */
export async function fetchCamsTren(): Promise<TrenRow[]> {
  const json = await fetchJson(hourlyUrl());
  const h = json.hourly;
  if (!h?.time?.length) return [];

  const rows: TrenRow[] = [];
  const now = Date.now();

  h.time.forEach((t, i) => {
    const ts = new Date(t).getTime();
    if (!Number.isFinite(ts) || ts > now) return; // skip ramalan

    const pm25 = num(h.pm2_5?.[i]);
    const pm10 = num(h.pm10?.[i]);
    const usAqi = num(h.us_aqi?.[i]);
    if (pm25 == null || pm10 == null || usAqi == null) return;

    rows.push({
      observed_at: t,
      pm25,
      pm10,
      us_aqi: Math.round(usAqi),
      source: "cams",
    });
  });

  return rows;
}
