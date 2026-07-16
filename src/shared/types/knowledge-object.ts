export type KnowledgeObjectType = "attachment" | "note";

export interface KnowledgeObjectSummary {
  id: string;
  type: KnowledgeObjectType;
  title: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}
