"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";

import { signUpWithPassword } from "../sign-up";
import { type SignUpInput, signUpSchema } from "../sign-up-schema";

export function SignUpForm() {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
  } = useForm<SignUpInput>({ resolver: zodResolver(signUpSchema) });

  const onSubmit = handleSubmit(async (input) => {
    setSubmitError(null);

    const result = await signUpWithPassword(input);

    if (!result.ok) {
      setSubmitError(result.message);
      return;
    }

    router.push("/");
    router.refresh();
  });

  return (
    <form className="flex flex-col gap-4" noValidate onSubmit={onSubmit}>
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium" htmlFor="sign-up-email">
          Email
        </label>
        <Input
          aria-describedby={errors.email ? "sign-up-email-error" : undefined}
          aria-invalid={errors.email ? true : undefined}
          autoComplete="email"
          id="sign-up-email"
          type="email"
          {...register("email")}
        />
        {errors.email ? (
          <p className="text-destructive text-sm" id="sign-up-email-error">
            {errors.email.message}
          </p>
        ) : null}
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium" htmlFor="sign-up-password">
          Password
        </label>
        <Input
          aria-describedby={errors.password ? "sign-up-password-error" : undefined}
          aria-invalid={errors.password ? true : undefined}
          autoComplete="new-password"
          id="sign-up-password"
          type="password"
          {...register("password")}
        />
        {errors.password ? (
          <p className="text-destructive text-sm" id="sign-up-password-error">
            {errors.password.message}
          </p>
        ) : null}
      </div>
      {submitError ? (
        <p className="text-destructive text-sm" role="alert">
          {submitError}
        </p>
      ) : null}
      <Button disabled={isSubmitting} type="submit">
        {isSubmitting ? "Creating account…" : "Create account"}
      </Button>
    </form>
  );
}
