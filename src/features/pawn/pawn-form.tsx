"use client";
import { ArrowUpRight, ImagePlus } from "lucide-react";
import { useState } from "react";
import { asciiText, checkContent } from "../../domain/moderation";
import { uploadMarketPhoto as upload } from "../../shared/lib/api-client";
import { UPLOAD_HINT } from "../../shared/lib/image-upload";

export function PawnForm({ onSave }: { onSave: (b: any) => Promise<void> }) {
  const [photo, setPhoto] = useState<string | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [rights, setRights] = useState(false);
  return (
    <form
      className="form pawn-form"
      onSubmit={async (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        setBusy(true);
        setError("");
        try {
          const title = asciiText(f.get("title"), "Title", 80),
            description = asciiText(f.get("description"), "Description", 600);
          checkContent(title, description);
          await onSave({
            title,
            description,
            condition: f.get("condition"),
            price: Math.round(Number(f.get("price")) * 100),
            photoId: photo,
          });
        } catch (e) {
          setError((e as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <p>
        A clear description, a fair price, and your hostel location. That&apos;s
        all it takes.
      </p>
      <label>
        What are you selling?
        <input
          name="title"
          required
          minLength={3}
          maxLength={80}
          placeholder="e.g. Hero cycle or Engineering Mathematics book"
        />
      </label>
      <div className="form-grid">
        <label>
          Your price (Rs)
          <input
            name="price"
            type="number"
            required
            min="1"
            max="50000"
            step="0.01"
            placeholder="e.g. 450"
          />
        </label>
        <label>
          Condition
          <select name="condition">
            {["New / sealed", "Like new", "Used - good", "Needs repair"].map(
              (c) => (
                <option key={c}>{c}</option>
              ),
            )}
          </select>
        </label>
      </div>
      <label>
        Description
        <textarea
          name="description"
          required
          maxLength={600}
          rows={4}
          placeholder="Condition, what is included, and anything the buyer should know."
        />
      </label>
      <p className="field-hint">
        {"Use English letters, numbers and simple punctuation."}
      </p>
      <details className="form-section">
        <summary>
          <ImagePlus size={18} />
          Add a photo · optional
        </summary>
        <div className="form-section-body">
          {photo && (
            <img
              className="pawn-upload-preview"
              src={"/api/market/media/" + photo}
              alt="Your item photo"
            />
          )}
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={rights}
              onChange={(e) => setRights(e.target.checked)}
            />
            This is my photo and the item follows the marketplace rules.
          </label>
          <p className="field-hint">{UPLOAD_HINT}</p>
          <label className="upload-label">
            Choose an item photo
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              disabled={!rights || busy}
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                setBusy(true);
                setError("");
                try {
                  setPhoto((await upload(f, "pawn")).id);
                } catch (e) {
                  setError((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            />
          </label>
        </div>
      </details>
      <label className="checkbox-label">
        <input required type="checkbox" />
        My listing follows the rules. No tobacco, vapes, intoxicants, controlled
        substances or weapons. Medicines, if any, are sealed and
        non-prescription.
      </label>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <button className="button primary full" disabled={busy}>
        {busy ? "Saving..." : "Put it on the shelf"}
        <ArrowUpRight size={18} />
      </button>
    </form>
  );
}
