export interface ExpiredKnowledgeObjectRow {
  id: string;
  storagePath: string | null;
  type: "attachment" | "note";
}

export interface RetentionPurgeResult {
  accountsDeleted: number;
  foldersPurged: number;
  knowledgeObjectsPurged: number;
  storageObjectsRemoved: number;
}
