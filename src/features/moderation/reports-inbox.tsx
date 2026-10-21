"use client";
import { useEffect, useState } from "react";
import { requestJSON } from "../../shared/lib/api-client";
function Review({
  report,
  onChanged,
}: {
  report: any;
  onChanged: () => Promise<void>;
}) {
  const [note, setNote] = useState(report.resolution),
    [status, setStatus] = useState(report.status),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <article className="control-card report-review" id={"report-" + report.id}>
      <header>
        <strong>{report.target_label}</strong>
        <span className="tag">
          {report.target_kind === "stasher" ? "Stasher" : "Listing"} ·{" "}
          {report.status}
        </span>
      </header>
      <p>
        <strong>{report.reason}</strong>
      </p>
      <p className="report-details">{report.details}</p>
      <small>
        Reported by {report.reporter_name || "Deleted account"}
        {report.reporter_student_id &&
          " · " + report.reporter_student_id} ·{" "}
        {new Date(report.created_at).toLocaleString()}
      </small>
      <form
        className="form"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          try {
            await requestJSON("admin/reports", "PUT", {
              id: report.id,
              status,
              resolution: note,
            });
            await onChanged();
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <label>
          Review status
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="open">Open</option>
            <option value="resolved">Resolved</option>
            <option value="dismissed">Dismissed</option>
          </select>
        </label>
        <label>
          Review note
          <textarea
            maxLength={600}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Record what you checked and the action taken."
          />
        </label>
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
        <button className="button ghost" disabled={busy}>
          Save review
        </button>
      </form>
    </article>
  );
}
export function ReportsInbox({ initialId }: { initialId?: string }) {
  const [rows, setRows] = useState<any[]>([]),
    [error, setError] = useState(""),
    [loaded, setLoaded] = useState(false);
  async function load() {
    try {
      const d = await requestJSON("admin/reports");
      setRows(d.reports);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoaded(true);
    }
  }
  useEffect(() => {
    void load();
  }, []);
  const ordered = initialId
    ? [...rows].sort(
        (a, b) => Number(b.id === initialId) - Number(a.id === initialId),
      )
    : rows;
  return (
    <section className="reports-inbox">
      <div className="control-heading">
        <div>
          <h2>Reports</h2>
          <p>
            Read the reason and explanation before taking action. Closing a
            report does not suspend a seller.
          </p>
        </div>
        <button className="button ghost" onClick={() => void load()}>
          Refresh
        </button>
      </div>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      {!loaded ? (
        <p>Loading reports…</p>
      ) : !rows.length ? (
        <p>No reports yet.</p>
      ) : (
        ordered.map((report) => (
          <Review
            key={report.id + report.updated_at}
            report={report}
            onChanged={load}
          />
        ))
      )}
    </section>
  );
}
