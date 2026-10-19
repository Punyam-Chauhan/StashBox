"use client";
import { Check, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { prohibitedReason } from "../../domain/moderation";
import { currentPrice } from "../../domain/pricing";
import { mrpLabel, type OwnListing } from "../../domain/shared";
import { PriceDetails } from "../catalogue/pricing-fields";
import { PacketPhoto, PhotoCredit } from "../catalogue/product-photos";

export function OwnRow({
  item,
  busy,
  onSave,
  onDelete,
  onEdit,
}: {
  item: OwnListing;
  busy: boolean;
  onSave: (price: number, available: boolean) => void;
  onDelete: () => void;
  onEdit: () => void;
}) {
  const blocked =
    prohibitedReason(item.name + " " + (item.offer_text || "")) ||
    (item.moderation_status && item.moderation_status !== "approved"
      ? "Removed by the moderator."
      : null);
  const effective = currentPrice(item);
  const [price, setPrice] = useState(String(effective / 100)),
    [confirmDelete, setConfirmDelete] = useState(false);
  useEffect(() => setPrice(String(effective / 100)), [effective]);
  return (
    <div className="own-row">
      <button
        className="own-art"
        onClick={onEdit}
        aria-label={`Edit photo for ${item.name}`}
      >
        <PacketPhoto item={item} />
      </button>
      <div className="own-name">
        <strong>{item.name}</strong>
        <span>
          {mrpLabel(item.mrp)}
          {item.category === "Drinks" && item.size
            ? ` · ${item.size}`
            : ""} · {item.category}
        </span>
        <button className="text-button" onClick={onEdit}>
          Edit pricing & photo
        </button>
        {blocked && (
          <p className="listing-blocked" role="status">
            Hidden from buyers: {blocked}
          </p>
        )}
        <PriceDetails item={item} />
        <PhotoCredit item={item} />
      </div>
      <label className="own-price">
        <span>₹</span>
        <input
          aria-label={`Price for ${item.name}`}
          type="number"
          min="1"
          max="1000"
          step="0.01"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
        />
      </label>
      <button
        className={`stock-button ${item.available ? "available" : ""}`}
        disabled={busy || !!blocked}
        onClick={() => onSave(item.price, !item.available)}
      >
        {item.available ? <Check size={14} /> : <X size={14} />}{" "}
        {item.available ? "In stock" : "Sold out"}
      </button>
      {Math.round(Number(price) * 100) !== effective && (
        <button
          className="icon-btn save-price"
          disabled={
            busy ||
            !!blocked ||
            !Number.isFinite(Number(price)) ||
            Number(price) < 1 ||
            Number(price) > 1000
          }
          onClick={() =>
            onSave(Math.round(Number(price) * 100), !!item.available)
          }
          aria-label={`Save price for ${item.name}`}
        >
          <Check size={18} />
        </button>
      )}
      {confirmDelete ? (
        <span className="delete-confirm">
          <button disabled={busy} onClick={onDelete}>
            Remove?
          </button>
          <button
            onClick={() => setConfirmDelete(false)}
            aria-label="Cancel removing listing"
          >
            <X size={15} />
          </button>
        </span>
      ) : (
        <button
          className="icon-btn"
          disabled={busy}
          onClick={() => setConfirmDelete(true)}
          aria-label={`Remove ${item.name}`}
        >
          <Trash2 size={17} />
        </button>
      )}
    </div>
  );
}
