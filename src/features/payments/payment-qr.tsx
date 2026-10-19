"use client";
import { QrCode } from "lucide-react";
import { useEffect, useState } from "react";
import {
  requestJSON as call,
  uploadMarketPhoto as upload,
} from "../../shared/lib/api-client";
import { UPLOAD_HINT } from "../../shared/lib/image-upload";
import { Modal } from "../../shared/ui/dialog";
export function PaymentQR({
  id,
  compact = false,
}: {
  id?: string | null;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  if (!id) return null;
  if (compact)
    return (
      <>
        <button
          className="upi-pill"
          onClick={() => setOpen(true)}
          aria-label="Open Stasher UPI QR"
        >
          <QrCode size={16} />
          UPI QR
        </button>
        {open && (
          <Modal
            title="Stasher UPI QR"
            onClose={() => setOpen(false)}
            className="modal-payment"
          >
            <div className="payment-code">
              <img
                src={"/api/market/media/" + id}
                alt="Stasher's UPI payment QR"
              />
              <p>
                Check the recipient and agree on the item before paying the
                Stasher directly.
              </p>
            </div>
          </Modal>
        )}
      </>
    );
  return (
    <details className="payment-expander">
      <summary>
        <QrCode size={16} />
        Stasher UPI QR
      </summary>
      <div className="payment-code">
        <img
          src={"/api/market/media/" + id}
          alt="Stasher's UPI payment QR"
          loading="lazy"
        />
        <p>
          Check the recipient in your UPI app. Pay the Stasher directly after
          confirming the item.
        </p>
      </div>
    </details>
  );
}
export function SellerPayments({
  onChanged,
  expanded = false,
}: {
  onChanged?: () => Promise<void>;
  expanded?: boolean;
}) {
  const [qr, setQR] = useState<any>(null),
    [busy, setBusy] = useState(false),
    [rights, setRights] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    call("payment-qr")
      .then((d) => setQR(d.qr))
      .catch((e) => setError(e.message));
  }, []);
  return (
    <details className="seller-payments" open={expanded || undefined}>
      <summary>
        <QrCode size={19} />
        Your payment QR · optional
      </summary>
      <div className="form seller-payment-body">
        <p>Add your own payment code for buyers to open from your listings.</p>
        {qr && (
          <>
            <img
              className="seller-qr-preview"
              src={"/api/market/media/" + qr.id}
              alt="Your UPI QR"
            />
            <button
              className="button ghost"
              type="button"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setError("");
                try {
                  await call("payment-qr", "DELETE");
                  setQR(null);
                  await onChanged?.();
                } catch (e) {
                  setError((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              Remove QR
            </button>
          </>
        )}
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={rights}
            onChange={(e) => setRights(e.target.checked)}
          />
          This is my payment QR. Show it to buyers.
        </label>
        <p className="field-hint">{UPLOAD_HINT}</p>
        <label className="upload-label">
          {busy ? "Saving QR..." : "Choose or replace QR"}
          <input
            aria-label="Upload your payment QR"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            disabled={!rights || busy}
            onChange={async (e) => {
              const input = e.currentTarget,
                file = input.files?.[0];
              if (!file) return;
              setBusy(true);
              setError("");
              try {
                const d = await upload(file, "qr");
                setQR(d);
                await onChanged?.();
              } catch (e) {
                setError((e as Error).message);
              } finally {
                input.value = "";
                setBusy(false);
              }
            }}
          />
        </label>
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
      </div>
    </details>
  );
}
