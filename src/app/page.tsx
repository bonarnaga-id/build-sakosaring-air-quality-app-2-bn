import Dashboard from "@/components/Dashboard";
import FloatingWidget from "@/components/FloatingWidget";

export const dynamic = "force-dynamic";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-emerald-50 text-slate-900">
      <Header />

      <main className="mx-auto max-w-5xl px-4 pb-20 pt-6 sm:px-6">
        {/* Intro hero */}
        <section className="mb-8">
          <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
            Real-time monitoring aktif
          </span>
          <h1 className="mt-4 text-3xl font-extrabold leading-tight text-slate-900 sm:text-4xl">
            Pantau Kualitas Udara{" "}
            <span className="bg-gradient-to-r from-emerald-600 to-sky-600 bg-clip-text text-transparent">
              Kecamatan Sako
            </span>{" "}
            Sekarang
          </h1>
          <p className="mt-3 max-w-2xl text-slate-600">
            SakoSaring adalah sistem pemantauan &amp; analisis kualitas udara real-time
            untuk lingkungan yang lebih sehat di Palembang. Lihat data PM2.5, PM10, CO,
            SO₂, dan dapatkan rekomendasi kesehatan langsung.
          </p>
        </section>

        <Dashboard />

        {/* Download section */}
        <DownloadSource />

        {/* Cara kerja / informasi */}
        <section className="mt-12 grid gap-4 sm:grid-cols-3">
          {[
            { icon: "📡", t: "Data Real-time", d: "Sensorku terhubung langsung ke database Neon PostgreSQL." },
            { icon: "🫀", t: "Aman & Sehat", d: "Rekomendasi kesehatan otomatis mengikuti kondisi udara." },
            { icon: "🔒", t: "Terkunci Aman", d: "Proteksi XSS, input tersanitasi, dan header keamanan." },
          ].map((c) => (
            <div key={c.t} className="rounded-2xl bg-white p-5 shadow-sm">
              <span className="text-2xl">{c.icon}</span>
              <h3 className="mt-2 font-bold text-slate-800">{c.t}</h3>
              <p className="mt-1 text-sm text-slate-500">{c.d}</p>
            </div>
          ))}
        </section>
      </main>

      <Footer />
      <FloatingWidget />
    </div>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-100 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
        {/* Logo placeholder */}
        <a href="#" className="flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/logo.png"
            alt="Logo SakoSaring"
            className="h-11 w-11 rounded-xl object-cover shadow-sm ring-1 ring-emerald-500/20"
          />
          <span className="leading-tight">
            <span className="block text-base font-extrabold text-slate-900">
              Sako<span className="text-emerald-600">Saring</span>
            </span>
            <span className="block text-[11px] text-slate-400">Domain Anda · www.sako.id</span>
          </span>
        </a>
        <nav className="hidden items-center gap-6 text-sm font-medium text-slate-600 sm:flex">
          <a href="#" className="hover:text-emerald-600">Dashboard</a>
          <a href="#" className="hover:text-emerald-600">Tentang</a>
          <a href="#" className="hover:text-emerald-600">Kontak</a>
        </nav>
        <a
          href="#download"
          className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
        >
          Download
        </a>
      </div>
    </header>
  );
}

function DownloadSource() {
  return (
    <section
      id="download"
      className="mt-12 overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 to-sky-700 p-8 text-white shadow-xl sm:p-10"
    >
      <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-xl">
          <span className="text-3xl">📦</span>
          <h2 className="mt-2 text-2xl font-bold">
            Download Source Code SakoSaring + Dokumentasi Lengkap
          </h2>
          <p className="mt-2 text-emerald-50">
            Dapatkan seluruh file source code, schema SQL, konfigurasi Neon PostgreSQL,
            dan dokumentasi lengkap untuk menjalankan proyek ini sendiri.
          </p>
          <ul className="mt-4 space-y-1 text-sm text-emerald-50">
            <li>✓ App.jsx, components/, lib/neonClient.js</li>
            <li>✓ schema.sql (2 tabel database)</li>
            <li>✓ Panduan deploy Vite + Tailwind</li>
          </ul>
        </div>
        <a
          href="/api/download"
          className="flex items-center gap-2 rounded-full bg-white px-6 py-3 font-bold text-emerald-700 shadow-lg transition hover:scale-105"
        >
          ⬇ Download Source Code
        </a>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white py-8 text-center">
      <div className="mx-auto max-w-5xl px-4">
        <p className="text-sm text-slate-500">
          SakoSaring — Sistem Pemantauan &amp; Analisis Kualitas Udara Sako, Palembang.
        </p>
        <p className="mt-2 text-sm font-semibold text-slate-700">
          Open Source oleh MZF - 2026
        </p>
        <p className="mt-2 text-xs text-slate-400">Dibuat dengan ❤️ di Indonesia 🇮🇩</p>
      </div>
    </footer>
  );
}
