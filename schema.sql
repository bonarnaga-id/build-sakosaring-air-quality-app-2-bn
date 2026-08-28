-- ============================================================
-- SakoSaring — Schema Database (Neon PostgreSQL)
-- Sistem Pemantauan & Analisis Kualitas Udara Sako, Palembang
-- Open Source oleh MZF - 2026
--
-- Koneksi (Neon):
--   DATABASE_URL=postgresql://neondb_owner:npg_YI1UJ9SsTQjo@ep-falling-resonance-ayxrz1l6-pooler.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require
--
-- Cara pakai:
--   psql "$DATABASE_URL" -f schema.sql
--   psql "$DATABASE_URL" -f seed.sql
-- ============================================================

-- 1) Tabel stasiun pemantauan kualitas udara
CREATE TABLE IF NOT EXISTS stasiun_sako (
    id            SERIAL PRIMARY KEY,
    location      VARCHAR(255) NOT NULL,        -- Nama lokasi stasiun
    pm25          REAL NOT NULL,                -- PM2.5 (µg/m³)
    pm10          REAL NOT NULL,                -- PM10 (µg/m³)
    co            REAL NOT NULL,                -- Karbon monoksida (ppm)
    so2           REAL NOT NULL,                -- Sulfur dioksida (ppb)
    ispu          INTEGER NOT NULL,             -- Indeks Standar Pencemar Udara
    comfort_index REAL NOT NULL DEFAULT 0,      -- Indeks kenyamanan (0-100)
    status        VARCHAR(40) NOT NULL,         -- Baik / Sedang / Tidak Sehat, dll.
    temperature   REAL NOT NULL,                -- Suhu (°C)
    humidity      REAL NOT NULL,                -- Kelembaban (%)
    recorded_at   TIMESTAMP DEFAULT NOW()       -- Waktu pencatatan
);

-- Index bantu query terbaru/terjelek
CREATE INDEX IF NOT EXISTS idx_stasiun_sako_recorded_at ON stasiun_sako (recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_stasiun_sako_ispu       ON stasiun_sako (ispu DESC);

-- 2) Tabel riwayat donasi Trakteer
CREATE TABLE IF NOT EXISTS riwayat_trakteer (
    id          SERIAL PRIMARY KEY,
    donor_name  VARCHAR(255) NOT NULL,          -- Nama pendonasi
    amount      INTEGER NOT NULL,               -- Nominal donasi (Rp)
    message     TEXT,                           -- Pesan donor (opsional)
    created_at  TIMESTAMP DEFAULT NOW()         -- Waktu donasi
);

CREATE INDEX IF NOT EXISTS idx_riwayat_trakteer_created_at ON riwayat_trakteer (created_at DESC);
