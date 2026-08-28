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
