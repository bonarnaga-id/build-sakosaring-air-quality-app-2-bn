/**
 * components/FloatingWidget.jsx
 * -----------------------------------------------------
 * SakoSaring — Floating button + modal donasi Trakteer.
 * Klik tombol membuka overlay modal (tanpa redirect).
 * Nominal bisa dipilih dan QRIS berubah dinamis.
 */

import { useEffect, useState } from "react";

const DONATION_OPTIONS = [6000, 12000, 18000, 24000, 60000];

const formatRupiah = (n) => "Rp" + n.toLocaleString("id-ID");

/** Placeholder payload QRIS — ganti dengan kode QRIS asli Anda. */
export const qrisPayload = (amount) =>
  `SakoSaring|MZF@BRI|${amount}|KodeQRIS-Placeholder`;

export default function FloatingWidget() {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(6000);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      {/* Tombol mengambang di kanan-bawah */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-full bg-rose-500 px-5 py-3 text-sm font-bold text-white shadow-2xl hover:bg-rose-600"
        aria-label="Donasi Trakteer"
      >
        ☕ <span>Web app ini gratis &amp; bebas iklan. Kopi kecil, server tetap jalan</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-md rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800">☕ Dukung SakoSaring</h2>
              <button
                onClick={() => setOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200"
                aria-label="Tutup"
              >
                ✕
              </button>
            </div>

            <p className="mt-1 text-sm text-slate-500">Pilih nominal (QRIS)</p>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {DONATION_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  onClick={() => setAmount(opt)}
                  className={`rounded-xl border-2 px-2 py-2 text-sm font-bold ${
                    amount === opt
                      ? "border-rose-500 bg-rose-50 text-rose-600"
                      : "border-slate-200 text-slate-700 hover:border-rose-300"
                  }`}
                >
                  {formatRupiah(opt)}
                </button>
              ))}
            </div>

            {/* QRIS placeholder — ganti dengan QR Code asli */}
            <div className="mt-5 rounded-2xl bg-slate-50 p-5 text-center">
              <p className="text-xl font-extrabold text-slate-800">{formatRupiah(amount)}</p>
              <div className="mx-auto mt-3 flex h-44 w-44 items-center justify-center rounded-xl border-2 border-dashed border-rose-300 bg-white text-5xl">
                📱
              </div>
              <p className="mt-3 text-xs text-slate-500">
                Scan QRIS dengan GoPay / OVO / Dana / ShopeePay / m-Banking
              </p>
              <button
                onClick={() => setOpen(false)}
                className="mt-4 w-full rounded-full bg-rose-500 py-2.5 font-bold text-white hover:bg-rose-600"
              >
                Sumbang Lewat QRIS
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
