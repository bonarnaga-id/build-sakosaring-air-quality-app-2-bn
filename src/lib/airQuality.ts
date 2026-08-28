/**
 * airQuality.ts — layer akses data stasiun kualitas udara (Neon PostgreSQL).
 * Digunakan bersama oleh: GET/POST /api/air-quality, SSE stream, dan cron ingest.
 */

import { db } from "@/db";
import { sql } from "drizzle-orm";

export interface StationRow {
  id: number;
  location: string;
  pm25: number;
  pm10: number;
  co: number;
  so2: number;
  ispu: number;
  comfort_index: number;
  status: string;
  temperature: number;
  humidity: number;
  recorded_at: string;
}

export interface UpsertStationInput {
  location: string;
  pm25: number;
  pm10: number;
  co: number;
  so2: number;
  ispu: number;
  comfort_index: number;
  status: string;
  temperature: number;
  humidity: number;
}

/** Semua stasiun terbaru (urut id), dipakai oleh Dashboard & SSE. */
export async function getLatestStations(): Promise<StationRow[]> {
  const res = await db.execute(sql`
    SELECT id, location, pm25, pm10, co, so2, ispu, comfort_index,
           status, temperature, humidity, recorded_at
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
      (location, pm25, pm10, co, so2, ispu, comfort_index, status, temperature, humidity)
    VALUES
      (${input.location}, ${input.pm25}, ${input.pm10}, ${input.co}, ${input.so2},
       ${input.ispu}, ${input.comfort_index}, ${input.status},
       ${input.temperature}, ${input.humidity})
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
      recorded_at = NOW()
    RETURNING id, location, pm25, pm10, co, so2, ispu, comfort_index,
              status, temperature, humidity, recorded_at
  `);
  return res.rows[0] as unknown as StationRow;
}
