import { type InfiniteData, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Backlink, Note, TrashedNote } from "@/features/notes/types";
import { graphRootKey } from "@/shared/lib/query-keys";
import type { Paginated } from "@/shared/types";

import { noteKeys } from "./note-keys";
import { useBacklinks } from "./use-backlinks";
import { useCreateNote, useDeleteNote, useRestoreNote, useUpdateNote } from "./use-note-mutations";
import { useNoteQuery } from "./use-note-query";
import { useNotesList } from "./use-notes-list";
import { useTrashList } from "./use-trash-list";

const api = {
  createNoteRequest: vi.fn(),
  deleteNoteRequest: vi.fn(),
  fetchBacklinks: vi.fn(),
  fetchNote: vi.fn(),
  fetchNotesList: vi.fn(),
  fetchTrashList: vi.fn(),
  restoreNoteRequest: vi.fn(),
  updateNoteRequest: vi.fn(),
};

vi.mock("@/features/notes/note-api", () => ({
  createNoteRequest: (...args: unknown[]) => api.createNoteRequest(...args),
  deleteNoteRequest: (...args: unknown[]) => api.deleteNoteRequest(...args),
  fetchBacklinks: (...args: unknown[]) => api.fetchBacklinks(...args),
  fetchNote: (...args: unknown[]) => api.fetchNote(...args),
  fetchNotesList: (...args: unknown[]) => api.fetchNotesList(...args),
  fetchTrashList: (...args: unknown[]) => api.fetchTrashList(...args),
  restoreNoteRequest: (...args: unknown[]) => api.restoreNoteRequest(...args),
  updateNoteRequest: (...args: unknown[]) => api.updateNoteRequest(...args),
}));

beforeEach(() => {
  for (const mock of Object.values(api)) {
    mock.mockReset();
  }
});

function makeNote(overrides: Partial<Note> = {}): Note {
  return {
    body: "",
    createdAt: "2026-07-24T00:00:00Z",
    dailyNoteDate: null,
    folderId: null,
    id: "n1",
    tags: [],
    title: "Note",
    type: "note",
    updatedAt: "2026-07-24T00:00:00Z",
    ...overrides,
  };
}

function seedList(client: QueryClient, items: Note[]): void {
  client.setQueryData<InfiniteData<Paginated<Note>>>(noteKeys.list(), {
    pageParams: [undefined],
    pages: [{ items }],
  });
}

function listItems(client: QueryClient): Note[] {
  return client.getQueryData<InfiniteData<Paginated<Note>>>(noteKeys.list())?.pages[0].items ?? [];
}

function setup() {
  const client = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, wrapper };
}

describe("useNotesList / useNoteQuery", () => {
  it("fetches and exposes the first page of notes", async () => {
    api.fetchNotesList.mockResolvedValue({ items: [makeNote({ id: "n1" })] });
    const { wrapper } = setup();

    const { result } = renderHook(() => useNotesList(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.pages[0].items[0].id).toBe("n1");
  });

  it("fetches a single note by id", async () => {
    api.fetchNote.mockResolvedValue(makeNote({ id: "n1", title: "One" }));
    const { wrapper } = setup();

    const { result } = renderHook(() => useNoteQuery("n1"), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.title).toBe("One");
  });

  it("does not fetch when the id is undefined", () => {
    const { wrapper } = setup();

    const { result } = renderHook(() => useNoteQuery(undefined), { wrapper });

    expect(result.current.fetchStatus).toBe("idle");
    expect(api.fetchNote).not.toHaveBeenCalled();
  });
});

describe("useCreateNote", () => {
  it("optimistically prepends the new note then reconciles on success", async () => {
    const { client, wrapper } = setup();
    seedList(client, [makeNote({ id: "n1", title: "First" })]);
    let resolve: (note: Note) => void = () => {};
    api.createNoteRequest.mockReturnValue(new Promise<Note>((r) => (resolve = r)));

    const { result } = renderHook(() => useCreateNote(), { wrapper });
    act(() => result.current.mutate({ title: "Second" }));

    await waitFor(() => expect(listItems(client)).toHaveLength(2));
    expect(listItems(client)[0].title).toBe("Second");

    act(() => resolve(makeNote({ id: "real", title: "Second" })));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it("rolls back the optimistic insert on error", async () => {
    const { client, wrapper } = setup();
    seedList(client, [makeNote({ id: "n1", title: "First" })]);
    api.createNoteRequest.mockRejectedValue(new Error("boom"));

    const { result } = renderHook(() => useCreateNote(), { wrapper });
    act(() => result.current.mutate({ title: "Second" }));

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(listItems(client)).toHaveLength(1);
    expect(listItems(client)[0].id).toBe("n1");
  });
});

describe("useUpdateNote", () => {
  it("optimistically patches the list and detail caches, then writes the server row", async () => {
    const { client, wrapper } = setup();
    seedList(client, [makeNote({ id: "n1", title: "Old" })]);
    client.setQueryData(noteKeys.detail("n1"), makeNote({ id: "n1", title: "Old" }));
    api.updateNoteRequest.mockResolvedValue(makeNote({ id: "n1", title: "New", body: "server" }));

    const { result } = renderHook(() => useUpdateNote(), { wrapper });
    act(() => result.current.mutate({ id: "n1", input: { title: "New" } }));

    await waitFor(() => expect(listItems(client)[0].title).toBe("New"));
    expect(client.getQueryData<Note>(noteKeys.detail("n1"))?.title).toBe("New");

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(client.getQueryData<Note>(noteKeys.detail("n1"))?.body).toBe("server");
  });
});

// BACK-06 (FR-LINK-6): a backlink appears on the target note without a manual
// refresh once the linking note's save settles — the mounted backlinks query
// refetches because every save invalidates all backlink caches.
describe("backlink freshness (BACK-06)", () => {
  const backlinkFrom = (note: Note): Backlink => ({
    object: {
      createdAt: note.createdAt,
      id: note.id,
      tags: [],
      title: note.title,
      type: "note",
      updatedAt: note.updatedAt,
    },
    snippet: "Links to [[Target]]",
  });

  it("refetches a mounted backlinks query when another note's save settles", async () => {
    const { wrapper } = setup();
    const source = makeNote({ id: "source", title: "Source" });
    api.fetchBacklinks.mockResolvedValueOnce([]).mockResolvedValue([backlinkFrom(source)]);
    api.updateNoteRequest.mockResolvedValue({ ...source, body: "Links to [[Target]]" });

    const { result } = renderHook(
      () => ({ backlinks: useBacklinks("target"), update: useUpdateNote() }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.backlinks.data).toEqual([]));

    act(() =>
      result.current.update.mutate({ id: "source", input: { body: "Links to [[Target]]" } }),
    );

    await waitFor(() => expect(result.current.backlinks.data).toHaveLength(1));
    expect(result.current.backlinks.data?.[0].object.title).toBe("Source");
    expect(api.fetchBacklinks).toHaveBeenCalledTimes(2);
    expect(api.fetchBacklinks).toHaveBeenLastCalledWith("target");
  });

  it("marks unmounted backlink and graph caches stale so the next visit refetches", async () => {
    const { client, wrapper } = setup();
    client.setQueryData(noteKeys.backlinks("target"), []);
    client.setQueryData([...graphRootKey, "global"], { edges: [], nodes: [] });
    api.updateNoteRequest.mockResolvedValue(makeNote({ id: "source" }));

    const { result } = renderHook(() => useUpdateNote(), { wrapper });
    act(() => result.current.mutate({ id: "source", input: { body: "[[Target]]" } }));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    await waitFor(() =>
      expect(client.getQueryState(noteKeys.backlinks("target"))?.isInvalidated).toBe(true),
    );
    expect(client.getQueryState([...graphRootKey, "global"])?.isInvalidated).toBe(true);
  });
});

describe("useDeleteNote", () => {
  it("optimistically removes the note and rolls back on error", async () => {
    const { client, wrapper } = setup();
    seedList(client, [makeNote({ id: "n1" }), makeNote({ id: "n2" })]);
    api.deleteNoteRequest.mockRejectedValue(new Error("boom"));

    const { result } = renderHook(() => useDeleteNote(), { wrapper });
    act(() => result.current.mutate("n1"));

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(listItems(client).map((note) => note.id)).toEqual(["n1", "n2"]);
  });

  it("removes the note optimistically on a successful delete", async () => {
    const { client, wrapper } = setup();
    seedList(client, [makeNote({ id: "n1" }), makeNote({ id: "n2" })]);
    api.deleteNoteRequest.mockResolvedValue({ id: "n1" });

    const { result } = renderHook(() => useDeleteNote(), { wrapper });
    act(() => result.current.mutate("n1"));

    await waitFor(() => expect(listItems(client).map((note) => note.id)).toEqual(["n2"]));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useTrashList / useRestoreNote (NOTE-12)", () => {
  function trashed(id: string): TrashedNote {
    return { ...makeNote({ id, title: id }), deletedAt: "2026-07-25T00:00:00Z" };
  }

  function seedTrash(client: QueryClient, items: TrashedNote[]): void {
    client.setQueryData<InfiniteData<Paginated<TrashedNote>>>(noteKeys.trash(), {
      pageParams: [undefined],
      pages: [{ items }],
    });
  }

  function trashItems(client: QueryClient): TrashedNote[] {
    return (
      client.getQueryData<InfiniteData<Paginated<TrashedNote>>>(noteKeys.trash())?.pages[0].items ??
      []
    );
  }

  it("fetches the first page of trash", async () => {
    const { wrapper } = setup();
    api.fetchTrashList.mockResolvedValue({ items: [trashed("t1")] });

    const { result } = renderHook(() => useTrashList(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.pages[0].items.map((note) => note.id)).toEqual(["t1"]);
    expect(api.fetchTrashList).toHaveBeenCalledWith({ cursor: undefined });
  });

  it("optimistically removes the restored note and seeds its detail cache", async () => {
    const { client, wrapper } = setup();
    seedTrash(client, [trashed("t1"), trashed("t2")]);
    const restored = makeNote({ id: "t1", title: "t1" });
    api.restoreNoteRequest.mockResolvedValue(restored);
    api.fetchTrashList.mockResolvedValue({ items: [trashed("t2")] });

    const { result } = renderHook(() => useRestoreNote(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync("t1");
    });

    expect(trashItems(client).map((note) => note.id)).toEqual(["t2"]);
    expect(client.getQueryData(noteKeys.detail("t1"))).toEqual(restored);
  });

  it("rolls the trash back when restore fails", async () => {
    const { client, wrapper } = setup();
    seedTrash(client, [trashed("t1")]);
    api.restoreNoteRequest.mockRejectedValue(new Error("expired"));
    api.fetchTrashList.mockReturnValue(new Promise(() => undefined));

    const { result } = renderHook(() => useRestoreNote(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync("t1").catch(() => undefined);
    });

    expect(trashItems(client).map((note) => note.id)).toEqual(["t1"]);
  });
});
