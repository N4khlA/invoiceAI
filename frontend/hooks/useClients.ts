import { useState, useEffect, useCallback } from "react";
import { api, extractError } from "@/lib/api";
import { Client, CreateClientRequest, PaginatedResponse } from "@/types";

interface UseClientsOptions {
  archived?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

interface UseClientsReturn {
  clients: Client[];
  total: number;
  totalPages: number;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useClients(options: UseClientsOptions = {}): UseClientsReturn {
  const { archived = false, search, page = 1, limit = 20 } = options;
  const [clients, setClients] = useState<Client[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (archived) params.set("archived", "true");
      if (search) params.set("search", search);
      params.set("page", String(page));
      params.set("limit", String(limit));

      const { data } = await api.get<PaginatedResponse<Client>>(
        `/clients?${params.toString()}`
      );
      setClients(data.data);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (err) {
      setError(extractError(err));
    } finally {
      setIsLoading(false);
    }
  }, [archived, search, page, limit]);

  useEffect(() => {
    void fetch();
  }, [fetch]);

  return { clients, total, totalPages, isLoading, error, refetch: fetch };
}

interface UseClientReturn {
  client: Client | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useClient(id: string): UseClientReturn {
  const [client, setClient] = useState<Client | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Backend returns the client object directly (includes summary)
      const { data } = await api.get<Client>(`/clients/${id}`);
      setClient(data);
    } catch (err) {
      setError(extractError(err));
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void fetch();
  }, [fetch]);

  return { client, isLoading, error, refetch: fetch };
}

export const clientApi = {
  create: async (payload: CreateClientRequest): Promise<Client> => {
    const { data } = await api.post<Client>("/clients", payload);
    return data;
  },

  update: async (
    id: string,
    payload: Partial<CreateClientRequest>
  ): Promise<Client> => {
    const { data } = await api.patch<Client>(`/clients/${id}`, payload);
    return data;
  },

  // No dedicated archive route on the backend: archive = PATCH isArchived.
  // (The list endpoint hides archived clients by default via ?archived=false.)
  archive: async (id: string): Promise<Client> => {
    const { data } = await api.patch<Client>(`/clients/${id}`, {
      isArchived: true,
    });
    return data;
  },

  unarchive: async (id: string): Promise<Client> => {
    const { data } = await api.patch<Client>(`/clients/${id}`, {
      isArchived: false,
    });
    return data;
  },
};
