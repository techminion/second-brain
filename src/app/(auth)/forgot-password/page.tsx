import type { Metadata } from "next";
import Link from "next/link";

import { PasswordResetRequestForm } from "@/features/auth/components/password-reset-request-form";

export const metadata: Metadata = { title: "Reset password — Second Brain" };

interface ForgotPasswordPageProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function ForgotPasswordPage({ searchParams }: ForgotPasswordPageProps) {
  const { error } = await searchParams;

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold">Reset your password</h1>
        <p className="text-muted-foreground text-sm">
          Enter your email and we will send you a reset link.
        </p>
      </div>
      {error === "invalid-link" ? (
        <p className="text-destructive text-sm" role="alert">
          That reset link is invalid or has expired. Request a new one below.
        </p>
      ) : null}
      <PasswordResetRequestForm />
      <p className="text-muted-foreground text-sm">
        Remembered your password?{" "}
        <Link className="text-primary underline underline-offset-4" href="/login">
          Log in
        </Link>
      </p>
    </section>
  );
}
