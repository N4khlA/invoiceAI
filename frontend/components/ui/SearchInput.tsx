import { Search, X } from "lucide-react";
import { cn } from "@/lib/formatters";
import { Input } from "./Field";

export function SearchInput({
  value,
  onChange,
  placeholder,
  label,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  label: string;
  className?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
      <Input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={label}
        className="pl-9 pr-9 [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="absolute inset-y-0 right-0 flex w-9 cursor-pointer items-center justify-center text-muted-foreground hover:text-foreground"
          aria-label="Clear search"
        >
          <X className="size-4" aria-hidden />
        </button>
      )}
    </div>
  );
}
