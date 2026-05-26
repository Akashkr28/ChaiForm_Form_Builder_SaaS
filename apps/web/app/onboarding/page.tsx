"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { trpc } from "~/trpc/client";

export default function OnboardingPage() {
  const router = useRouter();
  const me = trpc.auth.me.useQuery();
  const updateProfile = trpc.auth.updateProfile.useMutation();
  const [storedEmail, setStoredEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [contactNo, setContactNo] = useState("");
  const [occupation, setOccupation] = useState<"Student" | "Professional">("Professional");
  const [organizationName, setOrganizationName] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const token = window.localStorage.getItem("chaiforms_session_token");
    if (!token) {
      router.replace("/auth");
      return;
    }
    setStoredEmail(window.localStorage.getItem("chaiforms_user_email") ?? "");
  }, [router]);

  useEffect(() => {
    if (me.data?.user) {
      setFirstName(me.data.user.firstName ?? "");
      setLastName(me.data.user.lastName ?? "");
      setContactNo(me.data.user.contactNo ?? "");
      setOccupation((me.data.user.occupation as "Student" | "Professional") ?? "Professional");
      setOrganizationName(me.data.user.organizationName ?? "");
    }
  }, [me.data]);

  async function submit() {
    setError("");
    try {
      const result = await updateProfile.mutateAsync({ firstName, lastName, contactNo, occupation, organizationName });
      window.localStorage.setItem("chaiforms_user_name", result.user.fullName);
      router.push("/dashboard");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not save profile.";
      setError(message === "Load failed" ? "Could not reach the API server. Make sure dev:api is running on localhost:8000." : message);
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f8f3] px-6 py-8 text-[#171813]">
      <div className="mx-auto max-w-3xl">
        <nav className="flex items-center justify-between">
          <Link href="/" className="text-xl font-semibold">ChaiForms</Link>
          <span className="rounded-md bg-white px-3 py-2 text-sm">{me.data?.user.email ?? (storedEmail || "Creator profile")}</span>
        </nav>
        <section className="mt-10 rounded-lg border border-black/10 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-[#0f766e]">One last step</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight">Complete your creator profile.</h1>
          <p className="mt-3 text-black/60">This helps personalize your dashboard and keeps account settings complete.</p>

          <div className="mt-7 grid gap-4 md:grid-cols-2">
            <Field label="First name" value={firstName} onChange={setFirstName} />
            <Field label="Last name" value={lastName} onChange={setLastName} />
            <Field label="Contact no." value={contactNo} onChange={setContactNo} />
            <label className="block">
              <span className="text-sm font-medium">Occupation</span>
              <select value={occupation} onChange={(event) => setOccupation(event.target.value as "Student" | "Professional")} className="mt-2 w-full rounded-md border border-black/15 px-3 py-3">
                <option>Student</option>
                <option>Professional</option>
              </select>
            </label>
            <label className="block md:col-span-2">
              <span className="text-sm font-medium">Organization name <span className="text-black/40">(optional)</span></span>
              <input value={organizationName} onChange={(event) => setOrganizationName(event.target.value)} className="mt-2 w-full rounded-md border border-black/15 px-3 py-3" placeholder="Company, college or community" />
            </label>
            <label className="block md:col-span-2">
              <span className="text-sm font-medium">Email</span>
              <input value={me.data?.user.email ?? storedEmail} disabled className="mt-2 w-full rounded-md border border-black/15 bg-[#f7f8f3] px-3 py-3 text-black/60" />
            </label>
          </div>

          {me.error ? <p className="mt-4 rounded-md bg-yellow-50 px-3 py-2 text-sm text-yellow-800">Profile could not be loaded. Make sure the API server is running, then refresh this page.</p> : null}
          {error ? <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

          <button onClick={submit} disabled={updateProfile.isPending} className="mt-7 inline-flex items-center gap-2 rounded-md bg-[#171813] px-5 py-3 text-sm font-medium text-white disabled:opacity-60">
            {updateProfile.isPending ? "Saving..." : "Continue to dashboard"}
            <ArrowRight className="h-4 w-4" />
          </button>
        </section>
      </div>
    </main>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 w-full rounded-md border border-black/15 px-3 py-3" />
    </label>
  );
}
