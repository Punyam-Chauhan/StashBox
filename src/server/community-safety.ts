import {
  hasPermission,
  permissionsOf,
  STAFF_PERMISSIONS,
  validStudentId,
} from "../domain/permissions";
import { asciiText } from "./content-policy";
import type { ImageBucket } from "./object-store";
import { deleteMarketMedia } from "./image-storage";
const json = (data: unknown, status = 200) =>
  Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
const error = (message: string, status = 400) =>
  json({ error: message }, status);
const validId = (value: unknown): value is string =>
  typeof value === "string" && /^[a-f0-9-]{36}$/.test(value);
export const REPORT_REASONS = [
  "Scam or misleading price",
  "Wrong or unavailable item",
  "Prohibited item",
  "Harassment or unsafe behaviour",
  "Other",
];
type Context = {
  db: D1Database;
  bucket?: ImageBucket;
  user: any;
  body: () => Promise<any>;
};
export async function removeStudent(
  db: D1Database,
  bucket: ImageBucket | undefined,
  actor: any,
  id: string,
  confirmation: string,
) {
  if (!hasPermission(actor, "delete_accounts"))
    return error("Account deletion permission required.", 403);
  if (!validId(id) || typeof confirmation !== "string")
    return error("Choose an account and confirm its student ID.");
  const target = await db
    .prepare("SELECT id,role,student_id FROM users WHERE id=?")
    .bind(id)
    .first<any>();
  if (!target) return error("Account not found.", 404);
  if (id === actor.id || target.role !== "seller")
    return error(
      "Your account and staff accounts are protected. Remove a Vice-Maintainer role before deleting that account.",
      403,
    );
  if (confirmation !== target.student_id)
    return error("Enter this account's student ID to confirm deletion.");
  const media = (
    await db
      .prepare("SELECT id FROM market_media WHERE owner_id=?")
      .bind(id)
      .all<{ id: string }>()
  ).results;
  if (media.length && !bucket)
    return error("Image storage is unavailable. No account was deleted.", 503);
  // Hide and revoke first so a partial storage failure cannot leave an active, half-deleted account.
  const locked = await db
    .prepare(
      "UPDATE users SET is_open=0,shop_sleeping=1,deletion_pending=1,upi_qr_id=NULL WHERE id=? AND role='seller'",
    )
    .bind(id)
    .run();
  if (!locked.meta.changes)
    return error(
      "This account became a staff account. Reload before continuing.",
      409,
    );
  await db.batch([
    db
      .prepare("UPDATE packet_photos SET uploaded_by=NULL WHERE uploaded_by=?")
      .bind(id),
    db.prepare("DELETE FROM sessions WHERE user_id=?").bind(id),
    db
      .prepare("UPDATE pawn_listings SET available=0 WHERE seller_id=?")
      .bind(id),
  ]);
  for (const item of media) await deleteMarketMedia(db, bucket!, item.id);
  await db.batch([
    db
      .prepare(
        "DELETE FROM users WHERE id=? AND role='seller' AND deletion_pending=1",
      )
      .bind(id),
    db
      .prepare(
        "INSERT INTO audit(id,actor,target,action,created_at) VALUES (?,?,?,'account_deleted',?)",
      )
      .bind(crypto.randomUUID(), actor.id, id, Date.now()),
  ]);
  return json({ ok: true });
}
export async function communitySafety(
  req: Request,
  path: string,
  { db, bucket, user, body }: Context,
): Promise<Response | null> {
  if (
    [
      "admin/account-role",
      "admin/account-id",
      "admin/account",
      "admin/account-block",
    ].includes(path)
  ) {
    const data = await body();
    if (!validId(data.userId)) return error("Choose a valid account.");
    body = async () => data;
  }
  if (path === "reports" && req.method === "POST") {
    if (!user || user.must_change_password)
      return error("Log in with your own password to send a report.", 401);
    const b = await body();
    if (
      !["snack", "pawn", "stasher"].includes(b.kind) ||
      !REPORT_REASONS.includes(b.reason)
    )
      return error("Choose what you are reporting and a reason.");
    let targetId = b.targetId;
    if (b.kind === "stasher" && typeof b.username === "string") {
      const account = await db
        .prepare("SELECT id FROM users WHERE lower(username)=?")
        .bind(b.username.trim().toLowerCase().replace(/^@/, ""))
        .first<any>();
      targetId = account?.id;
    }
    if (typeof targetId !== "string" || !/^[a-f0-9-]{36}$/.test(targetId))
      return error(
        "Enter an existing Stasher username or choose a listing.",
        404,
      );
    const details = asciiText(b.details, "What happened", 1000);
    if (details.length < 10)
      return error("Please explain what happened in at least 10 characters.");
    const query =
      b.kind === "stasher"
        ? "SELECT id AS owner,name || ' (@' || username || ')' AS label FROM users WHERE id=?"
        : b.kind === "snack"
          ? "SELECT seller_id AS owner,name AS label FROM listings WHERE id=?"
          : "SELECT seller_id AS owner,title AS label FROM pawn_listings WHERE id=?";
    const target = await db.prepare(query).bind(targetId).first<any>();
    if (!target)
      return error("This listing or Stasher is no longer available.", 404);
    if (target.owner === user.id)
      return error("You cannot report your own listing or account.");
    const id = crypto.randomUUID(),
      now = Date.now();
    try {
      await db
        .prepare(
          "INSERT INTO reports(id,reporter_id,target_kind,target_id,target_label,reason,details,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)",
        )
        .bind(
          id,
          user.id,
          b.kind,
          targetId,
          target.label,
          b.reason,
          details,
          now,
          now,
        )
        .run();
    } catch (e) {
      if (String(e).includes("UNIQUE"))
        return error(
          "You already have an open report for this item. A Maintainer will review it.",
          409,
        );
      throw e;
    }
    return json({ ok: true, id });
  }
  if (path === "admin/reports") {
    if (!hasPermission(user, "reports"))
      return error("Report review permission required.", 403);
    if (req.method === "GET")
      return json({
        reports: (
          await db
            .prepare(
              "SELECT r.*,u.name AS reporter_name,u.student_id AS reporter_student_id FROM reports r LEFT JOIN users u ON u.id=r.reporter_id ORDER BY CASE WHEN r.status='open' THEN 0 ELSE 1 END,r.created_at DESC LIMIT 200",
            )
            .all()
        ).results,
      });
    if (req.method !== "PUT") return error("Method not allowed.", 405);
    const b = await body();
    if (
      !["resolved", "dismissed", "open"].includes(b.status) ||
      typeof b.id !== "string"
    )
      return error("Choose a report and review status.");
    const note = asciiText(b.resolution || "", "Review note", 600, false);
    if (b.status !== "open" && note.length < 5)
      return error("Add a short review note before closing the report.");
    try {
      const results = await db.batch([
        db
          .prepare(
            "UPDATE reports SET status=?,resolution=?,reviewed_by=?,updated_at=? WHERE id=?",
          )
          .bind(b.status, note, user.id, Date.now(), b.id),
        db
          .prepare(
            "INSERT INTO audit(id,actor,target,action,created_at) SELECT ?,?,?,?,? WHERE changes()=1",
          )
          .bind(
            crypto.randomUUID(),
            user.id,
            b.id,
            "report_" + b.status,
            Date.now(),
          ),
      ]);
      if (!results[0].meta.changes) return error("Report not found.", 404);
    } catch (e) {
      if (String(e).includes("UNIQUE"))
        return error(
          "Another open report already exists for this reporter and target.",
          409,
        );
      throw e;
    }
    return json({ ok: true });
  }
  if (path === "admin/notifications" || path === "admin/notifications/read") {
    if (!hasPermission(user, "notifications"))
      return error("Notification permission required.", 403);
    const kinds = [
      ...(hasPermission(user, "accounts") ? ["account"] : []),
      ...(hasPermission(user, "listings") ? ["listing"] : []),
      ...(hasPermission(user, "catalogue") ? ["product"] : []),
      ...(hasPermission(user, "reports") ? ["report"] : []),
    ];
    if (!kinds.length) return json({ notifications: [], unread: 0 });
    const marks = kinds.map(() => "?").join(",");
    if (path.endsWith("/read") && req.method === "POST") {
      const b = await body();
      if (
        !Array.isArray(b.ids) ||
        b.ids.length > 50 ||
        b.ids.some((id: unknown) => !Number.isSafeInteger(id))
      )
        return error("Choose up to 50 notifications.");
      if (b.ids.length)
        await db.batch(
          b.ids.map((id: number) =>
            db
              .prepare(
                `INSERT OR IGNORE INTO staff_notification_reads(notification_id,user_id) SELECT id,? FROM staff_notifications WHERE id=? AND kind IN (${marks})`,
              )
              .bind(user.id, id, ...kinds),
          ),
        );
      return json({ ok: true });
    }
    if (req.method !== "GET") return error("Method not allowed.", 405);
    const notifications = (
      await db
        .prepare(
          `SELECT n.*,CASE WHEN r.notification_id IS NULL THEN 0 ELSE 1 END AS is_read FROM staff_notifications n LEFT JOIN staff_notification_reads r ON r.notification_id=n.id AND r.user_id=? WHERE n.kind IN (${marks}) ORDER BY n.id DESC LIMIT 50`,
        )
        .bind(user.id, ...kinds)
        .all()
    ).results;
    const count = await db
      .prepare(
        `SELECT COUNT(*) AS n FROM staff_notifications n WHERE n.kind IN (${marks}) AND NOT EXISTS(SELECT 1 FROM staff_notification_reads r WHERE r.notification_id=n.id AND r.user_id=?)`,
      )
      .bind(...kinds, user.id)
      .first<any>();
    return json({ notifications, unread: count.n });
  }
  if (path === "admin/account-role" && req.method === "PUT") {
    if (!hasPermission(user, "manage_staff"))
      return error("Vice-Maintainer management permission required.", 403);
    const b = await body();
    if (
      !["seller", "vice"].includes(b.role) ||
      !Array.isArray(b.permissions) ||
      b.permissions.some(
        (p: unknown) => !STAFF_PERMISSIONS.some(([key]) => key === p),
      )
    )
      return error("Choose a role and valid permissions.");
    const permissions = [...new Set(b.permissions)] as string[];
    if (
      user.role !== "admin" &&
      permissions.some((p) => !hasPermission(user, p as any))
    )
      return error("You can only delegate permissions you already hold.", 403);
    if (b.role === "vice" && !permissions.length)
      return error("Select at least one permission.");
    if (
      permissions.some((p) =>
        [
          "reset_access",
          "delete_accounts",
          "block_accounts",
          "manage_staff",
          "edit_identity",
        ].includes(p),
      ) &&
      !permissions.includes("accounts")
    )
      return error("Account actions also require View accounts.");
    const target = await db
      .prepare(
        "SELECT id,role,permissions,deletion_pending,blocked FROM users WHERE id=?",
      )
      .bind(b.userId)
      .first<any>();
    if (!target) return error("Account not found.", 404);
    if (target.role === "admin" || target.id === user.id)
      return error("The primary Maintainer role is protected.", 403);
    if (
      user.role !== "admin" &&
      permissionsOf(target).some((p) => !hasPermission(user, p as any))
    )
      return error(
        "You cannot change staff who hold permissions you do not have.",
        403,
      );
    if (target.deletion_pending)
      return error(
        "An account pending deletion cannot receive a staff role.",
        409,
      );
    if (target.blocked && b.role === "vice")
      return error("Unblock this account before assigning a staff role.", 409);
    const result = await db.batch([
      db
        .prepare(
          "UPDATE users SET role=?,permissions=? WHERE id=? AND role!='admin' AND deletion_pending=0",
        )
        .bind(
          b.role,
          JSON.stringify(b.role === "vice" ? permissions : []),
          target.id,
        ),
      db.prepare("DELETE FROM sessions WHERE user_id=?").bind(target.id),
      db
        .prepare(
          "INSERT INTO audit(id,actor,target,action,created_at) VALUES (?,?,?,'account_role_updated',?)",
        )
        .bind(crypto.randomUUID(), user.id, target.id, Date.now()),
    ]);
    if (!result[0].meta.changes)
      return error("The account changed. Reload before assigning a role.", 409);
    return json({ ok: true });
  }
  if (path === "admin/account-id" && req.method === "PUT") {
    if (!hasPermission(user, "edit_identity"))
      return error("Identity correction permission required.", 403);
    const b = await body();
    if (!validStudentId(b.studentId))
      return error("Student ID must contain exactly five digits.");
    const target = await db
      .prepare("SELECT role FROM users WHERE id=?")
      .bind(b.userId)
      .first<any>();
    if (target?.role === "admin" && user.role !== "admin")
      return error("The primary Maintainer account is protected.", 403);
    try {
      const result = await db
        .prepare("UPDATE users SET student_id=? WHERE id=?")
        .bind(b.studentId, b.userId)
        .run();
      if (!result.meta.changes) return error("Account not found.", 404);
    } catch (e) {
      if (String(e).includes("UNIQUE"))
        return error("That student ID is already registered.", 409);
      throw e;
    }
    await db
      .prepare(
        "INSERT INTO audit(id,actor,target,action,created_at) VALUES (?,?,?,'student_id_corrected',?)",
      )
      .bind(crypto.randomUUID(), user.id, b.userId, Date.now())
      .run();
    return json({ ok: true });
  }
  if (path === "admin/account" && req.method === "DELETE") {
    const b = await body();
    return removeStudent(db, bucket, user, b.userId, b.confirmation);
  }
  if (path === "admin/account-block" && req.method === "PUT") {
    if (!hasPermission(user, "block_accounts"))
      return error("Seller suspension permission required.", 403);
    const b = await body();
    if (typeof b.blocked !== "boolean")
      return error("Choose suspend or unblock.");
    const reason = asciiText(b.reason || "", "Suspension reason", 400, false);
    if (b.blocked && reason.length < 10)
      return error("Explain the suspension in at least 10 characters.");
    const target = await db
      .prepare("SELECT id,role FROM users WHERE id=?")
      .bind(b.userId)
      .first<any>();
    if (!target) return error("Account not found.", 404);
    if (target.role !== "seller" || target.id === user.id)
      return error(
        "Staff accounts and your own account are protected. Remove the staff role first.",
        403,
      );
    await db.batch([
      db
        .prepare(
          "UPDATE users SET blocked=?,blocked_reason=?,is_open=CASE WHEN ?=1 THEN 0 ELSE is_open END,shop_sleeping=CASE WHEN ?=1 THEN 1 ELSE shop_sleeping END WHERE id=? AND role='seller'",
        )
        .bind(
          b.blocked ? 1 : 0,
          b.blocked ? reason : "",
          b.blocked ? 1 : 0,
          b.blocked ? 1 : 0,
          target.id,
        ),
      db.prepare("DELETE FROM sessions WHERE user_id=?").bind(target.id),
      db
        .prepare(
          "INSERT INTO audit(id,actor,target,action,created_at) VALUES (?,?,?,?,?)",
        )
        .bind(
          crypto.randomUUID(),
          user.id,
          target.id,
          b.blocked ? "seller_suspended" : "seller_unblocked",
          Date.now(),
        ),
    ]);
    return json({ ok: true });
  }
  return null;
}
