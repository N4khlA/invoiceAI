import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/formatters";

export function PageHeader({
  title,
  description,
  actions,
  back,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  back?: { href: string; label: string };
  className?: string;
}) {
  return (
    <div className={cn("mb-6 sm:mb-8", className)}>
      {back && (
        <Link
          href={back.href}
          className="mb-3 inline-flex items-center gap-1.5 rounded text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden />
          {back.label}
        </Link>
      )}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-foreground sm:text-[28px]">{title}</h1>
          {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2 md:shrink-0 md:justify-end">{actions}</div>}
      </div>
    </div>
  );
}

/** Standard page container used inside the app shell. */
export function Page({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8", className)} {...props} />;
}
