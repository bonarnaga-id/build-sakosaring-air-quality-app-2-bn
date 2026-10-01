/**
 * Migrasi ringan (dev/ops): menjalankan schema.sql + seed.sql ke Neon.
 * Jalankan dengan: npx tsx scripts/migrate.ts
 *
 * Aman dijalankan berulang (semua pakai IF NOT EXISTS / ON CONFLICT).
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { config as dotenvConfig } from "dotenv";
import { Pool } from "pg";

dotenvConfig({ path: ".env.local" });

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL belum diset di .env.local");
  process.exit(1);
}

function splitStatements(sqlText: string): string[] {
  /**
   * Pecah file SQL jadi statement utuh dengan parser 2-fasa:
   *  1) hapus komentar baris penuh (`--` di awar baris setelah spasi),
   *  2) gabungkan baris sampai ketemu `;` di akhir statement.
   * Komentar inline (di belakang kode) dipertahankan agar tetap aman.
   */
  const lines = sqlText
    .split(/\r?\n/)
    .filter((l) => !/^\s*--/.test(l));

  const stmts: string[] = [];
  let cur: string[] = [];
  for (const line of lines) {
    cur.push(line.trimEnd());
    if (line.trimEnd().endsWith(";")) {
      const joined = cur.join("\n").trim();
      if (joined) stmts.push(joined);
      cur = [];
    }
  }
  const tail = cur.join("\n").trim();
  if (tail) stmts.push(tail);
  return stmts;
}

async function main() {
  const pool = new Pool({ connectionString: url, ssl: { rejectUnauthorized: false } });
  const client = await pool.connect();

  try {
    for (const file of ["schema.sql", "seed.sql"]) {
      const path = resolve(process.cwd(), file);
      const text = readFileSync(path, "utf8");
      const stmts = splitStatements(text);
      console.log(`${file}: ${stmts.length} statement`);
      for (const stmt of stmts) {
        try {
          await client.query(stmt);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          if (/already exists|does not exist/i.test(msg)) {
            // aman: objek sudah ada / kolom sudah ada — lanjut
            continue;
          }
          console.error(`  GAGAL di statement:\n${stmt.slice(0, 200)}\n  -> ${msg}`);
          throw err;
        }
      }
      console.log(`  ✓ ${file} selesai`);
    }

    const res = await client.query(
      "SELECT location, pm25, ispu, status, source FROM stasiun_sako ORDER BY id"
    );
    console.log("\nIsi stasiun_sako:");
    for (const r of res.rows) {
      console.log(
        `  ${r.location} | PM2.5 ${r.pm25} | ISPU ${r.ispu} | ${r.status} | ${r.source}`
      );
    }
    // Hapus baris dummy lawas (nama jalan fiktif) yang sudah diganti
    // pembacaan real dari BMKG & CAMS Global.
    const del = await client.query(
      `DELETE FROM stasiun_sako
       WHERE location IN ('Jl. H. M. Ali – Sako Kenten',
                          'Jl. Sukamaju – Sako Baru',
                          'Jl. Beringin Janggut')`
    );
    if (del.rowCount && del.rowCount > 0) {
      console.log(`\n✓ ${del.rowCount} baris dummy lama dihapus`);
    }
    const t = await client.query("SELECT COUNT(*)::int AS n FROM tren_udara");
    console.log(`\nTren tersimpan: ${t.rows[0].n} baris`);
  } finally {
    client.release();
    await pool.end();
  }
}

void main().catch((e) => {
  console.error("Migrasi gagal:", e instanceof Error ? e.message : e);
  process.exit(1);
});
