"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CreditCard, Settings, Trash2, UserRound } from "lucide-react";
import { trpc } from "~/trpc/client";

export default function SettingsPage() {
  const me = trpc.auth.me.useQuery();
  const updateProfile = trpc.auth.updateProfile.useMutation();
  const deleteAccount = trpc.auth.deleteAccount.useMutation();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [contactNo, setContactNo] = useState("");
  const [occupation, setOccupation] = useState<"Student" | "Professional">("Professional");
  const [organizationName, setOrganizationName] = useState("");

  useEffect(() => {
    if (me.data?.user) {
      setFirstName(me.data.user.firstName ?? "");
      setLastName(me.data.user.lastName ?? "");
      setContactNo(me.data.user.contactNo ?? "");
      setOccupation((me.data.user.occupation as "Student" | "Professional") ?? "Professional");
      setOrganizationName(me.data.user.organizationName ?? "");
    }
  }, [me.data]);

  async function save() {
    const result = await updateProfile.mutateAsync({ firstName, lastName, contactNo, occupation, organizationName });
    window.localStorage.setItem("chaiforms_user_name", result.user.fullName);
    await me.refetch();
  }

  async function removeAccount() {
    await deleteAccount.mutateAsync({ confirm: "DELETE" });
    window.localStorage.removeItem("chaiforms_session_token");
    window.localStorage.removeItem("chaiforms_user_email");
    window.localStorage.removeItem("chaiforms_user_name");
    window.location.href = "/";
  }

  return (
    <main className="min-h-screen bg-[#f7f8f3] px-6 py-8 text-[#171813]">
      <div className="mx-auto max-w-5xl">
        <nav className="flex items-center justify-between">
          <Link href="/dashboard" className="text-xl font-semibold">ChaiForms</Link>
          <Link href="/dashboard" className="rounded-md border border-black/10 bg-white px-4 py-2 text-sm">Dashboard</Link>
        </nav>

        <section className="mt-8 grid gap-5 lg:grid-cols-[260px_1fr]">
          <aside className="rounded-lg bg-white p-4 shadow-sm">
            <h1 className="flex items-center gap-2 text-xl font-semibold"><Settings className="h-5 w-5" /> Settings</h1>
            <div className="mt-5 space-y-2 text-sm">
              <a href="#general" className="block rounded-md bg-[#f7f8f3] px-3 py-2">General settings</a>
              <a href="#subscription" className="block rounded-md px-3 py-2 hover:bg-[#f7f8f3]">Manage subscription</a>
              <a href="#account" className="block rounded-md px-3 py-2 hover:bg-[#f7f8f3]">Manage account</a>
            </div>
          </aside>

          <div className="space-y-5">
            <section id="general" className="rounded-lg bg-white p-5 shadow-sm">
              <h2 className="flex items-center gap-2 font-semibold"><UserRound className="h-4 w-4" /> General settings</h2>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <Input label="First name" value={firstName} onChange={setFirstName} />
                <Input label="Last name" value={lastName} onChange={setLastName} />
                <Input label="Contact no." value={contactNo} onChange={setContactNo} />
                <label className="block">
                  <span className="text-sm font-medium">Occupation</span>
                  <select value={occupation} onChange={(event) => setOccupation(event.target.value as "Student" | "Professional")} className="mt-2 w-full rounded-md border border-black/15 px-3 py-3">
                    <option>Student</option>
                    <option>Professional</option>
                  </select>
                </label>
                <Input label="Organization name" value={organizationName} onChange={setOrganizationName} className="md:col-span-2" />
                <label className="block md:col-span-2">
                  <span className="text-sm font-medium">Email</span>
                  <input value={me.data?.user.email ?? ""} disabled className="mt-2 w-full rounded-md border border-black/15 bg-[#f7f8f3] px-3 py-3 text-black/60" />
                </label>
              </div>
              <button onClick={save} className="mt-5 rounded-md bg-[#171813] px-4 py-2 text-sm text-white">Save changes</button>
            </section>

            <section id="subscription" className="rounded-lg bg-white p-5 shadow-sm">
              <h2 className="flex items-center gap-2 font-semibold"><CreditCard className="h-4 w-4" /> Manage subscription</h2>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <Info label="Plan" value={me.data?.user.subscriptionPlan ?? "starter"} />
                <Info label="Status" value={me.data?.user.subscriptionStatus ?? "active"} />
                <Info label="Billing" value="No payment method required" />
              </div>
            </section>

            <section id="account" className="rounded-lg border border-red-100 bg-white p-5 shadow-sm">
              <h2 className="flex items-center gap-2 font-semibold text-red-700"><Trash2 className="h-4 w-4" /> Manage account</h2>
              <p className="mt-2 text-sm text-black/60">Delete your account, forms and responses. This action cannot be undone.</p>
              <button onClick={removeAccount} className="mt-4 rounded-md bg-red-600 px-4 py-2 text-sm text-white">Delete account</button>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}

function Input({ label, value, onChange, className = "" }: { label: string; value: string; onChange: (value: string) => void; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="text-sm font-medium">{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 w-full rounded-md border border-black/15 px-3 py-3" />
    </label>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-black/10 p-4">
      <p className="text-sm text-black/50">{label}</p>
      <p className="mt-2 font-semibold capitalize">{value}</p>
    </div>
  );
}
