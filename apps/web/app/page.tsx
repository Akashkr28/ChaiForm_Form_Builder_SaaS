import Link from "next/link";
import { ArrowRight, BarChart3, CheckCircle2, FileText, Github, Linkedin, LockKeyhole, Mail, Palette, Send, Sparkles, Twitter } from "lucide-react";
import { sampleForms, sampleResponses, summarizeForm } from "@repo/forms";
import type { LucideIcon } from "lucide-react";

const features: Array<{ title: string; body: string; Icon: LucideIcon }> = [
  { title: "Dynamic builder", body: "Add text, email, number, select, multi-select, checkbox, rating and date fields.", Icon: FileText },
  { title: "Visibility controls", body: "Public forms appear in explore. Unlisted links stay hidden from listings.", Icon: LockKeyhole },
  { title: "Response analytics", body: `${sampleResponses.length} seeded responses power conversion and field breakdowns.`, Icon: BarChart3 },
  { title: "Email flow", body: "Creator alerts and respondent thank-you events are queued for every submission.", Icon: Mail },
];

const footerGroups = [
  {
    title: "Product",
    links: [
      { label: "Dashboard", href: "/dashboard" },
      { label: "Explore", href: "/explore" },
      { label: "Pricing", href: "/pricing" },
      { label: "API docs", href: "http://localhost:8000/docs" },
    ],
  },
  {
    title: "Use cases",
    links: [
      { label: "Lead capture", href: "/explore" },
      { label: "Event RSVPs", href: "/forms/anime-night-rsvp" },
      { label: "Applications", href: "/forms/startup-sprint-2026" },
      { label: "Beta feedback", href: "/forms/os-beta-feedback" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/" },
      { label: "Contact", href: "mailto:hello@chaiforms.dev" },
      { label: "Status", href: "/dashboard" },
      { label: "Security", href: "/pricing" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy", href: "/pricing" },
      { label: "Terms", href: "/pricing" },
      { label: "DPA", href: "/pricing" },
      { label: "Acceptable use", href: "/pricing" },
    ],
  },
];

const guideSteps = [
  {
    title: "Design the questions",
    body: "Add typed fields, required rules, options, rating scales and validation in a clean creator workspace.",
    Icon: FileText,
  },
  {
    title: "Choose how it appears",
    body: "Publish forms as public gallery entries or unlisted links, then style each form with a theme that fits the audience.",
    Icon: Palette,
  },
  {
    title: "Share and learn",
    body: "Collect public responses, queue emails, review analytics and export submissions when your workflow needs them.",
    Icon: Send,
  },
];

export default function Home() {
  const publicForms = sampleForms.filter((form) => form.visibility === "public");
  return (
    <main className="min-h-screen bg-[#f7f8f3] text-[#171813]">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
        <Link href="/" className="text-xl font-semibold tracking-tight">ChaiForms</Link>
        <div className="flex items-center gap-2 text-sm">
          <Link href="/explore" className="rounded-md px-3 py-2 hover:bg-black/5">Explore</Link>
          <Link href="/pricing" className="rounded-md px-3 py-2 hover:bg-black/5">Pricing</Link>
          <Link href="/dashboard" className="rounded-md bg-[#171813] px-4 py-2 text-white">Dashboard</Link>
        </div>
      </nav>

      <section className="mx-auto grid max-w-7xl gap-10 px-6 pb-14 pt-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        <div>
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-3 py-1 text-sm">
            <Sparkles className="h-4 w-4 text-[#f05a28]" />
            Production-ready form builder for teams and communities
          </div>
          <h1 className="max-w-4xl text-5xl font-semibold leading-[1.05] tracking-tight md:text-7xl">
            Build, publish and measure forms without glue code.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-black/65">
            ChaiForms is a production-style Typeform alternative with dynamic schemas, public and unlisted links, analytics, email flows, API docs and seeded demo content.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/auth" className="inline-flex items-center gap-2 rounded-md bg-[#171813] px-5 py-3 text-sm font-medium text-white">
              Create your account <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/explore" className="inline-flex items-center gap-2 rounded-md border border-black/15 bg-white px-5 py-3 text-sm font-medium">
              Browse public forms
            </Link>
          </div>
        </div>

        <div className="rounded-lg border border-black/10 bg-white p-4 shadow-sm">
          <div className="grid gap-3">
            {publicForms.map((form) => {
              const stats = summarizeForm(form, sampleResponses);
              return (
                <Link key={form.id} href={`/forms/${form.slug}`} className="rounded-md border border-black/10 p-4 transition hover:border-black/25" style={{ background: form.theme.background }}>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium" style={{ color: form.theme.accent }}>{form.theme.name}</p>
                      <h2 className="mt-1 text-xl font-semibold">{form.title}</h2>
                      <p className="mt-2 text-sm text-black/60">{form.description}</p>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-medium">{form.visibility}</span>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
                    <span>{stats.views} views</span>
                    <span>{stats.responses} responses</span>
                    <span>{stats.completionRate}% complete</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section className="border-y border-black/10 bg-white">
        <div className="mx-auto grid max-w-7xl gap-4 px-6 py-10 md:grid-cols-4">
          {features.map(({ title, body, Icon }) => (
            <div key={title} className="rounded-md border border-black/10 p-5">
              <Icon className="h-5 w-5 text-[#0f766e]" />
              <h3 className="mt-4 font-semibold">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-black/60">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-6 py-14 lg:grid-cols-[1fr_0.9fr] lg:items-center">
        <figure className="overflow-hidden rounded-lg border border-black/10 bg-white shadow-sm">
          <div className="flex items-center gap-2 border-b border-black/10 bg-[#f7f8f3] px-4 py-3">
            <span className="h-2.5 w-2.5 rounded-full bg-[#ef4444]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#f59e0b]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#10b981]" />
            <span className="ml-3 rounded-md bg-white px-3 py-1 text-xs text-black/50">chaiforms.dev/forms/startup-sprint</span>
          </div>
          <div className="grid gap-5 p-5 md:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-md bg-[#fff7ed] p-4">
              <p className="text-xs font-medium text-[#ff5a1f]">YC Neon</p>
              <h3 className="mt-2 text-2xl font-semibold leading-tight">Startup Sprint Application</h3>
              <p className="mt-3 text-sm leading-6 text-black/60">Collect founder details, idea summaries, team size and stage in one polished form.</p>
              <div className="mt-5 space-y-3">
                {["Founder name", "Work email", "Current stage"].map((label) => (
                  <div key={label} className="rounded-md border border-black/10 bg-white px-3 py-3 text-sm text-black/55">{label}</div>
                ))}
              </div>
            </div>
            <div className="space-y-4">
              <div className="rounded-md border border-black/10 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Responses</p>
                  <span className="rounded-full bg-[#ecfdf5] px-2 py-1 text-xs text-[#047857]">Live</span>
                </div>
                <div className="mt-4 flex h-28 items-end gap-2">
                  {[44, 72, 58, 92, 66, 104, 84].map((height, index) => (
                    <span key={index} className="flex-1 rounded-t-sm bg-[#0f766e]" style={{ height }} />
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center text-sm">
                <div className="rounded-md border border-black/10 p-3"><strong className="block text-lg">412</strong><span className="text-black/50">views</span></div>
                <div className="rounded-md border border-black/10 p-3"><strong className="block text-lg">86%</strong><span className="text-black/50">complete</span></div>
                <div className="rounded-md border border-black/10 p-3"><strong className="block text-lg">24</strong><span className="text-black/50">exports</span></div>
              </div>
            </div>
          </div>
        </figure>

        <div>
          <p className="text-sm font-medium text-[#0f766e]">Short guide</p>
          <h2 className="mt-3 text-4xl font-semibold tracking-tight">From idea to response data in three calm steps.</h2>
          <p className="mt-4 leading-7 text-black/60">
            ChaiForms keeps the creator flow focused: build the schema, publish the right kind of link, then use the response data without leaving the product.
          </p>
          <div className="mt-7 space-y-5">
            {guideSteps.map(({ title, body, Icon }) => (
              <div key={title} className="flex gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[#171813] text-white">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold">{title}</h3>
                  <p className="mt-1 text-sm leading-6 text-black/60">{body}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-7 flex items-center gap-2 text-sm font-medium text-[#0f766e]">
            <CheckCircle2 className="h-4 w-4" />
            Built for real signups, public submissions and database-backed analytics.
          </div>
        </div>
      </section>

      <footer className="border-t border-black/10 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-10">
          <div className="grid gap-10 lg:grid-cols-[1.15fr_2fr]">
            <div>
              <Link href="/" className="text-2xl font-semibold tracking-tight">ChaiForms</Link>
              <p className="mt-4 max-w-sm text-sm leading-6 text-black/60">
                Build dynamic forms, publish polished links, and collect responses with a type-safe API behind the scenes.
              </p>
              <div className="mt-5 flex items-center gap-2">
                {[
                  { label: "Twitter", href: "https://twitter.com", Icon: Twitter },
                  { label: "GitHub", href: "https://github.com", Icon: Github },
                  { label: "LinkedIn", href: "https://linkedin.com", Icon: Linkedin },
                ].map(({ label, href, Icon }) => (
                  <Link key={label} href={href} aria-label={label} className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-black/10 text-black/65 transition hover:border-black/25 hover:text-black">
                    <Icon className="h-4 w-4" />
                  </Link>
                ))}
              </div>
            </div>

            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {footerGroups.map((group) => (
                <div key={group.title}>
                  <h3 className="text-sm font-semibold">{group.title}</h3>
                  <div className="mt-4 space-y-3">
                    {group.links.map((item) => (
                      <Link key={item.label} href={item.href} className="block text-sm text-black/60 transition hover:text-black">
                        {item.label}
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-10 flex flex-col gap-4 border-t border-black/10 pt-6 text-sm text-black/55 md:flex-row md:items-center md:justify-between">
            <p>© 2026 ChaiForms. All rights reserved.</p>
            <div className="flex flex-wrap gap-4">
              <span>Built with Turborepo</span>
              <span>tRPC</span>
              <span>Zod</span>
              <span>Drizzle</span>
              <span>Scalar</span>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
