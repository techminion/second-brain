"use client";

import { Folder as FolderIcon } from "lucide-react";
import Link from "next/link";

import { Skeleton } from "@/shared/ui/skeleton";

import { ancestorIds, findFolder } from "../folder-tree-model";
import { useFolderTree } from "../hooks/use-folders";

/**
 * Folder page header (FOLD-13): breadcrumb path, name, and subfolders. The
 * folder's notes render below it from the notes feature (composed by the page).
 */
export function FolderHeader({ folderId }: Readonly<{ folderId: string }>) {
  const query = useFolderTree();

  if (query.isPending) {
    return <Skeleton aria-hidden="true" className="h-8 w-48" />;
  }

  const tree = query.data ?? [];
  const folder = findFolder(tree, folderId);

  if (!folder) {
    return (
      <p className="text-muted-foreground text-sm" role="status">
        This folder doesn’t exist or was deleted.
      </p>
    );
  }

  const trail = ancestorIds(tree, folderId)
    .map((id) => findFolder(tree, id))
    .filter((node) => node !== undefined);

  return (
    <header className="flex flex-col gap-3">
      {trail.length > 0 ? (
        <nav aria-label="Folder path" className="text-muted-foreground text-sm">
          {trail.map((node) => (
            <span key={node.id}>
              <Link className="underline" href={`/folders/${node.id}`}>
                {node.name}
              </Link>
              {" / "}
            </span>
          ))}
        </nav>
      ) : null}
      <h1 className="flex items-center gap-2 text-2xl font-semibold">
        <FolderIcon aria-hidden="true" className="text-muted-foreground size-6" />
        {folder.name}
      </h1>
      {folder.children.length > 0 ? (
        <ul aria-label="Subfolders" className="flex flex-wrap gap-2">
          {folder.children.map((child) => (
            <li key={child.id}>
              <Link
                className="hover:bg-muted flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm"
                href={`/folders/${child.id}`}
              >
                <FolderIcon aria-hidden="true" className="size-4" />
                {child.name}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </header>
  );
}
