import { asciiText, checkContent } from "./content-policy";
export async function manageHostels(
  req: Request,
  path: string,
  db: D1Database,
  actor: { id: string },
  body: () => Promise<any>,
) {
  const json = (d: any, status = 200) =>
    Response.json(d, { status, headers: { "Cache-Control": "no-store" } });
  if (path === "admin/hostels" && req.method === "GET")
    return json({
      hostels: (
        await db
          .prepare(
            "SELECT h.id,h.name,(SELECT COUNT(*) FROM users u WHERE u.hostel=h.id) AS residents FROM campus_hostels h ORDER BY h.created_at,h.id",
          )
          .all()
      ).results,
    });
  const id = path.match(/^admin\/hostels\/([a-z0-9-]{1,80})$/)?.[1];
  if (!id || !["PUT", "DELETE"].includes(req.method))
    return json({ error: "Action not found." }, 404);
  const row = await db
    .prepare("SELECT id,name FROM campus_hostels WHERE id=?")
    .bind(id)
    .first<{ id: string; name: string }>();
  if (!row)
    return json({ error: "Bhawan not found. Refresh and try again." }, 404);
  if (req.method === "DELETE") {
    const count = await db
      .prepare("SELECT COUNT(*) AS n FROM campus_hostels")
      .first<{ n: number }>();
    if (count!.n <= 1)
      return json(
        { error: "Keep at least one bhawan in your campus directory." },
        409,
      );
    const changes = await db.batch([
      db
        .prepare(
          "DELETE FROM campus_hostels WHERE id=? AND NOT EXISTS(SELECT 1 FROM users WHERE hostel=?) AND (SELECT COUNT(*) FROM campus_hostels)>1",
        )
        .bind(id, id),
      db
        .prepare(
          "INSERT INTO audit (id,actor,target,action,created_at) SELECT ?,?,?,'hostel_deleted',? WHERE changes()>0",
        )
        .bind(crypto.randomUUID(), actor.id, id, Date.now()),
    ]);
    if (!changes[0].meta.changes)
      return json(
        {
          error:
            "This bhawan has resident accounts. It can be renamed, but cannot be deleted until those accounts choose another bhawan.",
        },
        409,
      );
    return json({ ok: true });
  }
  const b = await body(),
    name = asciiText(b.name, "Bhawan name", 70);
  checkContent(name);
  if (name.length < 2 || !/[a-z]/i.test(name))
    return json({ error: "Enter a bhawan name." }, 400);
  const short = name.replace(/ (Bhawan|Hostel)$/i, ""),
    initials = short
      .split(/[^a-z0-9]+/i)
      .filter(Boolean)
      .slice(0, 3)
      .map((w) => w[0])
      .join("")
      .toUpperCase();
  try {
    await db.batch([
      db
        .prepare(
          "UPDATE campus_hostels SET name=?,short=?,initials=? WHERE id=?",
        )
        .bind(name, short, initials, id),
      db
        .prepare(
          "INSERT INTO audit (id,actor,target,action,created_at) VALUES (?,?,?,'hostel_renamed',?)",
        )
        .bind(crypto.randomUUID(), actor.id, id, Date.now()),
    ]);
  } catch (e) {
    if (String(e).includes("UNIQUE"))
      return json({ error: "That bhawan name is already in use." }, 409);
    throw e;
  }
  return json({ ok: true });
}
