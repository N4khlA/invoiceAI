"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  Users,
  Settings,
  CreditCard,
  LogOut,
  Zap,
  Plus,
  ChevronRight,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { cn } from "@/lib/formatters";

const NAV_ITEMS = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/invoices",  icon: FileText,         label: "Invoices" },
  { href: "/clients",   icon: Users,             label: "Clients" },
  { href: "/account",   icon: Settings,          label: "Account" },
  { href: "/billing",   icon: CreditCard,        label: "Billing" },
];

const PLAN_STYLES: Record<string, string> = {
  FREE: "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400",
  PRO:  "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400",
};

export function Sidebar() {
  const pathname = usePathname();
  const router   = useRouter();
  const { user, logout } = useAuthStore();

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      // swallow — logout regardless
    }
    logout();
    router.push("/login");
  };

  const plan = user?.plan ?? "FREE";

  return (
    <aside className="flex h-screen w-60 flex-col border-r border-border bg-card">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 px-5 border-b border-border">
        <Zap className="h-5 w-5 text-primary" />
        <span className="text-base font-bold text-foreground">InvoiceAI</span>
      </div>

      {/* CTA */}
      <div className="px-4 py-4">
        <Link
          href="/invoices/new"
          className={cn(
            "flex w-full items-center justify-center gap-2 rounded-lg",
            "bg-primary px-3 py-2.5 text-sm font-semibold text-primary-foreground",
            "hover:bg-indigo-500 transition-colors"
          )}
        >
          <Plus className="h-4 w-4" />
          New Invoice
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-2 space-y-0.5">
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
          const isActive =
            href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(href);

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
              {isActive && (
                <ChevronRight className="ml-auto h-3.5 w-3.5 opacity-50" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer: email + plan badge + logout */}
      <div className="border-t border-border p-3 space-y-1">
        {/* User info row */}
        <div className="flex items-center gap-3 px-2 py-1.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-sm font-bold text-primary uppercase shrink-0">
            {user?.businessName?.[0] ?? "?"}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <p className="text-xs text-muted-foreground truncate">
                {user?.email ?? "—"}
              </p>
              <span
                className={cn(
                  "shrink-0 inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-bold tracking-wide",
                  PLAN_STYLES[plan]
                )}
              >
                {plan}
              </span>
            </div>
            <p className="text-sm font-medium text-foreground truncate leading-tight">
              {user?.businessName}
            </p>
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className={cn(
            "flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground",
            "hover:bg-destructive/10 hover:text-destructive transition-colors"
          )}
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
