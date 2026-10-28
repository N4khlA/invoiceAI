import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "./Button";

export function Pagination({
  page,
  totalPages,
  total,
  pageSize,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <nav aria-label="Pagination" className="flex items-center justify-between gap-4 border-t border-border px-5 py-3">
      <p className="tabular text-sm text-muted-foreground">
        {from}–{to} of {total}
      </p>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={() => onPageChange(page - 1)} disabled={page <= 1} aria-label="Previous page">
          <ChevronLeft aria-hidden />
          <span className="hidden sm:inline">Previous</span>
        </Button>
        <Button variant="outline" size="sm" onClick={() => onPageChange(page + 1)} disabled={page >= totalPages} aria-label="Next page">
          <span className="hidden sm:inline">Next</span>
          <ChevronRight aria-hidden />
        </Button>
      </div>
    </nav>
  );
}
