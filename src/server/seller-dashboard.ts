import {
  calculateBook,
  todayIST,
  type LedgerEntry,
} from "../domain/bookkeeping";
import { asciiDisplay, asciiText, checkContent } from "./content-policy";
type Context = { db: D1Database; user: any; body: () => Promise<any> };
export async function sellerDashboard(
  req: Request,
  path: string,
  { db, user, body }: Context,
): Promise<Response | null> {
  if (!path.startsWith("seller/")) return null;
  const json = (v: any, status = 200) =>
    Response.json(v, {
      status,
      headers: {
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  if (!user)
    return json({ error: "Log in to open your private dashboard." }, 401);
  if (user.must_change_password)
    return json({ error: "Set your own password first." }, 403);
  if (path === "seller/shutter" && req.method === "POST") {
    const b = await body();
    if (typeof b.sleeping !== "boolean")
      return json({ error: "Choose whether your shop is open." }, 400);
    if (!b.sleeping && b.confirmStock !== true)
      return json(
        {
          error:
            "Confirm that your stock and prices are current before reopening.",
        },
        400,
      );
    await db
      .prepare(
        "UPDATE users SET shop_sleeping=?,is_open=?,confirmed_at=CASE WHEN ?=1 THEN ? ELSE confirmed_at END WHERE id=?",
      )
      .bind(
        b.sleeping ? 1 : 0,
        b.sleeping ? 0 : 1,
        b.sleeping ? 0 : 1,
        Date.now(),
        user.id,
      )
      .run();
    return json({ ok: true });
  }
  if (path === "seller/book" && req.method === "GET") {
    const entries = (
      await db
        .prepare(
          "SELECT id,product_key,name,kind,quantity,unit_price,entry_date,notes,created_at FROM seller_ledger WHERE seller_id=? ORDER BY entry_date,created_at,id LIMIT 5000",
        )
        .bind(user.id)
        .all<LedgerEntry>()
    ).results;
    const snacks = (
      await db
        .prepare(
          "SELECT product_key,name,mrp,container,volume_ml,price FROM listings WHERE seller_id=?",
        )
        .bind(user.id)
        .all<any>()
    ).results;
    const pawn = (
      await db
        .prepare("SELECT id,title,price FROM pawn_listings WHERE seller_id=?")
        .bind(user.id)
        .all<any>()
    ).results;
    return json({
      entries,
      choices: [
        ...snacks.map((p) => ({
          key: p.product_key,
          name:
            asciiDisplay(p.name) +
            (p.mrp ? ` - MRP Rs ${p.mrp / 100}` : "") +
            (p.container ? ` - ${p.container} ${p.volume_ml} ml` : ""),
          price: p.price,
        })),
        ...pawn.map((p) => ({
          key: "pawn:" + p.id,
          name: asciiDisplay(p.title),
          price: p.price,
        })),
      ],
    });
  }
  const entryId = path.match(/^seller\/book\/([a-z0-9-]{36})$/)?.[1];
  if (
    (path === "seller/book" && req.method === "POST") ||
    (entryId && ["PUT", "DELETE"].includes(req.method))
  ) {
    await db
      .prepare(
        "INSERT OR IGNORE INTO seller_books (seller_id,revision) VALUES (?,0)",
      )
      .bind(user.id)
      .run();
    const version = await db
      .prepare("SELECT revision FROM seller_books WHERE seller_id=?")
      .bind(user.id)
      .first<{ revision: number }>();
    const entries = (
      await db
        .prepare(
          "SELECT * FROM seller_ledger WHERE seller_id=? ORDER BY entry_date,created_at,id LIMIT 5001",
        )
        .bind(user.id)
        .all<LedgerEntry>()
    ).results;
    const existing = entryId ? entries.find((e) => e.id === entryId) : null;
    if (entryId && !existing)
      return json({ error: "Record not found in your private book." }, 404);
    if (!entryId && entries.length >= 5000)
      return json(
        {
          error:
            "The private book supports 5,000 records. Export older records before contacting support.",
        },
        400,
      );
    let entry: LedgerEntry | null = null;
    if (req.method !== "DELETE") {
      const b = await body();
      let name = "",
        key = String(b.productKey || "");
      const old = entries.find((e) => e.product_key === key);
      if (old) {
        name = old.name;
      } else if (key.startsWith("pawn:")) {
        const p = await db
          .prepare("SELECT title FROM pawn_listings WHERE id=? AND seller_id=?")
          .bind(key.slice(5), user.id)
          .first<any>();
        if (!p) return json({ error: "Choose one of your own items." }, 400);
        name = asciiDisplay(p.title);
      } else if (key && !key.startsWith("custom:")) {
        const p = await db
          .prepare(
            "SELECT name,mrp,container,volume_ml FROM listings WHERE product_key=? AND seller_id=?",
          )
          .bind(key, user.id)
          .first<any>();
        if (!p) return json({ error: "Choose one of your own products." }, 400);
        name =
          asciiDisplay(p.name) +
          (p.mrp ? ` - MRP Rs ${p.mrp / 100}` : "") +
          (p.container ? ` - ${p.container} ${p.volume_ml} ml` : "");
      } else {
        name = asciiText(b.name, "Product name", 120);
        key =
          "custom:" +
          name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, " ")
            .trim();
      }
      const notes = asciiText(b.notes ?? "", "Notes", 200, false);
      checkContent(name, notes);
      if (
        !["purchase", "sale"].includes(b.kind) ||
        !Number.isInteger(b.quantity) ||
        b.quantity < 1 ||
        b.quantity > 10000 ||
        !Number.isInteger(b.unitPrice) ||
        b.unitPrice < 0 ||
        b.unitPrice > 5000000 ||
        (b.kind === "sale" && b.unitPrice === 0)
      )
        return json(
          {
            error:
              "Enter a quantity of 1 to 10,000 and a valid per-item amount (up to Rs 50,000).",
          },
          400,
        );
      const date = b.date;
      if (
        typeof date !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
        !Number.isFinite(Date.parse(date + "T12:00:00Z")) ||
        new Date(date + "T12:00:00Z").toISOString().slice(0, 10) !== date ||
        date > todayIST() ||
        date < "2020-01-01"
      )
        return json(
          { error: "Choose a valid date from 2020 through today (IST)." },
          400,
        );
      entry = {
        id: existing?.id || crypto.randomUUID(),
        product_key: key,
        name,
        kind: b.kind,
        quantity: b.quantity,
        unit_price: b.unitPrice,
        entry_date: date,
        notes,
        created_at: existing?.created_at || Date.now(),
      };
    }
    calculateBook([
      ...entries.filter((e) => e.id !== entryId),
      ...(entry ? [entry] : []),
    ]);
    const rev = version!.revision;
    let statement: D1PreparedStatement;
    if (req.method === "DELETE")
      statement = db
        .prepare(
          "DELETE FROM seller_ledger WHERE id=? AND seller_id=? AND (SELECT revision FROM seller_books WHERE seller_id=?)=?",
        )
        .bind(entryId, user.id, user.id, rev);
    else if (existing)
      statement = db
        .prepare(
          "UPDATE seller_ledger SET product_key=?,name=?,kind=?,quantity=?,unit_price=?,entry_date=?,notes=? WHERE id=? AND seller_id=? AND (SELECT revision FROM seller_books WHERE seller_id=?)=?",
        )
        .bind(
          entry!.product_key,
          entry!.name,
          entry!.kind,
          entry!.quantity,
          entry!.unit_price,
          entry!.entry_date,
          entry!.notes,
          entryId,
          user.id,
          user.id,
          rev,
        );
    else
      statement = db
        .prepare(
          "INSERT INTO seller_ledger (id,seller_id,product_key,name,kind,quantity,unit_price,entry_date,notes,created_at) SELECT ?,?,?,?,?,?,?,?,?,? WHERE (SELECT revision FROM seller_books WHERE seller_id=?)=?",
        )
        .bind(
          entry!.id,
          user.id,
          entry!.product_key,
          entry!.name,
          entry!.kind,
          entry!.quantity,
          entry!.unit_price,
          entry!.entry_date,
          entry!.notes,
          entry!.created_at,
          user.id,
          rev,
        );
    const result = await db.batch([
      statement,
      db
        .prepare(
          "UPDATE seller_books SET revision=revision+1 WHERE seller_id=? AND revision=?",
        )
        .bind(user.id, rev),
    ]);
    if (!result[0].meta.changes)
      return json(
        { error: "Your book changed in another tab. Refresh and try again." },
        409,
      );
    return json({ ok: true });
  }
  return null;
}
