import { useState, useEffect, useCallback } from "react";
import { api, extractError } from "@/lib/api";
import { AuthUser, AiTone, Currency } from "@/types";
import { useAuthStore } from "@/store/authStore";

// ─── Payload types ─────────────────────────────────────────────────────────────

export interface UpdateBusinessDetailsPayload {
  businessName: string;
  businessAddress: string;
  currency: Currency;
}

export interface UpdatePreferencesPayload {
  aiTone: AiTone;
  readReceipts: boolean;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

// ─── useAccount hook ───────────────────────────────────────────────────────────

interface UseAccountReturn {
  account: AuthUser | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useAccount(): UseAccountReturn {
  const [account, setAccount] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const updateUser = useAuthStore((s) => s.updateUser);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data } = await api.get<{ data: AuthUser }>("/account");
      setAccount(data.data);
      // Keep store in sync
      updateUser(data.data);
    } catch (err) {
      setError(extractError(err));
    } finally {
      setIsLoading(false);
    }
  }, [updateUser]);

  useEffect(() => {
    void fetch();
  }, [fetch]);

  return { account, isLoading, error, refetch: fetch };
}

// ─── Mutation API helpers ──────────────────────────────────────────────────────

export const accountApi = {
  updateBusiness: async (
    payload: UpdateBusinessDetailsPayload & { logoFile?: File }
  ): Promise<AuthUser> => {
    // If logo file present, use multipart/form-data
    if (payload.logoFile) {
      const form = new FormData();
      form.append("businessName", payload.businessName);
      form.append("businessAddress", payload.businessAddress);
      form.append("currency", payload.currency);
      form.append("logo", payload.logoFile);
      const { data } = await api.patch<{ data: AuthUser }>("/account", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return data.data;
    }

    const { data } = await api.patch<{ data: AuthUser }>("/account", {
      businessName: payload.businessName,
      businessAddress: payload.businessAddress,
      currency: payload.currency,
    });
    return data.data;
  },

  updatePreferences: async (
    payload: UpdatePreferencesPayload
  ): Promise<AuthUser> => {
    const { data } = await api.patch<{ data: AuthUser }>("/account", payload);
    return data.data;
  },

  changePassword: async (payload: ChangePasswordPayload): Promise<void> => {
    await api.patch("/account/password", payload);
  },
};
