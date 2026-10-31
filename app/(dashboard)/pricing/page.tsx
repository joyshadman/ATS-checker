import type { Metadata } from "next";
import Link from "next/link";
import { getAiBalanceForUser } from "@/actions/credits";
import { BuyButton } from "@/components/pricing/buy-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { CheckCircle2 } from "@/components/ui/icons";
import { PageHeader } from "@/components/ui/page-header";
import { AI_FREE_USES, balanceLabel } from "@/lib/ai/credits-shared";
import { CREDIT_PACKS, formatUsd, pricePerCredit } from "@/lib/pricing/packs";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Credit packs for AI writing in the Resume Maker.",
};

const BALANCE_UNAVAILABLE = "Your balance could not be loaded right now.";

const COSTS_A_USE = [
  "AI writing in the Resume Maker: summary, bullets, and skills",
  "Importing a resume into the editor",
  "Every request counts, Try again and style chips included",
];

const ALWAYS_FREE = [
  "ATS analysis and job match",
  "Interview questions",
  "Improve Resume",
  "Cover letter analysis and improvement",
];

const FAQ = [
  { q: "Do credits expire?", a: "No. Credits never expire." },
  { q: "What if an AI request fails?", a: "You are not charged. The use is given back automatically." },
  {
    q: "When can I buy credits?",
    a: "Payments are coming soon. Until then the Buy buttons only show this notice.",
  },
];

function TagIcon({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
      <path d="M7 7h.01" />
    </svg>
  );
}

function SectionTitle({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="text-lg font-semibold text-foreground flex items-center gap-2.5">
      <span className="w-1.5 h-5 rounded-full bg-gradient-accent inline-block" aria-hidden="true" />
      {children}
    </h2>
  );
}

function PlanCard({
  name,
  price,
  amount,
  detail,
  popular = false,
  action,
}: {
  name: string;
  price: string;
  amount: string;
  detail: string;
  popular?: boolean;
  action: React.ReactNode;
}) {
  return (
    <li
      className={`relative flex flex-col rounded-2xl border bg-card p-6 shadow-card transition-shadow ${
        popular ? "border-accent/60 shadow-glow" : ""
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-base font-semibold text-foreground">{name}</h3>
        {popular && <Badge variant="primary">Most popular</Badge>}
      </div>
      <p className="mt-1 text-sm text-muted">{amount}</p>
      <p className="mt-5 text-4xl font-bold tracking-tight text-foreground">{price}</p>
      <p className="mt-1 text-xs text-muted">{detail}</p>
      <div className="mt-auto pt-6">{action}</div>
    </li>
  );
}

export default async function PricingPage() {
  const balance = await getAiBalanceForUser();

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="animate-slide-up">
        <PageHeader
          icon={<TagIcon />}
          title="Pricing"
          description="Get more AI writing in the Resume Maker. Everything else stays free."
        />
      </div>

      {/* Balance */}
      <Card variant="gradient" className="animate-slide-up stagger-1">
        <CardContent className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 py-6">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">Your AI balance</p>
            {balance.success ? (
              <>
                <p className="mt-1 text-2xl font-bold text-foreground">{balanceLabel(balance.data)}</p>
                <p className="mt-1 text-sm text-muted">Free uses are spent before credits.</p>
              </>
            ) : (
              <p className="mt-1 text-sm text-muted">{BALANCE_UNAVAILABLE}</p>
            )}
          </div>
          <Link
            href="/resumes/new"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-primary px-4 py-2.5 text-sm font-medium text-cream shadow-sm hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Open Resume Maker
          </Link>
        </CardContent>
      </Card>

      {/* Plans */}
      <section aria-labelledby="plans-heading" className="space-y-4 animate-slide-up stagger-2">
        <SectionTitle id="plans-heading">Plans</SectionTitle>
        <ul className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
          <PlanCard
            name="Free"
            price="$0"
            amount={`${AI_FREE_USES} AI uses, once per account`}
            detail="Included with every account"
            action={
              <p className="flex items-center gap-2 rounded-xl bg-surface px-4 py-2 text-sm text-muted">
                <CheckCircle2 className="h-4 w-4 text-success shrink-0" aria-hidden="true" />
                Yours already
              </p>
            }
          />
          {CREDIT_PACKS.map((pack) => (
            <PlanCard
              key={pack.id}
              name={pack.name}
              price={formatUsd(pack.priceCents)}
              amount={`${pack.credits} credits`}
              detail={pricePerCredit(pack)}
              popular={pack.popular}
              action={<BuyButton packName={pack.name} popular={pack.popular} />}
            />
          ))}
        </ul>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* What uses a credit */}
        <Card className="lg:col-span-3 animate-slide-up stagger-3">
          <CardHeader>
            <SectionTitle id="uses-heading">What uses a credit</SectionTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Costs 1 use</h3>
                <ul className="mt-2 space-y-2 text-sm text-muted">
                  {COSTS_A_USE.map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-accent shrink-0" aria-hidden="true" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">Always free</h3>
                <ul className="mt-2 space-y-2 text-sm text-muted">
                  {ALWAYS_FREE.map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 text-success shrink-0" aria-hidden="true" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <p className="rounded-xl bg-surface px-4 py-3 text-sm text-muted">
              A failed AI request costs nothing, and free uses are spent before credits.
            </p>
          </CardContent>
        </Card>

        {/* FAQ */}
        <Card className="lg:col-span-2 animate-slide-up stagger-4">
          <CardHeader>
            <SectionTitle id="faq-heading">Questions</SectionTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-4">
              {FAQ.map((item) => (
                <div key={item.q}>
                  <dt className="text-sm font-semibold text-foreground">{item.q}</dt>
                  <dd className="mt-1 text-sm text-muted">{item.a}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
