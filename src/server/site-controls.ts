import {
  DEFAULT_SETTINGS,
  MAX_MAINTENANCE_MS,
  parseAliases,
  parseWordlist,
  publicSettings,
  type SiteSettings,
} from "../domain/site-settings";
import { hasPermission } from "../domain/permissions";
export async function readSiteSettings(db: D1Database) {
  const row = await db
    .prepare("SELECT value,revision FROM site_settings WHERE id=1")
    .first<{ value: string; revision: number }>();
  if (!row) throw Error("Site settings are unavailable.");
  return {
    settings: { ...DEFAULT_SETTINGS, ...JSON.parse(row.value) } as SiteSettings,
    revision: row.revision,
  };
}
const json = (data: unknown, status = 200) =>
  Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
export async function siteControls(
  req: Request,
  db: D1Database,
  user: any,
  body: () => Promise<any>,
) {
  if (!user) return json({ error: "Log in to continue." }, 401);
  if (!hasPermission(user, "site"))
    return json({ error: "Maintainer access required." }, 403);
  const { settings, revision } = await readSiteSettings(db);
  if (req.method === "GET")
    return json({ settings, revision, serverNow: Date.now() });
  if (req.method !== "PUT") return json({ error: "Method not allowed." }, 405);
  const b = await body();
  if (b.revision !== revision)
    return json(
      { error: "Settings changed in another tab. Reload before saving." },
      409,
    );
  const next = { ...settings };
  let action = "";
  try {
    if (b.section === "availability") {
      for (const key of [
        "pawnEnabled",
        "signupEnabled",
        "uploadsEnabled",
        "demoEnabled",
      ] as const) {
        if (typeof b[key] !== "boolean")
          throw Error("Choose an option for every availability control.");
        next[key] = b[key];
      }
      action = "availability_updated";
    } else if (b.section === "maintenance") {
      if (!["start", "stop"].includes(b.action))
        throw Error("Choose start or end maintenance.");
      if (b.action === "start" && settings.maintenanceUntil > Date.now())
        throw Error(
          "Maintenance is already active. End it before starting a new window.",
        );
      next.maintenanceUntil =
        b.action === "start" ? Date.now() + MAX_MAINTENANCE_MS : 0;
      if (typeof b.message !== "string" || b.message.trim().length > 240)
        throw Error("Keep the maintenance message within 240 characters.");
      next.maintenanceMessage =
        b.message.trim() || DEFAULT_SETTINGS.maintenanceMessage;
      action =
        b.action === "start" ? "maintenance_started" : "maintenance_ended";
    } else if (b.section === "wordlists") {
      if (typeof b.blockedText !== "string" || typeof b.aliasText !== "string")
        throw Error("Upload or enter both wordlists.");
      next.blockedWords = parseWordlist(b.blockedText);
      next.searchAliases = parseAliases(b.aliasText);
      action = "wordlists_updated";
    } else if (b.section === "announcement") {
      if (
        typeof b.announcement !== "string" ||
        b.announcement.trim().length > 240
      )
        throw Error("Keep the announcement within 240 characters.");
      next.announcement = b.announcement.trim();
      action = "announcement_updated";
    } else throw Error("Choose a settings section.");
  } catch (e) {
    return json({ error: (e as Error).message }, 400);
  }
  const result = await db.batch([
    db
      .prepare(
        "UPDATE site_settings SET value=?,revision=revision+1,updated_at=? WHERE id=1 AND revision=?",
      )
      .bind(JSON.stringify(next), Date.now(), revision),
    db
      .prepare(
        "INSERT INTO audit (id,actor,target,action,created_at) SELECT ?,?,'site',?,? WHERE changes()=1",
      )
      .bind(crypto.randomUUID(), user.id, action, Date.now()),
  ]);
  if (!result[0].meta.changes)
    return json(
      { error: "Settings changed in another tab. Reload before saving." },
      409,
    );
  return json({
    settings: next,
    revision: revision + 1,
    serverNow: Date.now(),
  });
}
export function publicSiteResponse(settings: SiteSettings) {
  return json({ settings: publicSettings(settings), serverNow: Date.now() });
}
export async function siteActivity(db: D1Database, user: any) {
  if (!user) return json({ error: "Log in to continue." }, 401);
  if (!hasPermission(user, "activity"))
    return json({ error: "Maintainer access required." }, 403);
  const entries = (
    await db
      .prepare(
        "SELECT a.id,a.action,a.target,a.created_at,u.name AS actor FROM audit a LEFT JOIN users u ON u.id=a.actor ORDER BY a.created_at DESC LIMIT 100",
      )
      .all()
  ).results;
  return json({ entries });
}
