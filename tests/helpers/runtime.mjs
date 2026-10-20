import { Miniflare, convertV4MiniflareOptions } from "miniflare";

export function createTestRuntime(options = {}) {
  return new Miniflare(
    convertV4MiniflareOptions({
      modules: true,
      script: 'export default {fetch(){return new Response("test")}}',
      d1Databases: ["DB"],
      compatibilityDate: "2026-05-15",
      ...options,
    }),
  );
}
