import { FolderRepository } from "@/features/folders/folder-repository";
import type {
  CreateFolderInput,
  Folder,
  FolderDeleteStrategy,
  FolderRecord,
  FolderTreeNode,
} from "@/features/folders/types";
import { createNoteService, type NoteService } from "@/features/notes/note-service";
import { CyclicMoveError, NotFoundError, ValidationError } from "@/shared/lib/errors";
import { createServerActionSupabaseClient } from "@/shared/lib/supabase-server-action-client";

type FolderRepositoryContract = Pick<
  FolderRepository,
  | "createFolder"
  | "getFolder"
  | "listFolders"
  | "reparentChildren"
  | "softDeleteFolders"
  | "updateFolder"
>;

/**
 * The NoteService methods folder operations compose (05_API §12 rule 1/4):
 * FolderService never writes `notes`/`knowledge_objects` itself — contained
 * notes are moved or trashed through NoteService's public contract.
 */
type NoteOperations = Pick<NoteService, "delete" | "list" | "update">;

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const deleteStrategies: readonly FolderDeleteStrategy[] = ["delete_contents", "move_to_parent"];
const noteBatchSize = 100;
// Upper bound on note batches per folder, so a misbehaving list can never spin
// forever (100k notes per folder is far beyond MVP scale).
const maxNoteBatches = 1000;

function toFolder(record: FolderRecord): Folder {
  return {
    createdAt: record.createdAt,
    id: record.id,
    name: record.name,
    parentFolderId: record.parentFolderId,
    updatedAt: record.updatedAt,
  };
}

function normalizeName(name: unknown): string {
  if (typeof name !== "string") {
    throw new ValidationError("Folder name must be a string");
  }

  const trimmed = name.trim();
  if (trimmed.length === 0) {
    throw new ValidationError("Folder name must not be empty");
  }

  return trimmed;
}

function isFolderId(value: unknown): value is string {
  return typeof value === "string" && uuidPattern.test(value);
}

/** Folder ids in `rootId`'s subtree (inclusive), deepest first. */
function subtreeDeepestFirst(folders: FolderRecord[], rootId: string): string[] {
  const childrenOf = new Map<string, string[]>();
  for (const folder of folders) {
    if (folder.parentFolderId) {
      childrenOf.set(folder.parentFolderId, [
        ...(childrenOf.get(folder.parentFolderId) ?? []),
        folder.id,
      ]);
    }
  }

  const ordered: string[] = [];
  const visit = (id: string, seen: Set<string>) => {
    if (seen.has(id)) {
      return; // defensive: a pre-existing cycle must not loop forever
    }
    seen.add(id);
    for (const child of childrenOf.get(id) ?? []) {
      visit(child, seen);
    }
    ordered.push(id);
  };
  visit(rootId, new Set());

  return ordered;
}

export class FolderService {
  constructor(
    private readonly repository: FolderRepositoryContract,
    private readonly notes: NoteOperations,
  ) {}

  async create(userId: string, input: CreateFolderInput): Promise<Folder> {
    const name = normalizeName(input.name);
    const parentFolderId = input.parentFolderId ?? null;

    if (parentFolderId !== null) {
      await this.requireFolder(userId, parentFolderId);
    }

    return toFolder(await this.repository.createFolder(userId, { name, parentFolderId }));
  }

  async rename(userId: string, folderId: string, name: string): Promise<Folder> {
    const normalized = normalizeName(name);

    if (!isFolderId(folderId)) {
      throw new NotFoundError("Folder not found");
    }

    const updated = await this.repository.updateFolder(userId, folderId, { name: normalized });
    if (!updated) {
      throw new NotFoundError("Folder not found");
    }

    return toFolder(updated);
  }

  /**
   * Re-parent a folder (FR-FOLDER-1). `null` moves it to the root. Refuses to
   * make a folder its own ancestor (04_DATABASE §4.5 service-layer constraint).
   */
  async move(userId: string, folderId: string, newParentFolderId: string | null): Promise<Folder> {
    if (!isFolderId(folderId)) {
      throw new NotFoundError("Folder not found");
    }

    const folders = await this.repository.listFolders(userId);
    const byId = new Map(folders.map((folder) => [folder.id, folder]));

    if (!byId.has(folderId)) {
      throw new NotFoundError("Folder not found");
    }

    if (newParentFolderId !== null) {
      if (!isFolderId(newParentFolderId) || !byId.has(newParentFolderId)) {
        throw new NotFoundError("Destination folder not found");
      }

      // Walk up from the destination; reaching the moved folder is a cycle.
      let cursor: string | null = newParentFolderId;
      const seen = new Set<string>();
      while (cursor !== null && !seen.has(cursor)) {
        if (cursor === folderId) {
          throw new CyclicMoveError("A folder cannot be moved into itself or its subfolders");
        }
        seen.add(cursor);
        cursor = byId.get(cursor)?.parentFolderId ?? null;
      }
    }

    const updated = await this.repository.updateFolder(userId, folderId, {
      parentFolderId: newParentFolderId,
    });
    if (!updated) {
      throw new NotFoundError("Folder not found");
    }

    return toFolder(updated);
  }

  /**
   * Delete a folder with a mandatory contents strategy (FR-FOLDER-3):
   * - `move_to_parent`: its notes and subfolders move up one level, then the
   *   folder alone is trashed.
   * - `delete_contents`: every note in the subtree is trashed through
   *   NoteService (restorable for 30 days), then the subtree's folders.
   * Steps are ordered so a partial failure leaves consistent, retryable state:
   * contents are handled before the folder that holds them disappears.
   */
  async delete(userId: string, folderId: string, strategy: FolderDeleteStrategy): Promise<void> {
    if (!deleteStrategies.includes(strategy)) {
      throw new ValidationError("Strategy must be 'delete_contents' or 'move_to_parent'");
    }

    if (!isFolderId(folderId)) {
      throw new NotFoundError("Folder not found");
    }

    const folders = await this.repository.listFolders(userId);
    const folder = folders.find((candidate) => candidate.id === folderId);

    if (!folder) {
      throw new NotFoundError("Folder not found");
    }

    const deletedAt = new Date().toISOString();

    if (strategy === "move_to_parent") {
      await this.drainNotes(userId, folderId, (noteId) =>
        this.notes.update(userId, noteId, { folderId: folder.parentFolderId }),
      );
      await this.repository.reparentChildren(userId, folderId, folder.parentFolderId);
      await this.repository.softDeleteFolders(userId, [folderId], deletedAt);
      return;
    }

    const subtree = subtreeDeepestFirst(folders, folderId);
    for (const id of subtree) {
      await this.drainNotes(userId, id, (noteId) => this.notes.delete(userId, noteId));
    }
    await this.repository.softDeleteFolders(userId, subtree, deletedAt);
  }

  /** Direct children of `parentFolderId` (root when omitted/null). */
  async list(userId: string, parentFolderId: string | null = null): Promise<Folder[]> {
    const folders = await this.repository.listFolders(userId);
    return folders.filter((folder) => folder.parentFolderId === parentFolderId).map(toFolder);
  }

  /**
   * The whole active hierarchy, children sorted by name. A folder whose parent
   * is trashed or missing surfaces at the root rather than disappearing.
   */
  async getTree(userId: string): Promise<FolderTreeNode[]> {
    const folders = await this.repository.listFolders(userId);
    const nodes = new Map<string, FolderTreeNode>(
      folders.map((folder) => [folder.id, { ...toFolder(folder), children: [] }]),
    );
    const roots: FolderTreeNode[] = [];

    for (const folder of folders) {
      const node = nodes.get(folder.id);
      const parent = folder.parentFolderId ? nodes.get(folder.parentFolderId) : undefined;

      if (!node) {
        continue;
      }

      if (parent && parent !== node) {
        parent.children.push(node);
      } else {
        roots.push(node);
      }
    }

    return roots;
  }

  private async requireFolder(userId: string, folderId: string): Promise<FolderRecord> {
    const folder = isFolderId(folderId) ? await this.repository.getFolder(userId, folderId) : null;

    if (!folder) {
      throw new NotFoundError("Parent folder not found");
    }

    return folder;
  }

  /**
   * Apply `operation` to every active note in a folder. Each operation removes
   * the note from the folder's active listing, so the first page is re-read
   * until empty rather than following a cursor over a shifting set.
   */
  private async drainNotes(
    userId: string,
    folderId: string,
    operation: (noteId: string) => Promise<unknown>,
  ): Promise<void> {
    for (let batch = 0; batch < maxNoteBatches; batch += 1) {
      const page = await this.notes.list(userId, { folderId, limit: noteBatchSize });

      if (page.items.length === 0) {
        return;
      }

      for (const note of page.items) {
        await operation(note.id);
      }
    }

    throw new Error("Folder note drain exceeded its batch limit");
  }
}

export async function createFolderService(): Promise<FolderService> {
  const client = await createServerActionSupabaseClient();
  return new FolderService(new FolderRepository(client), await createNoteService());
}
