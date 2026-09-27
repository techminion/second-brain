"use client";

import { useQueryClient } from "@tanstack/react-query";
import { ChevronRight, Folder as FolderIcon, FolderPlus, MoreHorizontal } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { type DragEvent, type KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import type { FolderTreeNode } from "@/features/folders/types";
import { updateNoteRequest } from "@/features/notes/note-api";
import { ApiError } from "@/shared/lib/api-client";
import { folderDragType, noteDragType } from "@/shared/lib/drag-data";
import { notesRootKey } from "@/shared/lib/query-keys";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { Skeleton } from "@/shared/ui/skeleton";

import { ancestorIds, flattenVisible } from "../folder-tree-model";
import {
  useCreateFolder,
  useFolderTree,
  useMoveFolder,
  useRenameFolder,
} from "../hooks/use-folders";
import { DeleteFolderDialog } from "./delete-folder-dialog";
import { FolderNameInput } from "./folder-name-input";

type Editing = { mode: "create"; parentId: string | null } | { mode: "rename"; id: string } | null;

const rootDropId = "__root__";

function hasAppDrag(event: DragEvent): boolean {
  const types = Array.from(event.dataTransfer.types);
  return types.includes(noteDragType) || types.includes(folderDragType);
}

/**
 * Sidebar folder tree (FOLD-06/07/08/10): WAI-ARIA tree with roving focus —
 * ↑/↓ move, → expand/enter, ← collapse/parent, Home/End, Enter opens, F2
 * renames, Delete opens the contents-choice dialog. Notes (from the note list)
 * and folders drag onto a folder to move there, or onto the header for root.
 */
export function FolderTree() {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const query = useFolderTree();
  const createFolder = useCreateFolder();
  const renameFolder = useRenameFolder();
  const moveFolder = useMoveFolder();

  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Editing>(null);
  const [deleting, setDeleting] = useState<FolderTreeNode | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const itemRefs = useRef(new Map<string, HTMLLIElement>());

  const tree = useMemo(() => query.data ?? [], [query.data]);
  const rows = useMemo(() => flattenVisible(tree, expanded), [tree, expanded]);
  const activeFolderId = pathname.startsWith("/folders/") ? pathname.split("/")[2] : null;

  // Reveal the open folder's branch so the current location is visible.
  useEffect(() => {
    if (!activeFolderId || tree.length === 0) {
      return;
    }
    const ancestors = ancestorIds(tree, activeFolderId);
    if (ancestors.some((id) => !expanded.has(id))) {
      setExpanded((current) => new Set([...current, ...ancestors]));
    }
    // Reveal once per location/tree change; `expanded` is deliberately not a dep.
  }, [activeFolderId, tree]);

  const tabStopId =
    rows.find((row) => row.node.id === focusedId)?.node.id ??
    rows.find((row) => row.node.id === activeFolderId)?.node.id ??
    rows[0]?.node.id;

  const focusRow = (id: string | undefined) => {
    if (!id) {
      return;
    }
    setFocusedId(id);
    itemRefs.current.get(id)?.focus();
  };

  const toggle = (id: string, open?: boolean) => {
    setExpanded((current) => {
      const next = new Set(current);
      if (open ?? !next.has(id)) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  };

  const openFolder = (id: string) => router.push(`/folders/${id}`);

  const submitCreate = (parentId: string | null, name: string) => {
    setEditing(null);
    if (parentId) {
      toggle(parentId, true);
    }
    createFolder.mutate(
      { name, parentFolderId: parentId },
      { onError: () => toast.error("Could not create the folder.") },
    );
  };

  const submitRename = (id: string, name: string) => {
    setEditing(null);
    renameFolder.mutate(
      { id, name },
      { onError: () => toast.error("Could not rename the folder.") },
    );
  };

  const moveFolderTo = (id: string, parentFolderId: string | null) => {
    if (id === parentFolderId) {
      return;
    }
    moveFolder.mutate(
      { id, parentFolderId },
      {
        onError: (error) =>
          toast.error(
            error instanceof ApiError && error.code === "CYCLIC_MOVE"
              ? "A folder can’t be moved into one of its own subfolders."
              : "Could not move the folder.",
          ),
        onSuccess: () => {
          if (parentFolderId) {
            toggle(parentFolderId, true);
          }
        },
      },
    );
  };

  const moveNoteTo = async (noteId: string, folderId: string | null) => {
    try {
      await updateNoteRequest(noteId, { folderId });
      toast.success(folderId ? "Note moved" : "Note moved to the top level");
    } catch {
      toast.error("Could not move the note.");
    } finally {
      void queryClient.invalidateQueries({ queryKey: notesRootKey });
    }
  };

  const dropProps = (targetId: string | null) => {
    const key = targetId ?? rootDropId;
    return {
      onDragLeave: () => setDropTarget((current) => (current === key ? null : current)),
      onDragOver: (event: DragEvent) => {
        if (hasAppDrag(event)) {
          event.preventDefault();
          event.stopPropagation();
          event.dataTransfer.dropEffect = "move";
          setDropTarget(key);
        }
      },
      onDrop: (event: DragEvent) => {
        event.preventDefault();
        event.stopPropagation();
        setDropTarget(null);
        const noteId = event.dataTransfer.getData(noteDragType);
        const folderId = event.dataTransfer.getData(folderDragType);
        if (noteId) {
          void moveNoteTo(noteId, targetId);
        } else if (folderId) {
          moveFolderTo(folderId, targetId);
        }
      },
    };
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLLIElement>, index: number) => {
    if (event.target !== event.currentTarget) {
      return; // keys typed inside the inline input or menu button
    }
    const row = rows[index];
    const hasChildren = row.node.children.length > 0;
    const isOpen = expanded.has(row.node.id);

    const handlers: Record<string, () => void> = {
      ArrowDown: () => focusRow(rows[index + 1]?.node.id),
      ArrowLeft: () => (isOpen ? toggle(row.node.id, false) : focusRow(row.parentId ?? undefined)),
      ArrowRight: () => {
        if (hasChildren && !isOpen) {
          toggle(row.node.id, true);
        } else if (hasChildren) {
          focusRow(rows[index + 1]?.node.id);
        }
      },
      ArrowUp: () => focusRow(rows[index - 1]?.node.id),
      Delete: () => setDeleting(row.node),
      End: () => focusRow(rows[rows.length - 1]?.node.id),
      Enter: () => openFolder(row.node.id),
      F2: () => setEditing({ id: row.node.id, mode: "rename" }),
      Home: () => focusRow(rows[0]?.node.id),
    };

    const handler = handlers[event.key];
    if (handler) {
      event.preventDefault();
      handler();
    }
  };

  const renderCreateInput = (parentId: string | null, depth: number) =>
    editing?.mode === "create" && editing.parentId === parentId ? (
      <li className="py-0.5" role="none" style={{ paddingInlineStart: `${depth * 0.75}rem` }}>
        <FolderNameInput
          label="New folder name"
          onCancel={() => setEditing(null)}
          onSubmit={(name) => submitCreate(parentId, name)}
        />
      </li>
    ) : null;

  const renderNodes = (nodes: FolderTreeNode[], depth: number) =>
    nodes.map((node) => {
      const index = rows.findIndex((row) => row.node.id === node.id);
      const isOpen = expanded.has(node.id);
      const hasChildren = node.children.length > 0;
      const isActive = node.id === activeFolderId;
      const isRenaming = editing?.mode === "rename" && editing.id === node.id;

      return (
        <li
          aria-expanded={hasChildren ? isOpen : undefined}
          aria-label={node.name}
          aria-level={depth}
          aria-selected={isActive}
          draggable={!isRenaming}
          key={node.id}
          onDragStart={(event) => {
            event.stopPropagation();
            event.dataTransfer.setData(folderDragType, node.id);
            event.dataTransfer.effectAllowed = "move";
          }}
          onFocus={(event) => {
            if (event.target === event.currentTarget) {
              setFocusedId(node.id);
            }
          }}
          onKeyDown={(event) => handleKeyDown(event, index)}
          ref={(element) => {
            if (element) {
              itemRefs.current.set(node.id, element);
            } else {
              itemRefs.current.delete(node.id);
            }
          }}
          role="treeitem"
          tabIndex={node.id === tabStopId ? 0 : -1}
          className="focus-visible:ring-ring rounded-md outline-none focus-visible:ring-2"
        >
          <div
            {...dropProps(node.id)}
            className={cn(
              "group hover:bg-muted flex h-8 items-center gap-1 rounded-md pr-1",
              isActive && "bg-muted",
              dropTarget === node.id && "ring-ring ring-2",
            )}
            style={{ paddingInlineStart: `${(depth - 1) * 0.75}rem` }}
          >
            <span
              aria-hidden="true"
              className={cn(
                "text-muted-foreground flex size-5 shrink-0 items-center justify-center",
                !hasChildren && "invisible",
              )}
              onClick={() => toggle(node.id)}
            >
              <ChevronRight
                className={cn("size-3.5 transition-transform", isOpen && "rotate-90")}
              />
            </span>
            {isRenaming ? (
              <FolderNameInput
                initialValue={node.name}
                label={`Rename folder ${node.name}`}
                onCancel={() => setEditing(null)}
                onSubmit={(name) => submitRename(node.id, name)}
              />
            ) : (
              <span
                className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-sm"
                onClick={() => {
                  setFocusedId(node.id);
                  openFolder(node.id);
                }}
              >
                <FolderIcon aria-hidden="true" className="text-muted-foreground size-4 shrink-0" />
                <span className="truncate">{node.name}</span>
              </span>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  aria-label={`Actions for folder ${node.name}`}
                  className="text-muted-foreground size-6 shrink-0"
                  size="icon"
                  tabIndex={node.id === tabStopId ? 0 : -1}
                  type="button"
                  variant="ghost"
                >
                  <MoreHorizontal aria-hidden="true" className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="bg-background z-50 min-w-40 rounded-md border p-1 shadow-md"
              >
                {[
                  {
                    label: "New subfolder",
                    run: () => {
                      toggle(node.id, true);
                      setEditing({ mode: "create", parentId: node.id });
                    },
                  },
                  { label: "Rename", run: () => setEditing({ id: node.id, mode: "rename" }) },
                  ...(node.parentFolderId
                    ? [{ label: "Move to top level", run: () => moveFolderTo(node.id, null) }]
                    : []),
                  { label: "Delete…", run: () => setDeleting(node) },
                ].map((item) => (
                  <DropdownMenuItem
                    className="hover:bg-muted focus:bg-muted cursor-pointer rounded-sm px-2 py-1.5 text-sm outline-none"
                    key={item.label}
                    onSelect={item.run}
                  >
                    {item.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          {isOpen || (editing?.mode === "create" && editing.parentId === node.id) ? (
            <ul role="group">
              {renderNodes(node.children, depth + 1)}
              {renderCreateInput(node.id, depth)}
            </ul>
          ) : null}
        </li>
      );
    });

  return (
    <section aria-labelledby="sidebar-folders" className="flex flex-col gap-1">
      <div
        {...dropProps(null)}
        className={cn(
          "flex h-9 items-center justify-between rounded-md px-2",
          dropTarget === rootDropId && "ring-ring ring-2",
        )}
      >
        <h2
          className="text-muted-foreground flex items-center gap-2 text-sm font-medium"
          id="sidebar-folders"
        >
          <FolderIcon aria-hidden="true" className="size-4 shrink-0" />
          Folders
        </h2>
        <Button
          aria-label="New folder"
          className="text-muted-foreground hover:text-foreground size-7 shrink-0"
          onClick={() => setEditing({ mode: "create", parentId: null })}
          size="icon"
          type="button"
          variant="ghost"
        >
          <FolderPlus aria-hidden="true" className="size-4" />
        </Button>
      </div>

      {query.isPending ? (
        <div aria-hidden="true" className="flex flex-col gap-1 px-2">
          <Skeleton className="h-6 w-4/5" />
          <Skeleton className="h-6 w-3/5" />
        </div>
      ) : query.isError ? (
        <p className="text-destructive px-2 text-sm" role="alert">
          Could not load folders.
        </p>
      ) : (
        <>
          {tree.length === 0 && editing?.mode !== "create" ? (
            <p className="text-muted-foreground px-2 text-sm">No folders yet.</p>
          ) : null}
          <ul aria-labelledby="sidebar-folders" className="flex flex-col" role="tree">
            {renderNodes(tree, 1)}
            {renderCreateInput(null, 0)}
          </ul>
        </>
      )}

      <DeleteFolderDialog
        folder={deleting}
        onClose={() => setDeleting(null)}
        onDeleted={(id) => {
          if (id === activeFolderId) {
            router.replace("/");
          }
        }}
      />
    </section>
  );
}
