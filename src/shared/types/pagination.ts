export interface PaginationOptions {
  cursor?: string;
  limit?: number;
}

export interface Paginated<T> {
  items: T[];
  nextCursor?: string;
}
