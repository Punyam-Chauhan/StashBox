import type { ImageBucket } from "./object-store";
export const MAX_IMAGE_BYTES = 200000;
export const MAX_STORAGE_BYTES = 250 * 1024 * 1024;
export async function reservePhoto(
  db: D1Database,
  id: string,
  objectKey: string,
  bytes: number,
  limit = MAX_STORAGE_BYTES,
) {
  if (!Number.isSafeInteger(bytes) || bytes < 1 || bytes > MAX_IMAGE_BYTES)
    throw Object.assign(
      new Error("Compressed WebP images must be no larger than 200 KB."),
      { status: 413 },
    );
  const result = await db
    .prepare(
      "INSERT INTO image_storage (id,object_key,byte_size,created_at) SELECT ?,?,?,? WHERE COALESCE((SELECT SUM(byte_size) FROM image_storage),0)+?<=?",
    )
    .bind(id, objectKey, bytes, Date.now(), bytes, limit)
    .run();
  if (!result.meta.changes)
    throw Object.assign(
      new Error(
        "The shared photo storage limit has been reached. You can still list without an image.",
      ),
      { status: 507 },
    );
}
export async function releasePhoto(db: D1Database, id: string) {
  await db.prepare("DELETE FROM image_storage WHERE id=?").bind(id).run();
}
export async function deleteMarketMedia(
  db: D1Database,
  bucket: ImageBucket,
  id: string,
) {
  const media = await db
    .prepare("SELECT object_key FROM market_media WHERE id=?")
    .bind(id)
    .first<{ object_key: string }>();
  if (!media) return;
  await bucket.delete(media.object_key);
  await db.batch([
    db.prepare("DELETE FROM market_media WHERE id=?").bind(id),
    db.prepare("DELETE FROM image_storage WHERE id=?").bind(id),
  ]);
}
export async function pruneUnusedImages(db: D1Database, bucket: ImageBucket) {
  const cutoff = Date.now() - 86400000;
  const stale = (
    await db
      .prepare(
        "SELECT m.id FROM market_media m WHERE m.created_at<? AND ((m.kind='pawn' AND NOT EXISTS(SELECT 1 FROM pawn_listings p WHERE p.photo_id=m.id)) OR (m.kind='qr' AND NOT EXISTS(SELECT 1 FROM users u WHERE u.upi_qr_id=m.id))) LIMIT 12",
      )
      .bind(cutoff)
      .all<{ id: string }>()
  ).results;
  for (const row of stale) await deleteMarketMedia(db, bucket, row.id);
  const orphans = (
    await db
      .prepare(
        "SELECT s.id,s.object_key FROM image_storage s LEFT JOIN packet_photos p ON p.id=s.id LEFT JOIN market_media m ON m.id=s.id WHERE s.created_at<? AND p.id IS NULL AND m.id IS NULL LIMIT 12",
      )
      .bind(cutoff)
      .all<{ id: string; object_key: string }>()
  ).results;
  for (const row of orphans) {
    await bucket.delete(row.object_key);
    await releasePhoto(db, row.id);
  }
}
