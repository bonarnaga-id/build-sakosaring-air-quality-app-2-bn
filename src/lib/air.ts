/**
 * air.js
 * Logika perhitungan Indeks Standar Pencemar Udara (ISPU) dan kategori.
 */

export type CategoryKey = "baik" | "sedang" | "tidakSehat" | "sangatTidakSehat" | "berbahaya";

export interface CategoryMeta {
  key: CategoryKey;
  label: string;
  color: string;      // tailwind text color
  bg: string;         // tailwind bg
  badgeBg: string;    // solid badge background
  ring: string;
  emoji: string;
}

const CATEGORIES: Record<CategoryKey, CategoryMeta> = {
  baik: {
    key: "baik",
    label: "Baik",
    color: "text-green-600",
    bg: "bg-green-50",
    badgeBg: "bg-green-500",
    ring: "ring-green-200",
    emoji: "😊",
  },
  sedang: {
    key: "sedang",
    label: "Sedang",
    color: "text-yellow-600",
    bg: "bg-yellow-50",
    badgeBg: "bg-yellow-400",
    ring: "ring-yellow-200",
    emoji: "😐",
  },
  tidakSehat: {
    key: "tidakSehat",
    label: "Tidak Sehat",
    color: "text-red-600",
    bg: "bg-red-50",
    badgeBg: "bg-red-500",
    ring: "ring-red-200",
    emoji: "😷",
  },
  sangatTidakSehat: {
    key: "sangatTidakSehat",
    label: "Sangat Tidak Sehat",
    color: "text-purple-700",
    bg: "bg-purple-50",
    badgeBg: "bg-purple-600",
    ring: "ring-purple-200",
    emoji: "🤢",
  },
  berbahaya: {
    key: "berbahaya",
    label: "Berbahaya",
    color: "text-rose-800",
    bg: "bg-rose-100",
    badgeBg: "bg-rose-700",
    ring: "ring-rose-300",
    emoji: "🚨",
  },
};

export function categoryFromIspu(ispu: number): CategoryMeta {
  if (ispu <= 50) return CATEGORIES.baik;
  if (ispu <= 100) return CATEGORIES.sedang;
  if (ispu <= 200) return CATEGORIES.tidakSehat;
  if (ispu <= 300) return CATEGORIES.sangatTidakSehat;
  return CATEGORIES.berbahaya;
}

export interface HealthAdvice {
  title: string;
  points: string[];
  icon: string;
}

export function healthAdvice(ispu: number, cat: CategoryMeta): HealthAdvice {
  if (ispu <= 50) {
    return {
      title: "Udara Bagus! Ayo Beraktivitas di Luar 🏃",
      icon: "🌿",
      points: [
        "Kualitas udara sangat baik, aman untuk semua kelompok.",
        "Nikmati aktivitas outdoor seperti olahraga ringan.",
        "Buka jendela untuk sirkulasi udara segar.",
        "Ajak keluarga jalan-jalan pagi di sekitar Sako.",
      ],
    };
  }
  if (ispu <= 100) {
    return {
      title: "Udara Sedang, Tetap Waspada 😊",
      icon: "🫁",
      points: [
        "Masih aman, namun kelompok sensitif disarankan kurangi aktivitas berat.",
        "Minum air putih lebih banyak untuk menjaga daya tahan tubuh.",
        "Jika beraktivitas di luar, istirahatkan sesekali di tempat teduh.",
        "Anak-anak & lansia sebaiknya tidak berolahraga terlalu lama di luar.",
      ],
    };
  }
  if (ispu <= 200) {
    return {
      title: "Udara Tidak Sehat, Kurangi di Luar Rumah 😷",
      icon: "😷",
      points: [
        "Hindari aktivitas fisik berat di luar ruangan.",
        "Gunakan masker (KN95/medis) saat keluar rumah.",
        "Tutup jendela dan nyalakan air purifier jika ada.",
        "Kelompok rentan (balita, lansia, ibu hamil) diimbau tetap di dalam.",
      ],
    };
  }
  return {
    title: "Sangat Tidak Sehat / Berbahaya 🚨",
    icon: "🚨",
    points: [
      "Semua orang disarankan tetap di dalam ruangan.",
      "Pakai masker berstandar tinggi jika wajib keluar.",
      "Hindari olahraga luar ruangan sepenuhnya.",
      "Siapkan obat bagi yang punya riwayat asma/paru.",
    ],
  };
}

/** Indeks kenyamanan sederhana berbasis suhu & kelembaban (0-100). */
export function computeComfort(temperature: number, humidity: number): number {
  let score = 100;
  // suhu ideal 22-27°C
  if (temperature < 22) score -= (22 - temperature) * 3;
  if (temperature > 27) score -= (temperature - 27) * 3;
  // kelembaban ideal 40-60%
  if (humidity < 40) score -= (40 - humidity) * 0.8;
  if (humidity > 60) score -= (humidity - 60) * 0.8;
  return Math.max(0, Math.round(Math.min(100, score)));
}

export function comfortLabel(score: number): { text: string; color: string } {
  if (score >= 75) return { text: "Nyaman", color: "text-green-600" };
  if (score >= 50) return { text: "Cukup Nyaman", color: "text-yellow-600" };
  return { text: "Kurang Nyaman", color: "text-orange-600" };
}

/**
 * ISPU (Indeks Standar Pencemar Udara) — berdasarkan rumus interpolasi
 * linear standar AQI/indonesia. ISPU = sub-index tertinggi dari semua
 * polutan yang tersedia. Nilai keluaran berada pada rentang 0–500.
 */
export type Pollutant = "pm25" | "pm10" | "so2" | "co";

/** Breakpoint tiap polutan: { lo, hi, aqiLow, aqiHigh }. */
const AQI_BREAKPOINTS: Record<Pollutant, number[][]> = {
  pm25: [
    [0, 12, 0, 50],
    [12.1, 35.4, 51, 100],
    [35.5, 55.4, 101, 150],
    [55.5, 150.4, 151, 200],
    [150.5, 250.4, 201, 300],
    [250.5, 350.4, 301, 400],
    [350.5, 500.4, 401, 500],
  ],
  pm10: [
    [0, 54, 0, 50],
    [55, 154, 51, 100],
    [155, 254, 101, 150],
    [255, 354, 151, 200],
    [355, 424, 201, 300],
    [425, 504, 301, 400],
    [505, 604, 401, 500],
  ],
  so2: [
    [0, 35, 0, 50],
    [36, 75, 51, 100],
    [76, 185, 101, 150],
    [186, 304, 151, 200],
    [305, 604, 201, 300],
    [605, 804, 301, 400],
    [805, 1004, 401, 500],
  ],
  co: [
    [0, 4.4, 0, 50],
    [4.5, 9.4, 51, 100],
    [9.5, 12.4, 101, 150],
    [12.5, 15.4, 151, 200],
    [15.5, 30.4, 201, 300],
    [30.5, 40.4, 301, 400],
    [40.5, 50.4, 401, 500],
  ],
};

/** Sub-index ISPU dari satu polutan (interpolasi linear). > 500 → 500. */
export function ispuFrom(value: number, pollutant: Pollutant): number {
  if (!Number.isFinite(value) || value < 0) return 0;
  const table = AQI_BREAKPOINTS[pollutant];
  const last = table[table.length - 1];
  if (value >= last[1]) return 500;
  for (const [lo, hi, aqiLow, aqiHigh] of table) {
    if (value <= hi) {
      if (hi === lo) return aqiLow;
      return Math.round(
        aqiLow + ((aqiHigh - aqiLow) / (hi - lo)) * (value - lo)
      );
    }
  }
  return 500;
}

export interface IspuInput {
  pm25?: number;
  pm10?: number;
  so2?: number;
  co?: number;
}

/** ISPU akhir = sub-index tertinggi dari polutan yang tersedia. */
export function computeIspu(readings: IspuInput): number {
  const subs = [
    readings.pm25 != null ? ispuFrom(readings.pm25, "pm25") : 0,
    readings.pm10 != null ? ispuFrom(readings.pm10, "pm10") : 0,
    readings.so2 != null ? ispuFrom(readings.so2, "so2") : 0,
    readings.co != null ? ispuFrom(readings.co, "co") : 0,
  ];
  return Math.max(...subs);
}
