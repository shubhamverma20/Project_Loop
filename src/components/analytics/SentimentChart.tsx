"use client"

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend
} from "recharts"

interface SentimentChartProps {
  data: { name: string; value: number; fill: string }[]
}

export function SentimentChart({ data }: SentimentChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-zinc-500 text-sm">
        No sentiment data available for this range.
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={80}
          paddingAngle={5}
          dataKey="value"
          stroke="none"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.fill} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{ 
            backgroundColor: "#ffffff", 
            borderRadius: "8px",
            border: "1px solid #e4e4e7",
            boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)"
          }}
          itemStyle={{ fontSize: "14px", fontWeight: 500 }}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          formatter={(value: any) => [value, "Feedback"]}
        />
        <Legend 
          verticalAlign="bottom" 
          height={36} 
          iconType="circle"
          wrapperStyle={{ fontSize: "12px", color: "#71717a" }}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}
