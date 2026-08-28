/**
 * koneksi.ts / neonClient.js
 * ------------------------------------------------------------------
 * Konektor database ke Neon PostgreSQL menggunakan @neondatabase/serverless.
 * Serverless-friendly, pooling, dan aman untuk dipanggil dari API route.
 */

import { neon, neonConfig } from "@neondatabase/serverless";

// Neon membutuhkan fetch global — aman di runtime Node/Edge modern.
neonConfig.fetchConnectionCache = true;

export const sql = neon(process.env.NEON_DATABASE_URL ?? "");

export function neonHealth(): Promise<boolean> {
  return sql`SELECT 1`
    .then(() => true)
    .catch(() => false);
}
