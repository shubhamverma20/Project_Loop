"use client"

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"

interface VolumeChartProps {
  data: { date: string; count: number }[]
}

export function VolumeChart({ data }: VolumeChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-zinc-500 text-sm">
        No volume data available for this range.
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
        <XAxis 
          dataKey="date" 
          axisLine={false} 
          tickLine={false} 
          tick={{ fontSize: 12, fill: "#71717a" }}
          dy={10}
        />
        <YAxis 
          axisLine={false} 
          tickLine={false} 
          tick={{ fontSize: 12, fill: "#71717a" }}
        />
        <Tooltip
          contentStyle={{ 
            backgroundColor: "#ffffff", 
            borderRadius: "8px",
            border: "1px solid #e4e4e7",
            boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)"
          }}
          itemStyle={{ color: "#18181b", fontSize: "14px", fontWeight: 500 }}
          labelStyle={{ color: "#71717a", fontSize: "12px", marginBottom: "4px" }}
        />
        <Line 
          type="monotone" 
          dataKey="count" 
          name="Feedback Volume"
          stroke="#3b82f6" 
          strokeWidth={3}
          dot={{ r: 4, fill: "#3b82f6", strokeWidth: 2, stroke: "#ffffff" }}
          activeDot={{ r: 6, fill: "#2563eb" }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
