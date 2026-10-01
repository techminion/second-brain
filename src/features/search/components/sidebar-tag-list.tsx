"use client";

import { Tags } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/shared/lib/utils";

import { useTags } from "../hooks/use-tags";

/** Sidebar Tags section (TAG-07): every tag, linking to its browse view. */
export function SidebarTagList() {
  const pathname = usePathname();
  const query = useTags();
  const tags = query.data ?? [];

  return (
    <section aria-labelledby="sidebar-tags" className="flex flex-col gap-1">
      <h2
        className="text-muted-foreground flex h-9 items-center gap-2 px-2 text-sm font-medium"
        id="sidebar-tags"
      >
        <Tags aria-hidden="true" className="size-4 shrink-0" />
        Tags
      </h2>
      {query.isPending ? null : tags.length === 0 ? (
        <p className="text-muted-foreground px-2 text-sm">No tags yet.</p>
      ) : (
        <ul aria-labelledby="sidebar-tags" className="flex flex-wrap gap-1 px-2">
          {tags.map((tag) => {
            const active = pathname === `/tags/${tag.id}`;
            return (
              <li key={tag.id}>
                <Link
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "bg-tag/10 text-tag-text hover:ring-tag/60 rounded-full px-2 py-0.5 text-xs hover:ring-1",
                    active && "ring-tag ring-1",
                  )}
                  href={`/tags/${tag.id}`}
                >
                  #{tag.name}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
