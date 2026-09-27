"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createFolderRequest,
  deleteFolderRequest,
  fetchFolderTree,
  updateFolderRequest,
} from "@/features/folders/folder-api";
import type { CreateFolderInput, FolderDeleteStrategy } from "@/features/folders/types";
import { notesRootKey } from "@/shared/lib/query-keys";

import { folderKeys } from "./folder-keys";

export function useFolderTree() {
  return useQuery({ queryKey: folderKeys.tree(), queryFn: fetchFolderTree });
}

function useInvalidateFolders(alsoNotes = false) {
  const queryClient = useQueryClient();

  return () => {
    void queryClient.invalidateQueries({ queryKey: folderKeys.all });
    if (alsoNotes) {
      void queryClient.invalidateQueries({ queryKey: notesRootKey });
    }
  };
}

export function useCreateFolder() {
  const invalidate = useInvalidateFolders();
  return useMutation({
    mutationFn: (input: CreateFolderInput) => createFolderRequest(input),
    onSettled: invalidate,
  });
}

export function useRenameFolder() {
  const invalidate = useInvalidateFolders();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => updateFolderRequest(id, { name }),
    onSettled: invalidate,
  });
}

export function useMoveFolder() {
  const invalidate = useInvalidateFolders();
  return useMutation({
    mutationFn: ({ id, parentFolderId }: { id: string; parentFolderId: string | null }) =>
      updateFolderRequest(id, { parentFolderId }),
    onSettled: invalidate,
  });
}

export function useDeleteFolder() {
  const invalidate = useInvalidateFolders(true);
  return useMutation({
    mutationFn: ({ id, strategy }: { id: string; strategy: FolderDeleteStrategy }) =>
      deleteFolderRequest(id, strategy),
    onSettled: invalidate,
  });
}
