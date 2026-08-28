/**
 * lib/neonClient.js
 * -----------------------------------------------------
 * SakoSaring — Konektor database ke Neon PostgreSQL
 * menggunakan @neondatabase/serverless (serverless friendly,
 * cocok untuk Vite + Edge / fitur serverless).
 *
 * Instalasi:
 *   npm install @neondatabase/serverless
 *
 * Konfigurasi env `.env`:
 *   VITE_NEON_DATABASE_URL=postgresql://user:pass@host/db
 *
 * Catatan: JANGAN taruh secrets di kode front-end. Gunakan
 * proxy server (mis. Vercel serverless / backend) agar key
 * tetap tersimpan di server. File ini disediakan sebagai
 * pola konektor yang bisa dipindah ke layer serverless.
 */

import { neon, neonConfig } from "@neondatabase/serverless";

neonConfig.fetchConnectionCache = true;

export const sql =
  neon(import.meta.env.VITE_NEON_DATABASE_URL || process.env.NEON_DATABASE_URL || "");

/**
 * Ambil seluruh data stasiun kualitas udara.
 */
export async function getAirQualityData() {
  const rows = await sql`
    SELECT location, pm25, pm10, co, so2, ispu, comfort_index,
           status, temperature, humidity, recorded_at
    FROM stasiun_sako
    ORDER BY id ASC
  `;
  return rows;
}

/**
 * Simpan riwayat donasi Trakteer (sanitasi di sisi server).
 */
export async function recordDonation(donorName, amount, message) {
  const rows = await sql`
    INSERT INTO riwayat_trakteer (donor_name, amount, message)
    VALUES (${donorName}, ${amount}, ${message || null})
    RETURNING id, donor_name, amount, message, created_at
  `;
  return rows[0];
}

/**
 * Uji koneksi database.
 */
export async function ping() {
  try {
    await sql`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}
