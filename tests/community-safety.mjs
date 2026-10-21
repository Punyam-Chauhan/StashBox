import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { createTestRuntime } from "./helpers/runtime.mjs";
import { importTypeScript } from "./helpers/import-typescript.mjs";
const { communitySafety, removeStudent } = await importTypeScript(
  "src/server/community-safety.ts",
);
const { STAFF_PERMISSIONS, validStudentId, validUsername } =
  await importTypeScript("src/domain/permissions.ts");
const mf = createTestRuntime();
let checks = 0;
const check = (actual, expected) => {
  assert.deepEqual(actual, expected);
  checks++;
};
try {
  const db = await mf.getD1Database("DB");
  for (const file of readdirSync("drizzle")
    .filter((f) => f.endsWith(".sql"))
    .sort())
    for (const sql of readFileSync("drizzle/" + file, "utf8")
      .split("--> statement-breakpoint")
      .filter((s) => s.trim()))
      await db.prepare(sql).run();
  const addUser = async (username, studentId, role = "seller") => {
    const id = crypto.randomUUID();
    await db
      .prepare(
        "INSERT INTO users(id,name,email,student_id,username,phone,room,password_hash,salt,confirmed_at,created_at,role) VALUES (?,?,?,?,?,?,224,?,?,1,1,?)",
      )
      .bind(
        id,
        username,
        username + "@example.test",
        studentId,
        username,
        "9000000000",
        "hash",
        "salt",
        role,
      )
      .run();
    return { id, username, student_id: studentId, role };
  };
  const admin = await addUser("punyam", "10001", "admin");
  const seller = await addUser("seller_one", "10002");
  const reporter = await addUser("reporter", "10003");
  const vice = await addUser("vice", "10004");
  const other = await addUser("other", "10005");
  for (const id of ["1234", "123456", "abc12", 12345])
    check(validStudentId(id), false);
  check(validStudentId("01234"), true);
  check(validUsername("valid_user12"), true);
  for (const handle of ["ab", "@name", "2name", "Name", "a".repeat(25)])
    check(validUsername(handle), false);
  await assert.rejects(addUser("seller_one", "10006"), /UNIQUE/);
  await assert.rejects(
    addUser("bad_identity", "abcdef"),
    /Invalid account identity/,
  );
  const invoke = async (path, method, data, user = admin, bucket) => {
    const result = await communitySafety(
      new Request("http://localhost/api/" + path, { method }),
      path,
      { db, bucket, user, body: async () => data },
    );
    return { status: result.status, data: await result.json() };
  };
  const payload = {
    kind: "stasher",
    username: "@seller_one",
    reason: "Other",
    details: "A report with enough useful detail.",
  };
  check((await invoke("reports", "POST", payload, null)).status, 401);
  check((await invoke("reports", "POST", payload, seller)).status, 400);
  const report = await invoke("reports", "POST", payload, reporter);
  check(report.status, 200);
  check((await invoke("reports", "POST", payload, reporter)).status, 409);
  check(
    (
      await invoke(
        "reports",
        "POST",
        { ...payload, username: "' OR 1=1 --" },
        reporter,
      )
    ).status,
    404,
  );
  check((await invoke("admin/reports", "GET", null, reporter)).status, 403);
  check(
    (
      await invoke("admin/reports", "PUT", {
        id: report.data.id,
        status: "resolved",
        resolution: "Reviewed and contacted seller.",
      })
    ).status,
    200,
  );
  check(
    (await invoke("admin/reports", "GET")).data.reports[0].status,
    "resolved",
  );
  let notifications = await invoke("admin/notifications", "GET");
  check(
    notifications.data.notifications.some((n) => n.kind === "report"),
    true,
  );
  check(
    notifications.data.notifications.some((n) => n.kind === "account"),
    true,
  );
  const notificationId = notifications.data.notifications[0].id;
  await invoke("admin/notifications/read", "POST", { ids: [notificationId] });
  check(
    (await invoke("admin/notifications", "GET")).data.notifications[0].is_read,
    1,
  );
  check(
    (
      await invoke("admin/account-role", "PUT", {
        userId: vice.id,
        role: "vice",
        permissions: ["accounts", "reports", "notifications"],
      })
    ).status,
    200,
  );
  let actor = {
    ...vice,
    role: "vice",
    permissions: ["accounts", "reports", "notifications"],
  };
  check(
    (await invoke("admin/notifications", "GET", null, actor)).data
      .notifications[0].is_read,
    0,
  );
  check(
    (
      await invoke(
        "admin/account-block",
        "PUT",
        {
          userId: seller.id,
          blocked: true,
          reason: "Repeated scam reports confirmed.",
        },
        actor,
      )
    ).status,
    403,
  );
  check(
    (
      await invoke(
        "admin/account-role",
        "PUT",
        { userId: other.id, role: "vice", permissions: ["accounts"] },
        actor,
      )
    ).status,
    403,
  );
  actor.permissions.push("manage_staff");
  check(
    (
      await invoke(
        "admin/account-role",
        "PUT",
        { userId: other.id, role: "vice", permissions: ["site"] },
        actor,
      )
    ).status,
    403,
  );
  const all = STAFF_PERMISSIONS.map(([key]) => key);
  check(
    (
      await invoke("admin/account-role", "PUT", {
        userId: vice.id,
        role: "vice",
        permissions: all,
      })
    ).status,
    200,
  );
  actor.permissions = all;
  check(
    (
      await invoke(
        "admin/account-role",
        "PUT",
        { userId: admin.id, role: "seller", permissions: [] },
        actor,
      )
    ).status,
    403,
  );
  check(
    (
      await invoke(
        "admin/account-role",
        "PUT",
        { userId: vice.id, role: "seller", permissions: [] },
        actor,
      )
    ).status,
    403,
  );
  await db
    .prepare(
      "INSERT INTO sessions(token_hash,user_id,expires_at) VALUES (?,?,?)",
    )
    .bind("test", seller.id, Date.now() + 60000)
    .run();
  check(
    (
      await invoke(
        "admin/account-block",
        "PUT",
        {
          userId: seller.id,
          blocked: true,
          reason: "Repeated scam reports confirmed.",
        },
        actor,
      )
    ).status,
    200,
  );
  check(
    (
      await db
        .prepare("SELECT blocked FROM users WHERE id=?")
        .bind(seller.id)
        .first()
    ).blocked,
    1,
  );
  check(
    (
      await db
        .prepare("SELECT COUNT(*) AS n FROM sessions WHERE user_id=?")
        .bind(seller.id)
        .first()
    ).n,
    0,
  );
  check(
    (
      await invoke("admin/account-role", "PUT", {
        userId: seller.id,
        role: "vice",
        permissions: all,
      })
    ).status,
    409,
  );
  check(
    (
      await invoke(
        "admin/account-block",
        "PUT",
        { userId: seller.id, blocked: false },
        actor,
      )
    ).status,
    200,
  );
  check(
    (
      await invoke(
        "admin/account-block",
        "PUT",
        {
          userId: admin.id,
          blocked: true,
          reason: "Try to block primary account.",
        },
        actor,
      )
    ).status,
    403,
  );
  check(
    (
      await invoke("admin/account-id", "PUT", {
        userId: seller.id,
        studentId: "123456",
      })
    ).status,
    400,
  );
  check(
    (
      await invoke(
        "admin/account-id",
        "PUT",
        { userId: admin.id, studentId: "99999" },
        actor,
      )
    ).status,
    403,
  );
  check(
    (
      await invoke("admin/account", "DELETE", {
        userId: seller.id,
        confirmation: "wrong",
      })
    ).status,
    400,
  );
  check(
    (
      await invoke("admin/account", "DELETE", {
        userId: admin.id,
        confirmation: admin.student_id,
      })
    ).status,
    403,
  );
  check(
    (
      await invoke("admin/account", "DELETE", {
        userId: vice.id,
        confirmation: vice.student_id,
      })
    ).status,
    403,
  );
  const media = crypto.randomUUID();
  await db
    .prepare(
      "INSERT INTO market_media(id,owner_id,kind,object_key,content_type,created_at) VALUES (?,?,'qr','private/qr.webp','image/webp',1)",
    )
    .bind(media, seller.id)
    .run();
  check(
    (await removeStudent(db, undefined, admin, seller.id, seller.student_id))
      .status,
    503,
  );
  const deleted = [];
  const result = await removeStudent(
    db,
    { delete: async (key) => deleted.push(key) },
    actor,
    seller.id,
    seller.student_id,
  );
  check(result.status, 200);
  check(deleted, ["private/qr.webp"]);
  check(
    await db.prepare("SELECT id FROM users WHERE id=?").bind(seller.id).first(),
    null,
  );
  check(
    (
      await db
        .prepare("SELECT COUNT(*) AS n FROM market_media WHERE owner_id=?")
        .bind(seller.id)
        .first()
    ).n,
    0,
  );
  check(
    (
      await invoke("admin/account-role", "PUT", {
        role: "vice",
        permissions: all,
      })
    ).status,
    400,
  );
  console.log(
    `PASS ${checks} community safety checks and complete migration chain`,
  );
} finally {
  await mf.dispose();
}
