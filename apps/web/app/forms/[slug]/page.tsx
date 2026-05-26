"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { ArrowLeft, CheckCircle2, LockKeyhole, Send } from "lucide-react";
import { buildResponseValidator, type FormField } from "@repo/forms";
import { trpc } from "~/trpc/client";

function defaultValue(field: FormField) {
  if (field.type === "multi_select") return [];
  if (field.type === "checkbox") return false;
  return "";
}

export default function PublicFormPage() {
  const params = useParams<{ slug: string }>();
  const searchParams = useSearchParams();
  const isPreview = searchParams.get("preview") === "1";
  const { data, isLoading } = trpc.forms.getPublicBySlug.useQuery({ slug: params.slug });
  const form = data?.form;
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [password, setPassword] = useState("");
  const [respondentEmail, setRespondentEmail] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const mutation = trpc.forms.submitResponse.useMutation();

  const validator = useMemo(() => (form ? buildResponseValidator(form.fields) : null), [form]);

  useEffect(() => {
    if (form) {
      setValues(Object.fromEntries(form.fields.map((field) => [field.id, defaultValue(field)])));
    }
  }, [form]);

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f8f3] p-6">
        <div className="rounded-lg bg-white p-6 shadow-sm">Loading form...</div>
      </main>
    );
  }

  if (!form) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f8f3] p-6">
        <div className="max-w-md rounded-lg bg-white p-6 text-center shadow-sm">
          <h1 className="text-2xl font-semibold">Form not found</h1>
          <p className="mt-2 text-sm text-black/60">{data?.unavailableReason ?? "This link is invalid or the form was removed."}</p>
          <Link href="/explore" className="mt-5 inline-flex rounded-md bg-[#171813] px-4 py-2 text-sm text-white">Explore forms</Link>
        </div>
      </main>
    );
  }

  if (form.status !== "published") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f8f3] p-6">
        <div className="max-w-md rounded-lg bg-white p-6 text-center shadow-sm">
          <h1 className="text-2xl font-semibold">This form is unavailable</h1>
          <p className="mt-2 text-sm text-black/60">The creator has unpublished this form, so it is not accepting responses.</p>
        </div>
      </main>
    );
  }

  async function submit() {
    if (!form || !validator) return;
    setError("");
    const parsed = validator.safeParse(values);
    if (!parsed.success) {
      setError(parsed.error.issues.at(0)?.message ?? "Please check your answers.");
      return;
    }

    const result = await mutation.mutateAsync({
      slug: form.slug,
      password: password || undefined,
      respondentEmail: respondentEmail || undefined,
      values: parsed.data,
    });

    if (!result.ok) {
      setError(result.message ?? "Could not submit this response.");
      return;
    }
    setDone(true);
  }

  return (
    <main className="min-h-screen px-6 py-8" style={{ background: form.theme.background, color: form.theme.foreground }}>
      <div className="mx-auto max-w-3xl">
        <nav className="flex items-center justify-between text-sm">
          <Link href="/" className="font-semibold">ChaiForms</Link>
          <div className="flex items-center gap-2">
            {isPreview ? (
              <Link href="/dashboard" className="inline-flex items-center gap-2 rounded-md bg-[#171813] px-3 py-2 text-sm text-white">
                <ArrowLeft className="h-4 w-4" /> Dashboard
              </Link>
            ) : null}
            <span className="rounded-full bg-white px-3 py-1">{form.visibility}</span>
          </div>
        </nav>

        {done ? (
          <section className="mt-12 rounded-lg bg-white p-8 text-center shadow-sm">
            <CheckCircle2 className="mx-auto h-12 w-12" style={{ color: form.theme.accent }} />
            <h1 className="mt-5 text-3xl font-semibold">Thanks, response received.</h1>
            <p className="mt-3 text-black/60">The creator notification and respondent thank-you email have been queued in the demo email flow.</p>
            <Link href={isPreview ? "/dashboard" : "/explore"} className="mt-6 inline-flex items-center gap-2 rounded-md bg-[#171813] px-4 py-2 text-sm text-white">
              {isPreview ? <ArrowLeft className="h-4 w-4" /> : null}
              {isPreview ? "Back to dashboard" : "Back to explore"}
            </Link>
          </section>
        ) : (
          <section className="mt-10 rounded-lg bg-white p-6 shadow-sm md:p-8" style={{ borderRadius: form.theme.radius }}>
            <p className="text-sm font-medium" style={{ color: form.theme.accent }}>{form.theme.name}</p>
            <h1 className="mt-2 text-4xl font-semibold tracking-tight">{form.title}</h1>
            <p className="mt-3 leading-7 text-black/60">{form.description}</p>

            {form.password ? (
              <label className="mt-8 block">
                <span className="flex items-center gap-2 text-sm font-medium"><LockKeyhole className="h-4 w-4" /> Form password</span>
                <input value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 w-full rounded-md border border-black/15 px-3 py-3" placeholder="Hint: beta" type="password" />
              </label>
            ) : null}

            <label className="mt-6 block">
              <span className="text-sm font-medium">Email for confirmation</span>
              <input value={respondentEmail} onChange={(event) => setRespondentEmail(event.target.value)} className="mt-2 w-full rounded-md border border-black/15 px-3 py-3" placeholder="you@example.com" type="email" />
            </label>

            <div className="mt-6 space-y-6">
              {form.fields.map((field) => (
                <FieldInput key={field.id} field={field} value={values[field.id]} onChange={(value) => setValues((current) => ({ ...current, [field.id]: value }))} accent={form.theme.accent} />
              ))}
            </div>

            {error ? <p className="mt-5 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
            <button onClick={submit} disabled={mutation.isPending} className="mt-8 inline-flex items-center gap-2 rounded-md bg-[#171813] px-5 py-3 text-sm font-medium text-white disabled:opacity-60">
              <Send className="h-4 w-4" /> {mutation.isPending ? "Submitting..." : "Submit response"}
            </button>
          </section>
        )}
      </div>
    </main>
  );
}

function FieldInput({ field, value, onChange, accent }: { field: FormField; value: unknown; onChange: (value: unknown) => void; accent: string }) {
  const label = `${field.label}${field.required ? " *" : ""}`;
  const base = "mt-2 w-full rounded-md border border-black/15 px-3 py-3";

  if (field.type === "long_text") {
    return <label className="block"><span className="text-sm font-medium">{label}</span><textarea value={String(value ?? "")} onChange={(event) => onChange(event.target.value)} className={`${base} min-h-28`} placeholder={field.placeholder} /></label>;
  }
  if (field.type === "single_select") {
    return <label className="block"><span className="text-sm font-medium">{label}</span><select value={String(value ?? "")} onChange={(event) => onChange(event.target.value)} className={base}><option value="">Select one</option>{field.options.map((option) => <option key={option}>{option}</option>)}</select></label>;
  }
  if (field.type === "multi_select") {
    const selected = Array.isArray(value) ? value : [];
    return (
      <div>
        <p className="text-sm font-medium">{label}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {field.options.map((option) => {
            const active = selected.includes(option);
            return <button key={option} type="button" onClick={() => onChange(active ? selected.filter((item) => item !== option) : [...selected, option])} className="rounded-full border px-3 py-2 text-sm" style={{ borderColor: active ? accent : "rgba(0,0,0,.15)", background: active ? accent : "white", color: active ? "white" : "inherit" }}>{option}</button>;
          })}
        </div>
      </div>
    );
  }
  if (field.type === "checkbox") {
    return <label className="flex items-center gap-3 text-sm font-medium"><input type="checkbox" checked={Boolean(value)} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4" />{label}</label>;
  }
  if (field.type === "rating") {
    return <label className="block"><span className="text-sm font-medium">{label}</span><input type="range" min="1" max="5" value={Number(value || 3)} onChange={(event) => onChange(Number(event.target.value))} className="mt-4 w-full" /><span className="text-sm text-black/60">Rating: {Number(value || 3)}</span></label>;
  }
  return <label className="block"><span className="text-sm font-medium">{label}</span><input value={String(value ?? "")} onChange={(event) => onChange(field.type === "number" ? Number(event.target.value) : event.target.value)} className={base} type={field.type === "email" ? "email" : field.type === "date" ? "date" : field.type === "number" ? "number" : "text"} placeholder={field.placeholder} /></label>;
}
