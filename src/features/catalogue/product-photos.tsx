"use client";
import { useState } from "react";
import { libraryPhoto, libraryPhotoById } from "../../domain/packet-library";
import { type Photo } from "../../domain/shared";
import { PacketIllustration } from "./packet-illustration";
export { compressPhoto } from "../../shared/lib/image-upload";

const photoColors = new Map<string, string>();
const studioPhotos = new Map<string, boolean>();
function isStudioPhoto(img: HTMLImageElement) {
  try {
    const c = document.createElement("canvas");
    c.width = 8;
    c.height = 8;
    const ctx = c.getContext("2d", { willReadFrequently: true });
    if (!ctx) return false;
    ctx.drawImage(img, 0, 0, 8, 8);
    const d = ctx.getImageData(0, 0, 8, 8).data;
    return (
      [0, 7, 56, 63].filter(
        (p) =>
          d[p * 4 + 3] < 40 ||
          (d[p * 4] > 237 && d[p * 4 + 1] > 237 && d[p * 4 + 2] > 237),
      ).length >= 3
    );
  } catch {
    return false;
  }
}
function dominantColor(img: HTMLImageElement) {
  try {
    const c = document.createElement("canvas");
    c.width = 32;
    c.height = 32;
    const ctx = c.getContext("2d", { willReadFrequently: true });
    if (!ctx) return "#ee7844";
    ctx.drawImage(img, 0, 0, 32, 32);
    const data = ctx.getImageData(0, 0, 32, 32).data,
      bins = new Map<
        string,
        { weight: number; r: number; g: number; b: number; n: number }
      >();
    for (let i = 0; i < data.length; i += 4) {
      const [r, g, b, a] = data.slice(i, i + 4),
        max = Math.max(r, g, b),
        min = Math.min(r, g, b);
      if (a < 180 || max - min < 35 || max < 55 || min > 220) continue;
      const key = [r >> 5, g >> 5, b >> 5].join(","),
        v = bins.get(key) || { weight: 0, r: 0, g: 0, b: 0, n: 0 };
      v.weight += (max - min) / 255;
      v.r += r;
      v.g += g;
      v.b += b;
      v.n++;
      bins.set(key, v);
    }
    const best = [...bins.values()].sort((a, b) => b.weight - a.weight)[0];
    return best
      ? `rgb(${Math.round(best.r / best.n)}, ${Math.round(best.g / best.n)}, ${Math.round(best.b / best.n)})`
      : "#ee7844";
  } catch {
    return "#ee7844";
  }
}
export function PacketPhoto({
  item,
}: {
  item: Photo & { name: string; category?: string };
}) {
  const [broken, setBroken] = useState(""),
    [color, setColor] = useState("#ee7844"),
    [studio, setStudio] = useState(false);
  const prepared = item.photo_id
    ? libraryPhotoById(item.photo_id)
    : libraryPhoto(item.name);
  const path =
    item.photo_path ||
    prepared?.photo_path ||
    (item.photo_id ? `/api/photos/${item.photo_id}` : null);
  const hasPhoto = !!path && broken !== path;
  const isStudio = path ? (studioPhotos.get(path) ?? studio) : false;
  return (
    <div
      className={`packet-photo-frame ${hasPhoto ? "has-photo" : ""} ${isStudio ? "studio-photo" : "scene-photo"}`}
      style={
        {
          "--packet-accent": path ? photoColors.get(path) || color : "#b6ca83",
          "--packet-image": hasPhoto ? `url(${JSON.stringify(path)})` : "none",
        } as React.CSSProperties
      }
    >
      {hasPhoto ? (
        <img
          className="packet-photo"
          src={path}
          alt={item.name}
          loading="lazy"
          onLoad={(e) => {
            const accent =
                photoColors.get(path) || dominantColor(e.currentTarget),
              plain = studioPhotos.get(path) ?? isStudioPhoto(e.currentTarget);
            photoColors.set(path, accent);
            studioPhotos.set(path, plain);
            setColor(accent);
            setStudio(plain);
          }}
          onError={() => setBroken(path)}
        />
      ) : (
        <PacketIllustration name={item.name} category={item.category} />
      )}
    </div>
  );
}
export function PhotoCredit({ item }: { item: Photo }) {
  if (!item.photo_id) return null;
  return (
    <small className="photo-credit">
      {item.photo_source === "openfoodfacts" ? (
        <>
          <a
            href={item.photo_source_url || "https://openfoodfacts.org"}
            target="_blank"
            rel="noreferrer"
          >
            Open Food Facts contributors
          </a>{" "}
          ·{" "}
          <a
            href="https://creativecommons.org/licenses/by-sa/3.0/"
            target="_blank"
            rel="noreferrer"
          >
            CC BY-SA 3.0
          </a>
        </>
      ) : item.photo_source === "provided" ||
        item.photo_source === "maintainer" ? (
        "Product photo supplied by maintainer"
      ) : (
        "Shared Stasher photo"
      )}
    </small>
  );
}
