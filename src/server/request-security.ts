export function requestBodyLimit(pathname: string) {
  if (["/api/photos/upload", "/api/market/upload"].includes(pathname))
    return 200000;
  return pathname === "/api/admin/site" ? 24000 : 16000;
}

export function crossSiteWrite(request: Request) {
  if (["GET", "HEAD", "OPTIONS"].includes(request.method)) return false;
  const origin = request.headers.get("origin");
  return (
    (origin !== null && origin !== new URL(request.url).origin) ||
    request.headers.get("sec-fetch-site") === "cross-site"
  );
}
