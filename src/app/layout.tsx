import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "SakoSaring — Pantau Kualitas Udara Kecamatan Sako Palembang",
  description:
    "Sistem Pemantauan & Analisis Kualitas Udara Sako, Palembang. Data real-time PM2.5, PM10, CO, SO₂ dan rekomendasi kesehatan.",
  keywords: ["kualitas udara", "ISPU", "Sako", "Palembang", "polusi", "air quality"],
  openGraph: {
    title: "SakoSaring — Kualitas Udara Sako Palembang",
    description:
      "Pemantauan kualitas udara real-time untuk kecamatan Sako, Palembang.",
    locale: "id_ID",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="id">
      <body className="bg-slate-100 text-slate-900 antialiased">{children}</body>
    </html>
  );
}
