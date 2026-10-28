"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FileText, Plus, SearchX } from "lucide-react";
import { useInvoices } from "@/hooks/useInvoices";
import { useDebounce } from "@/hooks/useDebounce";
import { InvoiceStatus } from "@/types";
import { cn } from "@/lib/formatters";
import { Button, Card, EmptyState, ErrorState, Page, PageHeader, Pagination, SearchInput, STATUS_LABELS } from "@/components/ui";
import { InvoiceTable } from "@/components/invoices/InvoiceTable";

const FILTERS: Array<InvoiceStatus | undefined> = [undefined, "DRAFT", "SENT", "VIEWED", "OVERDUE", "PAID", "VOID"];
const PAGE_SIZE = 15;

export default function InvoicesPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<InvoiceStatus | undefined>();
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search.trim());

  useEffect(() => setPage(1), [debouncedSearch, status]);

  const { invoices, total, totalPages, isLoading, error, refetch } = useInvoices({
    search: debouncedSearch || undefined,
    status,
    page,
    limit: PAGE_SIZE,
  });

  const filtered = Boolean(debouncedSearch || status);

  return (
    <Page>
      <PageHeader
        title="Invoices"
        description={isLoading ? "Loading…" : `${total} ${filtered ? "matching" : "in total"}`}
        actions={
          <Button asChild>
            <Link href="/invoices/new">
              <Plus aria-hidden />
              New invoice
            </Link>
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div role="tablist" aria-label="Filter by status" className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0 md:pb-0">
          {FILTERS.map((s) => {
            const active = status === s;
            return (
              <button
                key={s ?? "ALL"}
                role="tab"
                aria-selected={active}
                onClick={() => setStatus(s)}
                className={cn(
                  "h-9 shrink-0 cursor-pointer rounded-full border px-3.5 text-sm font-medium transition-colors",
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground hover:border-muted-foreground/40 hover:text-foreground"
                )}
              >
                {s ? STATUS_LABELS[s] : "All"}
              </button>
            );
          })}
        </div>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search number or client"
          label="Search invoices"
          className="md:w-72"
        />
      </div>

      <Card className="overflow-hidden">
        {error ? (
          <ErrorState message={error} onRetry={refetch} />
        ) : !isLoading && invoices.length === 0 ? (
          filtered ? (
            <EmptyState
              icon={SearchX}
              title="No matching invoices"
              description="Try a different search or status filter."
              action={
                <Button variant="outline" onClick={() => { setSearch(""); setStatus(undefined); }}>
                  Clear filters
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={FileText}
              title="No invoices yet"
              description="Create an invoice, send it to your client, and track it here until it's paid."
              action={
                <Button asChild>
                  <Link href="/invoices/new">
                    <Plus aria-hidden />
                    Create invoice
                  </Link>
                </Button>
              }
            />
          )
        ) : (
          <>
            <InvoiceTable invoices={invoices} isLoading={isLoading} rows={8} />
            <Pagination page={page} totalPages={totalPages} total={total} pageSize={PAGE_SIZE} onPageChange={setPage} />
          </>
        )}
      </Card>
    </Page>
  );
}
