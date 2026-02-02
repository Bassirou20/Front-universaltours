
export type Paged<T> = { items: T[]; page: number; lastPage: number; perPage?: number; total?: number }
export const fromLaravel = <T>(resp:any): Paged<T> => {
  if (Array.isArray(resp?.data)) { const meta = resp?.meta ?? {}; return { items: resp.data as T[], page: Number(meta.current_page ?? 1), lastPage: Number(meta.last_page ?? 1), perPage: Number(meta.per_page ?? resp?.per_page ?? 10), total: Number(meta.total ?? resp?.total ?? resp?.data?.length ?? 0) } }
  if (Array.isArray(resp)) return { items: resp as T[], page: 1, lastPage: 1, perPage: resp.length, total: resp.length }
  if (Array.isArray(resp?.data?.data)) { const d = resp.data; return { items: d.data as T[], page: Number(d.current_page ?? 1), lastPage: Number(d.last_page ?? 1), perPage: Number(d.per_page ?? 10), total: Number(d.total ?? d.data.length ?? 0) } }
  return { items: [], page: 1, lastPage: 1, total: 0 }
}
