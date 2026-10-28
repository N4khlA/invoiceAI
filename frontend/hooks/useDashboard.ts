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
      // Backend returns the dashboard object directly (no data wrapper)
      const { data: response } = await api.get<DashboardData>(
        "/dashboard/summary"
      );
      setData(response);
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
