import Link from "next/link";
import { Check } from "lucide-react";

const plans = [
  { name: "Starter", price: "$0", copy: "For individuals and small communities.", features: ["3 published forms", "100 responses", "Explore listing", "CSV export"] },
  { name: "Pro", price: "$19", copy: "For creators running serious workflows.", features: ["Unlimited forms", "Unlisted links", "Password forms", "Email notifications", "Analytics dashboard"] },
  { name: "Scale", price: "$79", copy: "For teams with API-first operations.", features: ["Admin dashboard", "API access", "Rate limits", "Custom themes", "Priority support"] },
];

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-[#f7f8f3] px-6 py-8 text-[#171813]">
      <div className="mx-auto max-w-7xl">
        <nav className="flex items-center justify-between">
          <Link href="/" className="text-xl font-semibold">ChaiForms</Link>
          <Link href="/dashboard" className="rounded-md bg-[#171813] px-4 py-2 text-sm text-white">Dashboard</Link>
        </nav>
        <section className="py-14">
          <h1 className="text-5xl font-semibold tracking-tight">Simple pricing for form-heavy teams.</h1>
          <p className="mt-4 max-w-2xl text-black/60">Real payment integration is intentionally mocked, but the product surface is ready for a billing provider.</p>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {plans.map((plan) => (
              <div key={plan.name} className="rounded-lg border border-black/10 bg-white p-6">
                <h2 className="text-xl font-semibold">{plan.name}</h2>
                <p className="mt-4 text-4xl font-semibold">{plan.price}<span className="text-sm font-normal text-black/50"> /mo</span></p>
                <p className="mt-3 min-h-12 text-sm leading-6 text-black/60">{plan.copy}</p>
                <Link href="/auth" className="mt-6 block rounded-md bg-[#171813] px-4 py-3 text-center text-sm font-medium text-white">Choose plan</Link>
                <div className="mt-6 space-y-3">
                  {plan.features.map((feature) => (
                    <p key={feature} className="flex items-center gap-2 text-sm"><Check className="h-4 w-4 text-[#0f766e]" />{feature}</p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
