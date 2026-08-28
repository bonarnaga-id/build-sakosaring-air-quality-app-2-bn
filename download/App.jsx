/**
 * App.jsx
 * -----------------------------------------------------
 * SakoSaring — Komponen utama aplikasi.
 * Cocok untuk proyek Vite + React + Tailwind CSS.
 *
 * Drop-in ke: src/App.jsx pada proyek Vite Anda.
 * Pastikan Tailwind sudah terpasang dan index.css ter-import.
 */

import Dashboard from "./components/Dashboard.jsx";
import FloatingWidget from "./components/FloatingWidget.jsx";

export default function App() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 to-emerald-50 text-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-slate-100 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          {/* Logo placeholder — ganti sesuai branding */}
          <a href="#" className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500 text-lg text-white">🌿</span>
            <span className="font-extrabold">
              Sako<span className="text-emerald-600">Saring</span>
            </span>
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        {/* Hero */}
        <h1 className="text-3xl font-extrabold sm:text-4xl">
          Pantau Kualitas Udara{" "}
          <span className="bg-gradient-to-r from-emerald-600 to-sky-600 bg-clip-text text-transparent">
            Kecamatan Sako
          </span>
        </h1>
        <p className="mt-2 max-w-2xl text-slate-600">
          Sistem pemantauan &amp; analisis kualitas udara real-time untuk lingkungan yang
          lebih sehat di Palembang, Sumatera Selatan.
        </p>

        <div className="mt-6">
          <Dashboard />
        </div>
      </main>

      <footer className="border-t border-slate-200 bg-white py-8 text-center">
        <p className="text-sm font-semibold text-slate-700">
          Open Source oleh MZF - 2026
        </p>
      </footer>

      <FloatingWidget />
    </div>
  );
}
