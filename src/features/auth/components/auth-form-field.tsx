import type { UseFormRegisterReturn } from "react-hook-form";

import { Input } from "@/shared/ui/input";

interface AuthFormFieldProps {
  autoComplete: string;
  error: string | undefined;
  id: string;
  label: string;
  registration: UseFormRegisterReturn;
  type: string;
}

export function AuthFormField({
  autoComplete,
  error,
  id,
  label,
  registration,
  type,
}: AuthFormFieldProps) {
  const errorId = `${id}-error`;

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium" htmlFor={id}>
        {label}
      </label>
      <Input
        aria-describedby={error ? errorId : undefined}
        aria-invalid={error ? true : undefined}
        autoComplete={autoComplete}
        id={id}
        type={type}
        {...registration}
      />
      {error ? (
        <p className="text-destructive text-sm" id={errorId}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
