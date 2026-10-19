"use client";
import { ArrowUpRight, Moon, Package, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { type User } from "../../domain/shared";
import { useDetailsMotion } from "../../shared/hooks/use-details-motion";
import { sellerRequest as request } from "../../shared/lib/api-client";
import { Modal } from "../../shared/ui/dialog";
export function ShopShutter({
  user,
  onChanged,
  onDashboard,
}: {
  user: User;
  onChanged: () => Promise<void>;
  onDashboard: () => void;
}) {
  const { ref: menu, toggle, close } = useDetailsMotion();
  const [busy, setBusy] = useState(false),
    [reopen, setReopen] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const sleeping = !!user.shop_sleeping || !user.is_open;
  async function change(sleeping: boolean) {
    setBusy(true);
    setError("");
    try {
      await request("shutter", "POST", { sleeping, confirmStock: !sleeping });
      await onChanged();
      setReopen(false);
      setNotice(
        sleeping
          ? "Shop closed. Your items are hidden until you reopen."
          : "Your shop is open again.",
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 6000);
    return () => clearTimeout(timer);
  }, [notice]);
  return (
    <>
      <details
        ref={menu}
        className={`header-shop-control ${sleeping ? "is-sleeping" : ""}`}
      >
        <summary
          onClick={toggle}
          aria-label={
            sleeping
              ? "Shop closed - Stasher controls"
              : "Shop open - Stasher controls"
          }
        >
          {sleeping ? <Moon size={16} /> : <Sun size={16} />}
          <span className="shop-label-desktop">
            {sleeping ? "Shop closed" : "Shop open"}
          </span>
          <span className="shop-label-mobile">
            {sleeping ? "Closed" : "Open"}
          </span>
          <span className="shop-status-dot" />
        </summary>
        <div className="shop-control-menu">
          <strong>
            {sleeping ? "Your shop is resting" : "Your shop is open"}
          </strong>
          <button
            disabled={busy}
            onClick={() => {
              close(true);
              if (sleeping) setReopen(true);
              else void change(true);
            }}
          >
            {sleeping ? <Sun size={17} /> : <Moon size={17} />}{" "}
            {busy
              ? "Updating..."
              : sleeping
                ? "Open my shop"
                : "Going to sleep"}
          </button>
          <button
            onClick={() => {
              close(true);
              onDashboard();
            }}
          >
            <Package size={17} />
            Stasher dashboard
            <ArrowUpRight size={14} />
          </button>
        </div>
      </details>
      {notice && (
        <span className="shop-visibility-notice" role="status">
          {notice}
        </span>
      )}
      {error && !reopen && (
        <span className="shop-control-error" role="alert">
          {error}
        </span>
      )}
      {reopen && (
        <Modal
          title="Open your shop"
          onClose={() => setReopen(false)}
          className="modal-shop"
        >
          <form
            className="form"
            onSubmit={(e) => {
              e.preventDefault();
              void change(false);
            }}
          >
            <p>Check your stock and prices, then open for your neighbours.</p>
            <label className="checkbox-label">
              <input required type="checkbox" />I checked my stock, prices and
              availability.
            </label>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <button className="button primary full" disabled={busy}>
              {busy ? "Opening..." : "Open my shop"}
            </button>
          </form>
        </Modal>
      )}
    </>
  );
}
