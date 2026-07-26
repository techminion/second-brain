"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/shared/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
} from "@/shared/ui/dialog";

import { useDeleteNote } from "../hooks/use-note-mutations";

interface DeleteNoteDialogProps {
  isSaving: boolean;
  noteId: string;
  noteTitle: string;
}

export function DeleteNoteDialog({ isSaving, noteId, noteTitle }: DeleteNoteDialogProps) {
  const router = useRouter();
  const mutation = useDeleteNote();
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setError(null);
    }
    setOpen(nextOpen);
  };

  const handleConfirm = () => {
    setError(null);
    mutation.mutate(noteId, {
      onError: () => setError("Could not delete this note. Please try again."),
      onSuccess: () => {
        setOpen(false);
        router.replace("/");
      },
    });
  };

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogTrigger asChild>
        <Button size="sm" type="button" variant="destructive">
          Delete
        </Button>
      </DialogTrigger>
      <DialogPortal>
        <DialogOverlay className="bg-foreground/20 fixed inset-0 z-50" />
        <DialogContent className="bg-background fixed top-1/2 left-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border p-6 shadow-lg">
          <DialogTitle className="text-lg font-semibold">Delete “{noteTitle}”?</DialogTitle>
          <DialogDescription className="text-muted-foreground mt-2 text-sm">
            This note will move to trash and can be restored for 30 days.
          </DialogDescription>
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
              disabled={isSaving || mutation.isPending}
              onClick={handleConfirm}
              type="button"
              variant="destructive"
            >
              {mutation.isPending ? "Deleting…" : isSaving ? "Saving…" : "Delete note"}
            </Button>
          </div>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}
