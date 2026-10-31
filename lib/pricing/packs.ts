// Credit packs shown on /pricing (spec 0005). The only place prices live; payments
// will read the same list. No server imports, so it is safe on both sides.

export type CreditPack = {
  id: "starter" | "plus" | "pro";
  name: string;
  credits: number;
  /** Price in US cents. */
  priceCents: number;
  popular: boolean;
};

export const CREDIT_PACKS: readonly CreditPack[] = [
  { id: "starter", name: "Starter", credits: 20, priceCents: 400, popular: false },
  { id: "plus", name: "Plus", credits: 60, priceCents: 1000, popular: true },
  { id: "pro", name: "Pro", credits: 150, priceCents: 2000, popular: false },
];

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const usdWhole = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

/** "$4" for whole dollars, "$0.17" otherwise. */
export function formatUsd(cents: number): string {
  return cents % 100 === 0 ? usdWhole.format(cents / 100) : usd.format(cents / 100);
}

/** "$0.17 per credit", rounded to the nearest cent. */
export function pricePerCredit(pack: CreditPack): string {
  return `${formatUsd(Math.round(pack.priceCents / pack.credits))} per credit`;
}
