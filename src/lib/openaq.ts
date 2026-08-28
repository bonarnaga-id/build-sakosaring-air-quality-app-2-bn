/**
 * openaq.ts — pengambil data kualitas udara real-time dari OpenAQ v3
 * (gratis, butuh API key: https://explore.openaq.org/register).
 *
 * Strategi:
 *  1) Cari stasiun OpenAQ dalam radius sekitar Palembang (-2.97, 104.74).
 *  2) Untuk tiap lokasi, ambil pembacaan TERBARU via /locations/{id}/latest.
 *  3) Kelompokkan nilai per parameter (pm25, pm10, so2, co, temperature, humidity)
 *     menggunakan peta sensor -> parameter dari /locations (sensors ter-embed).
 *  4) Hitung ISPU + indeks kenyamanan, lalu ubah jadi UpsertStationInput.
 *
 * Catatan: respons OpenAQ v3 dapat berubah; parsing bersifat defensif dan
 * tiap lokasi yang gagal di-skip (tidak menggagalkan keseluruhan ingest).
 */

import { categoryFromIspu, computeComfort, computeIspu } from "@/lib/air";
import type { UpsertStationInput } from "@/lib/airQuality";

const OPENAQ_BASE = "https://api.openaq.org/v3";
const PALEMBANG = { lat: "-2.9734", lon: "104.7754" };
const RADIUS_M = 30000;

const NUMBER_PARAMS = ["pm25", "pm10", "so2", "co"] as const;

interface OpenAqSensor {
  id: number;
  name?: string;
  parameter?: { name?: string; units?: string };
}

interface OpenAqLocation {
  id: number;
  name?: string;
  locality?: string;
  sensors?: OpenAqSensor[];
}

interface LatestReading {
  sensorsId: number;
  value: number;
}

function openaqHeaders(): Record<string, string> {
  const key = process.env.OPENAQ_API_KEY;
  return key
    ? { "X-API-Key": key, accept: "application/json" }
    : { accept: "application/json" };
}

function num(v: unknown): number | undefined {
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function normalizeParam(name: string): string | undefined {
  const n = name.toLowerCase().trim();
  if (NUMBER_PARAMS.includes(n as (typeof NUMBER_PARAMS)[number])) return n;
  if (n === "temperature") return "temperature";
  if (n === "humidity") return "humidity";
  return undefined;
}

/** Cari lokasi OpenAQ di sekitar Palembang beserta sensor-nya. */
export async function findNearbyLocations(): Promise<OpenAqLocation[]> {
  const url =
    `${OPENAQ_BASE}/locations` +
    `?coordinates=${PALEMBANG.lat},${PALEMBANG.lon}` +
    `&radius=${RADIUS_M}` +
    `&parameters=pm25,pm10,so2,co,temperature,humidity` +
    `&limit=20&sensors=true`;
  const res = await fetch(url, { headers: openaqHeaders() });
  if (!res.ok) throw new Error(`OpenAQ locations error: ${res.status}`);
  const json = (await res.json()) as { results?: OpenAqLocation[] };
  return json.results ?? [];
}

/** Pembacaan terbaru per sensorId untuk satu lokasi. */
export async function fetchLatestByLocation(
  locationId: number
): Promise<LatestReading[]> {
  const url = `${OPENAQ_BASE}/locations/${locationId}/latest`;
  const res = await fetch(url, { headers: openaqHeaders() });
  if (!res.ok) throw new Error(`OpenAQ latest error: ${res.status}`);
  const json = (await res.json()) as { results?: LatestReading[] };
  return json.results ?? [];
}

/**
 * Konversi lokasi OpenAQ + pembacaannya ke baris stasiun SakoSaring.
 * Mengembalikan null bila tidak ada data pm25 (ISPU tidak dapat dihitung).
 */
export function toStationInput(
  location: OpenAqLocation,
  readings: LatestReading[]
): UpsertStationInput | null {
  const sensorNameById = new Map<number, string>();
  for (const s of location.sensors ?? []) {
    const name = s.parameter?.name ?? s.name ?? "";
    if (s.id != null && name) sensorNameById.set(s.id, name);
  }

  const byParam: Partial<Record<string, number>> = {};
  for (const r of readings) {
    const param = sensorNameById.get(r.sensorsId) ?? "";
    const key = normalizeParam(param);
    if (key && !(key in byParam)) byParam[key] = r.value;
  }

  const pm25 = num(byParam.pm25);
  if (pm25 == null) return null; // butuh minimal pm25 untuk ISPU

  const pm10 = num(byParam.pm10) ?? 0;
  const so2 = num(byParam.so2) ?? 0;
  const co = num(byParam.co) ?? 0;
  const temperature = num(byParam.temperature) ?? 30;
  const humidity = num(byParam.humidity) ?? 75;

  const ispu = computeIspu({ pm25, pm10, so2, co });
  const comfort = computeComfort(temperature, humidity);
  const status = categoryFromIspu(ispu).label;

  const label = location.name || location.locality || `Lokasi #${location.id}`;

  return {
    location: `OpenAQ • ${label}`,
    pm25,
    pm10,
    co,
    so2,
    ispu,
    comfort_index: comfort,
    status,
    temperature,
    humidity,
  };
}
