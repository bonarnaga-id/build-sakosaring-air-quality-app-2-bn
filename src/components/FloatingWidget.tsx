"use client";

import { useEffect, useState, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { formatRupiah } from "@/lib/security";

const DONATION_OPTIONS = [6000, 12000, 18000, 24000, 60000];

/** Sumber pembayaran QRIS palsu/placeholder yang berubah sesuai nominal. */
function buildQrisPayload(amount: number): string {
  return [
    "00020101021126480011ID5252525266015MZF@BRI088812980011393978258",
    `${String(amount).padStart(12, "0")}`,
    "5204581253033605802ID5909SakoSaring6007Palembang610830100",
    "6304",
  ].join("");
}

export default function FloatingWidget() {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(6000);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const bodyRef = useRef<typeof document.body>(null);

  useEffect(() => {
    // Lock scroll saat modal terbuka
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const close = () => {
    setOpen(false);
    setCopied(false);
  };

  const handleCopy = async () => {
    const payload = buildQrisPayload(amount);
    try {
      await navigator.clipboard.writeText(payload);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard tidak tersedia */
    }
  };

  // Simulasi simpan riwayat donasi (dengan validasi minimal di client)
  const handleRecord = async () => {
    setSaving(true);
    try {
      await fetch("/api/trakteer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ donorName: "Simpatisan SakoSaring", amount }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      /* abaikan — hanya simulasi */
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {/* Tombol mengambang */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-gradient-to-r from-rose-500 to-pink-600 px-5 py-3 text-sm font-semibold text-white shadow-2xl transition hover:scale-105 hover:shadow-pink-500/40 focus:outline-none focus:ring-4 focus:ring-pink-300"
        aria-label="Buka donasi Trakteer"
      >
        <span className="text-lg">☕</span>
        <span className="hidden max-w-[180px] text-left leading-tight sm:block">
          Web app ini gratis &amp; bebas iklan. Kopi kecil, server tetap jalan
        </span>
        <span className="sm:hidden">Dukung</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          onClick={close}
          role="dialog"
          aria-modal="true"
          aria-label="Donasi via Trakteer"
        >
          <div
            className="modal-card w-full max-w-md rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="relative flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div className="flex items-center gap-2">
                <span className="text-2xl">☕</span>
                <div>
                  <h2 className="font-bold text-slate-800">Trakteer SakoSaring</h2>
                  <p className="text-xs text-slate-500">Dukunganmu menjaga server tetap jalan.</p>
                </div>
              </div>
              <button
                onClick={close}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition hover:bg-slate-200"
                aria-label="Tutup"
              >
                ✕
              </button>
            </div>

            {/* Nominal */}
            <div className="px-6 pt-5">
              <p className="mb-2 text-sm font-medium text-slate-600">Pilih nominal (QRIS)</p>
              <div className="grid grid-cols-3 gap-2">
                {DONATION_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => setAmount(opt)}
                    className={`rounded-xl border-2 px-2 py-2.5 text-sm font-bold transition ${
                      amount === opt
                        ? "border-pink-500 bg-pink-50 text-pink-600"
                        : "border-slate-200 bg-white text-slate-700 hover:border-pink-300"
                    }`}
                  >
                    {formatRupiah(opt)}
                  </button>
                ))}
                <button className="col-span-3 rounded-xl border-2 border-dashed border-slate-200 px-2 py-2 text-sm text-slate-400">
                  Custom (QRIS)
                </button>
              </div>
            </div>

            {/* QR Code area */}
            <div className="px-6 py-5">
              <div className="rounded-2xl bg-slate-50 p-5 text-center">
                <p className="mb-3 text-xl font-extrabold text-slate-800">
                  {formatRupiah(amount)}
                </p>
                <div className="mx-auto inline-block rounded-xl bg-white p-3 shadow-sm">
                  <QRCodeSVG
                    value={buildQrisPayload(amount)}
                    size={180}
                    level="M"
                    fgColor="#0f172a"
                    bgColor="transparent"
                  />
                </div>
                <p className="mt-3 text-xs text-slate-500">
                  Scan QRIS menggunakan GoPay / OVO / Dana / ShopeePay / m-Banking
                </p>
                <button
                  onClick={handleCopy}
                  className="mt-3 rounded-full border border-pink-300 px-4 py-1.5 text-xs font-semibold text-pink-600 transition hover:bg-pink-50"
                >
                  {copied ? "✓ Disalin" : "Salin kode QRIS"}
                </button>
              </div>

              {/* CTA & feedback */}
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <button
                  onClick={handleRecord}
                  disabled={saving}
                  className="flex-1 rounded-full bg-gradient-to-r from-pink-500 to-rose-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-105 disabled:opacity-50"
                >
                  {saving ? "Menyimpan..." : saved ? "✓ Terima kasih! ❤️" : "Sumbang Lewat QRIS"}
                </button>
              </div>
              <p className="mt-3 text-center text-[11px] leading-relaxed text-slate-400">
                SakoSaring gratis &amp; tanpa iklan. Kontribusimu membantu biaya server,
                domain, dan pemantauan kualitas udara Sako.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
