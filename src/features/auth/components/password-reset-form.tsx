"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/shared/ui/button";

import { resetPassword } from "../password-reset";
import { type PasswordResetInput, passwordResetSchema } from "../password-reset-schema";
import { AuthFormField } from "./auth-form-field";

export function PasswordResetForm() {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
  } = useForm<PasswordResetInput>({ resolver: zodResolver(passwordResetSchema) });

  const onSubmit = handleSubmit(async (input) => {
    setSubmitError(null);

    const result = await resetPassword(input);

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
        autoComplete="new-password"
        error={errors.password?.message}
        id="new-password"
        label="New password"
        registration={register("password")}
        type="password"
      />
      <AuthFormField
        autoComplete="new-password"
        error={errors.confirmPassword?.message}
        id="confirm-new-password"
        label="Confirm new password"
        registration={register("confirmPassword")}
        type="password"
      />
      {submitError ? (
        <p className="text-destructive text-sm" role="alert">
          {submitError}
        </p>
      ) : null}
      <Button disabled={isSubmitting} type="submit">
        {isSubmitting ? "Updating password…" : "Update password"}
      </Button>
    </form>
  );
}
