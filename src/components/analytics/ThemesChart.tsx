"use client"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"

interface ThemesChartProps {
  data: { theme: string; count: number }[]
}

export function ThemesChart({ data }: ThemesChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-zinc-500 text-sm">
        No theme data available for this range.
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout="vertical" margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e4e4e7" />
        <XAxis 
          type="number"
          axisLine={false} 
          tickLine={false} 
          tick={{ fontSize: 12, fill: "#71717a" }}
        />
        <YAxis 
          dataKey="theme" 
          type="category"
          axisLine={false} 
          tickLine={false} 
          tick={{ fontSize: 12, fill: "#3f3f46" }}
          width={100}
        />
        <Tooltip
          cursor={{ fill: "#f4f4f5" }}
          contentStyle={{ 
            backgroundColor: "#ffffff", 
            borderRadius: "8px",
            border: "1px solid #e4e4e7",
            boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)"
          }}
          itemStyle={{ color: "#8b5cf6", fontSize: "14px", fontWeight: 500 }}
        />
        <Bar 
          dataKey="count" 
          name="Mentions"
          fill="#8b5cf6" 
          radius={[0, 4, 4, 0]} 
          barSize={24}
        />
      </BarChart>
    </ResponsiveContainer>
  )
}
