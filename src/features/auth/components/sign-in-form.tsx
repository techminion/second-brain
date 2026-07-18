"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/shared/ui/button";

import { signInWithPassword } from "../sign-in";
import { type SignInInput, signInSchema } from "../sign-in-schema";
import { AuthFormField } from "./auth-form-field";

export function SignInForm() {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
  } = useForm<SignInInput>({ resolver: zodResolver(signInSchema) });

  const onSubmit = handleSubmit(async (input) => {
    setSubmitError(null);

    const result = await signInWithPassword(input);

    if (!result.ok) {
      setSubmitError(result.message);
      return;
    }

    router.push("/");
    router.refresh();
  });

  return (
    <form className="flex flex-col gap-4" noValidate onSubmit={onSubmit}>
      <AuthFormField
        autoComplete="email"
        error={errors.email?.message}
        id="sign-in-email"
        label="Email"
        registration={register("email")}
        type="email"
      />
      <AuthFormField
        autoComplete="current-password"
        error={errors.password?.message}
        id="sign-in-password"
        label="Password"
        registration={register("password")}
        type="password"
      />
      {submitError ? (
        <p className="text-destructive text-sm" role="alert">
          {submitError}
        </p>
      ) : null}
      <Button disabled={isSubmitting} type="submit">
        {isSubmitting ? "Logging in…" : "Log in"}
      </Button>
    </form>
  );
}
