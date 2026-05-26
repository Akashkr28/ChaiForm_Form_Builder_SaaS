"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { trpc } from "~/trpc/client";

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<VerifyShell status="Verifying your email..." />}>
      <VerifyEmailContent />
    </Suspense>
  );
}

function VerifyEmailContent() {
  const router = useRouter();
  const params = useSearchParams();
  const verifyEmail = trpc.auth.verifyEmail.useMutation();
  const [status, setStatus] = useState("Verifying your email...");

  useEffect(() => {
    const token = params.get("token");
    if (!token) {
      setStatus("Verification token is missing.");
      return;
    }

    verifyEmail
      .mutateAsync({ token })
      .then((session) => {
        window.localStorage.setItem("chaiforms_session_token", session.token);
        window.localStorage.setItem("chaiforms_user_email", session.user.email);
        window.localStorage.setItem("chaiforms_user_name", session.user.fullName);
        router.replace(session.user.onboardingCompleted ? "/dashboard" : "/onboarding");
      })
      .catch((error) => setStatus(error instanceof Error ? error.message : "Could not verify email."));
  }, [params, router, verifyEmail]);

  return <VerifyShell status={status} />;
}

function VerifyShell({ status }: { status: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f8f3] p-6 text-[#171813]">
      <div className="rounded-lg bg-white p-6 text-center shadow-sm">
        <h1 className="text-2xl font-semibold">Email verification</h1>
        <p className="mt-2 text-sm text-black/60">{status}</p>
        <Link href="/auth" className="mt-5 inline-flex rounded-md bg-[#171813] px-4 py-2 text-sm text-white">Back to sign in</Link>
      </div>
    </main>
  );
}
