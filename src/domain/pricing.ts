import { asciiText, checkContent } from "./moderation";
export type Pricing = {
  price: number;
  price_after?: number | null;
  price_until?: number | null;
  usual_price?: number | null;
  offer_text?: string | null;
};
export function currentPrice(item: Pricing, now = Date.now()) {
  return item.price_until != null &&
    item.price_after != null &&
    now >= item.price_until
    ? item.price_after
    : item.price;
}
export function activeOffer(item: Pricing, now = Date.now()) {
  return !item.price_until || now < item.price_until;
}
export function priceTime(value: number) {
  return (
    new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
    }).format(value) + " IST"
  );
}
export function istInput(value: number) {
  return new Date(value + 330 * 60000).toISOString().slice(0, 16);
}
export function parseIST(value: string) {
  return Date.parse(value + ":00+05:30");
}
// Both API writes use the same validation. Existing schedules survive availability edits.
export function validatePricing(
  body: any,
  price: number,
  previous?: Pricing,
  now = Date.now(),
) {
  const supplied = ["priceAfter", "priceUntil", "usualPrice", "offerText"].some(
    (k) => Object.hasOwn(body, k),
  );
  if (!supplied)
    return previous && previous.price === price
      ? {
          price_after: previous.price_after ?? null,
          price_until: previous.price_until ?? null,
          usual_price: previous.usual_price ?? null,
          offer_text: previous.offer_text ?? null,
        }
      : {
          price_after: null,
          price_until: null,
          usual_price: null,
          offer_text: null,
        };
  const after = body.priceAfter ?? null,
    until = body.priceUntil ?? null,
    usual = body.usualPrice ?? null,
    note = body.offerText ?? "";
  const validMoney = (n: unknown) =>
    typeof n === "number" && Number.isInteger(n) && n >= 100 && n <= 100000;
  if (after !== null && !validMoney(after))
    throw new Error("Enter the later price between ₹1 and ₹1,000.");
  if (
    until !== null &&
    (!Number.isSafeInteger(until) ||
      (until <= now &&
        !(previous?.price_until === until && previous?.price_after === after)))
  )
    throw new Error("Choose a future date and time in IST.");
  if (after !== null && until === null)
    throw new Error("Choose when the selling price changes.");
  if (usual !== null && (!validMoney(usual) || usual <= price))
    throw new Error(
      "The usual price must be higher than your current selling price.",
    );
  if (typeof note !== "string" || note.trim().length > 100)
    throw new Error("Keep the offer note within 100 characters.");
  asciiText(note, "Offer note", 100, false);
  checkContent(note);
  return {
    price_after: after,
    price_until: until,
    usual_price: usual,
    offer_text: note.trim() || null,
  };
}
