"use client";

import { useEffect } from "react";
import { Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<CallbackShell />}>
      <AuthCallbackContent />
    </Suspense>
  );
}

function AuthCallbackContent() {
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    const token = params.get("token");
    const email = params.get("email");
    const name = params.get("name");
    const onboarding = params.get("onboarding");
    if (token) {
      window.localStorage.setItem("chaiforms_session_token", token);
      if (email) window.localStorage.setItem("chaiforms_user_email", email);
      if (name) window.localStorage.setItem("chaiforms_user_name", name);
      router.replace(onboarding === "complete" ? "/dashboard" : "/onboarding");
    }
  }, [params, router]);

  return <CallbackShell />;
}

function CallbackShell() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f8f3] p-6 text-[#171813]">
      <div className="rounded-lg bg-white p-6 text-center shadow-sm">
        <h1 className="text-2xl font-semibold">Finishing sign in...</h1>
        <p className="mt-2 text-sm text-black/60">You will be redirected to your dashboard.</p>
        <Link href="/dashboard" className="mt-5 inline-flex rounded-md bg-[#171813] px-4 py-2 text-sm text-white">Open dashboard</Link>
      </div>
    </main>
  );
}
