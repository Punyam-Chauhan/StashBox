import { compressPhoto } from "./image-upload";

/** JSON transport shared by StashBox and Pawn Shop. */
export async function requestJSON(
  path: string,
  method = "GET",
  data?: unknown,
) {
  const response = await fetch(`/api/${path}`, {
    method,
    headers: data ? { "Content-Type": "application/json" } : undefined,
    body: data ? JSON.stringify(data) : undefined,
    cache: "no-store",
  });
  let value: any;
  try {
    value = await response.json();
  } catch {
    throw new Error("Couldn’t reach StashBox. Please try again.");
  }
  if (!response.ok) throw new Error(value.error || "Something went wrong.");
  return value;
}

export function sellerRequest(path: string, method = "GET", data?: unknown) {
  return requestJSON(`seller/${path}`, method, data);
}

export async function uploadMarketPhoto(file: File, kind: string) {
  const blob = await compressPhoto(file, { qr: kind === "qr" });
  const response = await fetch(`/api/market/upload?kind=${kind}`, {
    method: "POST",
    headers: { "Content-Type": blob.type, "X-Photo-Rights": "confirmed" },
    body: blob,
  });
  const value: any = await response.json();
  if (!response.ok) throw new Error(value.error || "Upload failed.");
  return value;
}
