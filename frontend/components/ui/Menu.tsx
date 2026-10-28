"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/formatters";
import { Button } from "./Button";

export interface MenuItem {
  label: string;
  icon?: React.ElementType;
  onSelect: () => void;
  destructive?: boolean;
  disabled?: boolean;
}

export function Menu({ items, label = "More actions" }: { items: MenuItem[]; label?: string }) {
  if (items.length === 0) return null;
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <Button variant="outline" size="icon" aria-label={label}>
          <MoreHorizontal aria-hidden />
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={6}
          className="z-50 min-w-[200px] animate-scale-in rounded-xl border border-border bg-popover p-1 text-popover-foreground shadow-pop"
        >
          {items.map(({ label, icon: Icon, onSelect, destructive, disabled }) => (
            <DropdownMenu.Item
              key={label}
              disabled={disabled}
              onSelect={onSelect}
              className={cn(
                "flex h-10 cursor-pointer select-none items-center gap-2.5 rounded-lg px-3 text-sm font-medium outline-none transition-colors data-[disabled]:pointer-events-none data-[highlighted]:bg-muted data-[disabled]:opacity-50",
                destructive ? "text-destructive" : "text-foreground"
              )}
            >
              {Icon && <Icon className="size-4" aria-hidden />}
              {label}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
