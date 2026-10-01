"use client";

import { Check, ChevronDown, Folder, FolderOpen } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItemIndicator,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";

import { folderOptions } from "../folder-tree-model";
import { useFolderTree } from "../hooks/use-folders";

interface FolderPickerProps {
  value: string | null;
  onChange: (folderId: string | null) => void;
  disabled?: boolean;
}

const noFolder = "";
const itemClass =
  "hover:bg-muted focus:bg-muted relative flex cursor-pointer items-center rounded-sm py-1.5 pr-2 pl-7 text-sm outline-none";

/**
 * The note's folder as a breadcrumb that opens a folder menu (FR-FOLDER-2,
 * UX-02) — the keyboard/screen-reader path for moving a note, complementing
 * sidebar drag-and-drop (FOLD-08). The trigger names the current folder path.
 */
export function FolderPicker({ disabled, onChange, value }: FolderPickerProps) {
  const query = useFolderTree();
  const options = folderOptions(query.data ?? []);
  const current = options.find((option) => option.id === value);
  const label = current?.label ?? "No folder";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Folder: ${label}. Move note`}
        className="text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring flex h-7 max-w-64 items-center gap-1.5 rounded-md px-2 text-sm outline-none focus-visible:ring-2 disabled:opacity-50"
        disabled={disabled || query.isPending}
      >
        {current ? (
          <FolderOpen aria-hidden="true" className="size-4 shrink-0" />
        ) : (
          <Folder aria-hidden="true" className="size-4 shrink-0" />
        )}
        <span className="truncate">{label}</span>
        <ChevronDown aria-hidden="true" className="size-3.5 shrink-0" />
      </DropdownMenuTrigger>
      <DropdownMenuPortal>
        <DropdownMenuContent
          align="start"
          className="bg-popover text-popover-foreground z-50 max-h-80 min-w-48 overflow-y-auto rounded-lg border p-1 shadow-md"
        >
          <DropdownMenuLabel className="text-muted-foreground px-2 py-1 text-xs">
            Move to folder
          </DropdownMenuLabel>
          <DropdownMenuRadioGroup
            onValueChange={(next) => onChange(next === noFolder ? null : next)}
            value={value ?? noFolder}
          >
            <DropdownMenuRadioItem className={itemClass} value={noFolder}>
              <DropdownMenuItemIndicator className="absolute left-2">
                <Check aria-hidden="true" className="size-4" />
              </DropdownMenuItemIndicator>
              No folder
            </DropdownMenuRadioItem>
            {options.length > 0 ? <DropdownMenuSeparator className="bg-border my-1 h-px" /> : null}
            {options.map((option) => (
              <DropdownMenuRadioItem className={itemClass} key={option.id} value={option.id}>
                <DropdownMenuItemIndicator className="absolute left-2">
                  <Check aria-hidden="true" className="size-4" />
                </DropdownMenuItemIndicator>
                {option.label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenuPortal>
    </DropdownMenu>
  );
}
