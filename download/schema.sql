-- ============================================================
-- SakoSaring — Schema Database (Neon PostgreSQL)
-- Sistem Pemantauan & Analisis Kualitas Udara Sako, Palembang
-- Open Source oleh MZF - 2026
-- ============================================================

-- 1) Tabel stasiun pemantauan kualitas udara
CREATE TABLE IF NOT EXISTS stasiun_sako (
    id            SERIAL PRIMARY KEY,
    location      VARCHAR(255) NOT NULL UNIQUE,         -- Nama lokasi stasiun (1 baris = latest per lokasi)
    pm25          REAL NOT NULL,                   -- PM2.5 (µg/m³)
    pm10          REAL NOT NULL,                   -- PM10 (µg/m³)
    co            REAL NOT NULL,                   -- Karbon monoksida (ppm)
    so2           REAL NOT NULL,                   -- Sulfur dioksida (ppb)
    ispu          INTEGER NOT NULL,                -- Indeks Standar Pencemar Udara
    comfort_index REAL DEFAULT 0,                  -- Indeks kenyamanan (0-100)
    status        VARCHAR(40) NOT NULL,            -- Baik / Sedang / Tidak Sehat, dll.
    temperature   REAL NOT NULL,                   -- Suhu (°C)
    humidity      REAL NOT NULL,                   -- Kelembaban (%)
    recorded_at    TIMESTAMP DEFAULT NOW()
);

-- 2) Tabel riwayat donasi Trakteer
CREATE TABLE IF NOT EXISTS riwayat_trakteer (
    id          SERIAL PRIMARY KEY,
    donor_name  VARCHAR(255) NOT NULL,             -- Nama pendonasi
    amount      INTEGER NOT NULL,                  -- Nominal donasi (dalam Rupiah)
    message     TEXT,                              -- Pesan donor (bisa kosong)
    created_at  TIMESTAMP DEFAULT NOW()
);

-- Contoh data awal (opsional, idempotent)
INSERT INTO stasiun_sako
    (location, pm25, pm10, co, so2, ispu, comfort_index, status, temperature, humidity)
VALUES
    ('Jl. H. M. Ali – Sako Kenten', 38.5, 52.3, 7.2, 18.4, 87, 31.2, 'Sedang', 30.4, 76.5),
    ('Jl. Sukamaju – Sako Baru',    26.1, 41.7, 5.8, 12.9, 62, 33.8, 'Sedang', 31.1, 73.8),
    ('Jl. Beringin Janggut',        18.9, 30.2, 4.1,  9.6, 45, 36.4, 'Baik',   30.8, 75.2)
ON CONFLICT (location) DO NOTHING;
