"use client";

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

import { deleteAccountAction } from "../delete-account-action";

export function DeleteAccountForm() {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setError(null);
    setIsDeleting(true);

    const result = await deleteAccountAction();

    if (!result.ok) {
      setError(result.message);
      setIsDeleting(false);
    }
    // On success the action redirects — no further state update needed.
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" variant="destructive">
          Delete account
        </Button>
      </DialogTrigger>
      <DialogPortal>
        <DialogOverlay className="bg-foreground/20 fixed inset-0 z-50" />
        <DialogContent className="bg-background fixed top-1/2 left-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border p-6 shadow-lg">
          <DialogTitle className="text-lg font-semibold">Delete your account?</DialogTitle>
          <DialogDescription className="text-muted-foreground mt-2 text-sm">
            All your notes, folders, and data will be scheduled for permanent deletion. You have{" "}
            <strong>30 days</strong> to contact support to reverse this before the deletion becomes
            irreversible.
          </DialogDescription>
          {error ? (
            <p className="text-destructive mt-3 text-sm" role="alert">
              {error}
            </p>
          ) : null}
          <div className="mt-6 flex justify-end gap-3">
            <DialogClose asChild>
              <Button disabled={isDeleting} type="button" variant="ghost">
                Cancel
              </Button>
            </DialogClose>
            <Button
              disabled={isDeleting}
              onClick={handleConfirm}
              type="button"
              variant="destructive"
            >
              {isDeleting ? "Deleting…" : "Delete account"}
            </Button>
          </div>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}
