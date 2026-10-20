"use client";
import { useEffect, useState } from "react";
import { Clock3, Download, Upload, ShieldCheck } from "lucide-react";
import {
  parseAliases,
  parseWordlist,
  type SiteSettings,
} from "../../domain/site-settings";
import { requestJSON } from "../../shared/lib/api-client";
import { Modal } from "../../shared/ui/dialog";
export type ControlTool = "site" | "wordlists" | "activity";
const saveFile = (name: string, text: string) => {
  const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
export function MaintainerControls({
  tool,
  onChanged,
}: {
  tool: ControlTool;
  onChanged: () => Promise<void>;
}) {
  const [settings, setSettings] = useState<SiteSettings | null>(null),
    [revision, setRevision] = useState(0),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [confirm, setConfirm] = useState<"maintenance" | "availability" | null>(
      null,
    ),
    [events, setEvents] = useState<any[]>([]);
  const [blockedText, setBlockedText] = useState(""),
    [aliasText, setAliasText] = useState(""),
    [now, setNow] = useState(Date.now());
  function hydrate(d: { settings: SiteSettings; revision: number }) {
    setSettings(d.settings);
    setRevision(d.revision);
    setBlockedText(d.settings.blockedWords.join("\n"));
    setAliasText(
      d.settings.searchAliases
        .map((a) => a.keyword + " = " + a.product)
        .join("\n"),
    );
  }
  async function load() {
    setError("");
    try {
      hydrate(await requestJSON("admin/site"));
      if (tool === "activity")
        setEvents((await requestJSON("admin/activity")).entries);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    void load();
  }, [tool]);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  async function save(section: string, extra: Record<string, unknown> = {}) {
    if (!settings || busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const d = await requestJSON("admin/site", "PUT", {
        revision,
        section,
        ...extra,
      });
      hydrate(d);
      setConfirm(null);
      setNotice("Saved. Changes are live across the app.");
      await onChanged();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const availability = () =>
    save("availability", {
      pawnEnabled: settings!.pawnEnabled,
      signupEnabled: settings!.signupEnabled,
      uploadsEnabled: settings!.uploadsEnabled,
      demoEnabled: settings!.demoEnabled,
    });
  async function importFile(
    file: File | undefined,
    kind: "blocked" | "aliases",
  ) {
    if (!file) return;
    setError("");
    try {
      if (file.size > 16000)
        throw Error("Use a text or CSV file smaller than 16 KB.");
      const text = await file.text();
      if (kind === "blocked") {
        parseWordlist(text);
        setBlockedText(text);
      } else {
        parseAliases(text);
        setAliasText(text);
      }
      setNotice("File loaded for review. Save wordlists to apply it.");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <section className="maintainer-controls" aria-busy={busy}>
      <div className="maintainer-controls-toolbar">
        <button
          className="button ghost"
          disabled={busy}
          onClick={() => void load()}
        >
          Reload saved settings
        </button>
      </div>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="control-notice" role="status">
          {notice}
        </p>
      )}
      {!settings ? (
        <p role="status">Loading controls…</p>
      ) : tool === "site" ? (
        <>
          <section className="control-card">
            <div className="control-heading">
              <Clock3 />
              <div>
                <h2>Temporary maintenance</h2>
                <p>Pause access for everyone except signed-in Maintainers.</p>
              </div>
            </div>
            <p className="control-status">
              {settings.maintenanceUntil > now
                ? `Active · ends in ${Math.ceil((settings.maintenanceUntil - now) / 60000)} minutes`
                : "Site is open"}
            </p>
            <label>
              Message visitors will see
              <textarea
                maxLength={240}
                value={settings.maintenanceMessage}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    maintenanceMessage: e.target.value,
                  })
                }
              />
            </label>
            <p>
              Maintenance ends automatically after 2 hours, even if you log out.
              Login and password recovery stay available so you can get back in
              and end it early.
            </p>
            {settings.maintenanceUntil > now ? (
              <button
                className="button primary"
                disabled={busy}
                onClick={() =>
                  void save("maintenance", {
                    action: "stop",
                    message: settings.maintenanceMessage,
                  })
                }
              >
                End maintenance now
              </button>
            ) : (
              <button
                className="button ghost"
                disabled={busy}
                onClick={() => setConfirm("maintenance")}
              >
                Start a 2-hour maintenance window
              </button>
            )}
          </section>
          <section className="control-card">
            <h2>App availability</h2>
            <p>Changes preserve existing accounts, listings and images.</p>
            {(
              [
                [
                  "pawnEnabled",
                  "The Pawn Shop",
                  "Show its navigation and allow browsing, listing and selling. Turning it off removes its links and blocks direct access.",
                ],
                [
                  "signupEnabled",
                  "New accounts",
                  "Allow students to register. Existing accounts can always log in.",
                ],
                [
                  "demoEnabled",
                  "Demo listings button",
                  "Let visitors explore clearly labelled fictional listings. Off by default; real listings are unaffected.",
                ],
                [
                  "uploadsEnabled",
                  "New image uploads",
                  "Allow new packet photos, item images and payment QRs. Saved images remain available.",
                ],
              ] as const
            ).map(([key, label, hint]) => (
              <label key={key} className="control-toggle">
                <input
                  type="checkbox"
                  checked={settings[key]}
                  onChange={(e) =>
                    setSettings({ ...settings, [key]: e.target.checked })
                  }
                />
                <span>
                  <strong>{label}</strong>
                  <small>{hint}</small>
                </span>
                <b>{settings[key] ? "On" : "Off"}</b>
              </label>
            ))}
            <button
              className="button primary"
              disabled={busy}
              onClick={() =>
                !settings.pawnEnabled
                  ? setConfirm("availability")
                  : void availability()
              }
            >
              Save availability
            </button>
          </section>
          <section className="control-card">
            <h2>Campus announcement</h2>
            <p>
              A short banner shown throughout the app. Leave it empty to remove
              the banner.
            </p>
            <label>
              Announcement
              <textarea
                maxLength={240}
                value={settings.announcement}
                onChange={(e) =>
                  setSettings({ ...settings, announcement: e.target.value })
                }
              />
            </label>
            <button
              className="button primary"
              disabled={busy}
              onClick={() =>
                void save("announcement", {
                  announcement: settings.announcement,
                })
              }
            >
              Save announcement
            </button>
          </section>
        </>
      ) : tool === "wordlists" ? (
        <>
          <p className="control-note">
            <ShieldCheck size={19} />
            These lists are saved in the database. No code changes or restart
            needed.
          </p>
          <section className="control-card">
            <h2>Blocked words & phrases</h2>
            <p>
              One per line, or comma-separated. Added to the built-in checks for
              names, descriptions and other submitted text. Matching entries are
              hidden from public browsing; saved stock is not deleted.
            </p>
            <label>
              Extra blocked words
              <textarea
                rows={8}
                spellCheck={false}
                value={blockedText}
                onChange={(e) => setBlockedText(e.target.value)}
                placeholder={"example phrase\nanother phrase"}
              />
            </label>
            <div className="control-file-row">
              <label className="button ghost">
                <Upload size={16} />
                Import TXT / CSV
                <input
                  type="file"
                  accept=".txt,.csv,text/plain,text/csv"
                  onChange={(e) => {
                    void importFile(e.target.files?.[0], "blocked");
                    e.target.value = "";
                  }}
                />
              </label>
              <button
                className="button ghost"
                onClick={() => saveFile("blocked-words.txt", blockedText)}
              >
                <Download size={16} />
                Export list
              </button>
            </div>
            <small>
              Up to 300 entries · 8,000 characters. Import replaces the draft;
              review it before saving. Clear the field to remove your extra
              rules.
            </small>
          </section>
          <section className="control-card">
            <h2>Search keywords & aliases</h2>
            <p>
              Help students find products using familiar names. Use the exact
              product name from your catalogue.
            </p>
            <label>
              Keyword = product name
              <textarea
                rows={8}
                spellCheck={false}
                value={aliasText}
                onChange={(e) => setAliasText(e.target.value)}
                placeholder={
                  "noodles = Maggi Masala Noodles\nbiscuits = Oreo Original"
                }
              />
            </label>
            <div className="control-file-row">
              <label className="button ghost">
                <Upload size={16} />
                Import TXT / CSV
                <input
                  type="file"
                  accept=".txt,.csv,text/plain,text/csv"
                  onChange={(e) => {
                    void importFile(e.target.files?.[0], "aliases");
                    e.target.value = "";
                  }}
                />
              </label>
              <button
                className="button ghost"
                onClick={() => saveFile("search-aliases.txt", aliasText)}
              >
                <Download size={16} />
                Export list
              </button>
              <button
                className="text-button"
                onClick={() =>
                  saveFile(
                    "search-aliases-example.txt",
                    "noodles = Maggi Masala Noodles\nbiscuits = Oreo Original",
                  )
                }
              >
                Download example
              </button>
            </div>
            <small>
              Up to 200 entries · 8,000 characters. CSV accepts keyword,product
              name with no header.
            </small>
          </section>
          <button
            className="button primary"
            disabled={busy}
            onClick={() => {
              try {
                parseWordlist(blockedText);
                parseAliases(aliasText);
                void save("wordlists", { blockedText, aliasText });
              } catch (e) {
                setError((e as Error).message);
              }
            }}
          >
            Save wordlists
          </button>
        </>
      ) : (
        <section className="control-card">
          <h2>Recent Maintainer actions</h2>
          <p>
            The latest 100 changes, including settings, catalogue and account
            actions.
          </p>
          <div className="control-activity">
            {events.length ? (
              events.map((e) => (
                <article key={e.id}>
                  <strong>{e.action.replaceAll("_", " ")}</strong>
                  <span>
                    {e.actor || "Maintainer"} ·{" "}
                    {new Date(e.created_at).toLocaleString()}
                  </span>
                  <small>{e.target}</small>
                </article>
              ))
            ) : (
              <p>No actions recorded yet.</p>
            )}
          </div>
        </section>
      )}
      {confirm && settings && (
        <Modal
          title={
            confirm === "maintenance"
              ? "Pause the site for 2 hours?"
              : "Turn off The Pawn Shop?"
          }
          onClose={() => !busy && setConfirm(null)}
        >
          <div className="form">
            <p>
              {confirm === "maintenance"
                ? "Other visitors will see your maintenance message. You can still log in and use Maintainer tools. The site reopens automatically after 2 hours."
                : "Pawn links disappear and direct access is blocked. Existing listings and images stay saved. Turn it back on here whenever you’re ready."}
            </p>
            <div className="control-file-row">
              <button
                className="button ghost"
                disabled={busy}
                onClick={() => setConfirm(null)}
              >
                Cancel
              </button>
              <button
                className="button primary"
                disabled={busy}
                onClick={() =>
                  confirm === "maintenance"
                    ? void save("maintenance", {
                        action: "start",
                        message: settings.maintenanceMessage,
                      })
                    : void availability()
                }
              >
                {busy
                  ? "Saving…"
                  : confirm === "maintenance"
                    ? "Start 2-hour maintenance"
                    : "Turn off Pawn Shop"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </section>
  );
}
