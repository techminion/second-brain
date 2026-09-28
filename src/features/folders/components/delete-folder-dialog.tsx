"use client";

import { useId, useState } from "react";

import type { FolderDeleteStrategy } from "@/features/folders/types";
import { Button } from "@/shared/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from "@/shared/ui/dialog";

import { useDeleteFolder } from "../hooks/use-folders";

interface DeleteFolderDialogProps {
  folder: { id: string; name: string } | null;
  onClose: () => void;
  onDeleted?: (folderId: string) => void;
}

const strategies: { value: FolderDeleteStrategy; label: string; hint: string }[] = [
  {
    hint: "Its notes and subfolders move up one level. Nothing is deleted but the folder.",
    label: "Keep contents",
    value: "move_to_parent",
  },
  {
    hint: "Every note inside, including subfolders, moves to Trash (restorable for 30 days).",
    label: "Delete contents",
    value: "delete_contents",
  },
];

/**
 * Folder delete confirmation (FOLD-09, FR-FOLDER-3, 10_DESIGN §4): names the
 * folder and requires an explicit contents choice — nothing is preselected,
 * so contained notes can never be deleted by default.
 */
export function DeleteFolderDialog({ folder, onClose, onDeleted }: DeleteFolderDialogProps) {
  const mutation = useDeleteFolder();
  const [strategy, setStrategy] = useState<FolderDeleteStrategy | null>(null);
  const [error, setError] = useState<string | null>(null);
  const groupId = useId();

  const close = () => {
    setStrategy(null);
    setError(null);
    onClose();
  };

  const confirm = () => {
    if (!folder || !strategy) {
      return;
    }

    setError(null);
    mutation.mutate(
      { id: folder.id, strategy },
      {
        onError: () => setError("Could not delete this folder. Please try again."),
        onSuccess: () => {
          onDeleted?.(folder.id);
          close();
        },
      },
    );
  };

  return (
    <Dialog onOpenChange={(open) => (open ? undefined : close())} open={folder !== null}>
      <DialogPortal>
        <DialogOverlay className="bg-foreground/20 fixed inset-0 z-50" />
        <DialogContent className="bg-background fixed top-1/2 left-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border p-6 shadow-lg">
          <DialogTitle className="text-lg font-semibold">
            Delete folder “{folder?.name}”?
          </DialogTitle>
          <DialogDescription className="text-muted-foreground mt-2 text-sm">
            Choose what happens to everything inside it.
          </DialogDescription>
          <fieldset className="mt-4 flex flex-col gap-3">
            <legend className="sr-only">Folder contents</legend>
            {strategies.map((option) => (
              <label
                className="hover:bg-muted flex cursor-pointer gap-3 rounded-md border p-3"
                key={option.value}
              >
                <input
                  aria-describedby={`${groupId}-${option.value}`}
                  checked={strategy === option.value}
                  className="mt-1"
                  name={groupId}
                  onChange={() => setStrategy(option.value)}
                  type="radio"
                  value={option.value}
                />
                <span className="flex flex-col gap-1">
                  <span className="text-sm font-medium">{option.label}</span>
                  <span className="text-muted-foreground text-xs" id={`${groupId}-${option.value}`}>
                    {option.hint}
                  </span>
                </span>
              </label>
            ))}
          </fieldset>
          {error ? (
            <p className="text-destructive mt-3 text-sm" role="alert">
              {error}
            </p>
          ) : null}
          <div className="mt-6 flex justify-end gap-3">
            <DialogClose asChild>
              <Button disabled={mutation.isPending} type="button" variant="ghost">
                Cancel
              </Button>
            </DialogClose>
            <Button
              disabled={!strategy || mutation.isPending}
              onClick={confirm}
              type="button"
              variant="destructive"
            >
              {mutation.isPending ? "Deleting…" : "Delete folder"}
            </Button>
          </div>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}
