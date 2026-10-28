"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  CreditCard,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  Settings,
  Users,
  X,
} from "lucide-react";
import { api, getFeatures, type ApiFeatures } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { cn } from "@/lib/formatters";
import { Logo } from "@/components/Logo";
import { Button, PlanBadge, ThemeToggle } from "@/components/ui";

const NAV_ITEMS = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/invoices", icon: FileText, label: "Invoices" },
  { href: "/clients", icon: Users, label: "Clients" },
  { href: "/billing", icon: CreditCard, label: "Billing" },
  { href: "/account", icon: Settings, label: "Settings" },
];

function useIsDemo() {
  const [features, setFeatures] = useState<ApiFeatures | null>(null);
  useEffect(() => {
    void getFeatures().then(setFeatures);
  }, []);
  return features ? !features.email || !features.ai || !features.billing : false;
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const isDemo = useIsDemo();

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      // swallow — logout regardless
    }
    logout();
    router.push("/login");
  };

  const displayName = user?.bizName || user?.name || user?.email || "";

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center px-5">
        <Link href="/dashboard" onClick={onNavigate} className="rounded-lg" aria-label="InvoiceAI dashboard">
          <Logo />
        </Link>
      </div>

      <div className="px-4 pb-2 pt-1">
        <Button asChild className="w-full">
          <Link href="/invoices/new" onClick={onNavigate}>
            <Plus aria-hidden />
            New invoice
          </Link>
        </Button>
      </div>

      <nav aria-label="Main" className="flex-1 space-y-0.5 overflow-y-auto px-3 py-3">
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
          const isActive = href === "/dashboard" ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors",
                isActive
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="size-[18px] shrink-0" aria-hidden />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="space-y-3 border-t border-border p-4">
        {isDemo && (
          <p className="rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-xs leading-relaxed text-foreground">
            <span className="font-semibold">Demo mode</span> — emails are logged, AI uses templates and billing is simulated.
          </p>
        )}
        <div className="flex items-center gap-3">
          <div
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/15 font-display text-sm font-bold uppercase text-primary"
            aria-hidden
          >
            {displayName[0] ?? "?"}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <p className="truncate text-sm font-semibold text-foreground">{displayName}</p>
              <PlanBadge plan={user?.plan ?? "FREE"} />
            </div>
            <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
          </div>
        </div>
        <div className="flex items-center justify-between gap-2">
          <ThemeToggle />
          <Button variant="ghost" size="sm" onClick={handleLogout} className="hover:bg-destructive/10 hover:text-destructive">
            <LogOut aria-hidden />
            Sign out
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Desktop sidebar (≥ lg) + mobile top bar with slide-in drawer. */
export function Sidebar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close drawer on route change and lock body scroll while open
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <aside className="sticky top-0 hidden h-dvh w-[248px] shrink-0 border-r border-border bg-card lg:block">
        <SidebarContent />
      </aside>

      <header className="no-print sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-card/90 px-4 backdrop-blur lg:hidden">
        <Button variant="ghost" size="icon" onClick={() => setOpen(true)} aria-label="Open menu" aria-expanded={open}>
          <Menu className="!size-5" aria-hidden />
        </Button>
        <Link href="/dashboard" aria-label="InvoiceAI dashboard">
          <Logo />
        </Link>
        <Button asChild size="icon" aria-label="New invoice">
          <Link href="/invoices/new">
            <Plus className="!size-5" aria-hidden />
          </Link>
        </Button>
      </header>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="absolute inset-0 animate-fade-in bg-slate-950/50" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-[280px] max-w-[85vw] animate-slide-in-left border-r border-border bg-card shadow-pop">
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-3 top-3"
              onClick={() => setOpen(false)}
              aria-label="Close menu"
            >
              <X className="!size-5" aria-hidden />
            </Button>
            <SidebarContent onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}
