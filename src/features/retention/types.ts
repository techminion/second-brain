export interface ExpiredKnowledgeObjectRow {
  id: string;
  storagePath: string | null;
  type: "attachment" | "note";
}

export interface RetentionPurgeResult {
  foldersPurged: number;
  knowledgeObjectsPurged: number;
  storageObjectsRemoved: number;
}
