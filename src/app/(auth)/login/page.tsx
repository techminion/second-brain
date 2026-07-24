import type { Metadata } from "next";
import Link from "next/link";

import { GoogleSignInForm } from "@/features/auth/components/google-sign-in-form";
import { SignInForm } from "@/features/auth/components/sign-in-form";

export const metadata: Metadata = { title: "Log in — Second Brain" };

interface LoginPageProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error } = await searchParams;

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold">Log in</h1>
        <p className="text-muted-foreground text-sm">Pick up where you left off.</p>
      </div>
      {error === "oauth" ? (
        <p className="text-destructive text-sm" role="alert">
          Could not sign in with Google. Please try again.
        </p>
      ) : null}
      <GoogleSignInForm />
      <p className="text-muted-foreground text-center text-sm">Or continue with email</p>
      <SignInForm />
      <div className="flex flex-col gap-2 text-sm">
        <Link className="text-primary w-fit underline underline-offset-4" href="/forgot-password">
          Forgot password?
        </Link>
        <p className="text-muted-foreground">
          New to Second Brain?{" "}
          <Link className="text-primary underline underline-offset-4" href="/signup">
            Create an account
          </Link>
        </p>
      </div>
    </section>
  );
}
