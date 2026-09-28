export interface PageResponse<T> {
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  items: T[];
}
