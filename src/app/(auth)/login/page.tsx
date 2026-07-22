import type { Metadata } from "next";
import Link from "next/link";

import { SignInForm } from "@/features/auth/components/sign-in-form";

export const metadata: Metadata = { title: "Log in — Second Brain" };

export default function LoginPage() {
  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold">Log in</h1>
        <p className="text-muted-foreground text-sm">Pick up where you left off.</p>
      </div>
      <SignInForm />
      <div className="flex flex-col gap-2 text-sm">
        <Link
          className="text-primary w-fit underline-offset-4 hover:underline"
          href="/forgot-password"
        >
          Forgot password?
        </Link>
        <p className="text-muted-foreground">
          New to Second Brain?{" "}
          <Link className="text-primary underline-offset-4 hover:underline" href="/signup">
            Create an account
          </Link>
        </p>
      </div>
    </section>
  );
}
