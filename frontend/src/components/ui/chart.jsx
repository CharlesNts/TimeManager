import React from 'react'
import { Tooltip, Legend } from 'recharts'

// Small shadcn-like chart primitives to be reused by dashboard components.
// This mirrors the example provided and adapts to the project's CSS variables.

export const ChartContainer = ({ children, className = '', ...props }) => {
  return (
    <div className={`tm-chart-container ${className}`} {...props}>
      {children}
    </div>
  )
}

export const ChartTooltip = ({ content, ...props }) => {
  // We simply delegate to recharts' Tooltip but keep the wrapper for consistent api
  return <Tooltip {...props} content={content} />
}

export const ChartLegend = ({ content, ...props }) => {
  return <Legend {...props} content={content} />
}

export const ChartLegendContent = ({ payload }) => {
  if (!payload) return null
  return (
    <div className="flex items-center gap-3">
      {payload.map((item) => (
        <div key={item.dataKey} className="flex items-center gap-2 text-sm">
          <span style={{ width: 12, height: 8, background: item.color || 'currentColor', display: 'inline-block' }} />
          <span className="text-xs text-muted-foreground">{item.value}</span>
        </div>
      ))}
    </div>
  )
}

export const ChartTooltipContent = ({ payload, label, labelFormatter }) => {
  return (
    <div className="p-2 bg-white border rounded-md shadow-sm">
      <div className="text-xs font-medium">{labelFormatter ? labelFormatter(label) : label}</div>
      {payload?.map((p) => (
        <div key={p.dataKey} className="text-sm text-gray-700">{p.name}: <strong>{p.value}</strong></div>
      ))}
    </div>
  )
}

export const ChartConfig = {} // placeholder for type-like usage

export default ChartContainer
