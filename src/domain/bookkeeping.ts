import { ValidationError } from "./validation-error";
export type LedgerEntry = {
  id: string;
  product_key: string;
  name: string;
  kind: "purchase" | "sale";
  quantity: number;
  unit_price: number;
  entry_date: string;
  notes: string;
  created_at: number;
};
export const todayIST = () =>
  new Date(Date.now() + 330 * 60000).toISOString().slice(0, 10);
export const dateOffset = (date: string, days: number) =>
  new Date(Date.parse(date + "T12:00:00Z") + days * 86400000)
    .toISOString()
    .slice(0, 10);
export function calculateBook(entries: LedgerEntry[]) {
  const products = new Map<
    string,
    {
      key: string;
      name: string;
      stock: number;
      value: number;
      sold: number;
      revenue: number;
      profit: number;
      lastPrice: number;
      lots: { quantity: number; cost: number }[];
      head: number;
    }
  >();
  const rows = [...entries]
    .sort(
      (a, b) =>
        a.entry_date.localeCompare(b.entry_date) ||
        a.created_at - b.created_at ||
        a.id.localeCompare(b.id),
    )
    .map((e) => {
      let p = products.get(e.product_key);
      if (!p) {
        p = {
          key: e.product_key,
          name: e.name,
          stock: 0,
          value: 0,
          sold: 0,
          revenue: 0,
          profit: 0,
          lastPrice: 0,
          lots: [],
          head: 0,
        };
        products.set(e.product_key, p);
      }
      const total = e.quantity * e.unit_price;
      let cost = 0;
      if (e.kind === "purchase") {
        p.stock += e.quantity;
        p.value += total;
        p.lots.push({ quantity: e.quantity, cost: e.unit_price });
      } else {
        if (e.quantity > p.stock)
          throw new ValidationError(
            `Not enough recorded stock for ${e.name} on ${e.entry_date}. Add the purchase or opening stock first.`,
          );
        let remaining = e.quantity;
        while (remaining > 0) {
          const lot = p.lots[p.head],
            take = Math.min(remaining, lot.quantity);
          cost += take * lot.cost;
          lot.quantity -= take;
          remaining -= take;
          if (!lot.quantity) p.head++;
        }
        p.stock -= e.quantity;
        p.value -= cost;
        p.sold += e.quantity;
        p.revenue += total;
        p.profit += total - cost;
        p.lastPrice = e.unit_price;
      }
      return {
        ...e,
        total,
        cost,
        profit: e.kind === "sale" ? total - cost : 0,
      };
    });
  return {
    rows,
    products: [...products.values()].map(
      ({ key, name, stock, value, sold, revenue, profit, lastPrice }) => ({
        key,
        name,
        stock,
        value,
        sold,
        revenue,
        profit,
        lastPrice,
        averageCost: stock ? Math.round(value / stock) : 0,
      }),
    ),
  };
}
export function demandSuggestions(
  book: ReturnType<typeof calculateBook>,
  date = todayIST(),
  days = 3,
) {
  const start = dateOffset(date, -6),
    previous = dateOffset(date, -13),
    metrics = new Map<
      string,
      { units: number; previousUnits: number; days: Set<string> }
    >();
  for (const row of book.rows) {
    if (
      row.kind !== "sale" ||
      row.entry_date > date ||
      row.entry_date < previous
    )
      continue;
    const m = metrics.get(row.product_key) || {
      units: 0,
      previousUnits: 0,
      days: new Set<string>(),
    };
    if (row.entry_date >= start) {
      m.units += row.quantity;
      m.days.add(row.entry_date);
    } else m.previousUnits += row.quantity;
    metrics.set(row.product_key, m);
  }
  return book.products
    .map((p) => {
      const m = metrics.get(p.key) || {
          units: 0,
          previousUnits: 0,
          days: new Set<string>(),
        },
        daily = m.units / 7;
      return {
        ...p,
        recentUnits: m.units,
        previousUnits: m.previousUnits,
        salesDays: m.days.size,
        daily,
        daysLeft: daily ? p.stock / daily : null,
        suggested: Math.max(0, Math.ceil(daily * days) - p.stock),
        early: m.days.size < 3,
      };
    })
    .filter((p) => p.recentUnits > 0)
    .sort((a, b) => b.recentUnits - a.recentUnits || b.revenue - a.revenue);
}
