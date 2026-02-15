import { api } from "../../lib/axios";

export type DashboardDTO = {
  meta: {
    generated_at: string;
    range: { from: string; to: string; month_start: string };
  };
  kpis: {
    reservations_7d: number;
    ca_month: number;
    factures_to_follow_month: number;
    clients_total: number;
    new_clients_month: number;
  };
  series: {
    reservations_7d: Array<{ date: string; v: number }>;
    ca_30d: Array<{ date: string; v: number }>;
  };
  lists: {
    last_reservations: Array<{
      id: number;
      reference?: string | null;
      type?: string | null;
      statut?: string | null;
      created_at?: string | null;
      client?: { id: number; prenom?: string | null; nom?: string | null; email?: string | null } | null;
    }>;
    factures_to_follow: Array<{
      id: number;
      numero?: string | null;
      statut?: string | null;
      total: number;
      created_at?: string | null;
      reservation?: {
        id: number;
        reference?: string | null;
        type?: string | null;
        client?: { id: number; prenom?: string | null; nom?: string | null; email?: string | null } | null;
      } | null;
    }>;
  };
};

export async function fetchDashboard(): Promise<DashboardDTO> {
  const { data } = await api.get("/dashboard");
  return data as DashboardDTO;
}
