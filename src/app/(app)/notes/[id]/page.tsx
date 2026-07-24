import { NoteView } from "@/features/notes/components/note-view";

export const metadata = { title: "Note" };

interface NotePageProps {
  params: Promise<{ id: string }>;
}

export default async function NotePage({ params }: NotePageProps) {
  const { id } = await params;
  return <NoteView noteId={id} />;
}
