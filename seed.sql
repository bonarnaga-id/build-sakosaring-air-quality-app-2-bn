-- ============================================================
-- SakoSaring — Seed data sample (Neon PostgreSQL)
-- Jalankan SETELAH schema.sql
--   psql "$DATABASE_URL" -f schema.sql
--   psql "$DATABASE_URL" -f seed.sql
-- ============================================================

-- Contoh data stasiun pemantauan (3 lokasi di Kecamatan Sako, Palembang)
INSERT INTO stasiun_sako
    (location, pm25, pm10, co, so2, ispu, comfort_index, status, temperature, humidity)
VALUES
    ('Jl. H. M. Ali – Sako Kenten', 38.5, 52.3, 7.2, 18.4, 87, 63.2, 'Sedang', 30.4, 76.5),
    ('Jl. Sukamaju – Sako Baru',    26.1, 41.7, 5.8, 12.9, 62, 68.4, 'Sedang', 31.1, 73.8),
    ('Jl. Beringin Janggut',        18.9, 30.2, 4.1,  9.6, 45, 71.6, 'Baik',   30.8, 75.2);

-- Contoh data donasi Trakteer (opsional)
INSERT INTO riwayat_trakteer (donor_name, amount, message)
VALUES
    ('Bapak Surya',  12000, 'Semangat terus pakai servernya!'),
    ('Ibu Lina',     6000,  'Mantap membantu warga Sako.'),
    ('Raka Fauzan',  60000, 'Untuk listrik & upgrade sensor.');
