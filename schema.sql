-- ============================================================
-- SakoSaring — Schema Database (Neon PostgreSQL)
-- Sistem Pemantauan & Analisis Kualitas Udara Sako, Palembang
-- Open Source oleh MZF - 2026
--
-- Koneksi (Neon):
--   DATABASE_URL=postgresql://neondb_owner:***@ep-falling-resonance-ayxrz1l6-pooler.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require
--
-- JANGAN tulis password Neon di file ini. Pakai env var Vercel / .env.local.
-- Jika pernah mem-paste connection string lengkap ke chat, segera reset password
-- di Neon console lalu update env var.
--
-- Cara pakai:
--   psql "$DATABASE_URL" -f schema.sql
--   psql "$DATABASE_URL" -f seed.sql
-- ============================================================

-- 1) Tabel stasiun pemantauan kualitas udara
CREATE TABLE IF NOT EXISTS stasiun_sako (
    id            SERIAL PRIMARY KEY,
    location      VARCHAR(255) NOT NULL UNIQUE,        -- Nama lokasi stasiun (1 baris = latest per lokasi)
    pm25          REAL NOT NULL,                   -- PM2.5 (µg/m³)
    pm10          REAL NOT NULL,                   -- PM10 (µg/m³)
    co            REAL NOT NULL,                   -- Karbon monoksida (ppm)
    so2           REAL NOT NULL,                   -- Sulfur dioksida (ppb)
    ispu          INTEGER NOT NULL,                -- Indeks Standar Pencemar Udara
    comfort_index REAL NOT NULL DEFAULT 0,      -- Indeks kenyamanan (0-100)
    status        VARCHAR(40) NOT NULL,         -- Baik / Sedang / Tidak Sehat, dll.
    temperature   REAL NOT NULL,                   -- Suhu (°C)
    humidity      REAL NOT NULL,                   -- Kelembaban (%)
    source        VARCHAR(60) NOT NULL DEFAULT 'bmkg',  -- asal data: bmkg | cams | sensor
    distance_km   REAL,                        -- jarak stasiun ke pusat Sako (km), bisa NULL
    observed_at   TIMESTAMP,                   -- waktu pengamatan di sumber asli, bisa NULL
    recorded_at   TIMESTAMP DEFAULT NOW()       -- Waktu pencatatan
);

-- Index bantu query terbaru/terjelek
CREATE INDEX IF NOT EXISTS idx_stasiun_sako_recorded_at ON stasiun_sako (recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_stasiun_sako_ispu       ON stasiun_sako (ispu DESC);
CREATE INDEX IF NOT EXISTS idx_stasiun_sako_source     ON stasiun_sako (source);

-- Migrasi: tambah kolom baru jika tabel sudah dibuat oleh versi sebelumnya.
-- ADD COLUMN IF NOT EXISTS membuat statement ini aman dijalankan berulang.
ALTER TABLE stasiun_sako ADD COLUMN IF NOT EXISTS source      VARCHAR(60) NOT NULL DEFAULT 'bmkg';
ALTER TABLE stasiun_sako ADD COLUMN IF NOT EXISTS distance_km REAL;
ALTER TABLE stasiun_sako ADD COLUMN IF NOT EXISTS observed_at TIMESTAMP;

-- 2) Tabel riwayat donasi Trakteer
CREATE TABLE IF NOT EXISTS riwayat_trakteer (
    id          SERIAL PRIMARY KEY,
    donor_name  VARCHAR(255) NOT NULL,          -- Nama pendonasi
    amount      INTEGER NOT NULL,               -- Nominal donasi (Rp)
    message     TEXT,                           -- Pesan donor (opsional)
    created_at  TIMESTAMP DEFAULT NOW()         -- Waktu donasi
);

CREATE INDEX IF NOT EXISTS idx_riwayat_trakteer_created_at ON riwayat_trakteer (created_at DESC);

-- 3) Tabel tren kualitas udara per jam (grafik 3 hari terakhir, sumber CAMS Global)
CREATE TABLE IF NOT EXISTS tren_udara (
    id          SERIAL PRIMARY KEY,
    observed_at TIMESTAMP NOT NULL,             -- waktu pengamatan (per jam, WIB)
    pm25        REAL NOT NULL,                  -- PM2.5 (µg/m³)
    pm10        REAL NOT NULL,                  -- PM10 (µg/m³)
    us_aqi      INTEGER NOT NULL,               -- US EPA AQI (CAMS Global)
    source      VARCHAR(60) NOT NULL DEFAULT 'cams',
    UNIQUE (observed_at, source)
);

CREATE INDEX IF NOT EXISTS idx_tren_udara_observed_at ON tren_udara (observed_at DESC);

-- 3) Tabel tren kualitas udara per jam (grafik 3 hari terakhir, sumber CAMS Global)
CREATE TABLE IF NOT EXISTS tren_udara (
    id          SERIAL PRIMARY KEY,
    observed_at TIMESTAMP NOT NULL,             -- waktu pengamatan (per jam, WIB)
    pm25        REAL NOT NULL,                  -- PM2.5 (µg/m³)
    pm10        REAL NOT NULL,                  -- PM10 (µg/m³)
    us_aqi      INTEGER NOT NULL,               -- US EPA AQI (CAMS Global)
    source      VARCHAR(60) NOT NULL DEFAULT 'cams',
    UNIQUE (observed_at, source)
);

CREATE INDEX IF NOT EXISTS idx_tren_udara_observed_at ON tren_udara (observed_at DESC);

-- 3) Tabel tren kualitas udara per jam (grafik 3 hari terakhir, sumber CAMS Global)
CREATE TABLE IF NOT EXISTS tren_udara (
    id          SERIAL PRIMARY KEY,
    observed_at TIMESTAMP NOT NULL,             -- waktu pengamatan (per jam, WIB)
    pm25        REAL NOT NULL,                  -- PM2.5 (µg/m³)
    pm10        REAL NOT NULL,                  -- PM10 (µg/m³)
    us_aqi      INTEGER NOT NULL,               -- US EPA AQI (CAMS Global)
    source      VARCHAR(60) NOT NULL DEFAULT 'cams',
    UNIQUE (observed_at, source)
);

CREATE INDEX IF NOT EXISTS idx_tren_udara_observed_at ON tren_udara (observed_at DESC);
