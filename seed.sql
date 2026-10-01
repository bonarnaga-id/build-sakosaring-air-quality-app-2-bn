-- ============================================================
-- SakoSaring — Seed data (Neon PostgreSQL)
-- Jalankan SETELAH schema.sql
--   psql "$DATABASE_URL" -f schema.sql
--   psql "$DATABASE_URL" -f seed.sql
-- ============================================================

-- Stasiun awal dengan data REAL hasil verifikasi langsung ke sumbernya
-- (diambil 2026-10-01 07:00 WIB). Nilai ini hanya titik mula agar dashboard
-- tidak kosong sebelum cron pertama jalan; cron /api/cron/ingest akan
-- menimpa semuanya tiap 5 menit dengan data real terbaru.
--
-- Sumber:
--   BMKG (stasiun fisik)  -> WAQI mapq      : AQI 316 (Talang Betutu), 291 (Musi 2)
--   CAMS Global (satelit) -> Open-Meteo     : PM2.5 159.3, PM10 165.3, US AQI 193
--
-- ON CONFLICT DO NOTHING agar seed idempotent (location unik).
INSERT INTO stasiun_sako
    (location, pm25, pm10, co, so2, ispu, comfort_index, status,
     temperature, humidity, source, distance_km, observed_at)
VALUES
    ('Talang Betutu Palembang', 265.4, 358.3, 0, 0, 316, 25, 'Sangat Tidak Sehat', 30, 75, 'bmkg', 5.9, '2026-10-01 06:00:00'),
    ('Musi 2 Palembang',        244.1, 329.5, 0, 0, 291, 25, 'Sangat Tidak Sehat', 30, 75, 'bmkg', 8.4, '2026-10-01 05:00:00'),
    ('Sako',                    159.3, 165.3, 2.48, 6.76, 207, 25, 'Tidak Sehat', 30, 75, 'cams', NULL, '2026-10-01 07:00:00')
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
