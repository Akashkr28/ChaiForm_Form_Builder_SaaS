"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import QRCode from "qrcode";
import { BarChart3, Copy, Download, Eye, FilePlus2, Globe2, LockKeyhole, LogOut, Mail, MessageCircle, Pencil, Plus, Radio, Save, Send, Settings, Share2, ShieldCheck, Sparkles, Trash2, TrendingUp, Users, X } from "lucide-react";
import { sampleForms, sampleResponses, summarizeForm, type FieldType, type FormField, type FormRecord } from "@repo/forms";
import { trpc } from "~/trpc/client";
import { env } from "~/env";

const templateFields = [
  { id: "name", type: "short_text" as const, label: "Name", required: true, options: [], validation: {} },
  { id: "email", type: "email" as const, label: "Email", required: true, options: [], validation: {} },
  { id: "feedback", type: "long_text" as const, label: "Feedback", required: true, options: [], validation: {} },
  { id: "score", type: "rating" as const, label: "Score", required: true, options: [], validation: { min: 1, max: 5 } },
];

const fieldTypes: FieldType[] = ["short_text", "long_text", "email", "number", "single_select", "multi_select", "checkbox", "rating", "date"];

const buttonBase = "inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition hover:-translate-y-px hover:shadow-sm disabled:pointer-events-none disabled:opacity-50";

function patchForFieldType(type: FieldType, currentOptions: string[] = []) {
  return {
    type,
    options: ["single_select", "multi_select"].includes(type) ? currentOptions : [],
    validation: {},
  };
}

function statusTone(status: FormRecord["status"]) {
  if (status === "published") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "archived") return "border-zinc-200 bg-zinc-100 text-zinc-600";
  return "border-amber-200 bg-amber-50 text-amber-700";
}

function visibilityTone(visibility: FormRecord["visibility"]) {
  return visibility === "public" ? "border-sky-200 bg-sky-50 text-sky-700" : "border-violet-200 bg-violet-50 text-violet-700";
}

export default function DashboardPage() {
  const [token, setToken] = useState<string | null>(null);
  const [selected, setSelected] = useState(sampleForms[0]?.id ?? "");
  const [userEmail, setUserEmail] = useState("");
  const [userName, setUserName] = useState("");
  const [title, setTitle] = useState("Community Launch Feedback");
  const [description, setDescription] = useState("A focused form for collecting structured feedback.");
  const [visibility, setVisibility] = useState<"public" | "unlisted">("unlisted");
  const [responseQuery, setResponseQuery] = useState("");
  const [responsePage, setResponsePage] = useState(1);
  const [draftFields, setDraftFields] = useState<FormField[]>(templateFields);
  const [origin, setOrigin] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [shareStatus, setShareStatus] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editVisibility, setEditVisibility] = useState<"public" | "unlisted">("unlisted");
  const [editFields, setEditFields] = useState<FormField[]>([]);
  const listMine = trpc.forms.listMine.useQuery(undefined, { enabled: Boolean(token) });
  const me = trpc.auth.me.useQuery(undefined, { enabled: Boolean(token) });
  const createForm = trpc.forms.create.useMutation();
  const updateForm = trpc.forms.update.useMutation();
  const setStatus = trpc.forms.setStatus.useMutation();
  const cloneForm = trpc.forms.clone.useMutation();
  const deleteForm = trpc.forms.delete.useMutation();

  useEffect(() => {
    setToken(window.localStorage.getItem("chaiforms_session_token"));
    setUserEmail(window.localStorage.getItem("chaiforms_user_email") ?? "");
    setUserName(window.localStorage.getItem("chaiforms_user_name") ?? "");
    setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    if (me.data?.user) {
      setUserName(me.data.user.fullName);
      window.localStorage.setItem("chaiforms_user_name", me.data.user.fullName);
      if (!me.data.user.onboardingCompleted) window.location.href = "/onboarding";
    }
  }, [me.data]);

  const forms = token ? listMine.data ?? [] : [];
  const active = forms.find((form) => form.id === selected) ?? forms[0];
  const responsesQuery = trpc.forms.responsesPage.useQuery({ id: active?.id ?? "", page: responsePage, pageSize: 8, query: responseQuery || undefined }, { enabled: Boolean(token && active?.id) });
  const analyticsQuery = trpc.forms.analytics.useQuery({ id: active?.id ?? "" }, { enabled: Boolean(token && active?.id) });
  const analytics = analyticsQuery.data ?? (active ? summarizeForm(active, sampleResponses) : null);
  const responses = responsesQuery.data?.items?.length ? responsesQuery.data.items : active ? sampleResponses.filter((response) => response.formId === active.id) : [];
  const formUrl = active ? `${origin || "http://localhost:3000"}/forms/${active.slug}` : "";
  const apiBaseUrl = (env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/trpc").replace(/\/trpc$/, "");
  const publishedForms = forms.filter((form) => form.status === "published").length;
  const publicForms = forms.filter((form) => form.visibility === "public").length;

  useEffect(() => {
    if (!active) return;
    setIsEditing(false);
    setEditTitle(active.title);
    setEditDescription(active.description);
    setEditVisibility(active.visibility);
    setEditFields(active.fields);
  }, [active?.id]);

  useEffect(() => {
    let cancelled = false;
    async function generateQr() {
      if (!formUrl) {
        setQrDataUrl("");
        return;
      }
      const dataUrl = await QRCode.toDataURL(formUrl, {
        errorCorrectionLevel: "H",
        margin: 2,
        scale: 8,
        color: {
          dark: "#171813",
          light: "#f7f8f3",
        },
      });
      if (!cancelled) setQrDataUrl(dataUrl);
    }
    generateQr().catch(() => setQrDataUrl(""));
    return () => {
      cancelled = true;
    };
  }, [formUrl]);

  const csv = useMemo(() => {
    if (!active) return "";
    const headers = ["submittedAt", ...active.fields.map((field) => field.id)];
    const rows = responses.map((response) => headers.map((header) => JSON.stringify(response.values[header] ?? response[header as keyof typeof response] ?? "")).join(","));
    return [headers.join(","), ...rows].join("\n");
  }, [active, responses]);

  function logout() {
    window.localStorage.removeItem("chaiforms_session_token");
    window.localStorage.removeItem("chaiforms_user_email");
    window.localStorage.removeItem("chaiforms_user_name");
    setToken(null);
    setUserEmail("");
    setUserName("");
  }

  async function createDemoForm() {
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const form = await createForm.mutateAsync({
      title,
      description,
      slug: `${slug}-${Math.random().toString(36).slice(2, 5)}`,
      visibility,
      status: "draft",
      fields: draftFields.length ? draftFields : templateFields,
      theme: { name: "Builder Green", accent: "#0f766e", background: "#f0fdfa", surface: "#ffffff", foreground: "#12201c", radius: 8 },
    });
    setSelected(form.id);
    await listMine.refetch();
  }

  function addField() {
    setDraftFields((fields) => [
      ...fields,
      {
        id: `field_${fields.length + 1}`,
        type: "short_text",
        label: `Question ${fields.length + 1}`,
        required: false,
        options: [],
        validation: {},
      },
    ]);
  }

  function updateDraftField(index: number, patch: Partial<FormField>) {
    setDraftFields((fields) => fields.map((field, currentIndex) => (currentIndex === index ? { ...field, ...patch } : field)));
  }

  function addEditField() {
    setEditFields((fields) => [
      ...fields,
      {
        id: `field_${fields.length + 1}`,
        type: "short_text",
        label: `Question ${fields.length + 1}`,
        required: false,
        options: [],
        validation: {},
      },
    ]);
  }

  function updateEditField(index: number, patch: Partial<FormField>) {
    setEditFields((fields) => fields.map((field, currentIndex) => (currentIndex === index ? { ...field, ...patch } : field)));
  }

  async function saveActiveForm(form: FormRecord) {
    const updated = await updateForm.mutateAsync({
      id: form.id,
      title: editTitle,
      description: editDescription,
      slug: form.slug,
      visibility: editVisibility,
      status: form.status,
      fields: editFields.length ? editFields : form.fields,
      theme: form.theme,
      responseLimit: form.responseLimit,
      expiresAt: form.expiresAt,
    });
    setSelected(updated.id);
    setIsEditing(false);
    await listMine.refetch();
  }

  async function togglePublish(form: FormRecord) {
    await setStatus.mutateAsync({ id: form.id, status: form.status === "published" ? "draft" : "published" });
    await listMine.refetch();
  }

  async function removeActiveForm(form: FormRecord) {
    const confirmed = window.confirm(`Delete "${form.title}" and its responses? This cannot be undone.`);
    if (!confirmed) return;
    await deleteForm.mutateAsync({ id: form.id });
    const result = await listMine.refetch();
    setSelected(result.data?.[0]?.id ?? "");
  }

  async function qrFile() {
    if (!qrDataUrl || !active) return null;
    const response = await fetch(qrDataUrl);
    const blob = await response.blob();
    return new File([blob], `${active.slug}-qr.png`, { type: "image/png" });
  }

  async function shareQr() {
    if (!active || !formUrl) return;
    setShareStatus("");
    const file = await qrFile();
    const payload = {
      title: `${active.title} QR`,
      text: `Open ${active.title} on ChaiForms`,
      url: formUrl,
    };

    if (file && navigator.canShare?.({ files: [file] })) {
      await navigator.share({ ...payload, files: [file] });
      setShareStatus("QR shared.");
      return;
    }

    if (navigator.share) {
      await navigator.share(payload);
      setShareStatus("Form link shared.");
      return;
    }

    await navigator.clipboard.writeText(formUrl);
    setShareStatus("Form link copied.");
  }

  function shareQrViaMail() {
    if (!active || !formUrl) return;
    const subject = encodeURIComponent(`${active.title} QR`);
    const body = encodeURIComponent(`Here is the ChaiForms form link:\n\n${formUrl}\n\nThis form has a generated QR code available from the ChaiForms dashboard.`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
    setShareStatus("Opening your mail app.");
  }

  function shareQrOnWhatsapp() {
    if (!active || !formUrl) return;
    const message = encodeURIComponent(`Scan or open this ChaiForms link for "${active.title}": ${formUrl}`);
    window.open(`https://wa.me/?text=${message}`, "_blank", "noopener,noreferrer");
    setShareStatus("Opening WhatsApp share.");
  }

  return (
    <main className="min-h-screen bg-[#f4f6f1] text-[#171813]">
      <div className="border-b border-black/10 bg-[#f7f8f3]/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1460px] flex-wrap items-center justify-between gap-3 px-6 py-4">
          <Link href="/" className="flex items-center gap-2 text-xl font-semibold">
            <span className="grid h-8 w-8 place-items-center rounded-md bg-[#171813] text-sm text-white">C</span>
            ChaiForms
          </Link>
          <div className="flex items-center gap-2 text-sm">
            <Link href="/explore" className={`${buttonBase} border border-black/10 bg-white text-[#171813]`}><Globe2 className="h-4 w-4" /> Explore</Link>
            <a href={`${apiBaseUrl}/docs`} className={`${buttonBase} border border-black/10 bg-white text-[#171813]`}><Sparkles className="h-4 w-4" /> API docs</a>
            {token ? (
              <>
                <span className="hidden rounded-md border border-black/10 bg-white px-3 py-2 text-black/70 md:inline-flex">{userName || userEmail || "Signed in"}</span>
                <Link href="/settings" aria-label="Settings" className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-black/10 bg-white transition hover:-translate-y-px hover:shadow-sm"><Settings className="h-4 w-4" /></Link>
                <button onClick={logout} className={`${buttonBase} border border-black/10 bg-white text-[#171813]`}><LogOut className="h-4 w-4" /> Logout</button>
              </>
            ) : (
              <Link href="/auth" className={`${buttonBase} bg-[#171813] text-white`}>Sign in</Link>
            )}
          </div>
        </div>
      </div>
      <div className="mx-auto max-w-[1460px] px-6 py-6">
        {token ? (
          <header className="mb-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700"><ShieldCheck className="h-3.5 w-3.5" /> Protected creator workspace</p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight">Forms, responses and sharing in one place.</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-black/60">Create publishable forms, review responses, export data and share production-ready QR links.</p>
            </div>
            <div className="grid grid-cols-3 gap-2 rounded-lg border border-black/10 bg-white p-2 shadow-sm">
              <MiniStat label="Forms" value={forms.length} />
              <MiniStat label="Published" value={publishedForms} />
              <MiniStat label="Public" value={publicForms} />
            </div>
          </header>
        ) : null}

        {!token ? (
          <section className="mt-8 rounded-lg border border-black/10 bg-white p-6 shadow-sm">
            <h1 className="text-3xl font-semibold">Sign in to your creator workspace</h1>
            <p className="mt-2 text-black/60">Create an account to build forms, publish links, and collect responses in your own workspace.</p>
            <Link href="/auth" className={`${buttonBase} mt-5 bg-[#171813] text-white`}>Continue to sign in</Link>
          </section>
        ) : (
          <section className="grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
            <aside className="space-y-4 lg:sticky lg:top-5 lg:self-start">
              <div className="rounded-lg border border-black/10 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold">Forms</h2>
                  <span className="rounded-full bg-[#f4f6f1] px-2 py-1 text-xs text-black/50">{forms.length}</span>
                </div>
                <div className="mt-4 space-y-2">
                  {forms.map((form) => (
                    <button key={form.id} onClick={() => setSelected(form.id)} className={`w-full rounded-md border px-3 py-3 text-left text-sm transition hover:-translate-y-px hover:shadow-sm ${selected === form.id ? "border-[#171813] bg-[#171813] text-white" : "border-black/10 bg-white"}`}>
                      <span className="block truncate font-medium">{form.title}</span>
                      <span className="mt-2 flex flex-wrap gap-1.5">
                        <span className={`rounded-full border px-2 py-0.5 text-[11px] ${selected === form.id ? "border-white/20 bg-white/10 text-white" : statusTone(form.status)}`}>{form.status}</span>
                        <span className={`rounded-full border px-2 py-0.5 text-[11px] ${selected === form.id ? "border-white/20 bg-white/10 text-white" : visibilityTone(form.visibility)}`}>{form.visibility}</span>
                      </span>
                    </button>
                  ))}
                  {forms.length === 0 ? <p className="rounded-md border border-dashed border-black/15 p-3 text-sm text-black/60">No forms yet. Create your first form below.</p> : null}
                </div>
              </div>
              <div className="rounded-lg border border-black/10 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold">Create form</h2>
                  <FilePlus2 className="h-4 w-4 text-black/35" />
                </div>
                <input value={title} onChange={(event) => setTitle(event.target.value)} className="mt-3 w-full rounded-md border border-black/15 px-3 py-2 text-sm outline-none transition focus:border-[#0f766e] focus:ring-2 focus:ring-[#0f766e]/10" />
                <textarea value={description} onChange={(event) => setDescription(event.target.value)} className="mt-3 min-h-20 w-full rounded-md border border-black/15 px-3 py-2 text-sm outline-none transition focus:border-[#0f766e] focus:ring-2 focus:ring-[#0f766e]/10" />
                <select value={visibility} onChange={(event) => setVisibility(event.target.value as "public" | "unlisted")} className="mt-3 w-full rounded-md border border-black/15 px-3 py-2 text-sm outline-none transition focus:border-[#0f766e] focus:ring-2 focus:ring-[#0f766e]/10">
                  <option value="public">Public</option>
                  <option value="unlisted">Unlisted</option>
                </select>
                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Fields</p>
                    <button onClick={addField} className="inline-flex items-center gap-1 rounded-md border border-black/10 px-2 py-1 text-xs transition hover:bg-[#f4f6f1]"><Plus className="h-3 w-3" /> Add</button>
                  </div>
                  {draftFields.map((field, index) => (
                    <div key={`${field.id}-${index}`} className="rounded-md border border-black/10 bg-[#fbfcf8] p-2">
                      <input value={field.label} onChange={(event) => updateDraftField(index, { label: event.target.value })} className="w-full rounded-md border border-black/10 bg-white px-2 py-1 text-xs outline-none focus:border-[#0f766e]" />
                      <div className="mt-2 grid grid-cols-[1fr_auto_auto] gap-2">
                        <select value={field.type} onChange={(event) => updateDraftField(index, patchForFieldType(event.target.value as FieldType, field.options))} className="rounded-md border border-black/10 bg-white px-2 py-1 text-xs outline-none focus:border-[#0f766e]">
                          {fieldTypes.map((type) => <option key={type} value={type}>{type.replace("_", " ")}</option>)}
                        </select>
                        <label className="flex items-center gap-1 text-xs"><input checked={field.required} onChange={(event) => updateDraftField(index, { required: event.target.checked })} type="checkbox" /> Req</label>
                        <button onClick={() => setDraftFields((fields) => fields.filter((_, currentIndex) => currentIndex !== index))} className="rounded-md border border-black/10 bg-white p-1 transition hover:border-red-200 hover:text-red-700"><Trash2 className="h-3 w-3" /></button>
                      </div>
                      {["single_select", "multi_select"].includes(field.type) ? (
                        <OptionsEditor options={field.options} onChange={(options) => updateDraftField(index, { options })} compact />
                      ) : null}
                    </div>
                  ))}
                </div>
                <button onClick={createDemoForm} className={`${buttonBase} mt-3 w-full bg-[#171813] text-white`}><FilePlus2 className="h-4 w-4" /> Create draft</button>
              </div>
            </aside>

            {active ? (
              <div className="space-y-5">
                <section className="rounded-lg border border-black/10 bg-white p-5 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium text-[#0f766e]">{active.theme.name}</p>
                        <span className={`rounded-full border px-2 py-0.5 text-xs ${statusTone(active.status)}`}>{active.status}</span>
                        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs ${visibilityTone(active.visibility)}`}>
                          {active.visibility === "public" ? <Globe2 className="h-3 w-3" /> : <LockKeyhole className="h-3 w-3" />}
                          {active.visibility}
                        </span>
                      </div>
                      <h1 className="mt-2 text-3xl font-semibold tracking-tight">{active.title}</h1>
                      <p className="mt-2 max-w-3xl text-sm leading-6 text-black/60">{active.description}</p>
                      <p className="mt-3 break-all text-xs text-black/40">/{active.slug}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => setIsEditing((current) => !current)} className={`${buttonBase} border border-black/10 bg-white text-[#171813]`}>{isEditing ? <X className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}{isEditing ? "Cancel" : "Edit"}</button>
                      <button onClick={() => togglePublish(active)} className={`${buttonBase} border border-black/10 bg-white text-[#171813]`}><Radio className="h-4 w-4" />{active.status === "published" ? "Unpublish" : "Publish"}</button>
                      <button onClick={async () => { await cloneForm.mutateAsync({ id: active.id }); await listMine.refetch(); }} className={`${buttonBase} border border-black/10 bg-white text-[#171813]`}><Copy className="h-4 w-4" /> Clone</button>
                      <button onClick={() => removeActiveForm(active)} className={`${buttonBase} border border-red-200 bg-white text-red-700`}><Trash2 className="h-4 w-4" /> Delete</button>
                      <Link href={`/forms/${active.slug}?preview=1`} className={`${buttonBase} bg-[#171813] text-white`}><Eye className="h-4 w-4" /> Preview</Link>
                    </div>
                  </div>
                  {isEditing ? (
                    <div className="mt-5 border-t border-black/10 pt-5">
                      <div className="grid gap-3 md:grid-cols-2">
                        <label className="block">
                          <span className="text-sm font-medium">Form title</span>
                          <input value={editTitle} onChange={(event) => setEditTitle(event.target.value)} className="mt-2 w-full rounded-md border border-black/15 bg-white px-3 py-2 text-sm" />
                        </label>
                        <label className="block">
                          <span className="text-sm font-medium">Visibility</span>
                          <select value={editVisibility} onChange={(event) => setEditVisibility(event.target.value as "public" | "unlisted")} className="mt-2 w-full rounded-md border border-black/15 bg-white px-3 py-2 text-sm">
                            <option value="public">Public</option>
                            <option value="unlisted">Unlisted</option>
                          </select>
                        </label>
                        <label className="block md:col-span-2">
                          <span className="text-sm font-medium">Description</span>
                          <textarea value={editDescription} onChange={(event) => setEditDescription(event.target.value)} className="mt-2 min-h-20 w-full rounded-md border border-black/15 bg-white px-3 py-2 text-sm" />
                        </label>
                      </div>
                      <div className="mt-4 flex items-center justify-between">
                        <p className="text-sm font-medium">Fields</p>
                        <button onClick={addEditField} className="inline-flex items-center gap-1 rounded-md border border-black/10 bg-white px-2 py-1 text-xs"><Plus className="h-3 w-3" /> Add field</button>
                      </div>
                      <div className="mt-3 grid gap-3 md:grid-cols-2">
                        {editFields.map((field, index) => (
                          <div key={`${field.id}-${index}`} className="rounded-md border border-black/10 bg-white p-3">
                            <input value={field.label} onChange={(event) => updateEditField(index, { label: event.target.value })} className="w-full rounded-md border border-black/10 px-2 py-2 text-sm" />
                            <div className="mt-2 grid grid-cols-[1fr_auto_auto] gap-2">
                              <select value={field.type} onChange={(event) => updateEditField(index, patchForFieldType(event.target.value as FieldType, field.options))} className="rounded-md border border-black/10 px-2 py-2 text-sm">
                                {fieldTypes.map((type) => <option key={type} value={type}>{type.replace("_", " ")}</option>)}
                              </select>
                              <label className="flex items-center gap-1 text-xs"><input checked={field.required} onChange={(event) => updateEditField(index, { required: event.target.checked })} type="checkbox" /> Req</label>
                              <button onClick={() => setEditFields((fields) => fields.filter((_, currentIndex) => currentIndex !== index))} className="rounded-md border border-black/10 p-2"><Trash2 className="h-3 w-3" /></button>
                            </div>
                            {["single_select", "multi_select"].includes(field.type) ? (
                              <OptionsEditor options={field.options} onChange={(options) => updateEditField(index, { options })} />
                            ) : null}
                          </div>
                        ))}
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <button onClick={() => saveActiveForm(active)} disabled={updateForm.isPending || editFields.length === 0} className="inline-flex items-center gap-2 rounded-md bg-[#171813] px-3 py-2 text-sm text-white disabled:opacity-50"><Save className="h-4 w-4" /> {updateForm.isPending ? "Saving..." : "Save changes"}</button>
                        <button onClick={() => setIsEditing(false)} className="inline-flex items-center gap-2 rounded-md border border-black/10 bg-white px-3 py-2 text-sm"><X className="h-4 w-4" /> Cancel</button>
                      </div>
                    </div>
                  ) : null}
                  <div className="mt-5 grid gap-3 md:grid-cols-4">
                    <Metric label="Views" value={analytics?.views ?? 0} icon={<Eye className="h-4 w-4" />} />
                    <Metric label="Responses" value={analytics?.responses ?? 0} icon={<Users className="h-4 w-4" />} />
                    <Metric label="Completion" value={`${analytics?.completionRate ?? 0}%`} icon={<TrendingUp className="h-4 w-4" />} />
                    <Metric label="Fields" value={active.fields.length} icon={<FilePlus2 className="h-4 w-4" />} />
                  </div>
                  {analytics && "responseTrend" in analytics ? (
                    <div className="mt-5 rounded-md border border-black/10 bg-[#fbfcf8] p-4">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">7-day response trend</p>
                        <span className="text-xs text-black/45">Last updated live</span>
                      </div>
                      <div className="mt-4 flex h-28 items-end gap-2">
                        {analytics.responseTrend.map((day) => {
                          const max = Math.max(1, ...analytics.responseTrend.map((item) => item.responses));
                          return (
                            <div key={day.date} className="flex flex-1 flex-col items-center gap-2">
                              <div className="flex h-20 w-full items-end">
                                <span className="w-full rounded-t-sm bg-[#0f766e] shadow-sm" style={{ height: `${Math.max(8, (day.responses / max) * 80)}px` }} />
                              </div>
                              <span className="text-[10px] text-black/45">{day.date.slice(5)}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}
                </section>

                <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
                  <div className="rounded-lg border border-black/10 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                      <h2 className="flex items-center gap-2 font-semibold"><BarChart3 className="h-4 w-4" /> Response management</h2>
                      <a download={`${active.slug}.csv`} href={`data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`} className={`${buttonBase} border border-black/10 bg-white text-[#171813]`}><Download className="h-4 w-4" /> CSV</a>
                    </div>
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <input value={responseQuery} onChange={(event) => { setResponsePage(1); setResponseQuery(event.target.value); }} className="min-w-56 rounded-md border border-black/15 px-3 py-2 text-sm outline-none transition focus:border-[#0f766e] focus:ring-2 focus:ring-[#0f766e]/10" placeholder="Filter by respondent email" />
                      <span className="rounded-full bg-[#f4f6f1] px-2 py-1 text-xs text-black/50">{responsesQuery.data?.total ?? responses.length} total</span>
                    </div>
                    <div className="mt-4 overflow-x-auto">
                      <table className="w-full min-w-[620px] text-left text-sm">
                        <thead className="border-b border-black/10 text-xs uppercase tracking-wide text-black/45"><tr><th className="py-2">Submitted</th>{active.fields.slice(0, 3).map((field) => <th key={field.id} className="py-2">{field.label}</th>)}</tr></thead>
                        <tbody>
                          {responses.map((response) => (
                            <tr key={response.id} className="border-b border-black/5 transition hover:bg-[#fbfcf8]"><td className="py-3 text-black/55">{new Date(response.submittedAt).toLocaleDateString()}</td>{active.fields.slice(0, 3).map((field) => <td key={field.id} className="py-3">{String(response.values[field.id] ?? "")}</td>)}</tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="mt-4 flex items-center justify-between text-sm">
                      <button disabled={responsePage <= 1} onClick={() => setResponsePage((page) => Math.max(1, page - 1))} className="rounded-md border border-black/10 bg-white px-3 py-2 transition hover:bg-[#f4f6f1] disabled:opacity-40">Previous</button>
                      <span className="text-black/55">Page {responsesQuery.data?.page ?? responsePage} of {responsesQuery.data?.pageCount ?? 1}</span>
                      <button disabled={responsePage >= (responsesQuery.data?.pageCount ?? 1)} onClick={() => setResponsePage((page) => page + 1)} className="rounded-md border border-black/10 bg-white px-3 py-2 transition hover:bg-[#f4f6f1] disabled:opacity-40">Next</button>
                    </div>
                  </div>
                  <div className="rounded-lg border border-black/10 bg-white p-5 shadow-sm xl:sticky xl:top-5 xl:self-start">
                    <div className="flex items-center justify-between">
                      <h2 className="font-semibold">Share</h2>
                      <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs text-emerald-700">QR ready</span>
                    </div>
                    <p className="mt-3 break-all rounded-md bg-[#f4f6f1] p-3 text-sm leading-5">{formUrl}</p>
                    <div className="mt-4 flex aspect-square items-center justify-center rounded-md border border-black/10 bg-[#fbfcf8] p-7">
                      {qrDataUrl ? <img src={qrDataUrl} alt={`QR code for ${active.title}`} className="h-full w-full object-contain" /> : <span className="text-sm text-black/50">Generating QR...</span>}
                    </div>
                    <p className="mt-3 text-sm text-black/60">A fresh QR code is generated from this form link whenever the selected form changes.</p>
                    <div className="mt-4 grid gap-2">
                      <button onClick={shareQr} className={`${buttonBase} bg-[#171813] text-white`}><Share2 className="h-4 w-4" /> Share QR</button>
                      <button onClick={shareQrViaMail} className={`${buttonBase} border border-black/10 bg-white text-[#171813]`}><Mail className="h-4 w-4" /> Share QR via Mail</button>
                      <button onClick={shareQrOnWhatsapp} className={`${buttonBase} border border-black/10 bg-white text-[#171813]`}><MessageCircle className="h-4 w-4" /> Whatsapp QR</button>
                      <button className={`${buttonBase} border border-black/10 bg-white text-[#171813]`}><Send className="h-4 w-4" /> Test email flow</button>
                    </div>
                    {shareStatus ? <p className="mt-3 rounded-md bg-[#f7f8f3] px-3 py-2 text-sm text-black/60">{shareStatus}</p> : null}
                  </div>
                </section>
              </div>
            ) : (
              <div className="rounded-lg border border-black/10 bg-white p-6 shadow-sm">
                <h1 className="text-2xl font-semibold">Your workspace is ready.</h1>
                <p className="mt-2 text-black/60">Create your first form from the sidebar, then publish it to get a shareable link.</p>
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="min-w-24 rounded-md bg-[#f4f6f1] px-3 py-2 text-center">
      <p className="text-lg font-semibold">{value}</p>
      <p className="text-[11px] uppercase tracking-wide text-black/45">{label}</p>
    </div>
  );
}

function Metric({ label, value, icon }: { label: string; value: string | number; icon?: ReactNode }) {
  return (
    <div className="rounded-md border border-black/10 bg-[#fbfcf8] p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-black/50">{label}</p>
        {icon ? <span className="grid h-8 w-8 place-items-center rounded-md bg-white text-[#0f766e] shadow-sm">{icon}</span> : null}
      </div>
      <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
    </div>
  );
}

function OptionsEditor({ options, onChange, compact = false }: { options: string[]; onChange: (options: string[]) => void; compact?: boolean }) {
  const [draft, setDraft] = useState("");

  function addOption() {
    const option = draft.trim();
    if (!option) return;
    if (options.some((current) => current.toLowerCase() === option.toLowerCase())) {
      setDraft("");
      return;
    }
    onChange([...options, option]);
    setDraft("");
  }

  return (
    <div className="mt-2 space-y-2">
      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addOption();
            }
          }}
          className={`min-w-0 flex-1 rounded-md border border-black/10 px-2 ${compact ? "py-1 text-xs" : "py-2 text-sm"}`}
          placeholder="Add option"
        />
        <button type="button" onClick={addOption} className={`shrink-0 rounded-md border border-black/10 px-2 ${compact ? "py-1 text-xs" : "py-2 text-sm"}`}>
          Add
        </button>
      </div>
      {options.length ? (
        <div className="flex flex-wrap gap-2">
          {options.map((option) => (
            <span key={option} className={`inline-flex items-center gap-1 rounded-full bg-[#f7f8f3] px-2 py-1 ${compact ? "text-[11px]" : "text-xs"}`}>
              {option}
              <button type="button" onClick={() => onChange(options.filter((current) => current !== option))} className="text-black/45 hover:text-red-700">x</button>
            </span>
          ))}
        </div>
      ) : (
        <p className={`${compact ? "text-[11px]" : "text-xs"} text-black/45`}>Add at least one option.</p>
      )}
    </div>
  );
}
