/**
 * airQuality.ts — layer akses data stasiun kualitas udara (Neon PostgreSQL).
 * Digunakan bersama oleh: GET/POST /api/air-quality, SSE stream, dan cron ingest.
 */

import { db } from "@/db";
import { trenUdara } from "@/db/schema";
import { sql } from "drizzle-orm";

export type StationSource = "bmkg" | "cams" | "sensor";

export interface StationRow {
  id: number;
  location: string;
  pm25: number;
  pm10: number | null;
  co: number | null;
  so2: number | null;
  ispu: number;
  comfort_index: number;
  status: string;
  temperature: number;
  humidity: number;
  source: StationSource;
  distance_km: number | null;
  observed_at: string | null;
  lat: number | null;
  lon: number | null;
  source_name: string | null;
  recorded_at: string;
}

export interface UpsertStationInput {
  location: string;
  pm25: number;
  pm10?: number | null;
  co?: number | null;
  so2?: number | null;
  ispu: number;
  comfort_index: number;
  status: string;
  temperature: number;
  humidity: number;
  source?: StationSource;
  distance_km?: number | null;
  observed_at?: Date | null;
  lat?: number | null;
  lon?: number | null;
  source_name?: string | null;
}

export interface TrenRow {
  observed_at: string;
  pm25: number;
  pm10: number;
  us_aqi: number;
  source: string;
}

/** Label ramah per kode sumber, dipakai UI untuk membedakan asal data. */
export const SOURCE_LABEL: Record<StationSource, string> = {
  bmkg: "BMKG (stasiun fisik)",
  cams: "CAMS Global (satelit)",
  sensor: "Sensor komunitas",
};

/** Semua stasiun terbaru (urut id), dipakai oleh Dashboard & SSE. */
export async function getLatestStations(): Promise<StationRow[]> {
  const res = await db.execute(sql`
    SELECT id, location, pm25, pm10, co, so2, ispu, comfort_index,
           status, temperature, humidity, source, distance_km, observed_at,
           lat, lon, source_name, recorded_at
    FROM stasiun_sako
    ORDER BY id ASC
  `);
  return res.rows as unknown as StationRow[];
}

/**
 * UPSERT satu stasiun. Mengandalkan constraint UNIQUE(location) di tabel.
 * Jika lokasi belum ada → INSERT; jika ada → UPDATE menjadi data terbaru.
 */
export async function upsertStasiun(input: UpsertStationInput): Promise<StationRow> {
  const res = await db.execute(sql`
    INSERT INTO stasiun_sako
      (location, pm25, pm10, co, so2, ispu, comfort_index, status,
       temperature, humidity, source, distance_km, observed_at,
       lat, lon, source_name)
    VALUES
      (${input.location}, ${input.pm25}, ${input.pm10 ?? null}, ${input.co ?? null},
       ${input.so2 ?? null}, ${input.ispu}, ${input.comfort_index}, ${input.status},
       ${input.temperature}, ${input.humidity},
       ${input.source ?? "sensor"}, ${input.distance_km ?? null},
       ${input.observed_at ?? null},
       ${input.lat ?? null}, ${input.lon ?? null}, ${input.source_name ?? null})
    ON CONFLICT (location) DO UPDATE SET
      pm25 = EXCLUDED.pm25,
      pm10 = EXCLUDED.pm10,
      co = EXCLUDED.co,
      so2 = EXCLUDED.so2,
      ispu = EXCLUDED.ispu,
      comfort_index = EXCLUDED.comfort_index,
      status = EXCLUDED.status,
      temperature = EXCLUDED.temperature,
      humidity = EXCLUDED.humidity,
      source = EXCLUDED.source,
      distance_km = EXCLUDED.distance_km,
      observed_at = EXCLUDED.observed_at,
      lat = EXCLUDED.lat,
      lon = EXCLUDED.lon,
      source_name = EXCLUDED.source_name,
      recorded_at = NOW()
    RETURNING id, location, pm25, pm10, co, so2, ispu, comfort_index,
              status, temperature, humidity, source, distance_km, observed_at,
              lat, lon, source_name, recorded_at
  `);
  return res.rows[0] as unknown as StationRow;
}

/**
 * Simpan banyak baris tren per jam sekaligus (dari CAMS Global).
 * Konflik (observed_at, source) di-skip karena data lama tidak diubah.
 */
export async function insertTrenMassal(rows: TrenRow[]): Promise<number> {
  if (!rows.length) return 0;
  const values = rows.map((r) => ({
    observedAt: new Date(r.observed_at),
    pm25: r.pm25,
    pm10: r.pm10,
    usAqi: r.us_aqi,
    source: r.source,
  }));
  const res = await db
    .insert(trenUdara)
    .values(values)
    .onConflictDoNothing();
  return res.rowCount ?? 0;
}

/** Ambil tren 3 hari terakhir (urut naik) untuk grafik Dashboard. */
export async function getTren3Hari(): Promise<TrenRow[]> {
  const res = await db.execute(sql`
    SELECT observed_at, pm25, pm10, us_aqi, source
    FROM tren_udara
    WHERE observed_at >= NOW() - INTERVAL '3 days'
    ORDER BY observed_at ASC
  `);
  return res.rows as unknown as TrenRow[];
}
