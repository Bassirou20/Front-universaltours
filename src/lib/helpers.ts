import { useState, useEffect } from 'react'
import { api } from './axios'

// ─── Debounce hook ────────────────────────────────────────────────────────────

export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

// ─── Pagination normalizer ────────────────────────────────────────────────────
// Handles: Laravel paginate direct, double-nested, or flat array

export const normalizePaged = (input: unknown) => {
  const raw = input as Record<string, unknown> | null | undefined
  const root =
    raw?.data && typeof raw.data === 'object' && Array.isArray((raw.data as Record<string, unknown>).data)
      ? (raw.data as Record<string, unknown>)
      : raw

  const items: unknown[] = Array.isArray(root?.data)
    ? (root.data as unknown[])
    : Array.isArray(root?.items)
    ? (root.items as unknown[])
    : Array.isArray(root)
    ? (root as unknown[])
    : []

  return {
    items,
    page: Number(root?.current_page ?? (root as Record<string, unknown>)?.page ?? 1) || 1,
    lastPage: Number(root?.last_page ?? (root as Record<string, unknown>)?.lastPage ?? 1) || 1,
    total: Number(root?.total ?? items.length ?? 0) || 0,
  }
}

// ─── List normalizer (for non-paginated collections) ─────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const normalizeList = (input: any): any[] => {
  if (!input) return []
  if (Array.isArray(input)) return input
  if (Array.isArray(input?.data?.data)) return input.data.data
  if (Array.isArray(input?.data)) return input.data
  if (Array.isArray(input?.items)) return input.items
  return []
}

// ─── Currency formatter ───────────────────────────────────────────────────────

export const money = (n: unknown, devise = 'XOF') =>
  `${Number(n || 0).toLocaleString()} ${devise}`

// ─── Class merger ─────────────────────────────────────────────────────────────

export const cx = (...cls: Array<string | false | undefined | null>) =>
  cls.filter(Boolean).join(' ')

// ─── Paginated fetcher (fetches all pages) ────────────────────────────────────

export async function fetchAllPaged<T>(
  path: string,
  params?: Record<string, unknown>
): Promise<T[]> {
  const all: T[] = []
  let page = 1
  let last = 1

  for (let guard = 0; guard < 60; guard++) {
    const { data } = await api.get(path, { params: { ...params, page, per_page: 100 } })
    if (Array.isArray(data)) return data as T[]
    const items: T[] = Array.isArray(data?.data) ? (data.data as T[]) : []
    all.push(...items)
    last = Number(data?.last_page ?? 1)
    page = Number(data?.current_page ?? page) + 1
    if (page > last) break
  }

  return all
}
