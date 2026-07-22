import type { Metadata } from "next";
import Link from "next/link";

import { GoogleSignInForm } from "@/features/auth/components/google-sign-in-form";
import { SignUpForm } from "@/features/auth/components/sign-up-form";

export const metadata: Metadata = { title: "Create account — Second Brain" };

export default function SignUpPage() {
  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold">Create your account</h1>
        <p className="text-muted-foreground text-sm">
          Your notes, links, and ideas — one connected graph.
        </p>
      </div>
      <GoogleSignInForm />
      <p className="text-muted-foreground text-center text-sm">Or continue with email</p>
      <SignUpForm />
      <p className="text-muted-foreground text-sm">
        Already have an account?{" "}
        <Link className="text-primary underline-offset-4 hover:underline" href="/login">
          Log in
        </Link>
      </p>
    </section>
  );
}
