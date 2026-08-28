import { NextRequest, NextResponse } from "next/server";
import { rateLimitMock } from "@/lib/security";
import fs from "node:fs";
import path from "node:path";

export const dynamic = "force-dynamic";

/**
 * GET /api/download
 * Men-download bundle source code SakoSaring (file-file yang siap dicopy
 * ke proyek Vite) sebagai satu file .txt berisi seluruh isi file.
 */
export async function GET(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  if (!rateLimitMock(ip, 5, 60_000)) {
    return NextResponse.json({ error: "Terlalu cepat. Coba lagi." }, { status: 429 });
  }

  const base = path.join(process.cwd(), "download");
  const files = [
    "App.jsx",
    "components/Dashboard.jsx",
    "components/FloatingWidget.jsx",
    "lib/neonClient.js",
    "schema.sql",
    "README.md",
  ];

  let bundle = `${banner()}`;
  for (const f of files) {
    const full = path.join(base, f);
    try {
      const content = fs.readFileSync(full, "utf8");
      bundle += `\n` + separator(f) + `\n${content}\n`;
    } catch {
      bundle += `\n` + separator(f) + `\n[file tidak tersedia]\n`;
    }
  }

  return new NextResponse(bundle, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": 'attachment; filename="sakosaring-source-code.txt"',
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "no-store",
    },
  });
}

function banner(): string {
  return [
    "=".repeat(72),
    " SAKOSARING — SOURCE CODE + DOKUMENTASI LENGKAP",
    " Sistem Pemantauan & Analisis Kualitas Udara Sako, Palembang",
    " Open Source oleh MZF - 2026",
    "=".repeat(72),
    "",
    " Isi bundle: App.jsx, components/, lib/, schema.sql, README.md",
    " Panduan lengkap ada di README.md di bagian bawah.",
    "",
  ].join("\n");
}

function separator(name: string): string {
  return `\n${"-".repeat(72)}\nFILE: ${name}\n${"-".repeat(72)}`;
}
