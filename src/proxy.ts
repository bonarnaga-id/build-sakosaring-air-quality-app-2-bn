import { NextResponse, type NextRequest } from "next/server";

/**
 * Proxy keamanan global (Next.js 16 "proxy" convention):
 * Header keamanan dasar + proteksi XSS/clickjacking.
 */
export function proxy(_request: NextRequest) {
  const response = NextResponse.next();

  response.headers.set("Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline'; " +
    "style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; " +
    "font-src 'self' data:; connect-src 'self'; frame-ancestors 'none';");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=()"
  );

  return response;
}

export const config = {
  matcher: "/(.*)",
};
