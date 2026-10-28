import { cn } from "@/lib/formatters";

/** InvoiceAI mark: a folded invoice sheet with a spark. */
export function Logo({ className, withText = true }: { className?: string; withText?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <svg viewBox="0 0 32 32" className="size-8 shrink-0" aria-hidden>
        <rect width="32" height="32" rx="9" className="fill-primary" />
        <path d="M10 8.5h8.5L23 13v10.5a1 1 0 0 1-1 1H10a1 1 0 0 1-1-1v-14a1 1 0 0 1 1-1Z" fill="white" fillOpacity="0.95" />
        <path d="M18.5 8.5V13H23" fill="none" stroke="hsl(var(--primary))" strokeOpacity="0.35" strokeWidth="1.2" />
        <path d="M12 16h6M12 19h4" stroke="hsl(var(--primary))" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M21 17.5l.7 1.6 1.6.7-1.6.7-.7 1.6-.7-1.6-1.6-.7 1.6-.7z" className="fill-primary" />
      </svg>
      {withText && <span className="font-display text-[17px] font-bold tracking-tight text-foreground">InvoiceAI</span>}
    </span>
  );
}
