"use client";

import { Tags } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/shared/lib/utils";
import { SidebarSection } from "@/shared/ui/sidebar-section";

import { useTags } from "../hooks/use-tags";

/** Sidebar Tags section (TAG-07, UX-04): every tag, linking to its browse view; collapsible. */
export function SidebarTagList() {
  const pathname = usePathname();
  const query = useTags();
  const tags = query.data ?? [];

  return (
    <SidebarSection Icon={Tags} id="sidebar-tags" title="Tags">
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
    </SidebarSection>
  );
}
