"use client";

import { useEffect, useState, useCallback } from "react";
import {
  categoryFromIspu,
  healthAdvice,
  computeComfort,
  comfortLabel,
  type CategoryMeta,
} from "@/lib/air";
import { formatRupiah } from "@/lib/security";

interface Station {
  id?: number;
  location: string;
  pm25: number;
  pm10: number;
  co: number;
  so2: number;
  ispu: number;
  comfort_index?: number;
  status: string;
  temperature: number;
  humidity: number;
  recorded_at?: string;
}

interface Metric {
  key: string;
  label: string;
  value: string;
  unit: string;
  cat: CategoryMeta;
  big?: boolean;
}

export default function Dashboard() {
  const [stations, setStations] = useState<Station[]>([]);
  const [selected, setSelected] = useState<Station | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);

  const applyStations = useCallback((raw: Array<Station | Record<string, unknown>>) => {
    const data: Station[] = raw.map((d) => ({
      ...(d as Station),
      pm25: Number((d as Record<string, unknown>).pm25),
      pm10: Number((d as Record<string, unknown>).pm10),
      co: Number((d as Record<string, unknown>).co),
      so2: Number((d as Record<string, unknown>).so2),
      ispu: Number((d as Record<string, unknown>).ispu),
      temperature: Number((d as Record<string, unknown>).temperature),
      humidity: Number((d as Record<string, unknown>).humidity),
    }));
    // pilih stasiun dengan ISPU tertinggi sebagai representatif Sako
    const worst = data.length
      ? data.reduce((a, b) => (b.ispu > a.ispu ? b : a))
      : null;
    setStations(data);
    setSelected(worst);
    setLastUpdate(
      new Date().toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    );
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/air-quality", { cache: "no-store" });
      if (!res.ok) throw new Error();
      const json = await res.json();
      if (!json.ok) throw new Error(json.error);
      applyStations(json.data);
      setError(null);
    } catch {
      setError("Gagal memuat data real-time. Periksa koneksi database.");
    } finally {
      setLoading(false);
    }
  }, [applyStations]);

  useEffect(() => {
    void (async () => {
      await load();
    })();
    const t = setInterval(load, 60_000); // fallback polling tiap menit
    const es = new EventSource("/api/air-quality/stream");
    es.onmessage = (e) => {
      let parsed: { ok?: boolean; data?: Array<Station> };
      try {
        parsed = JSON.parse(e.data);
      } catch {
        return;
      }
      if (parsed.ok && parsed.data) {
        applyStations(parsed.data);
        setError(null);
      }
    };
    // EventSource auto-reconnect; polling fallback tetap jalan bila stream putus.
    es.onerror = () => {};
    return () => {
      clearInterval(t);
      es.close();
    };
  }, [load, applyStations]);

  if (loading && !selected) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-600" />
          <p className="text-sm text-slate-500">Memantau kualitas udara Sako...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 p-8 text-center">
        <div className="text-4xl">📡</div>
        <p className="mt-3 font-semibold text-red-700">{error}</p>
        <button
          onClick={load}
          className="mt-4 rounded-full bg-red-600 px-6 py-2 text-white transition hover:bg-red-700"
        >
          Coba Lagi
        </button>
      </div>
    );
  }

  if (!selected) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center text-slate-500">
        Belum ada data. Klik muat ulang untuk menyiapkan stasiun pemantau.
        <button
          onClick={load}
          className="mt-4 block w-full rounded-full bg-emerald-600 px-6 py-2 text-white"
        >
          Muat Ulang
        </button>
      </div>
    );
  }

  const cat = categoryFromIspu(selected.ispu);
  const advice = healthAdvice(selected.ispu, cat);
  const comfort = computeComfort(selected.temperature, selected.humidity);
  const comfortInfo = comfortLabel(comfort);

  const metrics: Metric[] = [
    { key: "pm25", label: "PM2.5", value: selected.pm25.toFixed(1), unit: "µg/m³", cat: categoryFromIspu(selected.pm25 * 2) },
    { key: "pm10", label: "PM10", value: selected.pm10.toFixed(1), unit: "µg/m³", cat: categoryFromIspu(selected.pm10) },
    { key: "co", label: "CO", value: selected.co.toFixed(1), unit: "ppm", cat: categoryFromIspu(selected.co * 12) },
    { key: "so2", label: "SO₂", value: selected.so2.toFixed(1), unit: "ppb", cat: categoryFromIspu(selected.so2 * 2) },
  ];

  return (
    <section className="space-y-8">
      {/* Header info */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Lokasi pemantauan</h2>
          <p className="text-sm text-slate-500">Kecamatan Sako · Palembang, Sumatera Selatan</p>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs text-slate-500 shadow-sm">
          <span className={`h-2 w-2 rounded-full ${lastUpdate ? "bg-emerald-500" : "bg-slate-300"}`} />
          Live · diperbarui {lastUpdate ?? "..."}
          <button
            onClick={load}
            className="ml-2 font-semibold text-emerald-600 hover:text-emerald-700"
            aria-label="Muat ulang data"
          >
            ↻
          </button>
        </div>
      </div>

      {/* Selector stasiun */}
      {stations.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {stations.map((s) => {
            const sc = categoryFromIspu(s.ispu);
            const active = selected.id === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setSelected(s)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  active
                    ? `${sc.badgeBg} text-white shadow-md`
                    : "bg-white text-slate-600 ring-1 ring-slate-200 hover:ring-emerald-300"
                }`}
              >
                {s.location}
              </button>
            );
          })}
        </div>
      )}

      {/* ISPU utama */}
      <div className={`rounded-3xl p-6 ring-2 ring-inset ${cat.bg} ${cat.ring}`}>
        <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-slate-600">
              ISPU · Indeks Standar Pencemar Udara
            </p>
            <div className="mt-1 flex items-end gap-3">
              <span className={`text-6xl font-extrabold leading-none ${cat.color}`}>
                {selected.ispu}
              </span>
              <span className="pb-1 text-sm text-slate-500">/ 500</span>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <span className={`inline-flex items-center gap-1 rounded-full ${cat.badgeBg} px-3 py-1 text-sm font-semibold text-white`}>
                {cat.emoji} {cat.label}
              </span>
              <span className="text-sm text-slate-500">· {selected.location}</span>
            </div>
          </div>
          <div className="text-left">
            <p className="text-sm font-medium text-slate-600">
              {selected.temperature.toFixed(1)}°C · {selected.humidity.toFixed(0)}%
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Kenyamanan: <span className={`font-semibold ${comfortInfo.color}`}>{comfortInfo.text}</span> ({comfort}/100)
            </p>
          </div>
        </div>

        {/* Skala */}
        <ScaleBar value={selected.ispu} />
      </div>

      {/* Kartu polutan */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {metrics.map((m) => (
          <MetricCard key={m.key} metric={m} />
        ))}
        <div className="col-span-2 rounded-2xl bg-white p-5 shadow-sm lg:col-span-1">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Indeks Kenyamanan</p>
          <p className={`mt-2 text-3xl font-extrabold ${comfortInfo.color}`}>{comfort}</p>
          <span className="mt-1 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
            {comfortInfo.text}
          </span>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-emerald-500" style={{ width: `${comfort}%` }} />
          </div>
        </div>
      </div>

      {/* Rekomendasi kesehatan */}
      <div className="rounded-3xl bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{advice.icon}</span>
          <h3 className="text-lg font-bold text-slate-800">{advice.title}</h3>
        </div>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {advice.points.map((p, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
              <span className="mt-0.5 text-emerald-500">✓</span> {p}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function ScaleBar({ value }: { value: number }) {
  const pct = Math.min(100, (value / 500) * 100);
  return (
    <div className="mt-5">
      <div className="flex h-3 w-full overflow-hidden rounded-full">
        <div className="h-full w-1/4 bg-green-400" />
        <div className="h-full w-1/4 bg-yellow-400" />
        <div className="h-full w-1/4 bg-red-500" />
        <div className="h-full w-1/4 bg-purple-600" />
      </div>
      <div className="relative mt-1 h-4">
        <div
          className="absolute -top-0 h-4 w-1.5 rounded bg-slate-800 shadow"
          style={{ left: `calc(${pct}% - 3px)` }}
        />
      </div>
      <div className="mt-1 flex justify-between text-[10px] font-medium text-slate-400">
        <span>Baik (0)</span>
        <span>Sedang</span>
        <span>Tidak Sehat</span>
        <span>Berbahaya (500)</span>
      </div>
    </div>
  );
}

function MetricCard({ metric }: { metric: Metric }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
          {metric.label}
        </p>
        <span className={`h-2.5 w-2.5 rounded-full ${metric.cat.badgeBg}`} />
      </div>
      <p className={`mt-2 text-3xl font-extrabold ${metric.cat.color}`}>
        {metric.value}
      </p>
      <p className="text-xs text-slate-400">{metric.unit}</p>
      <p className="mt-1 text-xs font-medium text-slate-500">
        {metric.cat.emoji} {metric.cat.label}
      </p>
    </div>
  );
}
