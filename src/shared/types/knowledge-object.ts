export type KnowledgeObjectType = "attachment" | "note";

/**
 * Who performed a mutation, as recorded in `audit_log.actor` (04_DATABASE
 * §4.13/§8): the user through the app, an AI agent, or the system itself.
 */
export type AuditActor = "ai" | "system" | "user";

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
