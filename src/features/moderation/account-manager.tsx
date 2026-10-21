"use client";
import { useEffect, useState } from "react";
import {
  hasPermission,
  permissionsOf,
  STAFF_PERMISSIONS,
  validStudentId,
  type StaffPermission,
} from "../../domain/permissions";
import { hostelName, locationText, type User } from "../../domain/shared";
import { requestJSON } from "../../shared/lib/api-client";
import { Modal } from "../../shared/ui/dialog";
type Mode = "role" | "delete" | "identity" | "block";
export function AccountManager({
  user,
  onReset,
  onChanged,
}: {
  user: User;
  onReset: (target: any) => void;
  onChanged: () => Promise<void>;
}) {
  const [rows, setRows] = useState<any[]>([]),
    [query, setQuery] = useState(""),
    [target, setTarget] = useState<any>(null),
    [mode, setMode] = useState<Mode>("role"),
    [permissions, setPermissions] = useState<string[]>([]),
    [role, setRole] = useState("seller"),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState("");
  async function load() {
    try {
      setRows(
        (await requestJSON("admin/users?search=" + encodeURIComponent(query)))
          .users,
      );
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    void load();
  }, []);
  function edit(row: any, next: Mode) {
    setError("");
    setNotice("");
    setTarget(row);
    setMode(next);
    setRole(row.role);
    setPermissions(permissionsOf(row));
  }
  const available = STAFF_PERMISSIONS.filter(([key]) =>
    hasPermission(user, key),
  );
  return (
    <section className="account-manager">
      <h2>Account management</h2>
      <p>Find students by username, five-digit student ID, name or email.</p>
      <form
        className="admin-search"
        onSubmit={(e) => {
          e.preventDefault();
          void load();
        }}
      >
        <input
          aria-label="Find student account"
          placeholder="@username, student ID, name or email"
          value={query}
          onChange={(e) => setQuery(e.target.value.replace(/^@/, ""))}
        />
        <button className="button primary">Find student</button>
      </form>
      {error && !target && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {notice && <p role="status">{notice}</p>}
      <div className="account-list">
        {rows.map((row) => (
          <article className="control-card" key={row.id}>
            <header>
              <strong>
                {row.name}{" "}
                <span className="seller-handle">@{row.username}</span>
              </strong>
              <span className="tag">
                {row.role === "admin"
                  ? "Maintainer"
                  : row.role === "vice"
                    ? "Vice-Maintainer"
                    : row.blocked
                      ? "Suspended"
                      : "Student"}
              </span>
            </header>
            <p>
              {row.student_id} · {hostelName(row.hostel)} · {locationText(row)}
              <br />
              {row.email}
            </p>
            {row.blocked_reason && (
              <p>Suspension reason: {row.blocked_reason}</p>
            )}
            {row.deletion_pending === 1 && (
              <p role="alert">
                Deletion is pending. Retry deletion to finish cleanup.
              </p>
            )}
            <div className="account-actions">
              {row.role !== "admin" &&
                hasPermission(user, "reset_access") &&
                row.id !== user.id &&
                (user.role === "admin" ||
                  permissionsOf(row).every((p) =>
                    hasPermission(user, p as StaffPermission),
                  )) && (
                  <button className="button ghost" onClick={() => onReset(row)}>
                    Reset access
                  </button>
                )}
              {row.id !== user.id &&
                row.role !== "admin" &&
                hasPermission(user, "manage_staff") && (
                  <button
                    className="button ghost"
                    onClick={() => edit(row, "role")}
                  >
                    Role & permissions
                  </button>
                )}
              {hasPermission(user, "edit_identity") &&
                (row.role !== "admin" || user.role === "admin") && (
                  <button
                    className="button ghost"
                    onClick={() => edit(row, "identity")}
                  >
                    {validStudentId(row.student_id)
                      ? "Correct student ID"
                      : "Fix student ID"}
                  </button>
                )}
              {row.role === "seller" &&
                hasPermission(user, "block_accounts") && (
                  <button
                    className="button ghost"
                    onClick={() => edit(row, "block")}
                  >
                    {row.blocked ? "Unblock seller" : "Suspend seller"}
                  </button>
                )}
              {row.role === "seller" &&
                hasPermission(user, "delete_accounts") && (
                  <button
                    className="button danger"
                    onClick={() => edit(row, "delete")}
                  >
                    Delete account
                  </button>
                )}
            </div>
          </article>
        ))}
        {!rows.length && <p>No matching accounts.</p>}
      </div>
      {target && (
        <Modal
          title={
            mode === "role"
              ? "Role & permissions"
              : mode === "delete"
                ? "Delete account permanently"
                : mode === "block"
                  ? target.blocked
                    ? "Unblock seller"
                    : "Suspend seller"
                  : "Correct student ID"
          }
          wide={mode === "role"}
          onClose={() => !busy && setTarget(null)}
        >
          <form
            className="form"
            onSubmit={async (e) => {
              e.preventDefault();
              const values = Object.fromEntries(new FormData(e.currentTarget));
              setBusy(true);
              setError("");
              try {
                await requestJSON(
                  mode === "role"
                    ? "admin/account-role"
                    : mode === "delete"
                      ? "admin/account"
                      : mode === "block"
                        ? "admin/account-block"
                        : "admin/account-id",
                  mode === "delete" ? "DELETE" : "PUT",
                  {
                    ...values,
                    userId: target.id,
                    ...(mode === "role"
                      ? {
                          role,
                          permissions: role === "vice" ? permissions : [],
                        }
                      : {}),
                    ...(mode === "block" ? { blocked: !target.blocked } : {}),
                  },
                );
                setTarget(null);
                setNotice(
                  "Account updated. Changed roles and suspensions revoke existing sessions.",
                );
                await load();
                await onChanged();
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <p>
              <strong>
                {target.name} · @{target.username}
              </strong>
            </p>
            {mode === "role" ? (
              <>
                <label>
                  Account role
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                  >
                    <option value="seller">Student</option>
                    <option value="vice">Vice-Maintainer</option>
                  </select>
                </label>
                {role === "vice" && (
                  <>
                    <p>
                      Select exactly what this person may do. Your primary
                      Maintainer account is protected.
                    </p>
                    <button
                      type="button"
                      className="text-button"
                      onClick={() =>
                        setPermissions(available.map(([key]) => key))
                      }
                    >
                      Select all permissions I can grant
                    </button>
                    <div className="permission-list">
                      {available.map(([key, label, hint]) => (
                        <label className="control-toggle" key={key}>
                          <input
                            type="checkbox"
                            checked={permissions.includes(key)}
                            onChange={(e) =>
                              setPermissions((current) =>
                                e.target.checked
                                  ? [
                                      ...new Set([
                                        ...current,
                                        key,
                                        ...([
                                          "reset_access",
                                          "delete_accounts",
                                          "block_accounts",
                                          "manage_staff",
                                          "edit_identity",
                                        ].includes(key)
                                          ? ["accounts"]
                                          : []),
                                      ]),
                                    ]
                                  : current.filter((p) => p !== key),
                              )
                            }
                          />
                          <span>
                            <strong>{label}</strong>
                            <small>{hint}</small>
                          </span>
                        </label>
                      ))}
                    </div>
                  </>
                )}
              </>
            ) : mode === "delete" ? (
              <>
                <p>
                  This permanently removes the account, sessions, private
                  notebook, listings and personal payment/item uploads. Shared
                  catalogue photos remain available to other sellers. This
                  cannot be undone.
                </p>
                <label>
                  Type student ID {target.student_id} to confirm
                  <input name="confirmation" required autoComplete="off" />
                </label>
              </>
            ) : mode === "block" ? (
              <>
                <p>
                  {target.blocked
                    ? "The seller will be able to log in again. They must reopen their snack shop themselves."
                    : "This revokes sessions and hides this seller's listings across the site. Their records are kept for review and they can be unblocked later."}
                </p>
                {!target.blocked && (
                  <label>
                    Why are you suspending this seller?
                    <textarea
                      name="reason"
                      required
                      minLength={10}
                      maxLength={400}
                    />
                  </label>
                )}
              </>
            ) : (
              <label>
                Five-digit student ID
                <input
                  name="studentId"
                  inputMode="numeric"
                  pattern="[0-9]{5}"
                  minLength={5}
                  maxLength={5}
                  required
                  defaultValue={
                    validStudentId(target.student_id) ? target.student_id : ""
                  }
                />
              </label>
            )}
            {error && (
              <p role="alert" className="form-error">
                {error}
              </p>
            )}
            <button
              className={"button " + (mode === "delete" ? "danger" : "primary")}
              disabled={busy}
            >
              {busy
                ? "Saving…"
                : mode === "delete"
                  ? "Permanently delete account"
                  : "Save changes"}
            </button>
          </form>
        </Modal>
      )}
    </section>
  );
}
