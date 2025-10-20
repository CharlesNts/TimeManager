import React from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts'

// Génère des données de sparkline factices pour le graphique
const generateSparkline = (value, period) => {
  const days = period === 7 ? 7 : period === 30 ? 30 : 12;
  const baseValue = value / days;
  return Array.from({ length: days }, (_, i) => ({
    day: `J${i + 1}`,
    value: Math.max(0, baseValue + (Math.random() - 0.5) * baseValue * 0.4)
  }));
};

// Custom Tooltip standard pour tous les dashboards
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload[0]) {
    const value = payload[0].value;
    const formattedValue = typeof value === 'number' ? 
      (value >= 60 ? `${Math.floor(value / 60)}h ${value % 60}m` : `${value}m`) : 
      value;
    
    return (
      <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg text-xs">
        <p className="font-medium text-gray-900">{label}</p>
        <p className="text-blue-600 font-semibold">{formattedValue}</p>
      </div>
    )
  }
  return null
}

export default function KPIChartCard({ 
  title, 
  value, 
  icon, 
  chartColor = 'var(--color-desktop)',
  chartSeries = [],
  period = 7,
  valueFormatter,
  isRate = false,
  rateValue,
  children
}) {
  const IconComponent = icon
  
  // Utiliser les données réelles si fournies, sinon générer des données factices
  const data = chartSeries && chartSeries.length > 0 ? chartSeries : generateSparkline(value, period)

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-500">
          {title}
        </CardTitle>
        {IconComponent && <IconComponent className="h-4 w-4 text-gray-400" />}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold mb-2">
          {isRate && rateValue ? `${rateValue.toFixed(1)}%` : valueFormatter ? valueFormatter(value) : value}
        </div>
        <div className="h-[120px] mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 6, right: 0, left: 0, bottom: 24 }}>
              <defs>
                <linearGradient id={`fill-${title}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="6%" stopColor={chartColor} stopOpacity={0.16} />
                  <stop offset="95%" stopColor={chartColor} stopOpacity={0.03} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="3 3" strokeOpacity={0.08} />
              <XAxis dataKey="label" axisLine={false} tick={{ fontSize: 12 }} />
              <YAxis hide />
              <RechartsTooltip content={<CustomTooltip />} cursor={false} />
              <Area 
                type="monotone" 
                dataKey="value" 
                stroke={chartColor} 
                fill={`url(#fill-${title})`} 
                strokeWidth={2} 
                dot={false}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        {children && <div className="mt-2">{children}</div>}
      </CardContent>
    </Card>
  )
}
