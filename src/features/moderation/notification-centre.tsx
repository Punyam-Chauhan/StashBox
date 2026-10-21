"use client";
import { useEffect, useState } from "react";
import { Bell, CheckCheck } from "lucide-react";
import { hasPermission } from "../../domain/permissions";
import type { User } from "../../domain/shared";
import { requestJSON } from "../../shared/lib/api-client";
import { Modal } from "../../shared/ui/dialog";
import { ReportsInbox } from "./reports-inbox";
export function NotificationCentre({ user }: { user: User }) {
  const [data, setData] = useState<{ notifications: any[]; unread: number }>({
      notifications: [],
      unread: 0,
    }),
    [open, setOpen] = useState(false),
    [report, setReport] = useState<string | null>(null),
    [error, setError] = useState("");
  const allowed = hasPermission(user, "notifications");
  async function load() {
    try {
      setData(await requestJSON("admin/notifications"));
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    if (!allowed) return;
    void load();
    const update = () => {
      if (!document.hidden) void load();
    };
    const timer = setInterval(update, 20000);
    window.addEventListener("focus", update);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", update);
    };
  }, [user.id, user.permissions, allowed]);
  if (!allowed) return null;
  async function read(ids: number[]) {
    try {
      await requestJSON("admin/notifications/read", "POST", { ids });
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <>
      <button
        className="icon-btn staff-bell"
        aria-label={
          "Maintainer notifications" +
          (data.unread ? ", " + data.unread + " unread" : "")
        }
        onClick={() => {
          setOpen(true);
          void load();
        }}
      >
        <Bell size={20} />
        {data.unread > 0 && (
          <span className="notification-count">
            {data.unread > 99 ? "99+" : data.unread}
          </span>
        )}
      </button>
      {open && (
        <Modal
          title="Maintainer notifications"
          onClose={() => setOpen(false)}
          className="notification-modal"
        >
          <div className="notification-toolbar">
            <small>{data.unread} unread · Updates every 20 seconds</small>
            <button
              className="text-button"
              onClick={() =>
                void read(
                  data.notifications.filter((n) => !n.is_read).map((n) => n.id),
                )
              }
            >
              <CheckCheck size={16} />
              Mark shown as read
            </button>
          </div>
          {error && (
            <p role="alert" className="form-error">
              {error}
            </p>
          )}
          {!data.notifications.length ? (
            <p>No notifications yet.</p>
          ) : (
            <div className="notification-list">
              {data.notifications.map((n) => (
                <button
                  className={
                    "notification-entry " + (!n.is_read ? "unread" : "")
                  }
                  key={n.id}
                  onClick={() => {
                    void read([n.id]);
                    if (n.kind === "report") {
                      setOpen(false);
                      setReport(n.subject_id);
                    }
                  }}
                >
                  <strong>{n.title}</strong>
                  <small>
                    {new Date(n.created_at).toLocaleString()}
                    {n.kind === "report"
                      ? " · Open report details"
                      : " · Mark as read"}
                  </small>
                </button>
              ))}
            </div>
          )}
        </Modal>
      )}
      {report && (
        <Modal title="Review report" wide onClose={() => setReport(null)}>
          <ReportsInbox initialId={report} />
        </Modal>
      )}
    </>
  );
}
