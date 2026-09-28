import { describe, expect, it, vi } from "vitest";

import { FolderService } from "@/features/folders/folder-service";
import type { FolderRecord } from "@/features/folders/types";
import { CyclicMoveError, NotFoundError, ValidationError } from "@/shared/lib/errors";

const ids = {
  a: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  b: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  c: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
  d: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
};

function folder(id: string, name: string, parentFolderId: string | null): FolderRecord {
  return {
    createdAt: "2026-09-01T00:00:00.000Z",
    deletedAt: null,
    id,
    name,
    ownerId: "user-id",
    parentFolderId,
    updatedAt: "2026-09-01T00:00:00.000Z",
  };
}

// a ─┬─ b ── c
//    └─ (notes)
// d (root)
const hierarchy = [
  folder(ids.a, "Alpha", null),
  folder(ids.b, "Beta", ids.a),
  folder(ids.c, "Gamma", ids.b),
  folder(ids.d, "Delta", null),
];

function setup() {
  const repository = {
    createFolder: vi.fn(),
    getFolder: vi.fn(),
    listFolders: vi.fn().mockResolvedValue(hierarchy),
    reparentChildren: vi.fn().mockResolvedValue(undefined),
    softDeleteFolders: vi.fn().mockResolvedValue(undefined),
    updateFolder: vi.fn(),
  };
  // Notes per folder; list returns the folder's remaining notes, and
  // update/delete remove them — mimicking the active listing draining.
  const notesByFolder = new Map<string, string[]>();
  const notes = {
    delete: vi.fn(async (_userId: string, noteId: string) => {
      for (const [key, list] of notesByFolder) {
        notesByFolder.set(
          key,
          list.filter((id) => id !== noteId),
        );
      }
    }),
    list: vi.fn(async (_userId: string, options: { folderId?: string | null }) => ({
      items: (notesByFolder.get(options.folderId ?? "") ?? []).map((id) => ({ id })),
    })),
    update: vi.fn(async (_userId: string, noteId: string) => {
      for (const [key, list] of notesByFolder) {
        notesByFolder.set(
          key,
          list.filter((id) => id !== noteId),
        );
      }
      return { id: noteId };
    }),
  };
  const service = new FolderService(repository, notes as never);
  return { notes, notesByFolder, repository, service };
}

describe("FolderService.create / rename", () => {
  it("creates a root folder with a trimmed name", async () => {
    const { repository, service } = setup();
    repository.createFolder.mockResolvedValue(folder(ids.a, "Alpha", null));

    await expect(service.create("user-id", { name: "  Alpha " })).resolves.toEqual(
      expect.objectContaining({ id: ids.a, name: "Alpha", parentFolderId: null }),
    );
    expect(repository.createFolder).toHaveBeenCalledWith("user-id", {
      name: "Alpha",
      parentFolderId: null,
    });
  });

  it("rejects an empty name before data access", async () => {
    const { repository, service } = setup();

    await expect(service.create("user-id", { name: "   " })).rejects.toBeInstanceOf(
      ValidationError,
    );
    expect(repository.createFolder).not.toHaveBeenCalled();
  });

  it("refuses a missing or foreign parent with NotFoundError", async () => {
    const { repository, service } = setup();
    repository.getFolder.mockResolvedValue(null);

    await expect(
      service.create("user-id", { name: "X", parentFolderId: ids.b }),
    ).rejects.toBeInstanceOf(NotFoundError);
    await expect(
      service.create("user-id", { name: "X", parentFolderId: "not-a-uuid" }),
    ).rejects.toBeInstanceOf(NotFoundError);
    expect(repository.createFolder).not.toHaveBeenCalled();
  });

  it("renames, and maps an invisible folder to NotFoundError", async () => {
    const { repository, service } = setup();
    repository.updateFolder.mockResolvedValueOnce(folder(ids.a, "Renamed", null));

    await expect(service.rename("user-id", ids.a, "Renamed")).resolves.toEqual(
      expect.objectContaining({ name: "Renamed" }),
    );

    repository.updateFolder.mockResolvedValueOnce(null);
    await expect(service.rename("user-id", ids.a, "X")).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("FolderService.move", () => {
  it("re-parents a folder, preserving its identity", async () => {
    const { repository, service } = setup();
    repository.updateFolder.mockResolvedValue(folder(ids.c, "Gamma", ids.d));

    await expect(service.move("user-id", ids.c, ids.d)).resolves.toEqual(
      expect.objectContaining({ id: ids.c, parentFolderId: ids.d }),
    );
    expect(repository.updateFolder).toHaveBeenCalledWith("user-id", ids.c, {
      parentFolderId: ids.d,
    });
  });

  it("moves to root with null", async () => {
    const { repository, service } = setup();
    repository.updateFolder.mockResolvedValue(folder(ids.b, "Beta", null));

    await service.move("user-id", ids.b, null);

    expect(repository.updateFolder).toHaveBeenCalledWith("user-id", ids.b, {
      parentFolderId: null,
    });
  });

  it.each([
    ["into itself", ids.a, ids.a],
    ["into its child", ids.a, ids.b],
    ["into a deep descendant", ids.a, ids.c],
  ])("rejects moving a folder %s", async (_name, folderId, destination) => {
    const { repository, service } = setup();

    await expect(service.move("user-id", folderId, destination)).rejects.toBeInstanceOf(
      CyclicMoveError,
    );
    expect(repository.updateFolder).not.toHaveBeenCalled();
  });

  it("404s a missing folder or destination", async () => {
    const { service } = setup();
    const missing = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";

    await expect(service.move("user-id", missing, null)).rejects.toBeInstanceOf(NotFoundError);
    await expect(service.move("user-id", ids.a, missing)).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("FolderService.delete", () => {
  it("requires an explicit, known strategy", async () => {
    const { repository, service } = setup();

    await expect(service.delete("user-id", ids.a, "nuke" as never)).rejects.toBeInstanceOf(
      ValidationError,
    );
    expect(repository.listFolders).not.toHaveBeenCalled();
  });

  it("move_to_parent: relocates notes and subfolders one level up, trashes only the folder", async () => {
    const { notes, notesByFolder, repository, service } = setup();
    notesByFolder.set(ids.b, ["n1", "n2"]);

    await service.delete("user-id", ids.b, "move_to_parent");

    expect(notes.update).toHaveBeenCalledWith("user-id", "n1", { folderId: ids.a });
    expect(notes.update).toHaveBeenCalledWith("user-id", "n2", { folderId: ids.a });
    expect(notes.delete).not.toHaveBeenCalled();
    expect(repository.reparentChildren).toHaveBeenCalledWith("user-id", ids.b, ids.a);
    expect(repository.softDeleteFolders).toHaveBeenCalledWith(
      "user-id",
      [ids.b],
      expect.any(String),
    );
  });

  it("delete_contents: trashes every note in the subtree, then the subtree deepest-first", async () => {
    const { notes, notesByFolder, repository, service } = setup();
    notesByFolder.set(ids.a, ["n1"]);
    notesByFolder.set(ids.c, ["n2", "n3"]);

    await service.delete("user-id", ids.a, "delete_contents");

    expect(notes.delete.mock.calls.map(([, id]) => id).sort()).toEqual(["n1", "n2", "n3"]);
    expect(notes.update).not.toHaveBeenCalled();
    expect(repository.softDeleteFolders).toHaveBeenCalledWith(
      "user-id",
      [ids.c, ids.b, ids.a],
      expect.any(String),
    );
    // The unrelated root folder is untouched.
    expect(repository.softDeleteFolders.mock.calls[0][1]).not.toContain(ids.d);
  });

  it("never trashes the folder when moving its contents fails", async () => {
    const { notes, notesByFolder, repository, service } = setup();
    notesByFolder.set(ids.b, ["n1"]);
    notes.update.mockRejectedValueOnce(new Error("network"));

    await expect(service.delete("user-id", ids.b, "move_to_parent")).rejects.toThrow("network");
    expect(repository.softDeleteFolders).not.toHaveBeenCalled();
  });

  it("404s a missing folder", async () => {
    const { service } = setup();

    await expect(
      service.delete("user-id", "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee", "delete_contents"),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("FolderService.list / getTree", () => {
  it("lists direct children of a parent, root by default", async () => {
    const { service } = setup();

    await expect(service.list("user-id")).resolves.toEqual([
      expect.objectContaining({ id: ids.a }),
      expect.objectContaining({ id: ids.d }),
    ]);
    await expect(service.list("user-id", ids.a)).resolves.toEqual([
      expect.objectContaining({ id: ids.b }),
    ]);
  });

  it("nests the hierarchy and surfaces orphans at the root", async () => {
    const { repository, service } = setup();
    repository.listFolders.mockResolvedValue([
      ...hierarchy,
      folder(
        "ffffffff-ffff-4fff-8fff-ffffffffffff",
        "Orphan",
        "99999999-9999-4999-8999-999999999999",
      ),
    ]);

    const tree = await service.getTree("user-id");

    expect(tree.map((node) => node.name)).toEqual(["Alpha", "Delta", "Orphan"]);
    expect(tree[0].children[0].name).toBe("Beta");
    expect(tree[0].children[0].children[0].name).toBe("Gamma");
    expect(tree[0]).not.toHaveProperty("ownerId");
  });
});
