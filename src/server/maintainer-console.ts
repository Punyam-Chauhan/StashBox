import type { ImageBucket } from "./object-store";
import { checkContent } from "./content-policy";
import { libraryPhoto, photoGroup } from "../domain/packet-library";
import {
  deleteMarketMedia,
  MAX_IMAGE_BYTES,
  MAX_STORAGE_BYTES,
  releasePhoto,
} from "./image-storage";
import { photoService } from "./packet-photos";
type Context = {
  db: D1Database;
  bucket: ImageBucket;
  user: any;
  body: () => Promise<any>;
};
export async function maintainerConsole(
  req: Request,
  path: string,
  { db, bucket, user, body }: Context,
) {
  const json = (v: any, status = 200) =>
    Response.json(v, { status, headers: { "Cache-Control": "no-store" } });
  if (!user) return json({ error: "Log in to continue." }, 401);
  if (user.role !== "admin" || user.must_change_password)
    return json({ error: "Maintainer access required." }, 403);
  const pawnOnly = path === "pawn/admin/review",
    stashOnly =
      !pawnOnly && new URL(req.url).searchParams.get("market") === "stashbox",
    service = photoService(db, bucket);
  const audit = (target: string, action: string) =>
    db
      .prepare(
        "INSERT INTO audit (id,actor,target,action,created_at) VALUES (?,?,?,?,?)",
      )
      .bind(crypto.randomUUID(), user.id, target, action, Date.now())
      .run();
  if (req.method === "GET") {
    let snacks: any[] = [],
      products: any[] = [],
      photos: any[] = [],
      pawn: any[] = [];
    if (!pawnOnly) {
      snacks = await service.decorate(
        (
          await db
            .prepare(
              `SELECT l.*,u.name AS seller_name,u.hostel,u.wing,COALESCE(u.room_label,CAST(u.room AS TEXT)) AS room,p.id AS photo_id,p.source AS photo_source FROM listings l JOIN users u ON u.id=l.seller_id LEFT JOIN packet_photos p ON p.id=l.photo_id ORDER BY l.updated_at DESC LIMIT 200`,
            )
            .all<any>()
        ).results,
        true,
      );
      photos = (
        await db
          .prepare(
            "SELECT p.*,u.name AS seller_name FROM packet_photos p LEFT JOIN users u ON u.id=p.uploaded_by ORDER BY p.created_at DESC LIMIT 200",
          )
          .all()
      ).results;
      const metadata = (
        await db.prepare("SELECT * FROM product_catalog").all<any>()
      ).results;
      const byGroup = new Map(metadata.map((p) => [p.product_group, p]));
      products = await service.decorate(
        (await service.directory(true)).map((p) => ({
          ...p,
          product_group: photoGroup(p.name, p.category),
          moderation_status: "approved",
          created_at: null,
          ...byGroup.get(photoGroup(p.name, p.category)),
        })),
        true,
      );
    }
    if (!stashOnly)
      pawn = (
        await db
          .prepare(
            `SELECT p.*,u.name AS seller_name,u.hostel,u.wing,COALESCE(u.room_label,CAST(u.room AS TEXT)) AS room FROM pawn_listings p JOIN users u ON u.id=p.seller_id ORDER BY p.created_at DESC LIMIT 200`,
          )
          .all()
      ).results;
    const qrs = (
      await db
        .prepare(
          "SELECT m.*,u.name AS seller_name FROM market_media m JOIN users u ON u.id=m.owner_id AND u.upi_qr_id=m.id WHERE m.kind='qr' ORDER BY m.created_at DESC LIMIT 100",
        )
        .all()
    ).results;
    const storage = await db
      .prepare(
        "SELECT COALESCE(SUM(byte_size),0) AS used,COUNT(*) AS files FROM image_storage",
      )
      .first();
    return json({
      storage: {
        ...storage,
        limit: MAX_STORAGE_BYTES,
        max_photo: MAX_IMAGE_BYTES,
      },
      snacks: snacks.map((s) => ({
        ...s,
        missing_photo: !s.photo_id,
        user_photo: s.photo_source === "seller",
      })),
      products: products.map((p) => ({ ...p, missing_photo: !p.photo_id })),
      photos,
      pawn,
      qrs,
    });
  }
  if (!["PUT", "DELETE"].includes(req.method))
    return json({ error: "Action not supported." }, 405);
  const b = await body();
  const config: Record<string, [string, string, string]> = {
    snack: ["listings", "moderation_status", "id"],
    product: ["product_catalog", "moderation_status", "product_group"],
    photo: ["packet_photos", "review_status", "id"],
    pawn: ["pawn_listings", "status", "id"],
    qr: ["market_media", "status", "id"],
  };
  if (
    !config[b.kind] ||
    typeof b.id !== "string" ||
    (pawnOnly && !["pawn", "qr"].includes(b.kind)) ||
    (stashOnly && b.kind === "pawn")
  )
    return json({ error: "Choose an item from this marketplace." }, 400);
  const [table, status, key] = config[b.kind];
  let row = await db
    .prepare(`SELECT * FROM ${table} WHERE ${key}=?`)
    .bind(b.id)
    .first<any>();
  if (!row && b.kind === "product") {
    const product = (await service.directory(true)).find(
      (p) => photoGroup(p.name, p.category) === b.id,
    );
    if (product) {
      await service.register(product.name, product.category);
      row = await db
        .prepare("SELECT * FROM product_catalog WHERE product_group=?")
        .bind(b.id)
        .first<any>();
    }
  }
  if (row?.moderation_status === "renamed")
    return json(
      {
        error:
          "This product has been renamed. Manage its current catalogue entry.",
      },
      409,
    );
  if (!row)
    return json({ error: "Item no longer exists. Refresh this section." }, 404);
  if (b.kind === "qr" && row.kind !== "qr")
    return json({ error: "Choose a payment code." }, 400);
  if (req.method === "DELETE") {
    if (b.kind === "product") {
      await db.batch([
        db
          .prepare(
            "UPDATE product_catalog SET moderation_status='removed' WHERE product_group=?",
          )
          .bind(b.id),
        db
          .prepare(
            "UPDATE listings SET moderation_status='catalog_removed' WHERE name=? AND category=? AND moderation_status='approved'",
          )
          .bind(row.name, row.category),
      ]);
    } else if (b.kind === "snack")
      await db.prepare("DELETE FROM listings WHERE id=?").bind(b.id).run();
    else if (b.kind === "pawn") {
      await db.prepare("DELETE FROM pawn_listings WHERE id=?").bind(b.id).run();
      if (
        row.photo_id &&
        !(await db
          .prepare("SELECT id FROM pawn_listings WHERE photo_id=?")
          .bind(row.photo_id)
          .first())
      )
        await deleteMarketMedia(db, bucket, row.photo_id);
    } else if (b.kind === "qr") {
      await db
        .prepare("UPDATE users SET upi_qr_id=NULL WHERE upi_qr_id=?")
        .bind(b.id)
        .run();
      await deleteMarketMedia(db, bucket, b.id);
    } else if (b.kind === "photo") {
      await db.batch([
        db
          .prepare("DELETE FROM product_photo_defaults WHERE photo_id=?")
          .bind(b.id),
        db
          .prepare("UPDATE listings SET photo_id=NULL WHERE photo_id=?")
          .bind(b.id),
        db.prepare("DELETE FROM packet_cache WHERE photo_id=?").bind(b.id),
        db.prepare("DELETE FROM packet_photos WHERE id=?").bind(b.id),
      ]);
      if (row.product_group && !libraryPhoto(row.matched_name)) {
        const replacement = await db
          .prepare(
            "SELECT id FROM packet_photos WHERE product_group=? AND review_status='approved' ORDER BY created_at DESC LIMIT 1",
          )
          .bind(row.product_group)
          .first<{ id: string }>();
        if (replacement)
          await service.selectDefault(
            row.matched_name,
            row.category,
            replacement.id,
            user.id,
          );
      }
      await bucket.delete(row.object_key);
      await releasePhoto(db, b.id);
    }
    await audit(b.id, `delete_${b.kind}`);
    return json({ ok: true });
  }
  if (!["approved", "rejected"].includes(b.status))
    return json({ error: "Choose hide or restore." }, 400);
  if (b.status === "approved")
    checkContent(
      row.name || row.title || row.matched_name || "",
      row.description || "",
      row.offer_text || "",
    );
  if (b.kind === "snack" && b.status === "approved") {
    const product = await db
      .prepare(
        "SELECT moderation_status FROM product_catalog WHERE name=? AND category=?",
      )
      .bind(row.name, row.category)
      .first<any>();
    if (product && product.moderation_status !== "approved")
      return json(
        {
          error: "Restore the catalogue product before restoring its listings.",
        },
        400,
      );
  }
  await db
    .prepare(`UPDATE ${table} SET ${status}=? WHERE ${key}=?`)
    .bind(b.status, b.id)
    .run();
  if (b.kind === "product") {
    if (b.status === "approved")
      await db
        .prepare(
          "UPDATE listings SET moderation_status='approved' WHERE name=? AND category=? AND moderation_status='catalog_removed'",
        )
        .bind(row.name, row.category)
        .run();
    else
      await db
        .prepare(
          "UPDATE listings SET moderation_status='catalog_removed' WHERE name=? AND category=? AND moderation_status='approved'",
        )
        .bind(row.name, row.category)
        .run();
  }

  if (b.kind === "photo" && b.status === "rejected")
    await db
      .prepare("DELETE FROM product_photo_defaults WHERE photo_id=?")
      .bind(b.id)
      .run();
  if (b.kind === "pawn" && row.photo_id)
    await db
      .prepare("UPDATE market_media SET status=? WHERE id=?")
      .bind(b.status, row.photo_id)
      .run();
  await audit(b.id, `review_${b.kind}_${b.status}`);
  return json({ ok: true });
}
