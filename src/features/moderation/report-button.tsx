"use client";
import { useState } from "react";
import { Flag } from "lucide-react";
import { Modal } from "../../shared/ui/dialog";
import { requestJSON } from "../../shared/lib/api-client";
const reasons = [
  "Scam or misleading price",
  "Wrong or unavailable item",
  "Prohibited item",
  "Harassment or unsafe behaviour",
  "Other",
];
export function ReportButton({
  kind = "stasher",
  targetId,
  username,
  label = "Report Stasher",
  targetLabel,
}: {
  kind?: "snack" | "pawn" | "stasher";
  targetId?: string;
  username?: string;
  label?: string;
  targetLabel?: string;
}) {
  const [open, setOpen] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [sent, setSent] = useState(false);
  if (targetId?.startsWith("demo-")) return null;
  return (
    <>
      <button
        className="text-button report-button"
        onClick={() => {
          setOpen(true);
          setError("");
          setSent(false);
        }}
      >
        <Flag size={14} />
        {label}
      </button>
      {open && (
        <Modal
          title={sent ? "Report received" : "Send a report"}
          onClose={() => setOpen(false)}
        >
          {sent ? (
            <div className="form">
              <p>
                A Maintainer has been notified. They will review your
                explanation and the account or listing. Reports do not
                automatically suspend anyone.
              </p>
              <button className="button primary" onClick={() => setOpen(false)}>
                Done
              </button>
            </div>
          ) : (
            <form
              className="form"
              onSubmit={async (e) => {
                e.preventDefault();
                const data = Object.fromEntries(new FormData(e.currentTarget));
                setBusy(true);
                setError("");
                try {
                  await requestJSON("reports", "POST", {
                    ...data,
                    kind,
                    targetId,
                    username: username || data.username,
                  });
                  setSent(true);
                } catch (e) {
                  setError((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              <p>
                Reporting{" "}
                {targetLabel || (username && "@" + username) || "a Stasher"}.
                Explain what happened so the Maintainer can investigate. Your
                report is private to authorised staff.
              </p>
              {kind === "stasher" && !targetId && !username && (
                <label>
                  Stasher username
                  <input
                    name="username"
                    required
                    placeholder="@username"
                    maxLength={25}
                  />
                </label>
              )}
              <label>
                Why are you reporting this?
                <select name="reason" required defaultValue="">
                  <option value="" disabled>
                    Choose a reason
                  </option>
                  {reasons.map((reason) => (
                    <option key={reason}>{reason}</option>
                  ))}
                </select>
              </label>
              <label>
                What happened?
                <textarea
                  name="details"
                  required
                  minLength={10}
                  maxLength={1000}
                  rows={5}
                  placeholder="Describe the item, price, conversation or behaviour and when it happened. Do not include passwords or payment secrets."
                />
              </label>
              <small>
                Use English letters and simple punctuation. Log in before
                sending a report.
              </small>
              {error && (
                <p className="form-error" role="alert">
                  {error}
                </p>
              )}
              <button className="button primary" disabled={busy}>
                {busy ? "Sending…" : "Send report"}
              </button>
            </form>
          )}
        </Modal>
      )}
    </>
  );
}
