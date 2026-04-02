import { useState, useEffect, useCallback } from "react";
import { api, extractError } from "@/lib/api";
import { DashboardData } from "@/types";

interface UseDashboardReturn {
  data: DashboardData | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useDashboard(): UseDashboardReturn {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data: response } = await api.get<{ data: DashboardData }>(
        "/dashboard"
      );
      setData(response.data);
    } catch (err) {
      setError(extractError(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetch();
  }, [fetch]);

  return { data, isLoading, error, refetch: fetch };
}
