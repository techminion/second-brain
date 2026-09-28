import { FolderHeader } from "@/features/folders/components/folder-header";
import { FolderNoteList } from "@/features/notes/components/folder-note-list";

export const metadata = { title: "Folder" };

interface FolderPageProps {
  params: Promise<{ id: string }>;
}

export default async function FolderPage({ params }: FolderPageProps) {
  const { id } = await params;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 py-10">
      <FolderHeader folderId={id} />
      <FolderNoteList folderId={id} />
    </div>
  );
}
