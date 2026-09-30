import { SearchView } from "@/features/search/components/search-view";

export const metadata = { title: "Search" };

interface SearchPageProps {
  searchParams: Promise<{ q?: string | string[] }>;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { q } = await searchParams;
  const query = Array.isArray(q) ? (q[0] ?? "") : (q ?? "");
  // Keyed by the URL query so browser back/forward reseeds the field.
  return <SearchView initialQuery={query} key={query} />;
}
