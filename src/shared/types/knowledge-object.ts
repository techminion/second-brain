export type KnowledgeObjectType = "attachment" | "note";

/** A tag as carried on a knowledge object (ADR-31): id for removal, name for display. */
export interface Tag {
  id: string;
  name: string;
}

export interface KnowledgeObjectSummary {
  id: string;
  type: KnowledgeObjectType;
  title: string;
  tags: Tag[];
  createdAt: string;
  updatedAt: string;
}
