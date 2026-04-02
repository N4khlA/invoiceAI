import { useState, useEffect, useCallback } from "react";
import { api, extractError } from "@/lib/api";
import { Client, CreateClientRequest, PaginatedResponse } from "@/types";

interface UseClientsOptions {
  includeArchived?: boolean;
  search?: string;
  page?: number;
  pageSize?: number;
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
  const { includeArchived = false, search, page = 1, pageSize = 20 } = options;
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
      if (includeArchived) params.set("includeArchived", "true");
      if (search) params.set("search", search);
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));

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
  }, [includeArchived, search, page, pageSize]);

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
      const { data } = await api.get<{ data: Client }>(`/clients/${id}`);
      setClient(data.data);
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
    const { data } = await api.post<{ data: Client }>("/clients", payload);
    return data.data;
  },

  update: async (
    id: string,
    payload: Partial<CreateClientRequest>
  ): Promise<Client> => {
    const { data } = await api.patch<{ data: Client }>(`/clients/${id}`, payload);
    return data.data;
  },

  archive: async (id: string): Promise<Client> => {
    const { data } = await api.post<{ data: Client }>(`/clients/${id}/archive`);
    return data.data;
  },

  unarchive: async (id: string): Promise<Client> => {
    const { data } = await api.post<{ data: Client }>(`/clients/${id}/unarchive`);
    return data.data;
  },
};
