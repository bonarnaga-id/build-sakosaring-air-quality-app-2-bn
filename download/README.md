# SakoSaring
**Sistem Pemantauan & Analisis Kualitas Udara Sako, Palembang**
*Open Source oleh MZF - 2026*

SakoSaring memantau kualitas udara secara real-time (ISPU: PM2.5, PM10, CO, SO₂) di
Kecamatan Sako, Palembang, Sumatera Selatan, dan memberikan rekomendasi kesehatan.

---

## 1. Fitur

- Dashboard real-time dengan kartu ISPU & polutan (berkode warna).
- Indeks kenyamanan (suhu & kelembaban).
- Rekomendasi kesehatan otomatis (non-teknis & mudah dipahami).
- Floating widget donasi Trakteer dengan modal QRIS.
- Integrasi Neon PostgreSQL (dua tabel).
- Keamanan: XSS prevention, input tersanitasi, rate-limiting, header keamanan.

## 2. Struktur File

| File | Fungsi |
|------|--------|
| `App.jsx` | Komponen utama aplikasi |
| `components/Dashboard.jsx` | Dashboard kualitas udara |
| `components/FloatingWidget.jsx` | Tombol + modal donasi Trakteer |
| `lib/neonClient.js` | Konektor Neon PostgreSQL |
| `schema.sql` | Skema database (2 tabel) |

## 3. Quick Start (Vite)

```bash
# 1. Buat proyek Vite + React
npm create vite@latest sakosaring -- --template react
cd sakosaring

# 2. Pasang Tailwind CSS (v4 contoh)
npm install tailwindcss @tailwindcss/vite
# tambahkan plugin @tailwindcss/vite di vite.config.js

# 3. Pasang Neon client
npm install @neondatabase/serverless

# 4. Salin file dari bundle ini
cp -r App.jsx components lib src/

# 5. Konfigurasi env
echo "VITE_NEON_DATABASE_URL=postgresql://user:pass@host/db" > .env

# 6. Setup database (lihat schema.sql)
psql $VITE_NEON_DATABASE_URL -f schema.sql

# 7. Jalankan
npm run dev
```

## 4. Skema Database

### `stasiun_sako`
| Kolom | Tipe | Keterangan |
|-------|------|------------|
| id | SERIAL PK | ID stasiun |
| location | VARCHAR(255) | Lokasi stasiun pemantau |
| pm25 | REAL | PM2.5 (µg/m³) |
| pm10 | REAL | PM10 (µg/m³) |
| co | REAL | Karbon monoksida (ppm) |
| so2 | REAL | Sulfur dioksida (ppb) |
| ispu | INTEGER | Indeks Standar Pencemar Udara |
| comfort_index | REAL | Indeks kenyamanan (0-100) |
| status | VARCHAR(40) | Kategori status |
| temperature | REAL | Suhu (°C) |
| humidity | REAL | Kelembaban (%) |
| recorded_at | TIMESTAMP | Waktu pemantauan |

### `riwayat_trakteer`
| Kolom | Tipe | Keterangan |
|-------|------|------------|
| id | SERIAL PK | ID donasi |
| donor_name | VARCHAR(255) | Nama pendonasi |
| amount | INTEGER | Nominal donasi (Rupiah) |
| message | TEXT | Pesan donor |
| created_at | TIMESTAMP | Waktu donasi |

## 5. Keamanan

- **XSS Prevention**: Semua input disanitasi (ganti `sanitize-html` sesuai kebutuhan).
- **Input terfilter**: Nama donor divalidasi regex; nominal hanya dari daftar aman.
- **Rate-limiting**: Contoh in-memory (ganti dengan Redis pada production).
- **Header keamanan**: CSP, X-Frame-Options, X-Content-Type-Options, dll.

## 6. Kustomisasi

- **Logo**: Ganti emoji `🌿` di header pada `App.jsx`.
- **Domain**: Ganti teks placeholder domain di header.
- **QRIS**: Ganti placeholder QR Code dengan QRIS asli Anda di `FloatingWidget.jsx`.

---

© 2026 MZF · Open Source
