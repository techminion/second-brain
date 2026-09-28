"use client";

import { useState } from "react";

import { Input } from "@/shared/ui/input";

interface FolderNameInputProps {
  initialValue?: string;
  label: string;
  onCancel: () => void;
  onSubmit: (name: string) => void;
}

/** Inline name field for create/rename (FOLD-07): Enter saves, Esc or blur cancels. */
export function FolderNameInput({
  initialValue = "",
  label,
  onCancel,
  onSubmit,
}: FolderNameInputProps) {
  const [value, setValue] = useState(initialValue);

  return (
    <Input
      aria-label={label}
      autoFocus
      className="h-7 text-sm"
      onBlur={onCancel}
      onChange={(event) => setValue(event.target.value)}
      onFocus={(event) => event.target.select()}
      onKeyDown={(event) => {
        event.stopPropagation();
        if (event.key === "Enter") {
          event.preventDefault();
          if (value.trim()) {
            onSubmit(value.trim());
          } else {
            onCancel();
          }
        } else if (event.key === "Escape") {
          event.preventDefault();
          onCancel();
        }
      }}
      value={value}
    />
  );
}
