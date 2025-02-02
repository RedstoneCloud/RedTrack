"use client"

import { Line, LineChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts"
import { ChartContainer, ChartTooltip } from "@/components/ui/chart"

const data = [
  { name: "Jan", average: 400, today: 240 },
  { name: "Feb", average: 300, today: 139 },
  { name: "Mar", average: 200, today: 980 },
  { name: "Apr", average: 278, today: 390 },
  { name: "May", average: 189, today: 480 },
  { name: "Jun", average: 239, today: 380 },
  { name: "Jul", average: 349, today: 430 },
  { name: "Aug", average: 400, today: 240 },
  { name: "Sep", average: 300, today: 139 },
  { name: "Oct", average: 200, today: 980 },
  { name: "Nov", average: 278, today: 390 },
  { name: "Dec", average: 189, today: 480 },
]

export function SmallChart() {
  return (
    <ChartContainer
      config={{
        average: {
          label: "Average",
          color: "#fff",
        },
        today: {
          label: "Today",
          color: "#ff0000   ",
        },
      }}
      className="h-[300px] min-w-fit w-fit min-h-16"
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{
            top: 5,
            right: 10,
            left: 10,
            bottom: 5,
          }}
          width={400} height={400}
        >
          <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis
            stroke="#888888"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `$${value}`}
          />
          <Tooltip content={<ChartTooltip />} />
          <Line
            type="monotone"
            strokeWidth={2}
            dataKey="today"
            activeDot={{
              r: 6,
              style: { fill: "#00ff00", opacity: 0.25 },
            }}
            style={{
              stroke: "#ff00ff",
            }}
          />
          <Line
            type="monotone"
            dataKey="average"
            strokeWidth={2}
            activeDot={{
              r: 8,
              style: { fill: "#0000ff", opacity: 0.25 },
            }}
            style={{
              stroke: "#0000ff",
            }}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartContainer>
  )
}

