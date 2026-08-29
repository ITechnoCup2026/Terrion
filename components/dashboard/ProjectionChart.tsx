'use client'

import {
  Area,
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { EmptyState } from '@/components/ui/EmptyState'
import { formatNumberId } from '@/lib/format/number'

/**
 * Twelve weeks of projected tonnage, with the uncertainty made visible.
 *
 * The shaded band is not decoration. A harvest window spanning several days
 * does not commit its tonnage to one week; the bar is the even-spread point
 * estimate and the band is the range between "certain to land here" and
 * "could all land here". Drawing only the bar would state a precision the
 * model does not have.
 *
 * Risk weeks carry an icon and the word "Padat" as well as a different fill,
 * because colour alone fails for a colour-blind reader and dies in greyscale
 * the moment someone prints this for a members' meeting.
 */

export type ChartWeek = {
  label: string
  expected: number
  min: number
  max: number
  risk: boolean
}

type Row = ChartWeek & { band: [number, number] }

/**
 * Chart colours, read from the live palette.
 *
 * These were once --terrion-primary / --terrion-accent-strong /
 * --terrion-muted-2, which the palette rewrite renamed out from under them.
 * An undefined custom property in an SVG fill is not an error and has no
 * fallback: the declaration is invalid and the shape paints black, which is
 * how this chart spent a release drawing harvest tonnage as black slabs.
 * lib/theme/tokens.test.ts now fails the build rather than the eye.
 */
const COLOR = {
  bar: 'var(--chart-1)',    // green — a week within capacity
  risk: 'var(--chart-2)',   // gold  — the only warm colour, so it means "act"
  band: 'var(--terrion-green-100)',
}

// Recharts hands the label renderer one datum at a time; only risk weeks get a mark.
function RiskMark(props: { x?: number; y?: number; width?: number; index?: number; rows?: Row[] }) {
  const { x = 0, y = 0, width = 0, index = 0, rows = [] } = props
  if (!rows[index]?.risk) return null
  return (
    <g transform={`translate(${x + width / 2}, ${y - 6})`}>
      <text textAnchor="middle" className="fill-destructive text-[10px] font-semibold">
        ⚠ Padat
      </text>
    </g>
  )
}

function ChartTooltip({ active, payload }: { active?: boolean; payload?: { payload: Row }[] }) {
  if (!active || !payload?.length) return null
  const row = payload[0].payload
  return (
    <div className="rounded-md border border-border bg-card px-3 py-2 text-xs shadow-sm">
      <p className="font-medium text-foreground">{row.label}</p>
      <p className="text-muted-foreground">
        Perkiraan {formatNumberId(row.expected)} ton
      </p>
      <p className="text-muted-foreground">
        Rentang {formatNumberId(row.min)}–{formatNumberId(row.max)} ton
      </p>
      {row.risk && <p className="mt-1 font-medium text-destructive">⚠ Melebihi kapasitas</p>}
    </div>
  )
}

export function ProjectionChart({ weeks }: { weeks: ChartWeek[] }) {
  const rows: Row[] = weeks.map(w => ({ ...w, band: [w.min, w.max] }))
  const hasAny = rows.some(r => r.max > 0)

  if (!hasAny) {
    return (
      <EmptyState
        title="Belum ada panen yang diproyeksikan"
        description="Proyeksi muncul setelah ada blok yang ditanam dan data cuaca tersedia untuk lahannya."
      />
    )
  }

  return (
    // Grows to whatever room the card gives it, with 18rem as the floor. The
    // dashboard sits it beside a taller column, and a fixed height there left
    // a third of the card empty under the axis.
    <div className="h-full min-h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={rows} margin={{ top: 24, right: 8, bottom: 4, left: 0 }}>
          <CartesianGrid stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
            tickLine={false}
            axisLine={{ stroke: 'var(--input)' }}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
            tickLine={false}
            axisLine={false}
            width={44}
            label={{
              value: 'ton',
              position: 'insideTopLeft',
              fontSize: 10,
              fill: 'var(--muted-foreground)',
            }}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--muted)', fillOpacity: 0.6 }} />

          <Area
            dataKey="band"
            stroke="none"
            fill={COLOR.band}
            fillOpacity={0.85}
            isAnimationActive={false}
            activeDot={false}
          />
          <Bar dataKey="expected" isAnimationActive={false} radius={[2, 2, 0, 0]}>
            {rows.map((row, i) => (
              <Cell key={i} fill={row.risk ? COLOR.risk : COLOR.bar} />
            ))}
            <LabelList dataKey="expected" content={<RiskMark rows={rows} />} />
          </Bar>
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
