/** The small object-storage contract used by the app; supports local R2 and private Supabase Storage. */
export interface ImageBucket {
  get(
    key: string,
  ): Promise<{ body: ReadableStream<Uint8Array>; httpEtag: string } | null>;
  put(
    key: string,
    bytes: Uint8Array,
    options: { httpMetadata: { contentType: string } },
  ): Promise<unknown>;
  delete(key: string): Promise<unknown>;
}
export type StorageEnvironment = {
  BUCKET?: ImageBucket;
  STORAGE_PROVIDER?: string;
  SUPABASE_URL?: string;
  SUPABASE_BUCKET?: string;
  SUPABASE_SECRET_KEY?: string;
};
const unavailable = () =>
  Object.assign(
    new Error(
      "Image storage is temporarily unavailable. Please try again later.",
    ),
    { status: 503 },
  );
export function supabaseStorage(
  url: string,
  bucket: string,
  secret: string,
  send: typeof fetch = fetch,
): ImageBucket {
  const origin = new URL(url);
  if (
    origin.protocol !== "https:" ||
    !/^[a-z0-9]+\.supabase\.co$/.test(origin.hostname) ||
    origin.username ||
    origin.password ||
    origin.search ||
    origin.hash ||
    !["", "/"].includes(origin.pathname)
  )
    throw unavailable();
  if (!/^[a-z0-9][a-z0-9_-]{0,99}$/.test(bucket)) throw unavailable();
  // New secret keys use apikey only. JWT service_role keys also need Bearer auth.
  const headers: Record<string, string> = { apikey: secret };
  if (!secret.startsWith("sb_secret_")) {
    try {
      if (JSON.parse(atob(secret.split(".")[1])).role !== "service_role")
        throw Error();
    } catch {
      console.warn(
        "Image storage configuration requires a backend secret key.",
      );
      throw unavailable();
    }
    headers.Authorization = "Bearer " + secret;
  }
  const base = origin.origin + "/storage/v1/object/";
  function objectPath(key: string) {
    const parts = key.split("/");
    if (
      parts.length !== 2 ||
      !["packets", "market"].includes(parts[0]) ||
      !/^[a-f0-9-]{36}$/.test(parts[1])
    )
      throw unavailable();
    return bucket + "/" + parts.map(encodeURIComponent).join("/");
  }
  async function request(path: string, init: RequestInit = {}) {
    try {
      return await send(base + path, {
        ...init,
        headers: { ...headers, ...init.headers },
        // Workers supports manual redirects; non-2xx responses are rejected below.
        redirect: "manual",
        signal: AbortSignal.timeout(15000),
      });
    } catch {
      console.warn("Image storage network request failed.");
      throw unavailable();
    }
  }
  async function failed(response: Response): Promise<never> {
    const error = (await response.json().catch(() => null)) as {
      message?: string;
    } | null;
    const known = [
      "Bucket not found",
      "Invalid API key",
      "Invalid JWT",
      "new row violates row-level security policy",
    ];
    console.warn("Image storage request was rejected.", {
      status: response.status,
      reason: known.includes(error?.message || "")
        ? error!.message
        : "Provider error",
    });
    throw unavailable();
  }
  return {
    async get(key) {
      const response = await request("authenticated/" + objectPath(key));
      if (response.status === 404) {
        await response.body?.cancel();
        return null;
      }
      // Storage also uses a JSON statusCode for missing objects; auth failures must never be mistaken for a miss.
      if (response.status === 400) {
        const value = (await response.json().catch(() => null)) as {
          statusCode?: string;
          error?: string;
        } | null;
        if (value?.statusCode === "404" || value?.error === "not_found")
          return null;
        throw unavailable();
      }
      if (!response.ok || !response.body) return failed(response);
      return {
        body: response.body,
        httpEtag: response.headers.get("etag") || '"' + key.split("/")[1] + '"',
      };
    },
    async put(key, bytes, options) {
      if (
        options.httpMetadata.contentType !== "image/webp" ||
        bytes.byteLength > 200000 ||
        bytes.byteLength < 12
      )
        throw unavailable();
      const response = await request(objectPath(key), {
        method: "POST",
        headers: {
          "Content-Type": "image/webp",
          "x-upsert": "false",
          "cache-control": "no-store",
        },
        body: new Blob([new Uint8Array(bytes)], { type: "image/webp" }),
      });
      if (!response.ok) return failed(response);
      await response.body?.cancel();
    },
    async delete(key) {
      objectPath(key);
      const response = await request(bucket, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prefixes: [key] }),
      });
      if (!response.ok) return failed(response);
      await response.body?.cancel();
    },
  };
}
export function imageBucket(env: StorageEnvironment): ImageBucket | undefined {
  if (env.STORAGE_PROVIDER === "supabase") {
    if (!env.SUPABASE_URL || !env.SUPABASE_BUCKET || !env.SUPABASE_SECRET_KEY)
      return undefined;
    return supabaseStorage(
      env.SUPABASE_URL,
      env.SUPABASE_BUCKET,
      env.SUPABASE_SECRET_KEY,
    );
  }
  return env.BUCKET;
}
