import React, { useMemo, useId } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts'

function fmtMinutes(v) {
  if (typeof v !== 'number') return '—'
  const h = Math.floor(v / 60)
  const m = v % 60
  return `${h}h ${String(m).padStart(2, '0')}m`
}

// Custom themed tooltip matching the site design (French, styled)
function CustomTooltip({ active, payload }) {
  if (!active || !payload || payload.length === 0) return null
  const value = payload[0].value
  return (
    <div className="bg-white border border-gray-200 rounded-md shadow-md p-2">
      <p className="text-xs font-medium text-gray-900">Heures travaillées</p>
      <p className="text-sm font-semibold text-gray-700">{fmtMinutes(value)}</p>
    </div>
  )
}

const daysFr = ['dim', 'lun', 'mar', 'mer', 'jeu', 'ven', 'sam']
const monthsFr = ['jan', 'fév', 'mar', 'avr', 'mai', 'juin', 'juil', 'aoû', 'sep', 'oct', 'nov', 'déc']

// deterministic gentle series generator between previous and current with adaptive labels
function makeSeries(previous, current, maxPoints = 12, period = 7) {
  const points = Math.max(2, Math.min(maxPoints, period))
  const series = []
  const endDate = new Date()
  const startDate = new Date(endDate)
  startDate.setDate(endDate.getDate() - (period - 1))

  for (let i = 0; i < points; i++) {
    const ratio = points === 1 ? 0 : i / (points - 1)
    // smooth interpolation with ease-in-out
    const ease = 0.5 - 0.5 * Math.cos(Math.PI * ratio)
    const value = Math.round(previous * (1 - ease) + current * ease)

    const labelDate = new Date(startDate)
    labelDate.setDate(startDate.getDate() + Math.round(ratio * (period - 1)))

    let label = ''
    if (period <= 7) {
      label = daysFr[labelDate.getDay()]
    } else if (period <= 31) {
      label = labelDate.getDate().toString()
    } else {
      label = monthsFr[labelDate.getMonth()]
    }

    series.push({ idx: i, value, label })
  }

  return series
}

export default function ChartComparison({ current = 0, previous = 0, height = 120, period = 7, maxPoints = 12 }) {
  const reactId = useId()
  const gradientId = useMemo(() => `compFill-${reactId.replace(/[:]/g, '-')}`, [reactId])
  const data = useMemo(() => makeSeries(previous, current, maxPoints, period), [previous, current, maxPoints, period])
  const pct = previous > 0 ? Math.round(((current - previous) / previous) * 1000) / 10 : (current > 0 ? 100 : 0)
  const pctLabel = `${pct >= 0 ? '+' : ''}${pct}%`

  return (
    <div className="w-full flex flex-col items-center">
      <div className="w-full" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 6, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="6%" stopColor="var(--color-desktop)" stopOpacity={0.16} />
                <stop offset="95%" stopColor="var(--color-desktop)" stopOpacity={0.03} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} strokeDasharray="3 3" strokeOpacity={0.08} />
            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} interval="preserveStartEnd" />
            <YAxis hide />
            <RechartsTooltip content={<CustomTooltip />} cursor={false} />
            <Area type="monotone" dataKey="value" stroke="var(--color-desktop)" fill={`url(#${gradientId})`} strokeWidth={2} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="pt-2 text-center w-full">
        <div className="text-sm text-muted-foreground">Comparaison</div>
        <div className="text-lg font-semibold whitespace-nowrap">{pctLabel} <span className="text-xs text-muted-foreground">vs période précédente</span></div>
      </div>
    </div>
  )
}
