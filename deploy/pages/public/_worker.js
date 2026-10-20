// Keep the browser's URL and Origin intact for same-origin checks and session cookies.
// The service binding reaches the existing app, database and private storage internally.
export default {
  async fetch(request, env) {
    const api = new URL(request.url).pathname.startsWith("/api/");
    const readOnly = ["GET", "HEAD"].includes(request.method);
    if (!api && !readOnly) await request.body?.cancel();
    // This app submits forms through /api; it does not use framework server actions.
    const response =
      api || readOnly
        ? await env.STASHBOX.fetch(request)
        : new Response("Method not allowed.", {
            status: 405,
            headers: { Allow: "GET, HEAD" },
          });
    const headers = new Headers(response.headers);
    headers.set("X-Content-Type-Options", "nosniff");
    headers.set("X-Frame-Options", "DENY");
    headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    headers.set("Strict-Transport-Security", "max-age=31536000");
    headers.set(
      "Permissions-Policy",
      "camera=(), microphone=(), geolocation=()",
    );
    headers.set(
      "Content-Security-Policy",
      [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline'",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com",
        "img-src 'self' https: data: blob:",
        "connect-src 'self'",
        "base-uri 'none'",
        "object-src 'none'",
        "frame-ancestors 'none'",
        "form-action 'self'",
        "upgrade-insecure-requests",
      ].join("; "),
    );
    if (headers.get("content-type")?.includes("text/html"))
      headers.set("Cache-Control", "private, no-store");
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  },
};
