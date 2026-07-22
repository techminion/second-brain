"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/shared/ui/button";

import { requestPasswordReset } from "../password-reset-request";
import {
  type PasswordResetRequestInput,
  passwordResetRequestSchema,
} from "../password-reset-request-schema";
import { AuthFormField } from "./auth-form-field";

export function PasswordResetRequestForm() {
  const [status, setStatus] = useState<{ kind: "error" | "success"; message: string } | null>(null);
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
  } = useForm<PasswordResetRequestInput>({ resolver: zodResolver(passwordResetRequestSchema) });

  const onSubmit = handleSubmit(async (input) => {
    setStatus(null);

    const result = await requestPasswordReset(input);
    setStatus({ kind: result.ok ? "success" : "error", message: result.message });
  });

  return (
    <form className="flex flex-col gap-4" noValidate onSubmit={onSubmit}>
      <AuthFormField
        autoComplete="email"
        error={errors.email?.message}
        id="password-reset-email"
        label="Email"
        registration={register("email")}
        type="email"
      />
      {status ? (
        <p
          className={
            status.kind === "error" ? "text-destructive text-sm" : "text-muted-foreground text-sm"
          }
          role="status"
        >
          {status.message}
        </p>
      ) : null}
      <Button disabled={isSubmitting} type="submit">
        {isSubmitting ? "Sending reset link…" : "Send reset link"}
      </Button>
    </form>
  );
}
