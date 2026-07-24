import { type InfiniteData, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Note } from "@/features/notes/types";
import type { Paginated } from "@/shared/types";

import { noteKeys } from "./note-keys";
import { useCreateNote, useDeleteNote, useUpdateNote } from "./use-note-mutations";
import { useNoteQuery } from "./use-note-query";
import { useNotesList } from "./use-notes-list";

const api = {
  createNoteRequest: vi.fn(),
  deleteNoteRequest: vi.fn(),
  fetchNote: vi.fn(),
  fetchNotesList: vi.fn(),
  updateNoteRequest: vi.fn(),
};

vi.mock("@/features/notes/note-api", () => ({
  createNoteRequest: (...args: unknown[]) => api.createNoteRequest(...args),
  deleteNoteRequest: (...args: unknown[]) => api.deleteNoteRequest(...args),
  fetchNote: (...args: unknown[]) => api.fetchNote(...args),
  fetchNotesList: (...args: unknown[]) => api.fetchNotesList(...args),
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
