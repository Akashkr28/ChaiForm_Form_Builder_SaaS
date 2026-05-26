"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, LogIn, UserPlus } from "lucide-react";
import { trpc } from "~/trpc/client";
import { env } from "~/env.js";

type Mode = "signin" | "signup";

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signup");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [verificationUrl, setVerificationUrl] = useState("");
  const signup = trpc.auth.signup.useMutation();
  const login = trpc.auth.login.useMutation();
  const apiBaseUrl = (env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/trpc").replace(/\/trpc$/, "");

  async function submit() {
    setError("");
    setVerificationUrl("");
    try {
      if (mode === "signup") {
        const result = await signup.mutateAsync({ fullName, email, password });
        setVerificationUrl(result.verificationUrl ?? "");
        return;
      }

      const session = await login.mutateAsync({ email, password });
      window.localStorage.setItem("chaiforms_session_token", session.token);
      window.localStorage.setItem("chaiforms_user_email", session.user.email);
      window.localStorage.setItem("chaiforms_user_name", session.user.fullName);
      router.push(session.user.onboardingCompleted ? "/dashboard" : "/onboarding");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not authenticate.");
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f8f3] px-6 py-8 text-[#171813]">
      <div className="mx-auto max-w-6xl">
        <nav className="flex items-center justify-between">
          <Link href="/" className="text-xl font-semibold">ChaiForms</Link>
          <Link href="/explore" className="rounded-md border border-black/10 bg-white px-4 py-2 text-sm">Explore forms</Link>
        </nav>

        <section className="grid gap-8 py-14 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
          <div>
            <p className="text-sm font-medium text-[#0f766e]">Creator account</p>
            <h1 className="mt-3 max-w-xl text-5xl font-semibold tracking-tight">Sign up, build forms, collect real responses.</h1>
            <p className="mt-5 max-w-xl leading-7 text-black/60">
              Every creator gets their own workspace, protected dashboard, published form links, response analytics and API access.
            </p>
          </div>

          <div className="rounded-lg border border-black/10 bg-white p-6 shadow-sm">
            <div className="grid grid-cols-2 gap-2 rounded-md bg-[#f7f8f3] p-1">
              <button onClick={() => setMode("signup")} className={`inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium ${mode === "signup" ? "bg-white shadow-sm" : ""}`}><UserPlus className="h-4 w-4" /> Sign up</button>
              <button onClick={() => setMode("signin")} className={`inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium ${mode === "signin" ? "bg-white shadow-sm" : ""}`}><LogIn className="h-4 w-4" /> Sign in</button>
            </div>

            <div className="mt-6 space-y-4">
              {mode === "signup" ? (
                <label className="block">
                  <span className="text-sm font-medium">Full name</span>
                  <input value={fullName} onChange={(event) => setFullName(event.target.value)} className="mt-2 w-full rounded-md border border-black/15 px-3 py-3" placeholder="Ada Lovelace" />
                </label>
              ) : null}
              <label className="block">
                <span className="text-sm font-medium">Email</span>
                <input value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 w-full rounded-md border border-black/15 px-3 py-3" placeholder="you@company.com" type="email" />
              </label>
              <label className="block">
                <span className="text-sm font-medium">Password</span>
                <input value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 w-full rounded-md border border-black/15 px-3 py-3" placeholder="At least 8 characters" type="password" />
              </label>
            </div>

            {error ? <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
            {verificationUrl ? (
              <div className="mt-4 rounded-md bg-[#ecfdf5] px-3 py-3 text-sm text-[#065f46]">
                <p className="font-medium">Verification email sent.</p>
                <p className="mt-1">For local development, open this verification link:</p>
                <Link href={verificationUrl} className="mt-2 block break-all underline">{verificationUrl}</Link>
              </div>
            ) : null}

            <button onClick={submit} disabled={signup.isPending || login.isPending} className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#171813] px-4 py-3 text-sm font-medium text-white disabled:opacity-60">
              {signup.isPending || login.isPending ? "Working..." : mode === "signup" ? "Create account" : "Sign in"}
              <ArrowRight className="h-4 w-4" />
            </button>

            <div className="my-5 flex items-center gap-3 text-xs text-black/45">
              <span className="h-px flex-1 bg-black/10" />
              or
              <span className="h-px flex-1 bg-black/10" />
            </div>

            <a href={`${apiBaseUrl}/auth/google`} className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-black/15 bg-white px-4 py-3 text-sm font-medium">
              <span className="grid h-5 w-5 place-items-center rounded-full border border-black/10 text-xs font-semibold">G</span>
              Continue with Google
            </a>
          </div>
        </section>
      </div>
    </main>
  );
}
