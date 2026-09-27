"use client";

import {
  type InfiniteData,
  type QueryClient,
  type QueryKey,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";

import {
  createNoteRequest,
  deleteNoteRequest,
  restoreNoteRequest,
  updateNoteRequest,
} from "@/features/notes/note-api";
import type { CreateNoteInput, Note, TrashedNote, UpdateNoteInput } from "@/features/notes/types";
import type { Paginated } from "@/shared/types";

import { noteKeys } from "./note-keys";

type ListCache = InfiniteData<Paginated<Note>> | undefined;
type TrashCache = InfiniteData<Paginated<TrashedNote>> | undefined;
type ListSnapshot = [QueryKey, ListCache][];

function mapListItems(cache: ListCache, transform: (items: Note[]) => Note[]): ListCache {
  if (!cache) {
    return cache;
  }

  return {
    ...cache,
    pages: cache.pages.map((page) => ({ ...page, items: transform(page.items) })),
  };
}

function updateListCaches(
  queryClient: QueryClient,
  transform: (items: Note[]) => Note[],
): ListSnapshot {
  const previous = queryClient.getQueriesData<ListCache>({ queryKey: noteKeys.lists() });
  queryClient.setQueriesData<ListCache>({ queryKey: noteKeys.lists() }, (cache) =>
    mapListItems(cache, transform),
  );
  return previous;
}

function restoreListCaches(queryClient: QueryClient, snapshot: ListSnapshot | undefined): void {
  snapshot?.forEach(([key, data]) => queryClient.setQueryData(key, data));
}

function invalidateLists(queryClient: QueryClient): void {
  void queryClient.invalidateQueries({ queryKey: noteKeys.lists() });
}

function buildOptimisticNote(input: CreateNoteInput): Note {
  const now = new Date().toISOString();

  return {
    body: input.body ?? "",
    createdAt: now,
    dailyNoteDate: null,
    folderId: input.folderId ?? null,
    id: `optimistic-${crypto.randomUUID()}`,
    tags: [],
    title: input.title,
    type: "note",
    updatedAt: now,
  };
}

/**
 * Create a note. The new note is optimistically prepended to the first page of
 * every list cache (newest-first) with a temporary id, rolled back on error,
 * and reconciled with the server row when the lists are invalidated on settle.
 */
export function useCreateNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateNoteInput) => createNoteRequest(input),
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: noteKeys.lists() });
      const optimistic = buildOptimisticNote(input);
      const previousLists = updateListCaches(queryClient, (items) => [optimistic, ...items]);
      return { previousLists };
    },
    onError: (_error, _input, context) => {
      restoreListCaches(queryClient, context?.previousLists);
    },
    onSettled: () => {
      invalidateLists(queryClient);
    },
  });
}

/**
 * Update a note. Optimistically patches the note in-place in every list cache
 * and in its detail cache, rolls both back on error, writes the server row on
 * success, and invalidates on settle.
 */
export function useUpdateNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateNoteInput }) =>
      updateNoteRequest(id, input),
    onMutate: async ({ id, input }) => {
      await queryClient.cancelQueries({ queryKey: noteKeys.all });
      const patch = (note: Note): Note => ({
        ...note,
        ...input,
        updatedAt: new Date().toISOString(),
      });

      const previousLists = updateListCaches(queryClient, (items) =>
        items.map((note) => (note.id === id ? patch(note) : note)),
      );

      const previousDetail = queryClient.getQueryData<Note>(noteKeys.detail(id));
      if (previousDetail) {
        queryClient.setQueryData(noteKeys.detail(id), patch(previousDetail));
      }

      return { previousDetail, previousLists };
    },
    onError: (_error, { id }, context) => {
      restoreListCaches(queryClient, context?.previousLists);
      queryClient.setQueryData(noteKeys.detail(id), context?.previousDetail);
    },
    onSuccess: (note) => {
      queryClient.setQueryData(noteKeys.detail(note.id), note);
    },
    onSettled: (_data, _error, { id }) => {
      invalidateLists(queryClient);
      void queryClient.invalidateQueries({ queryKey: noteKeys.detail(id) });
    },
  });
}

/**
 * Delete (soft) a note. Optimistically removes it from every list cache and
 * drops its detail cache, rolling the lists back on error.
 */
export function useDeleteNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteNoteRequest(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: noteKeys.lists() });
      const previousLists = updateListCaches(queryClient, (items) =>
        items.filter((note) => note.id !== id),
      );
      return { previousLists };
    },
    onError: (_error, _id, context) => {
      restoreListCaches(queryClient, context?.previousLists);
    },
    onSuccess: (_data, id) => {
      queryClient.removeQueries({ queryKey: noteKeys.detail(id) });
    },
    onSettled: () => {
      invalidateLists(queryClient);
      void queryClient.invalidateQueries({ queryKey: noteKeys.trash() });
    },
  });
}

/**
 * Restore a note from trash (NOTE-12). Optimistically removes it from the trash
 * listing, rolls back on error, seeds its detail cache with the restored note
 * on success, and invalidates both the trash and the active lists on settle.
 */
export function useRestoreNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => restoreNoteRequest(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: noteKeys.trash() });
      const previousTrash = queryClient.getQueryData<TrashCache>(noteKeys.trash());
      queryClient.setQueryData<TrashCache>(noteKeys.trash(), (cache) =>
        cache
          ? {
              ...cache,
              pages: cache.pages.map((page) => ({
                ...page,
                items: page.items.filter((note) => note.id !== id),
              })),
            }
          : cache,
      );
      return { previousTrash };
    },
    onError: (_error, _id, context) => {
      queryClient.setQueryData(noteKeys.trash(), context?.previousTrash);
    },
    onSuccess: (note) => {
      queryClient.setQueryData(noteKeys.detail(note.id), note);
    },
    onSettled: () => {
      invalidateLists(queryClient);
      void queryClient.invalidateQueries({ queryKey: noteKeys.trash() });
    },
  });
}
