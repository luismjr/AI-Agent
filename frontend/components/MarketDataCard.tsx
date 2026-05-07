"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { MarketSnapshot } from "@/lib/types";
import { TrendingUp, TrendingDown } from "lucide-react";

interface Props {
  snapshot: MarketSnapshot;
}

export function MarketDataCard({ snapshot }: Props) {
  const isPositive = (snapshot.change_pct ?? 0) >= 0;
  const chartColor = isPositive ? "#22c55e" : "#ef4444";

  const chartData = snapshot.price_history.slice(-90);

  const minPrice = Math.min(...chartData.map((d) => d.close)) * 0.99;
  const maxPrice = Math.max(...chartData.map((d) => d.close)) * 1.01;

  return (
    <div className="bg-surface border border-border rounded-xl overflow-hidden animate-slide-up">
      {/* Header */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-bold text-primary">
                {snapshot.ticker}
              </span>
              <span className="text-xs text-text-muted truncate max-w-[140px]">
                {snapshot.company_name}
              </span>
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-xl font-semibold text-text-primary">
                {snapshot.current_price != null
                  ? `$${snapshot.current_price.toFixed(2)}`
                  : "—"}
              </span>
              {snapshot.change_pct != null && (
                <span
                  className={`flex items-center gap-0.5 text-xs font-medium ${
                    isPositive ? "text-positive" : "text-negative"
                  }`}
                >
                  {isPositive ? (
                    <TrendingUp size={12} />
                  ) : (
                    <TrendingDown size={12} />
                  )}
                  {isPositive ? "+" : ""}
                  {snapshot.change_pct.toFixed(2)}%
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <div className="h-24 px-0">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 4, right: 0, bottom: 0, left: 0 }}
            >
              <defs>
                <linearGradient id={`grad-${snapshot.ticker}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={chartColor} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={chartColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" hide />
              <YAxis domain={[minPrice, maxPrice]} hide />
              <Tooltip
                contentStyle={{
                  background: "#0e1117",
                  border: "1px solid #252d3f",
                  borderRadius: "8px",
                  fontSize: "11px",
                }}
                itemStyle={{ color: "#e2e8f0" }}
                labelStyle={{ color: "#94a3b8" }}
                formatter={(v: number) => [`$${v.toFixed(2)}`, "Close"]}
              />
              <Area
                type="monotone"
                dataKey="close"
                stroke={chartColor}
                strokeWidth={1.5}
                fill={`url(#grad-${snapshot.ticker})`}
                dot={false}
                activeDot={{ r: 3, fill: chartColor }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-px bg-border m-0">
        {[
          { label: "Market Cap", value: snapshot.market_cap },
          { label: "P/E Ratio", value: snapshot.pe_ratio?.toFixed(1) },
          { label: "52W High", value: snapshot.week_52_high ? `$${snapshot.week_52_high.toFixed(2)}` : null },
          { label: "52W Low", value: snapshot.week_52_low ? `$${snapshot.week_52_low.toFixed(2)}` : null },
        ].map((stat) => (
          <div key={stat.label} className="bg-surface px-3 py-2">
            <div className="text-xs text-text-muted">{stat.label}</div>
            <div className="text-xs font-medium text-text-primary mt-0.5">
              {stat.value ?? "—"}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
