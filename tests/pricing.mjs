import assert from "node:assert/strict";
import { importTypeScript } from "./helpers/import-typescript.mjs";
const { currentPrice, activeOffer, validatePricing, istInput, parseIST } =
  await importTypeScript("src/domain/pricing.ts");
const now = Date.now(),
  until = now + 10000,
  item = {
    price: 2000,
    price_after: 2500,
    price_until: until,
    usual_price: 2500,
    offer_text: "Midnight deal",
  };
assert.equal(currentPrice(item, until - 1), 2000);
assert.equal(currentPrice(item, until), 2500);
assert.equal(currentPrice(item, until + 1), 2500);
assert.equal(activeOffer(item, until), false);
assert.equal(currentPrice({ price: 2000 }), 2000);
assert.equal(parseIST("2026-10-20T00:00"), Date.parse("2026-10-19T18:30:00Z"));
assert.equal(istInput(parseIST("2026-10-20T00:00")), "2026-10-20T00:00");
assert.equal(
  validatePricing({}, 2000, item).price_after,
  2500,
  "Stock toggle preserves schedule",
);
assert.equal(
  validatePricing({}, 3000, item).price_until,
  null,
  "Quick manual price override clears schedule",
);
assert.throws(() => validatePricing({ priceAfter: 2500 }, 2000), /when/);
assert.throws(() => validatePricing({ usualPrice: 1500 }, 2000), /higher/);
assert.throws(
  () => validatePricing({ priceUntil: now - 1000 }, 2000),
  /future/,
);
assert.throws(
  () => validatePricing({ priceAfter: 1, priceUntil: until }, 2000),
  /later price/,
);
assert.equal(
  validatePricing(
    {
      priceAfter: 2500,
      priceUntil: until,
      usualPrice: 2500,
      offerText: " Deal ",
    },
    2000,
  ).offer_text,
  "Deal",
);
console.log(
  "PASS 14 pricing checks: exact cutoff, IST midnight, validation and manual overrides",
);
