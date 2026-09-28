import { OpenTodayRedirect } from "@/features/notes/components/open-today-redirect";

export const metadata = { title: "Today" };

interface TodayPageProps {
  searchParams: Promise<{ offset?: string }>;
}

export default async function TodayPage({ searchParams }: TodayPageProps) {
  const { offset } = await searchParams;
  const days = Number(offset ?? 0);
  return <OpenTodayRedirect offsetDays={Number.isInteger(days) ? days : 0} />;
}
