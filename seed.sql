-- ============================================================
-- SakoSaring — Seed data (Neon PostgreSQL)
-- Jalankan SETELAH schema.sql
--   psql "$DATABASE_URL" -f schema.sql
--   psql "$DATABASE_URL" -f seed.sql
-- ============================================================

-- Stasiun awal dengan data REAL hasil verifikasi langsung ke sumbernya
-- (diambil 2026-10-01 11:00 WIB). Nilai ini hanya titik mula agar dashboard
-- tidak kosong sebelum cron pertama jalan; cron /api/cron/ingest akan
-- menimpa semuanya tiap 5 menit dengan data real terbaru.
--
-- INTEGRITAS DATA:
--  - WAQI mapq hanya memberi AQI total (US EPA), jadi PM2.5 diturunkan lewat
--    inversi breakpoint dan diberi label "estimasi" di UI. PM10/CO/SO₂ ditulis
--    NULL, BUKAN difabrikasi — sumber tidak menyediakannya.
--  - CAMS Global memberi PM2.5, PM10, CO, SO₂ langsung (µg/m³ → konversi unit).
--
-- ON CONFLICT DO NOTHING agar seed idempotent (location unik).
INSERT INTO stasiun_sako
    (location, pm25, pm10, co, so2, ispu, comfort_index, status,
     temperature, humidity, source, distance_km, observed_at, lat, lon, source_name)
VALUES
    ('Talang Betutu Palembang', 316.0, NULL, NULL, NULL, 367, 25, 'Berbahaya', 34.5, 42, 'bmkg', 9.2, '2026-10-01 11:00:00', -3.031, 104.72, 'WAQI mapq (BMKG)'),
    ('Musi 2 Palembang',        212.0, NULL, NULL, NULL, 212, 25, 'Sangat Tidak Sehat', 34.5, 42, 'bmkg', 8.9, '2026-10-01 11:00:00', -2.94, 104.7, 'WAQI mapq (BMKG)'),
    ('Sako',                     85.4, 92.0, 1.25, 4.51, 166, 25, 'Tidak Sehat', 34.5, 42, 'cams', NULL, '2026-10-01 11:00:00', -2.9734, 104.7754, 'Open-Meteo CAMS Global')
ON CONFLICT (location) DO NOTHING;

-- Tren 3 hari terakhir (CAMS Global, per jam) — cuplikan beberapa titik
-- representatif. Cron akan mengisi ~72 baris penuh saat pertama jalan.
INSERT INTO tren_udara (observed_at, pm25, pm10, us_aqi, source)
VALUES
    ('2026-09-29 07:00:00',  96.4, 100.1, 126, 'cams'),
    ('2026-09-29 13:00:00', 142.7, 148.9, 176, 'cams'),
    ('2026-09-29 19:00:00', 118.2, 123.5, 152, 'cams'),
    ('2026-09-30 07:00:00', 104.1, 108.8, 134, 'cams'),
    ('2026-09-30 13:00:00', 151.3, 157.2, 186, 'cams'),
    ('2026-09-30 19:00:00', 129.6, 135.0, 163, 'cams'),
    ('2026-10-01 07:00:00', 159.3, 165.3, 193, 'cams')
ON CONFLICT (observed_at, source) DO NOTHING;

-- Contoh data donasi Trakteer (opsional)
INSERT INTO riwayat_trakteer (donor_name, amount, message)
VALUES
    ('Bapak Surya',  12000, 'Semangat terus pakai servernya!'),
    ('Ibu Lina',     6000,  'Mantap membantu warga Sako.'),
    ('Raka Fauzan',  60000, 'Untuk listrik & upgrade sensor.')
ON CONFLICT DO NOTHING;
