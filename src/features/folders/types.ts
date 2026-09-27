export interface Folder {
  id: string;
  name: string;
  parentFolderId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FolderTreeNode extends Folder {
  children: FolderTreeNode[];
}

export interface FolderRecord extends Folder {
  deletedAt: string | null;
  ownerId: string;
}

export interface CreateFolderInput {
  name: string;
  parentFolderId?: string | null;
}

export type FolderDeleteStrategy = "delete_contents" | "move_to_parent";
