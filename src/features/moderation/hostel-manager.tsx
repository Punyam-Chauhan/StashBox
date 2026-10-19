"use client";
import { Building2, Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { requestJSON as request } from "../../shared/lib/api-client";
import { Modal } from "../../shared/ui/dialog";
type ManagedHostel = { id: string; name: string; residents: number };
export function HostelManager({
  onChanged,
}: {
  onChanged: () => Promise<void>;
}) {
  const [hostels, setHostels] = useState<ManagedHostel[]>([]),
    [name, setName] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [editing, setEditing] = useState<ManagedHostel | null>(null),
    [deleting, setDeleting] = useState<ManagedHostel | null>(null);
  async function load() {
    setHostels((await request("admin/hostels")).hostels);
  }
  useEffect(() => {
    void load().catch((e) => setError(e.message));
  }, []);
  async function save(
    path: string,
    method: string,
    body: any,
    message: string,
  ) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await request(path, method, body);
      await load();
      await onChanged();
      setNotice(message);
      setEditing(null);
      setDeleting(null);
      if (method === "POST") setName("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="hostel-manager">
      <header>
        <Building2 size={22} />
        <div>
          <h2>Your campus hostels</h2>
          <p>Add, rename or remove a bhawan from your directory.</p>
        </div>
      </header>
      <div className="hostel-management-list">
        {hostels.map((h) => (
          <article key={h.id}>
            <div>
              <strong>{h.name}</strong>
              <span>
                {h.residents}{" "}
                {h.residents === 1 ? "resident account" : "resident accounts"}
              </span>
            </div>
            <div className="hostel-row-actions">
              <button
                className="button ghost"
                aria-label={"Rename " + h.name}
                disabled={busy}
                onClick={() => {
                  setError("");
                  setEditing(h);
                }}
              >
                <Pencil size={15} />
                Rename
              </button>
              <button
                className="icon-btn"
                aria-label={"Delete " + h.name}
                title={
                  h.residents
                    ? "Resident accounts use this bhawan"
                    : hostels.length <= 1
                      ? "Keep at least one bhawan"
                      : "Delete this bhawan"
                }
                disabled={busy || h.residents > 0 || hostels.length <= 1}
                onClick={() => {
                  setError("");
                  setDeleting(h);
                }}
              >
                <Trash2 size={18} />
              </button>
            </div>
          </article>
        ))}
      </div>
      <p className="hostel-deletion-hint">
        Bhawan names can be changed at any time. A bhawan with resident accounts
        cannot be deleted.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void save(
            "admin/hostels",
            "POST",
            { name },
            "Hostel added. It is ready to choose across StashBox.",
          );
        }}
      >
        <label>
          Bhawan name
          <input
            required
            minLength={2}
            maxLength={70}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Aryabhatta Bhawan"
          />
        </label>
        <button className="button primary" disabled={busy}>
          <Plus size={16} />
          {busy ? "Saving..." : "Add bhawan"}
        </button>
      </form>
      {error && !editing && !deleting && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="field-hint" role="status">
          {notice}
        </p>
      )}
      {editing && (
        <Modal title="Rename bhawan" onClose={() => setEditing(null)}>
          <form
            className="form"
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              void save(
                "admin/hostels/" + editing.id,
                "PUT",
                { name: f.get("name") },
                "Bhawan renamed across StashBox.",
              );
            }}
          >
            <p>
              Resident accounts, listings and saved hostel selections stay
              linked to this bhawan.
            </p>
            <label>
              New bhawan name
              <input
                name="name"
                required
                minLength={2}
                maxLength={70}
                defaultValue={editing.name}
              />
            </label>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <button className="button primary full" disabled={busy}>
              {busy ? "Saving..." : "Save bhawan name"}
            </button>
          </form>
        </Modal>
      )}
      {deleting && (
        <Modal title="Delete bhawan?" onClose={() => setDeleting(null)}>
          <div className="form">
            <p>
              Remove <strong>{deleting.name}</strong> from the hostel directory?
              It will no longer appear in the chooser or account forms.
            </p>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <div className="hostel-delete-actions">
              <button
                className="button ghost"
                disabled={busy}
                onClick={() => setDeleting(null)}
              >
                Keep bhawan
              </button>
              <button
                className="button primary"
                disabled={busy}
                onClick={() =>
                  void save(
                    "admin/hostels/" + deleting.id,
                    "DELETE",
                    undefined,
                    "Bhawan removed from the directory.",
                  )
                }
              >
                {busy ? "Deleting..." : "Delete bhawan"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </section>
  );
}
