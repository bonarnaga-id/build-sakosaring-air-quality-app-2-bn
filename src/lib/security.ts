/**
 * security.js
 * Lapisan keamanan: sanitasi input, proteksi XSS, dan validasi.
 */

import sanitizeHtml from "sanitize-html";

/** Sanitasi teks bebas dari tag HTML/script berbahaya. */
export function sanitizeText(input: unknown, maxLen = 500): string {
  const raw = typeof input === "string" ? input : String(input ?? "");
  const trimmed = raw.trim().slice(0, maxLen);
  return sanitizeHtml(trimmed, {
    allowedTags: [],
    allowedAttributes: {},
    allowedSchemes: [],
  });
}

/** Validasi nama donor: huruf/angka/spasi/dot, panjang aman. */
export function validDonorName(input: unknown): boolean {
  const name = sanitizeText(input, 80);
  if (name.length < 2 || name.length > 80) return false;
  return /^[a-zA-Z0-9 .\-_']+$/.test(name);
}

/** Daftar nominal donasi yang diizinkan (anti-fraud). */
export const ALLOWED_AMOUNTS = [6000, 12000, 18000, 24000, 60000];

export function validAmount(input: unknown): boolean {
  const n = Number(input);
  return Number.isInteger(n) && ALLOWED_AMOUNTS.includes(n);
}

/** Format Rupiah. */
export function formatRupiah(n: number): string {
  return "Rp" + n.toLocaleString("id-ID");
}

/**
 * rateLimitMock — simulasi rate limiting berbentuk in-memory.
 * Pada production, ganti dengan Redis/Upstash.
 */
const buckets = new Map<string, { count: number; reset: number }>();

export function rateLimitMock(ip: string, limit = 10, windowMs = 60_000): boolean {
  const now = Date.now();
  const entry = buckets.get(ip);
  if (!entry || now > entry.reset) {
    buckets.set(ip, { count: 1, reset: now + windowMs });
    return true;
  }
  if (entry.count >= limit) return false;
  entry.count += 1;
  return true;
}
