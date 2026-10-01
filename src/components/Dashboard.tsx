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
  pm10?: number | null;
  co?: number | null;
  so2?: number | null;
  ispu: number;
  comfort_index?: number;
  status: string;
  temperature: number;
  humidity: number;
  source?: SourceCode;
  distance_km?: number | null;
  observed_at?: string | null;
  lat?: number | null;
  lon?: number | null;
  source_name?: string | null;
  recorded_at?: string;
}

type SourceCode = "bmkg" | "cams" | "sensor";

const SOURCE_META: Record<SourceCode, { label: string; badge: string; dot: string; short: string }> = {
  bmkg: { label: "BMKG (stasiun fisik)", short: "BMKG", badge: "bg-sky-100 text-sky-700", dot: "bg-sky-500" },
  cams: { label: "CAMS Global (satelit)", short: "CAMS", badge: "bg-violet-100 text-violet-700", dot: "bg-violet-500" },
  sensor: { label: "Sensor komunitas", short: "Sensor", badge: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500" },
};

interface TrenPoint {
  observed_at: string;
  pm25: number;
  pm10: number;
  us_aqi: number;
}

interface Metric {
  key: string;
  label: string;
  value: string;
  unit: string;
  cat: CategoryMeta;
  big?: boolean;
  /** true bila sumber tidak mengukur polutan ini → tampil "tidak tersedia" */
  unavailable?: boolean;
  /** true bila nilai diturunkan (estimasi), bukan pengukuran langsung */
  estimated?: boolean;
}

export default function Dashboard() {
  const [stations, setStations] = useState<Station[]>([]);
  const [selected, setSelected] = useState<Station | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const [tren, setTren] = useState<TrenPoint[]>([]);

  const applyStations = useCallback((raw: Array<Station | Record<string, unknown>>) => {
    const data: Station[] = raw.map((d) => {
      const r = d as Record<string, unknown>;
      // Pertahankan NULL untuk polutan yang tidak diukur sumber — jangan
      // di-Number() jadi 0, karena 0.0 akan terlihat seperti pengukuran nyata.
      const numOrUndefined = (v: unknown) =>
        v == null ? undefined : Number(v);
      return {
        ...(d as Station),
        pm25: Number(r.pm25),
        pm10: numOrUndefined(r.pm10),
        co: numOrUndefined(r.co),
        so2: numOrUndefined(r.so2),
        ispu: Number(r.ispu),
        temperature: Number(r.temperature),
        humidity: Number(r.humidity),
      };
    });
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

  const loadTren = useCallback(async () => {
    try {
      const res = await fetch("/api/air-quality/tren", { cache: "no-store" });
      if (!res.ok) return;
      const json = await res.json();
      if (json.ok && Array.isArray(json.data)) setTren(json.data);
    } catch {
      // grafik bersifat pelengkap; diam-diam diabaikan bila gagal
    }
  }, []);

  useEffect(() => {
    void (async () => {
      await load();
      void loadTren();
    })();
    const t = setInterval(load, 60_000); // fallback polling tiap menit
    const tt = setInterval(loadTren, 5 * 60_000); // tren tiap 5 menit
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
      clearInterval(tt);
      es.close();
    };
  }, [load, loadTren, applyStations]);

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

  // BMKG (WAQI mapq) hanya memberi AQI total → PM2.5 diturunkan lewat inversi
  // breakpoint, PM10/CO/SO₂ tidak diberikan sumber. Tidak ada angka yang
  // difabrikasi: yang tidak diukur ditampilkan sebagai "tidak tersedia".
  const isBmkg = (selected.source ?? "sensor") === "bmkg";

  const metrics: Metric[] = [
    {
      key: "pm25",
      label: "PM2.5",
      value: selected.pm25.toFixed(1),
      unit: "µg/m³",
      cat: categoryFromIspu(selected.pm25 * 2),
      estimated: isBmkg,
    },
    selected.pm10 == null
      ? {
          key: "pm10",
          label: "PM10",
          value: "—",
          unit: "µg/m³",
          cat: categoryFromIspu(0),
          unavailable: true,
        }
      : {
          key: "pm10",
          label: "PM10",
          value: selected.pm10.toFixed(1),
          unit: "µg/m³",
          cat: categoryFromIspu(selected.pm10),
        },
    selected.co == null
      ? {
          key: "co",
          label: "CO",
          value: "—",
          unit: "ppm",
          cat: categoryFromIspu(0),
          unavailable: true,
        }
      : {
          key: "co",
          label: "CO",
          value: selected.co.toFixed(1),
          unit: "ppm",
          cat: categoryFromIspu(selected.co * 12),
        },
    selected.so2 == null
      ? {
          key: "so2",
          label: "SO₂",
          value: "—",
          unit: "ppb",
          cat: categoryFromIspu(0),
          unavailable: true,
        }
      : {
          key: "so2",
          label: "SO₂",
          value: selected.so2.toFixed(1),
          unit: "ppb",
          cat: categoryFromIspu(selected.so2 * 2),
        },
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
            const src = SOURCE_META[s.source ?? "sensor"];
            return (
              <button
                key={s.id}
                onClick={() => setSelected(s)}
                aria-label={`${src.label} — ${s.location}${s.distance_km != null ? `, ${s.distance_km} km` : ""}`}
                className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${
                  active
                    ? `${sc.badgeBg} text-white shadow-md`
                    : "bg-white text-slate-600 ring-1 ring-slate-200 hover:ring-emerald-300"
                }`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${
                    active ? "bg-white" : src.dot
                  }`}
                  aria-hidden="true"
                />
                {s.location}
                {s.distance_km != null && (
                  <span className="opacity-70">· {s.distance_km} km</span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Legenda asal sumber data */}
      {stations.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
          <span className="font-medium">Asal data:</span>
          {Object.entries(SOURCE_META).map(([code, meta]) => {
            const ada = stations.some((s) => (s.source ?? "sensor") === code);
            if (!ada) return null;
            return (
              <span key={code} className="inline-flex items-center gap-1.5">
                <span className={`h-2 w-2 rounded-full ${meta.dot}`} />
                {meta.short}
              </span>
            );
          })}
          <span className="text-slate-400">· pembanding antar sumber, bukan satu sumber</span>
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
              {selected.source && (
                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${SOURCE_META[selected.source].badge}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${SOURCE_META[selected.source].dot}`} />
                  {SOURCE_META[selected.source].short}
                </span>
              )}
              <span className="text-sm text-slate-500">· {selected.location}</span>
            </div>
            {selected.observed_at && (
              <p className="mt-1.5 text-xs text-slate-400">
                Pengamatan {new Date(selected.observed_at).toLocaleString("id-ID", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })} WIB
                {selected.distance_km != null ? ` · ${selected.distance_km} km dari Sako` : ""}
              </p>
            )}
            {/* Provenance: untuk akuntabilitas data */}
            <p className="mt-0.5 text-[11px] text-slate-400">
              Sumber: {selected.source_name ?? SOURCE_META[selected.source ?? "sensor"].label}
              {selected.lat != null && selected.lon != null
                ? ` · koordinat ${selected.lat.toFixed(3)}, ${selected.lon.toFixed(3)}`
                : ""}
            </p>
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

      {/* Grafik tren 3 hari */}
      {tren.length > 1 && <TrenChart points={tren} />}

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

function TrenChart({ points }: { points: TrenPoint[] }) {
  const W = 100;
  const H = 34;
  const maxAqi = Math.max(50, ...points.map((p) => p.us_aqi));
  const maxPm = Math.max(20, ...points.map((p) => p.pm25));

  const path = (vals: number[], max: number) =>
    vals
      .map((v, i) => {
        const x = (i / (vals.length - 1)) * W;
        const y = H - (Math.min(v, max) / max) * H;
        return `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
      })
      .join(" ");

  const last = points[points.length - 1];
  const first = points[0];
  const selisih = last.us_aqi - first.us_aqi;

  return (
    <div className="rounded-3xl bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-800">Tren 3 Hari Terakhir</h3>
          <p className="text-xs text-slate-500">
            US EPA AQI &amp; PM2.5 per jam · CAMS Global (satelit)
          </p>
        </div>
        <span
          className={`text-sm font-semibold ${
            selisih > 0 ? "text-red-600" : selisih < 0 ? "text-green-600" : "text-slate-500"
          }`}
        >
          {selisih > 0 ? "▲" : selisih < 0 ? "▼" : "—"} {Math.abs(selisih)} poin
        </span>
      </div>

      <div className="mt-4 flex gap-4 text-xs">
        <span className="inline-flex items-center gap-1.5 text-slate-600">
          <span className="h-2 w-6 rounded-full bg-violet-500" /> US AQI
        </span>
        <span className="inline-flex items-center gap-1.5 text-slate-600">
          <span className="h-2 w-6 rounded-full bg-emerald-500" /> PM2.5 (µg/m³)
        </span>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="mt-2 h-40 w-full"
        role="img"
        aria-label="Grafik tren kualitas udara 3 hari terakhir"
      >
        <path d={path(points.map((p) => p.us_aqi), maxAqi)} fill="none" stroke="#8b5cf6" strokeWidth={0.7} />
        <path d={path(points.map((p) => p.pm25), maxPm)} fill="none" stroke="#10b981" strokeWidth={0.7} />
      </svg>

      <div className="mt-1 flex justify-between text-[10px] text-slate-400">
        <span>{new Date(first.observed_at).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}</span>
        <span>{new Date(last.observed_at).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
      </div>
    </div>
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
        {metric.unavailable ? (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-400">
            tidak diukur
          </span>
        ) : (
          <span className={`h-2.5 w-2.5 rounded-full ${metric.cat.badgeBg}`} />
        )}
      </div>
      <p
        className={`mt-2 text-3xl font-extrabold ${
          metric.unavailable ? "text-slate-300" : metric.cat.color
        }`}
      >
        {metric.value}
      </p>
      <p className="text-xs text-slate-400">{metric.unit}</p>
      {metric.unavailable ? (
        <p className="mt-1 text-xs font-medium text-slate-400">
          sumber tidak menyediakan
        </p>
      ) : (
        <p className="mt-1 text-xs font-medium text-slate-500">
          {metric.cat.emoji} {metric.cat.label}
          {metric.estimated && (
            <span className="ml-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
              estimasi
            </span>
          )}
        </p>
      )}
    </div>
  );
}
