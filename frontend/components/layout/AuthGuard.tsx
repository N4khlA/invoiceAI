"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { restoreSession } from "@/lib/api";
import { Logo } from "@/components/Logo";

/**
 * The access token lives in memory only, so after a reload we silently
 * restore the session from the HttpOnly refresh cookie before rendering.
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const hasToken = useAuthStore((s) => Boolean(s.accessToken));
  const logout = useAuthStore((s) => s.logout);
  const [ready, setReady] = useState(hasToken);

  useEffect(() => {
    if (hasToken) {
      setReady(true);
      return;
    }
    let cancelled = false;
    restoreSession().then((ok) => {
      if (cancelled) return;
      if (ok) {
        setReady(true);
      } else {
        logout();
        router.replace(`/login?next=${encodeURIComponent(pathname)}`);
      }
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasToken]);

  if (!ready) {
    return (
      <div className="flex min-h-dvh items-center justify-center" aria-busy="true" aria-label="Loading your workspace">
        <Logo withText={false} className="animate-pulse" />
      </div>
    );
  }

  return <>{children}</>;
}
