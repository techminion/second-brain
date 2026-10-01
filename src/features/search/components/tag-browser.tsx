"use client";

import { FileText, Paperclip } from "lucide-react";
import Link from "next/link";

import { ApiError } from "@/shared/lib/api-client";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import { Skeleton } from "@/shared/ui/skeleton";

import { useObjectsByTag, useTags } from "../hooks/use-tags";

/**
 * Browse by tag (TAG-06, FR-TAG-3): every active object carrying the tag,
 * across folders and types, newest-edited first. The chip row switches the
 * tag filter (TAG-10).
 */
export function TagBrowser({ tagId }: Readonly<{ tagId: string }>) {
  const tags = useTags();
  const objects = useObjectsByTag(tagId);
  const tag = tags.data?.find((candidate) => candidate.id === tagId);
  const items = objects.data?.pages.flatMap((page) => page.items) ?? [];
  const missing = objects.error instanceof ApiError && objects.error.status === 404;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-10">
      <h1 className="text-2xl font-semibold">{tag ? `#${tag.name}` : "Tag"}</h1>

      {(tags.data ?? []).length > 1 ? (
        <nav aria-label="Filter by tag">
          <ul className="flex flex-wrap gap-2">
            {(tags.data ?? []).map((candidate) => (
              <li key={candidate.id}>
                <Link
                  aria-current={candidate.id === tagId ? "page" : undefined}
                  className={cn(
                    "bg-tag/10 text-tag-text hover:ring-tag/60 rounded-full px-3 py-1 text-xs hover:ring-1",
                    candidate.id === tagId && "ring-tag ring-1",
                  )}
                  href={`/tags/${candidate.id}`}
                >
                  #{candidate.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}

      {missing ? (
        <p className="text-muted-foreground text-sm" role="status">
          This tag doesn’t exist.
        </p>
      ) : objects.isPending ? (
        <div aria-hidden="true" className="flex flex-col gap-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : items.length === 0 ? (
        <p className="text-muted-foreground text-sm">Nothing is tagged with this yet.</p>
      ) : (
        <ul aria-label="Tagged items" className="flex flex-col divide-y rounded-md border">
          {items.map((item) => {
            const Icon = item.type === "note" ? FileText : Paperclip;
            const content = (
              <>
                <span className="flex items-center gap-2 text-sm font-medium">
                  <Icon aria-hidden="true" className="text-muted-foreground size-4" />
                  {item.title || "Untitled"}
                </span>
                {item.tags.length > 0 ? (
                  <span className="text-muted-foreground text-xs">
                    {item.tags.map((itemTag) => `#${itemTag.name}`).join(" ")}
                  </span>
                ) : null}
              </>
            );
            return (
              <li key={item.id}>
                {item.type === "note" ? (
                  <Link
                    className="hover:bg-muted flex flex-col gap-1 px-4 py-3"
                    href={`/notes/${item.id}`}
                  >
                    {content}
                  </Link>
                ) : (
                  <div className="flex flex-col gap-1 px-4 py-3">{content}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {objects.hasNextPage ? (
        <Button
          className="self-center"
          disabled={objects.isFetchingNextPage}
          onClick={() => void objects.fetchNextPage()}
          type="button"
          variant="ghost"
        >
          Load more
        </Button>
      ) : null}
    </div>
  );
}
