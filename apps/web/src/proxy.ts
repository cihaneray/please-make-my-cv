import { NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  const rawHost = request.headers.get("host") || "";
  const allowed = (process.env.WEB_ALLOWED_HOSTS || "localhost,127.0.0.1,[::1]")
    .split(",")
    .map((value) => value.trim().toLowerCase());
  let host: URL;
  try {
    host = new URL(`http://${rawHost}`);
    if (
      host.username ||
      host.password ||
      host.pathname !== "/" ||
      host.search ||
      host.hash ||
      !allowed.includes(host.hostname.toLowerCase())
    )
      throw new Error("Invalid host");
  } catch {
    return NextResponse.json(
      {
        error: { code: "HOST_REJECTED", message: "This host is not allowed." },
      },
      { status: 400 },
    );
  }
  const origin = request.headers.get("origin");
  if (
    request.nextUrl.pathname.startsWith("/api/") &&
    origin &&
    !["GET", "HEAD", "OPTIONS"].includes(request.method)
  ) {
    try {
      const value = new URL(origin);
      if (
        !["http:", "https:"].includes(value.protocol) ||
        value.host !== host.host
      )
        throw new Error("Invalid origin");
    } catch {
      return NextResponse.json(
        {
          error: {
            code: "ORIGIN_REJECTED",
            message: "This origin is not allowed.",
          },
        },
        { status: 403 },
      );
    }
  }
  const headers = new Headers(request.headers);
  if (request.nextUrl.pathname.startsWith("/api/") && process.env.API_TOKEN)
    headers.set("authorization", `Bearer ${process.env.API_TOKEN}`);
  if (request.nextUrl.pathname.startsWith("/api/"))
    return NextResponse.next({ request: { headers } });
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = `default-src 'self'; script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""}; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; frame-src 'self' blob: data:; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; frame-ancestors 'self'; form-action 'self'`;
  headers.set("x-nonce", nonce);
  headers.set("content-security-policy", csp);
  const response = NextResponse.next({ request: { headers } });
  response.headers.set("Content-Security-Policy", csp);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
export const config = {
  matcher: ["/((?!_next/static|_next/image|icon.svg).*)"],
};
