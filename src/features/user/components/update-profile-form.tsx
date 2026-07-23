"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";

import { updateProfileAction } from "../update-profile-action";

interface UpdateProfileFormProps {
  initialDisplayName: string | null;
}

interface FormValues {
  displayName: string;
}

export function UpdateProfileForm({ initialDisplayName }: Readonly<UpdateProfileFormProps>) {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [savedDisplayName, setSavedDisplayName] = useState<string | null>(initialDisplayName);

  const {
    formState: { isSubmitting },
    handleSubmit,
    register,
    reset,
  } = useForm<FormValues>({
    defaultValues: { displayName: initialDisplayName ?? "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null);

    const result = await updateProfileAction({ displayName: values.displayName });

    if (!result.ok) {
      setSubmitError(result.message);
      return;
    }

    setSavedDisplayName(result.profile.displayName);
    reset({ displayName: result.profile.displayName ?? "" });
  });

  return (
    <form className="flex flex-col gap-4" noValidate onSubmit={onSubmit}>
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium" htmlFor="display-name">
          Display name
        </label>
        <Input
          autoComplete="nickname"
          id="display-name"
          placeholder="Your name"
          type="text"
          {...register("displayName")}
        />
        <p className="text-muted-foreground text-xs">
          Leave blank to clear. Maximum 80 characters.
        </p>
      </div>
      {submitError ? (
        <p className="text-destructive text-sm" role="alert">
          {submitError}
        </p>
      ) : null}
      {savedDisplayName !== initialDisplayName && !submitError ? (
        <p aria-live="polite" className="text-sm text-green-600 dark:text-green-400">
          Saved
        </p>
      ) : null}
      <Button className="self-start" disabled={isSubmitting} type="submit">
        {isSubmitting ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}
