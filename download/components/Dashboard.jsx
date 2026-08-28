/**
 * components/Dashboard.jsx
 * -----------------------------------------------------
 * SakoSaring — Dashboard kualitas udara real-time.
 * Cocok untuk proyek Vite + Tailwind CSS.
 * Data diambil dari Neon PostgreSQL via lib/neonClient.js.
 */

import { useEffect, useState } from "react";
import { getAirQualityData } from "../lib/neonClient.js";

const CATEGORIES = {
  baik:        { label: "Baik",            badge: "bg-green-500",  color: "text-green-600", emoji: "😊" },
  sedang:      { label: "Sedang",          badge: "bg-yellow-400", color: "text-yellow-600", emoji: "😐" },
  tidakSehat:  { label: "Tidak Sehat",     badge: "bg-red-500",    color: "text-red-600",   emoji: "😷" },
  berbahaya:   { label: "Berbahaya",       badge: "bg-rose-700",   color: "text-rose-700",  emoji: "🚨" },
};

function categoryFromIspu(ispu) {
  if (ispu <= 50) return CATEGORIES.baik;
  if (ispu <= 100) return CATEGORIES.sedang;
  if (ispu <= 200) return CATEGORIES.tidakSehat;
  return CATEGORIES.berbahaya;
}

function healthAdvice(ispu) {
  const cat = categoryFromIspu(ispu);
  if (ispu <= 50) return { t: "Udara Bagus! Beraktivitas di Luar 🏃", p: ["Aman untuk semua kelompok.", "Nikmati olahraga outdoor.", "Buka jendela untuk udara segar."] };
  if (ispu <= 100) return { t: "Udara Sedang, Tetap Waspada 😊", p: ["Kelompok sensitif kurangi aktivitas berat.", "Minum cukup air putih.", "Anak & lansia jangan olahraga lama di luar."] };
  if (ispu <= 200) return { t: "Udara Tidak Sehat 😷", p: ["Hindari aktivitas fisik berat di luar.", "Pakai masker saat keluar.", "Tutup jendela, nyalakan air purifier."] };
  return { t: "Sangat Tidak Sehat / Berbahaya 🚨", p: ["Semua orang tetap di dalam ruangan.", "Masker wajib bila keluar.", "Hindari olahraga luar ruangan."] };
}

export default function Dashboard() {
  const [stations, setStations] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = () => {
    getAirQualityData()
      .then((data) => {
        setStations(data);
        const worst = data.length
          ? data.reduce((a, b) => (b.ispu > a.ispu ? b : a))
          : null;
        setSelected(worst);
        setLoading(false);
      })
      .catch(() => {
        setError("Gagal memuat data. Periksa koneksi database.");
        setLoading(false);
      });
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, []);

  if (loading) return (
    <div className="py-20 text-center text-slate-500">
      <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-600" />
      <p className="mt-3 text-sm">Memuat data kualitas udara...</p>
    </div>
  );

  if (error) return (
    <div className="rounded-3xl border border-red-200 bg-red-50 p-8 text-center text-red-700">{error}</div>
  );

  if (!selected) return <div className="p-8 text-center text-slate-500">Belum ada data.</div>;

  const cat = categoryFromIspu(selected.ispu);

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-slate-800">Lokasi: {selected.location}</h2>
        <p className="text-sm text-slate-500">Kecamatan Sako · Palembang</p>
      </div>

      {stations.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {stations.map((s) => (
            <button
              key={s.location}
              onClick={() => setSelected(s)}
              className={`rounded-full px-4 py-1.5 text-sm ${selected.location === s.location ? "bg-emerald-600 text-white" : "bg-white ring-1 ring-slate-200"}`}
            >
              {s.location}
            </button>
          ))}
        </div>
      )}

      <div className="rounded-3xl bg-white p-6 shadow">
        <p className="text-sm text-slate-500">ISPU · Indeks Standar Pencemar Udara</p>
        <div className="mt-1 flex items-end gap-3">
          <span className={`text-6xl font-extrabold ${cat.color}`}>{selected.ispu}</span>
          <span className={`mb-2 inline-block rounded-full ${cat.badge} px-3 py-1 text-sm text-white`}>
            {cat.emoji} {cat.label}
          </span>
        </div>
        <p className="mt-2 text-sm text-slate-500">
          {selected.temperature}°C · {selected.humidity}% · Kenyamanan {selected.comfort_index}/100
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { l: "PM2.5", v: selected.pm25 + " µg/m³" },
          { l: "PM10", v: selected.pm10 + " µg/m³" },
          { l: "CO", v: selected.co + " ppm" },
          { l: "SO₂", v: selected.so2 + " ppb" },
        ].map((m) => (
          <div key={m.l} className="rounded-2xl bg-white p-4 shadow">
            <p className="text-xs font-medium text-slate-500">{m.l}</p>
            <p className="mt-1 text-2xl font-bold text-slate-800">{m.v}</p>
          </div>
        ))}
      </div>

      <div className="rounded-3xl bg-white p-6 shadow">
        {(() => { const a = healthAdvice(selected.ispu); return (
          <>
            <h3 className="text-lg font-bold text-slate-800">{a.t}</h3>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-600">
              {a.p.map((x, i) => <li key={i}>{x}</li>)}
            </ul>
          </>
        ); })()}
      </div>
    </section>
  );
}
