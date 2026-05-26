"use client";

import Link from "next/link";
import { Eye, LockKeyhole } from "lucide-react";
import { sampleForms, sampleResponses, summarizeForm } from "@repo/forms";
import { trpc } from "~/trpc/client";

export default function ExplorePage() {
  const { data: apiForms, isLoading } = trpc.forms.listExplore.useQuery();
  const publicForms = apiForms?.length ? apiForms : sampleForms.filter((form) => form.status === "published" && form.visibility === "public");
  const hiddenForms = sampleForms.filter((form) => form.visibility === "unlisted");

  return (
    <main className="min-h-screen bg-white px-6 py-8 text-[#171813]">
      <div className="mx-auto max-w-7xl">
        <nav className="flex items-center justify-between">
          <Link href="/" className="text-xl font-semibold">ChaiForms</Link>
          <Link href="/pricing" className="rounded-md border border-black/10 px-4 py-2 text-sm">Pricing</Link>
        </nav>
        <section className="py-12">
          <h1 className="text-5xl font-semibold tracking-tight">Public form gallery</h1>
          <p className="mt-4 max-w-2xl text-black/60">Only published forms marked public are listed here. Unlisted forms stay out of the gallery and work only through a direct link.</p>
          {isLoading ? <p className="mt-8 text-sm text-black/60">Loading public forms...</p> : null}
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            {publicForms.map((form) => {
              const stats = summarizeForm(form, sampleResponses);
              return (
                <Link key={form.id} href={`/forms/${form.slug}`} className="rounded-lg border border-black/10 p-5 transition hover:border-black/30" style={{ background: form.theme.background }}>
                  <div className="flex items-center gap-2 text-sm font-medium" style={{ color: form.theme.accent }}><Eye className="h-4 w-4" /> Public</div>
                  <h2 className="mt-4 text-2xl font-semibold">{form.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-black/60">{form.description}</p>
                  <div className="mt-5 flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full bg-white px-3 py-1">{form.fields.length} fields</span>
                    <span className="rounded-full bg-white px-3 py-1">{stats.responses} responses</span>
                    <span className="rounded-full bg-white px-3 py-1">{stats.completionRate}% completion</span>
                  </div>
                </Link>
              );
            })}
          </div>
          <div className="mt-10 rounded-lg border border-dashed border-black/20 bg-[#f7f8f3] p-5">
            <div className="flex items-center gap-2 font-medium"><LockKeyhole className="h-4 w-4" /> Unlisted demo form</div>
            <p className="mt-2 text-sm text-black/60">{hiddenForms[0]?.title} is intentionally hidden here. Direct link: <Link className="underline" href={`/forms/${hiddenForms[0]?.slug}`}>/forms/{hiddenForms[0]?.slug}</Link></p>
          </div>
        </section>
      </div>
    </main>
  );
}
