import { TagBrowser } from "@/features/search/components/tag-browser";

export const metadata = { title: "Tag" };

interface TagPageProps {
  params: Promise<{ id: string }>;
}

export default async function TagPage({ params }: TagPageProps) {
  const { id } = await params;
  return <TagBrowser tagId={id} />;
}
