export const MAX_SOURCE_PHOTO_BYTES = 30 * 1024 * 1024;
export const MAX_SAVED_PHOTO_BYTES = 200000;
export const UPLOAD_HINT =
  "JPG, PNG, WebP or AVIF up to 30 MB. Resized and compressed to WebP, max 200 KB saved.";

export async function compressPhoto(
  file: File,
  options: { qr?: boolean } = {},
): Promise<Blob> {
  if (
    !["image/jpeg", "image/png", "image/webp", "image/avif"].includes(
      file.type,
    ) ||
    file.size > MAX_SOURCE_PHOTO_BYTES
  )
    throw new Error("Choose a JPG, PNG, WebP or AVIF photo up to 30 MB.");
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error(
      "This image could not be opened. Try a JPG, PNG, WebP or AVIF export.",
    );
  }
  try {
    if (
      !bitmap.width ||
      !bitmap.height ||
      bitmap.width * bitmap.height > 100000000
    )
      throw new Error("This image has too many pixels. Try a smaller export.");
    const qr = !!options.qr,
      edge = qr ? 1800 : 1600,
      target = qr ? 180000 : 120000;
    let scale = Math.min(1, edge / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas"),
      ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not prepare this photo.");
    let smallest: Blob | null = null;
    // Layer 1: downsample large sources; redraw from the original every time.
    for (let resize = 0; resize < 5; resize++) {
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      // Layer 2: adapt WebP quality to the size budget, without cascading losses.
      for (const quality of qr ? [0.99, 0.97, 0.95] : [0.88, 0.8, 0.72, 0.65]) {
        const blob = await new Promise<Blob>((resolve, reject) =>
          canvas.toBlob(
            (b) =>
              b ? resolve(b) : reject(Error("Could not compress this photo.")),
            "image/webp",
            quality,
          ),
        );
        if (blob.type !== "image/webp")
          throw new Error(
            "Your browser cannot create WebP images. Try a current Chrome, Edge, Firefox or Safari browser.",
          );
        if (!smallest || blob.size < smallest.size) smallest = blob;
        if (blob.size <= target) return blob;
      }
      if (Math.max(canvas.width, canvas.height) <= 640) break;
      scale *= 0.8;
    }
    if (smallest && smallest.size <= MAX_SAVED_PHOTO_BYTES) return smallest;
    throw new Error(
      "This photo is still too large after compression. Try a tighter crop.",
    );
  } finally {
    bitmap.close();
  }
}
