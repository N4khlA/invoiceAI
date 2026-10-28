import { useState, useEffect, useCallback } from "react";
import { api, extractError } from "@/lib/api";
import {
  Invoice,
  CreateInvoiceRequest,
  UpdateInvoiceRequest,
  PaginatedResponse,
  AiFollowUpSuggestion,
  AiTone,
  FollowUp,
} from "@/types";

interface UseInvoicesOptions {
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
  clientId?: string;
}

interface UseInvoicesReturn {
  invoices: Invoice[];
  total: number;
  totalPages: number;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useInvoices(options: UseInvoicesOptions = {}): UseInvoicesReturn {
  const { status, search, page = 1, limit = 20, clientId } = options;

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      if (search) params.set("search", search);
      if (clientId) params.set("clientId", clientId);
      params.set("page", String(page));
      params.set("limit", String(limit));

      const { data } = await api.get<PaginatedResponse<Invoice>>(
        `/invoices?${params.toString()}`
      );
      setInvoices(data.data);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (err) {
      setError(extractError(err));
    } finally {
      setIsLoading(false);
    }
  }, [status, search, page, limit, clientId]);

  useEffect(() => {
    void fetch();
  }, [fetch]);

  return { invoices, total, totalPages, isLoading, error, refetch: fetch };
}

interface UseInvoiceReturn {
  invoice: Invoice | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useInvoice(id: string): UseInvoiceReturn {
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Backend returns the invoice object directly (no data wrapper)
      const { data } = await api.get<Invoice>(`/invoices/${id}`);
      setInvoice(data);
    } catch (err) {
      setError(extractError(err));
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void fetch();
  }, [fetch]);

  return { invoice, isLoading, error, refetch: fetch };
}

export const invoiceApi = {
  create: async (payload: CreateInvoiceRequest): Promise<Invoice> => {
    const { data } = await api.post<Invoice>("/invoices", payload);
    return data;
  },

  update: async (id: string, payload: UpdateInvoiceRequest): Promise<Invoice> => {
    const { data } = await api.patch<Invoice>(`/invoices/${id}`, payload);
    return data;
  },

  send: async (id: string, customMessage?: string): Promise<Invoice> => {
    const { data } = await api.post<Invoice>(`/invoices/${id}/send`, {
      customMessage,
    });
    return data;
  },

  markPaid: async (id: string): Promise<Invoice> => {
    const { data } = await api.post<Invoice>(`/invoices/${id}/mark-paid`);
    return data;
  },

  void: async (id: string): Promise<Invoice> => {
    const { data } = await api.post<Invoice>(`/invoices/${id}/void`);
    return data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/invoices/${id}`);
  },

  downloadPdf: async (id: string): Promise<Blob> => {
    const { data } = await api.get<Blob>(`/invoices/${id}/pdf`, {
      responseType: "blob",
    });
    return data;
  },

  // Backend route: POST /v1/ai/follow-up with { invoiceId, tone? }
  getAiSuggestion: async (
    id: string,
    tone?: AiTone
  ): Promise<AiFollowUpSuggestion> => {
    const { data } = await api.post<AiFollowUpSuggestion>("/ai/follow-up", {
      invoiceId: id,
      ...(tone ? { tone } : {}),
    });
    return data;
  },

  sendFollowUp: async (
    id: string,
    subject: string,
    body: string
  ): Promise<void> => {
    await api.post(`/invoices/${id}/followups`, { subject, body });
  },
};

// ─── Follow-up hooks ──────────────────────────────────────────────────────────

export function useFollowUps(invoiceId: string) {
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Backend returns the follow-up array directly (no data wrapper)
      const { data } = await api.get<FollowUp[]>(
        `/invoices/${invoiceId}/followups`
      );
      setFollowUps(data);
    } catch (err) {
      setError(extractError(err));
    } finally {
      setIsLoading(false);
    }
  }, [invoiceId]);

  useEffect(() => {
    void fetch();
  }, [fetch]);

  return { followUps, isLoading, error, refetch: fetch };
}

export function useGenerateAiSuggestion(invoiceId: string) {
  const [suggestion, setSuggestion] = useState<AiFollowUpSuggestion | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const generate = useCallback(async (tone?: AiTone) => {
    setIsGenerating(true);
    try {
      const data = await invoiceApi.getAiSuggestion(invoiceId, tone);
      setSuggestion(data);
    } catch {
      // swallow; UI keeps previous suggestion
    } finally {
      setIsGenerating(false);
    }
  }, [invoiceId]);

  return { suggestion, isGenerating, generate };
}

export function useSendFollowUp(invoiceId: string) {
  const [isSending, setIsSending] = useState(false);

  const sendFollowUp = useCallback(
    async (subject: string, body: string) => {
      setIsSending(true);
      try {
        await invoiceApi.sendFollowUp(invoiceId, subject, body);
      } finally {
        setIsSending(false);
      }
    },
    [invoiceId]
  );

  return { isSending, sendFollowUp };
}
