"use client";

import { useState } from "react";
import Link from "next/link";
import { useClients, clientApi } from "@/hooks/useClients";
import { Plus, Search, Users, ChevronRight, Trash2 } from "lucide-react";
import { cn } from "@/lib/formatters";

export default function ClientsPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [isDeleting, setIsDeleting] = useState(false);
  const { clients, total, totalPages, isLoading, error, refetch } = useClients({
    search: search || undefined,
    page,
    pageSize: 20,
  });

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete client "${name}"? This will not delete their invoices.`)) return;
    setIsDeleting(true);
    try {
      const { api } = await import("@/lib/api");
      await api.delete(`/clients/${id}`);
      refetch();
    } catch {
      alert("Failed to delete client.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Clients</h1>
          <p className="text-sm text-muted-foreground">{total} total clients</p>
        </div>
        <Link
          href="/clients/new"
          className={cn(
            "flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5",
            "text-sm font-semibold text-primary-foreground hover:bg-indigo-500 transition-colors"
          )}
        >
          <Plus className="h-4 w-4" />
          Add Client
        </Link>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search clients…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="w-full rounded-lg border border-border bg-card pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
        />
      </div>

      {/* List */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {isLoading ? (
          <div className="divide-y divide-border">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="px-5 py-4 h-16 animate-pulse bg-muted/10" />
            ))}
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-20">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        ) : clients.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-6">
            <Users className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm font-medium text-foreground mb-1">No clients yet</p>
            {!search && (
              <Link href="/clients/new" className="text-sm text-primary hover:underline">
                Add your first client →
              </Link>
            )}
          </div>
        ) : (
          <>
            <ul className="divide-y divide-border">
              {clients.map((client) => (
                <li key={client.id}>
                  <div className="flex items-center gap-4 px-5 py-4 hover:bg-accent transition-colors group">
                    {/* Avatar */}
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-sm font-bold text-primary uppercase shrink-0">
                      {client.name[0]}
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{client.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{client.email}</p>
                    </div>
                    {/* Invoice count */}
                    <div className="text-right shrink-0 hidden sm:block">
                      <p className="text-xs text-muted-foreground">
                        {client.outstanding > 0 ? `$${client.outstanding.toFixed(0)} outstanding` : "No outstanding"}
                      </p>
                    </div>
                    {/* Actions */}
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleDelete(client.id, client.name)}
                        disabled={isDeleting}
                        className="text-muted-foreground hover:text-destructive transition-colors"
                        title="Delete client"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                      <Link
                        href={`/clients/${client.id}`}
                        className="text-muted-foreground hover:text-primary transition-colors"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-border">
                <p className="text-xs text-muted-foreground">
                  Page {page} of {totalPages}
                </p>
                <div className="flex gap-2">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                    className="text-xs text-primary hover:underline disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <button
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className="text-xs text-primary hover:underline disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
