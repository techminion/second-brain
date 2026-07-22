import type { Metadata } from "next";

import { PasswordResetForm } from "@/features/auth/components/password-reset-form";

export const metadata: Metadata = { title: "Choose a new password — Second Brain" };

export default function ResetPasswordPage() {
  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold">Choose a new password</h1>
        <p className="text-muted-foreground text-sm">
          Use at least 8 characters for your new password.
        </p>
      </div>
      <PasswordResetForm />
    </section>
  );
}
