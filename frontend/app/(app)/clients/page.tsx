"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Archive, ChevronRight, Plus, SearchX, Users } from "lucide-react";
import { useClients } from "@/hooks/useClients";
import { useDebounce } from "@/hooks/useDebounce";
import { cn } from "@/lib/formatters";
import { Button, Card, EmptyState, ErrorState, Page, PageHeader, Pagination, SearchInput, Skeleton } from "@/components/ui";

const PAGE_SIZE = 20;

function Avatar({ name }: { name: string }) {
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  return (
    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 font-display text-sm font-bold text-primary" aria-hidden>
      {initials || "?"}
    </span>
  );
}

export default function ClientsPage() {
  const [search, setSearch] = useState("");
  const [archived, setArchived] = useState(false);
  const [page, setPage] = useState(1);
  const debounced = useDebounce(search.trim());

  useEffect(() => setPage(1), [debounced, archived]);

  const { clients, total, totalPages, isLoading, error, refetch } = useClients({
    search: debounced || undefined,
    archived,
    page,
    limit: PAGE_SIZE,
  });

  return (
    <Page>
      <PageHeader
        title="Clients"
        description={isLoading ? "Loading…" : `${total} ${archived ? "archived" : "active"}`}
        actions={
          <Button asChild>
            <Link href="/clients/new">
              <Plus aria-hidden />
              New client
            </Link>
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div role="tablist" aria-label="Client list" className="inline-flex rounded-lg border border-border bg-muted/60 p-0.5">
          {[
            { value: false, label: "Active" },
            { value: true, label: "Archived" },
          ].map((t) => (
            <button
              key={t.label}
              role="tab"
              aria-selected={archived === t.value}
              onClick={() => setArchived(t.value)}
              className={cn(
                "h-8 cursor-pointer rounded-md px-4 text-sm font-medium transition-colors",
                archived === t.value ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
        <SearchInput value={search} onChange={setSearch} placeholder="Search name, email or company" label="Search clients" className="sm:w-80" />
      </div>

      <Card className="overflow-hidden">
        {error ? (
          <ErrorState message={error} onRetry={refetch} />
        ) : isLoading ? (
          <div className="divide-y divide-border">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-5 py-4">
                <Skeleton className="size-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-56" />
                </div>
              </div>
            ))}
          </div>
        ) : clients.length === 0 ? (
          debounced ? (
            <EmptyState icon={SearchX} title="No matching clients" description={`Nothing matches “${debounced}”.`} />
          ) : archived ? (
            <EmptyState icon={Archive} title="No archived clients" description="Archived clients are hidden from new invoices but keep their history." />
          ) : (
            <EmptyState
              icon={Users}
              title="Add your first client"
              description="Save the people you bill once, then invoice them in a couple of clicks."
              action={
                <Button asChild>
                  <Link href="/clients/new">
                    <Plus aria-hidden />
                    New client
                  </Link>
                </Button>
              }
            />
          )
        ) : (
          <>
            <ul className="divide-y divide-border">
              {clients.map((c) => (
                <li key={c.id}>
                  <Link href={`/clients/${c.id}`} className="group flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-muted/50 sm:px-5">
                    <Avatar name={c.name} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-foreground">{c.name}</p>
                      <p className="truncate text-sm text-muted-foreground">
                        {c.company && c.company !== c.name ? `${c.company} · ` : ""}
                        {c.email}
                      </p>
                    </div>
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
            <Pagination page={page} totalPages={totalPages} total={total} pageSize={PAGE_SIZE} onPageChange={setPage} />
          </>
        )}
      </Card>
    </Page>
  );
}
