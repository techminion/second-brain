"use client";

import { useId } from "react";

import { folderOptions } from "../folder-tree-model";
import { useFolderTree } from "../hooks/use-folders";

interface FolderPickerProps {
  value: string | null;
  onChange: (folderId: string | null) => void;
  disabled?: boolean;
}

/**
 * Labelled folder select for a note (FR-FOLDER-2) — the keyboard/screen-reader
 * path for moving a note, complementing sidebar drag-and-drop (FOLD-08).
 */
export function FolderPicker({ disabled, onChange, value }: FolderPickerProps) {
  const id = useId();
  const query = useFolderTree();
  const options = folderOptions(query.data ?? []);

  return (
    <div className="flex items-center gap-2">
      <label className="text-muted-foreground text-sm" htmlFor={id}>
        Folder
      </label>
      <select
        className="bg-background h-8 max-w-48 rounded-md border px-2 text-sm"
        disabled={disabled || query.isPending}
        id={id}
        onChange={(event) => onChange(event.target.value || null)}
        value={value ?? ""}
      >
        <option value="">No folder</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
