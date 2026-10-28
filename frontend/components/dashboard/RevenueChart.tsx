"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { MonthlyRevenue } from "@/types";
import { formatCompactCurrency, formatCurrency } from "@/lib/formatters";

/** Single-series monthly bars: no legend (the card title names it), hover tooltip, sr-only table. */
export function RevenueChart({ data, currency }: { data: MonthlyRevenue[]; currency: string }) {
  const empty = data.every((d) => d.amount === 0);

  return (
    <div className="relative">
      <div className="h-[240px] w-full" aria-hidden>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 4 }} barCategoryGap="28%">
            <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="3 3" />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
              dy={6}
            />
            <YAxis
              width={56}
              tickLine={false}
              axisLine={false}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
              tickFormatter={(v: number) => formatCompactCurrency(v, currency)}
              allowDecimals={false}
            />
            <Tooltip
              cursor={{ fill: "hsl(var(--muted))", radius: 6 }}
              content={({ active, payload, label }) =>
                active && payload?.length ? (
                  <div className="rounded-lg border border-border bg-popover px-3 py-2 shadow-pop">
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="tabular text-sm font-semibold text-foreground">
                      {formatCurrency(Number(payload[0].value), currency)}
                    </p>
                  </div>
                ) : null
              }
            />
            <Bar dataKey="amount" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} maxBarSize={44} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      {empty && (
        <p className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
          Paid invoices will show up here.
        </p>
      )}
      <table className="sr-only">
        <caption>Revenue collected per month</caption>
        <thead>
          <tr><th scope="col">Month</th><th scope="col">Revenue</th></tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.month}><td>{d.month}</td><td>{formatCurrency(d.amount, currency)}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
