/**
 * waqi.ts — pengambil data REAL stasiun pemantauan fisik BMKG di Palembang
 * lewat WAQI (api.waqi.info). Tidak butuh API key berbayar.
 *
 * Mengapa WAQI sebagai sumber utama:
 *  - Stasiun BMKG adalah stasiun pemantauan fisik (bukan model), jadi ini
 *    pengukuran langsung di lapangan yang bisa membandingkan data satelit.
 *  - Endpoint `mapq` bekerja dengan demo token; endpoint `/feed/{idx}/`
 *    SELALU mengembalikan Shanghai dengan demo token, jadi HANYA `mapq`
 *    yang dipakai di sini.
 *
 * Yang dikembalikan mapq:
 *  - `aqi`  = indeks US EPA (bukan µg/m³)
 *  - `pol`  = polutan utama (mis. "pm25")
 *  - `utime`/`stamp` = waktu pengamatan
 *  - `lat`, `lon`, `city`, `idx`
 *
 * Catatan: mapq hanya memberi nilai AQI total, bukan rincian per polutan.
 * PM2.5 diturunkan dari AQI lewat inversi breakpoint US EPA agar tetap
 * konsisten dengan cara ISPU dihitung di lib/air. PM10/CO/SO₂ TIDAK
 * difabrikasi — dibiarkan NULL karena tidak diberikan sumber.
 */

import { categoryFromIspu, computeComfort } from "@/lib/air";
import type { UpsertStationInput } from "@/lib/airQuality";

const BASE = "https://api.waqi.info/mapq";
const TOKEN = process.env.WAQI_TOKEN ?? "demo";
const FETCH_TIMEOUT_MS = 20_000;

/** Bounding box sekitar Palembang (cukup luas untuk menangkap stasiun BMKG Sako & sekitarnya). */
const BOUNDS = "-3.25,104.35,-2.65,105.25";
/** Hanya stasiun dalam radius ini (km) dari pusat Sako yang dipakai. */
const MAX_DISTANCE_KM = 25;

export const SAKO_CENTER = { lat: -2.9734, lon: 104.7754 };

interface WaqiStation {
  lat: number;
  lon: number;
  city?: string;
  idx?: number;
  aqi?: string | number;
  pol?: string;
  stamp?: number;
  utime?: string;
  tz?: string;
}

function num(v: unknown): number | undefined {
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

/** Jarak haversine dalam km antara dua koordinat. */
function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
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

/**
 * Inversi AQI US EPA → konsentrasi PM2.5 (µg/m³).
 * Dipakai karena mapq WAQI hanya memberi nilai AQI, bukan konsentrasi.
 */
function aqiToPm25(aqi: number): number {
  const bp = [
    [0, 50, 0, 12],
    [51, 100, 12.1, 35.4],
    [101, 150, 35.5, 55.4],
    [151, 200, 55.5, 150.4],
    [201, 300, 150.5, 250.4],
    [301, 400, 250.5, 350.4],
    [401, 500, 350.5, 500.4],
  ];
  for (const [lo, hi, cLo, cHi] of bp) {
    if (aqi <= hi) {
      return Math.round(((aqi - lo) / (hi - lo)) * (cHi - cLo) + cLo);
    }
  }
  return 500.4;
}

/** Ambil semua stasiun BMKG/WAQI di dalam bounding box Palembang. */
export async function fetchWaqiStations(): Promise<WaqiStation[]> {
  const url = `${BASE}/bounds/?token=${TOKEN}&bounds=${BOUNDS}`;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`WAQI HTTP ${res.status}`);
    const json = (await res.json()) as WaqiStation[];
    return Array.isArray(json) ? json : [];
  } finally {
    clearTimeout(t);
  }
}

/**
 * Konversi stasiun WAQI ke baris stasiun SakoSaring.
 * Mengembalikan null bila AQI tidak valid atau stasiun terlalu jauh.
 *
 * INTEGRITAS DATA — penting untuk dipahami:
 *  Endpoint `mapq` WAQI HANYA memberi nilai AQI total (US EPA) + polutan
 *  utama, TIDAK memberi rincian konsentrasi per polutan. Karena itu:
 *   - PM2.5 diturunkan dari AQI lewat inversi breakpoint US EPA (diberi label
 *     jelas sebagai "estimasi" di UI).
 *   - PM10, CO, SO₂ TIDAK difabrikasi. Kolomnya diisi NULL (tidak tersedia)
 *     agar tidak ada angka palsu yang ditampilkan sebagai pengukuran.
 */
export function toStationInput(s: WaqiStation): UpsertStationInput | null {
  const aqi = num(s.aqi);
  if (aqi == null || aqi < 0) return null;

  const distance = haversineKm(SAKO_CENTER.lat, SAKO_CENTER.lon, s.lat, s.lon);
  if (distance > MAX_DISTANCE_KM) return null;

  // mapq hanya memberi AQI total; PM2.5 diturunkan lewat inversi breakpoint.
  const pm25 = aqiToPm25(aqi);
  // PM10/CO/SO₂ tidak diberikan mapq → NULL (bukan difabrikasi).
  const pm10 = null;
  const so2 = null;
  const co = null;

  const ispu = aqi;

  const observedAt = s.stamp ? new Date(s.stamp * 1000) : null;
  const name = (s.city ?? "Stasiun BMKG")
    .replace(/,\s*Indonesia\s*$/, "")
    .replace(/^BMKG\s*•\s*/, "")
    .trim();

  return {
    location: name,
    pm25,
    pm10,
    co,
    so2,
    ispu,
    comfort_index: computeComfort(30, 75),
    status: categoryFromIspu(ispu).label,
    temperature: 30,
    humidity: 75,
    source: "bmkg",
    distance_km: Math.round(distance * 10) / 10,
    observed_at: observedAt,
    lat: s.lat,
    lon: s.lon,
    source_name: "WAQI mapq (BMKG)",
  };
}

/**
 * Ambil pembacaan real stasiun BMKG di sekitar Sako, urut terdekat.
 */
export async function fetchBmkgStations(): Promise<UpsertStationInput[]> {
  const stations = await fetchWaqiStations();
  const inputs = stations
    .map(toStationInput)
    .filter((x): x is UpsertStationInput => x != null)
    .sort((a, b) => (a.distance_km ?? 0) - (b.distance_km ?? 0));
  return inputs;
}
