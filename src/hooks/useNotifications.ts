import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/axios'

export type AppNotification = {
  id: number
  user_id: number
  type: string
  title: string
  body: string | null
  url: string | null
  data: Record<string, any> | null
  read_at: string | null
  created_at: string
  updated_at: string
}

/**
 * Polling : compteur léger toutes les 30s.
 */
export function useUnreadCount() {
  return useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: async () => {
      const { data } = await api.get('/notifications/unread-count')
      return Number(data?.count ?? 0)
    },
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    staleTime: 10_000,
  })
}

/**
 * Liste paginée (1ère page = 15 par défaut), refetch à l'ouverture du dropdown.
 */
export function useNotificationsList(enabled = true) {
  return useQuery({
    queryKey: ['notifications', 'list'],
    queryFn: async () => {
      const { data } = await api.get('/notifications', { params: { per_page: 15 } })
      const items: AppNotification[] = Array.isArray(data?.data) ? data.data : []
      return items
    },
    enabled,
    refetchInterval: enabled ? 30_000 : false,
    staleTime: 5_000,
  })
}

export function useMarkNotificationRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      await api.post(`/notifications/${id}/read`)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}

export function useMarkAllRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      await api.post('/notifications/mark-all-read')
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}

export function useDeleteNotification() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/notifications/${id}`)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}
