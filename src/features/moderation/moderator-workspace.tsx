"use client";
import {
  ArrowLeft,
  ArrowUpRight,
  Building2,
  EyeOff,
  Package,
  QrCode,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  Undo2,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { CATEGORIES, hostelName, locationText } from "../../domain/shared";
import { Modal } from "../../shared/ui/dialog";
import { PacketPhoto } from "../catalogue/product-photos";
import { HostelManager } from "./hostel-manager";
import { PhotoManager } from "./photo-manager";
type Tool =
  | "listings"
  | "catalogue"
  | "uploads"
  | "payments"
  | "bhawans"
  | "accounts";
type Entry = {
  id: string;
  kind: "snack" | "product" | "photo" | "pawn" | "qr";
  name: string;
  subtitle: string;
  status: string;
  raw: any;
};
type ProductTarget = { name: string; category: string };
export function ModeratorWorkspace({
  experience,
  onChanged,
  accountTools,
}: {
  experience: "stashbox" | "pawn";
  onChanged: () => Promise<void>;
  accountTools?: ReactNode;
}) {
  const pawn = experience === "pawn",
    endpoint = pawn ? "pawn/admin/review" : "admin/review?market=stashbox";
  const [tool, setTool] = useState<Tool | null>(null),
    [data, setData] = useState<any>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [query, setQuery] = useState(""),
    [status, setStatus] = useState("visible"),
    [target, setTarget] = useState<ProductTarget | undefined>(),
    [confirm, setConfirm] = useState<Entry | null>(null),
    [version, setVersion] = useState(0),
    [editing, setEditing] = useState<Entry | null>(null),
    [editName, setEditName] = useState(""),
    [creating, setCreating] = useState(false);
  async function load() {
    try {
      const r = await fetch("/api/" + endpoint),
        d: any = await r.json();
      if (!r.ok) throw Error(d.error || "Could not load moderator tools.");
      setData(d);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    void load();
  }, [endpoint]);
  const entries = useMemo<Entry[]>(() => {
    if (!data) return [];
    if (tool === "listings")
      return (pawn ? data.pawn : data.snacks).map((r: any) => ({
        id: r.id,
        kind: pawn ? "pawn" : "snack",
        name: r.title || r.name,
        subtitle: `${r.seller_name} · ${r.hostel ? hostelName(r.hostel) : "Location not set"} · ${locationText(r)}`,
        status: r.status || r.moderation_status || "approved",
        raw: r,
      }));
    if (tool === "catalogue")
      return data.products.map((r: any) => ({
        id: r.product_group,
        kind: "product",
        name: r.name,
        subtitle: r.category,
        status: r.moderation_status,
        raw: r,
      }));
    if (tool === "uploads")
      return data.photos.map((r: any) => ({
        id: r.id,
        kind: "photo",
        name: r.matched_name,
        subtitle: `Uploaded by ${r.seller_name || "Moderator"}`,
        status: r.review_status,
        raw: r,
      }));
    if (tool === "payments")
      return data.qrs.map((r: any) => ({
        id: r.id,
        kind: "qr",
        name: r.seller_name,
        subtitle: "Shared payment code",
        status: r.status,
        raw: r,
      }));
    return [];
  }, [data, tool, pawn]);
  const visible = entries.filter(
    (e) =>
      (status === "all" ||
        (status === "visible"
          ? e.status === "approved"
          : e.status !== "approved")) &&
      `${e.name} ${e.subtitle}`.toLowerCase().includes(query.toLowerCase()),
  );
  const tools: {
    key: Tool;
    title: string;
    description: string;
    Icon: typeof Package;
    count?: number;
  }[] = pawn
    ? [
        {
          key: "listings",
          title: "Shop listings",
          description: "Review items listed across campus.",
          Icon: Package,
          count: data?.pawn.length,
        },
        {
          key: "payments",
          title: "Payment codes",
          description: "Manage payment codes shown to buyers.",
          Icon: QrCode,
          count: data?.qrs.length,
        },
      ]
    : [
        {
          key: "listings",
          title: "Stock listings",
          description: "Manage individual room listings.",
          Icon: Package,
          count: data?.snacks.length,
        },
        {
          key: "catalogue",
          title: "Product catalogue",
          description: "Edit product names, shared photos and availability.",
          Icon: Package,
          count: data?.products.length,
        },
        {
          key: "payments",
          title: "Payment codes",
          description: "Manage payment codes shown to buyers.",
          Icon: QrCode,
          count: data?.qrs.length,
        },
        {
          key: "bhawans",
          title: "Bhawans",
          description: "Add, rename or remove campus hostels.",
          Icon: Building2,
        },
        {
          key: "accounts",
          title: "Student accounts",
          description: "Find an account and help restore access.",
          Icon: Users,
        },
      ];
  const selected =
    tools.find((t) => t.key === tool) ||
    (tool === "uploads"
      ? {
          title: "Uploaded product photos",
          description: "Manage uploaded images across the product catalogue.",
        }
      : undefined);
  function open(next: Tool | null) {
    setTool(next);
    setQuery("");
    setStatus("visible");
    setError("");
    setTarget(undefined);
    setEditing(null);
    setCreating(false);
  }
  function photoFor(e: Entry) {
    setTarget({ name: e.raw.name, category: e.raw.category });
    setEditing(e);
    setEditName(e.name);
    setError("");
  }
  async function action(e: Entry, method: "PUT" | "DELETE") {
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/" + endpoint, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            kind: e.kind,
            id: e.id,
            ...(method === "PUT"
              ? { status: e.status === "approved" ? "rejected" : "approved" }
              : {}),
          }),
        }),
        d: any = await r.json();
      if (!r.ok) throw Error(d.error || "Could not update this item.");
      await load();
      await onChanged();
      setVersion((v) => v + 1);
      setConfirm(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const noun = (e: Entry) =>
    e.kind === "product"
      ? "product"
      : e.kind === "photo"
        ? "photo"
        : e.kind === "qr"
          ? "code"
          : "listing";
  return (
    <section className={`moderator-workspace ${pawn ? "pawn-moderator" : ""}`}>
      <header className="moderator-page-heading">
        <div>
          <span className="eyebrow">
            {pawn ? "THE PAWN SHOP" : "STASHBOX"} · MODERATOR
          </span>
          <h1>
            {pawn ? "The shopkeeper’s desk." : "Keep the stash in order."}
          </h1>
          <p>
            {tool
              ? "One task at a time. Select an item to manage it."
              : "Choose what you want to manage."}
          </p>
        </div>
        <button
          className="button ghost"
          disabled={busy}
          onClick={() => void load()}
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </header>
      {tool && (
        <div className="moderator-breadcrumb">
          <button className="text-button" onClick={() => open(null)}>
            <ArrowLeft size={16} />
            All moderator tools
          </button>
          <span>/</span>
          <strong>{selected?.title}</strong>
        </div>
      )}
      {error && !confirm && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {!tool ? (
        <>
          <div className="moderator-tool-grid">
            {tools.map(({ key, title, description, Icon, count }) => (
              <button
                key={key}
                className="moderator-tool-card"
                onClick={() => open(key)}
              >
                <div>
                  <Icon size={23} />
                  {count !== undefined && <span>{count}</span>}
                </div>
                <h2>{title}</h2>
                <p>{description}</p>
                <span className="moderator-tool-link">
                  Open section
                  <ArrowUpRight size={17} />
                </span>
              </button>
            ))}
          </div>
          {!data && !error && <p role="status">Loading overview...</p>}
          <div className="moderator-overview-note">
            <ShieldCheck size={20} />
            <p>
              {pawn
                ? "These tools manage Pawn Shop items and payment codes."
                : "Stock listings belong to individual Stashers. Catalogue products are shared across hostels."}
            </p>
          </div>
        </>
      ) : tool === "bhawans" ? (
        <HostelManager onChanged={onChanged} />
      ) : tool === "accounts" ? (
        <section className="moderator-focused-panel">{accountTools}</section>
      ) : (
        <section className="moderator-focused-panel">
          <div className="moderator-section-heading">
            <h2>{selected?.title}</h2>
            <p>{selected?.description}</p>
          </div>
          <>
            {tool === "catalogue" && (
              <div className="moderator-image-tabs">
                <button
                  className="button ghost"
                  onClick={() => setCreating(!creating)}
                >
                  Add product
                </button>
                <button
                  className="button ghost"
                  onClick={() => open("uploads")}
                >
                  Manage uploaded photos
                </button>
              </div>
            )}
            {creating && (
              <CatalogueCreate
                onDone={async () => {
                  setCreating(false);
                  await load();
                  await onChanged();
                }}
              />
            )}
            <div className="moderator-list-controls">
              <label className="search-box">
                <Search size={18} />
                <input
                  aria-label="Search moderator entries"
                  placeholder="Find an item, Stasher or room"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </label>
              <select
                aria-label="Filter entry status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="all">All entries</option>
                <option value="visible">Allowed</option>
                <option value="hidden">Hidden or removed</option>
              </select>
            </div>
            <div className="moderator-list-summary">
              <span>
                {visible.length} {visible.length === 1 ? "entry" : "entries"}
              </span>
              {tool === "listings" && (
                <small>Hide is reversible. Delete removes that listing.</small>
              )}
              {tool === "catalogue" && (
                <small>
                  Removing a product hides its suggestions and stock listings.
                  It can be restored.
                </small>
              )}
            </div>
            {!data ? (
              <p role="status">Loading this section...</p>
            ) : visible.length ? (
              <div className="moderator-entry-list">
                {visible.map((e) => (
                  <article key={e.id} className="moderator-entry">
                    <div className="moderator-entry-image">
                      {e.kind === "snack" || e.kind === "product" ? (
                        <PacketPhoto item={e.raw} />
                      ) : e.kind === "photo" ? (
                        <img src={"/api/photos/" + e.id} alt={e.name} />
                      ) : e.kind === "qr" ? (
                        <img
                          src={"/api/market/media/" + e.id}
                          alt="Payment code"
                        />
                      ) : e.raw.photo_id ? (
                        <img
                          src={"/api/market/media/" + e.raw.photo_id}
                          alt={e.name}
                        />
                      ) : (
                        <Package size={25} />
                      )}
                    </div>
                    <div className="moderator-entry-copy">
                      <strong>{e.name}</strong>
                      <p>{e.subtitle}</p>
                      <div className="moderator-entry-tags">
                        <span
                          className={
                            e.status === "approved"
                              ? "tag-visible"
                              : "tag-hidden"
                          }
                        >
                          {e.status === "approved"
                            ? e.kind === "product"
                              ? "In catalogue"
                              : "Allowed"
                            : e.status === "removed"
                              ? "Removed from catalogue"
                              : "Hidden"}
                        </span>
                        {e.raw.missing_photo && <span>Image needed</span>}
                      </div>
                    </div>
                    <div className="moderator-entry-actions">
                      {!pawn &&
                        (e.kind === "product" || e.kind === "snack") && (
                          <button
                            className="button ghost"
                            onClick={() => photoFor(e)}
                          >
                            {e.kind === "product"
                              ? "Edit product"
                              : "Manage product"}
                          </button>
                        )}
                      {e.kind !== "product" && (
                        <button
                          className="button ghost"
                          disabled={busy}
                          onClick={() => void action(e, "PUT")}
                        >
                          {e.status === "approved" ? (
                            <EyeOff size={14} />
                          ) : (
                            <Undo2 size={14} />
                          )}{" "}
                          {e.status === "approved" ? "Hide" : "Restore"}{" "}
                          {noun(e)}
                        </button>
                      )}
                      {e.kind === "product" && e.status !== "approved" && (
                        <button
                          className="button ghost"
                          disabled={busy}
                          onClick={() => void action(e, "PUT")}
                        >
                          <Undo2 size={14} />
                          Restore product
                        </button>
                      )}
                      {!(e.kind === "product" && e.status === "removed") && (
                        <button
                          className="button ghost moderator-delete"
                          disabled={busy}
                          onClick={() => {
                            setError("");
                            setConfirm(e);
                          }}
                        >
                          <Trash2 size={14} />
                          {e.kind === "product"
                            ? "Remove product"
                            : "Delete " + noun(e)}
                        </button>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="moderator-empty">
                <Package size={30} />
                <h3>No matching entries.</h3>
                <p>Try a different search or visibility filter.</p>
              </div>
            )}
          </>
        </section>
      )}
      {editing && target && (
        <Modal
          title="Edit catalogue product"
          onClose={() => setEditing(null)}
          wide
        >
          <form
            className="form"
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError("");
              try {
                const r = await fetch("/api/admin/products", {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      name: target.name,
                      category: target.category,
                      newName: editName,
                    }),
                  }),
                  d: any = await r.json();
                if (!r.ok) throw Error(d.error);
                setTarget({ ...target, name: editName.trim() });
                setEditing({ ...editing, name: editName.trim() });
                await load();
                await onChanged();
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <label>
              Product name
              <input
                value={editName}
                required
                minLength={2}
                maxLength={70}
                onChange={(e) => setEditName(e.target.value)}
              />
            </label>
            <button
              className="button primary"
              disabled={busy || editName.trim() === target.name}
            >
              Save product name
            </button>
            <p className="field-hint">
              Name changes apply to this product across all stock listings.
            </p>
            {error && (
              <p role="alert" className="form-error">
                {error}
              </p>
            )}
          </form>
          <PhotoManager
            key={target.name + version}
            initialProduct={target}
            onRemovePhoto={(p, product) =>
              setConfirm({
                id: p.photo_id!,
                kind: "photo",
                name: product.name,
                subtitle: "Product photo",
                status: "approved",
                raw: p,
              })
            }
            onChanged={async () => {
              await load();
              await onChanged();
            }}
          />
        </Modal>
      )}
      {confirm && (
        <Modal
          title={
            confirm.kind === "product"
              ? "Remove this product?"
              : "Delete this " + noun(confirm) + "?"
          }
          onClose={() => setConfirm(null)}
        >
          <div className="form">
            <strong>{confirm.name}</strong>
            <p>
              {confirm.kind === "product"
                ? "This removes the product from autocomplete and hides its stock listings. You can restore it from the catalogue later."
                : confirm.kind === "photo"
                  ? "This deletes the uploaded image and removes it from listings that use it. A remaining shared image or illustration will be shown."
                  : confirm.kind === "qr"
                    ? "This deletes the payment code wherever it is shown. The Stasher can add a new one."
                    : "This permanently deletes this listing. Other listings for the same product stay unchanged."}
            </p>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <div className="moderator-confirm-actions">
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
                onClick={() => void action(confirm, "DELETE")}
              >
                {busy
                  ? "Updating..."
                  : confirm.kind === "product"
                    ? "Remove product"
                    : "Delete " + noun(confirm)}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </section>
  );
}

function CatalogueCreate({ onDone }: { onDone: () => Promise<void> }) {
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <form
      className="form"
      onSubmit={async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.currentTarget));
        setBusy(true);
        try {
          const r = await fetch("/api/admin/products", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(data),
            }),
            d: any = await r.json();
          if (!r.ok) throw Error(d.error);
          await onDone();
        } catch (e) {
          setError((e as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <label>
        Product name
        <input name="name" required minLength={2} maxLength={70} />
      </label>
      <label>
        Category
        <select name="category">
          {CATEGORIES.slice(1).map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </label>
      {error && <p role="alert">{error}</p>}
      <button className="button primary" disabled={busy}>
        Add to catalogue
      </button>
    </form>
  );
}
