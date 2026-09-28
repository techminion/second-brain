import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

import { FolderRepository } from "@/features/folders/folder-repository";

const row = {
  created_at: "2026-09-01T00:00:00.000Z",
  deleted_at: null,
  id: "folder-id",
  name: "Projects",
  owner_id: "user-id",
  parent_folder_id: null,
  updated_at: "2026-09-01T00:00:00.000Z",
};

function setup(result: { data: unknown; error: unknown }) {
  const builder: Record<string, ReturnType<typeof vi.fn>> & { then?: unknown } = {};
  for (const method of ["eq", "in", "insert", "is", "order", "select", "update"]) {
    builder[method] = vi.fn(() => builder);
  }
  builder.single = vi.fn().mockResolvedValue(result);
  builder.maybeSingle = vi.fn().mockResolvedValue(result);
  builder.then = (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve);
  const from = vi.fn(() => builder);
  return { builder, from, repository: new FolderRepository({ from } as unknown as SupabaseClient) };
}

describe("FolderRepository", () => {
  it("creates an owned folder and maps the row", async () => {
    const { builder, repository } = setup({ data: row, error: null });

    await expect(
      repository.createFolder("user-id", { name: "Projects", parentFolderId: null }),
    ).resolves.toEqual(expect.objectContaining({ id: "folder-id", name: "Projects" }));
    expect(builder.insert).toHaveBeenCalledWith({
      name: "Projects",
      owner_id: "user-id",
      parent_folder_id: null,
    });
  });

  it("reads only active owned folders", async () => {
    const { builder, repository } = setup({ data: null, error: null });

    await expect(repository.getFolder("user-id", "folder-id")).resolves.toBeNull();
    expect(builder.eq).toHaveBeenCalledWith("owner_id", "user-id");
    expect(builder.is).toHaveBeenCalledWith("deleted_at", null);
  });

  it("lists active folders ordered by name", async () => {
    const { builder, repository } = setup({ data: [row], error: null });

    await expect(repository.listFolders("user-id")).resolves.toHaveLength(1);
    expect(builder.is).toHaveBeenCalledWith("deleted_at", null);
    expect(builder.order).toHaveBeenCalledWith("name", { ascending: true });
  });

  it("updates only the provided fields of an active folder", async () => {
    const { builder, repository } = setup({ data: row, error: null });

    await repository.updateFolder("user-id", "folder-id", { parentFolderId: null });

    const values = builder.update.mock.calls[0][0] as Record<string, unknown>;
    expect(values).toHaveProperty("parent_folder_id", null);
    expect(values).not.toHaveProperty("name");
    expect(builder.is).toHaveBeenCalledWith("deleted_at", null);
  });

  it("soft-deletes a set of folders and skips an empty set", async () => {
    const { builder, from, repository } = setup({ data: null, error: null });

    await repository.softDeleteFolders("user-id", [], "2026-09-27T00:00:00.000Z");
    expect(from).not.toHaveBeenCalled();

    await repository.softDeleteFolders("user-id", ["a", "b"], "2026-09-27T00:00:00.000Z");
    expect(builder.in).toHaveBeenCalledWith("id", ["a", "b"]);
    expect(builder.update).toHaveBeenCalledWith({
      deleted_at: "2026-09-27T00:00:00.000Z",
      updated_at: "2026-09-27T00:00:00.000Z",
    });
  });

  it("surfaces failures without leaking database messages", async () => {
    const { repository } = setup({ data: null, error: { message: "secret" } });

    await expect(repository.listFolders("user-id")).rejects.toThrow("Unable to list folders");
  });
});
