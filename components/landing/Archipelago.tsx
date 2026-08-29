import { archipelago } from '@/lib/atlas/silhouette'
import { cn } from '@/lib/utils'

/**
 * Indonesia in line art, behind the hero type.
 *
 * Real geography, generated from the same boundary file the Atlas uses, so the
 * silhouette costs no asset and is not a designer's impression of a country.
 * Provinces that actually have a cooperative are filled; the rest are outline
 * only. That is the entire claim the picture makes, and it is true.
 *
 * A server component: the geometry is read and simplified once per process and
 * arrives as markup, so there is no fetch, no loading state and no layout
 * shift under the headline.
 *
 * `aria-hidden`, because it is decoration. Every fact it carries is also in
 * the counts strip below the hero, in words.
 */
export async function Archipelago({
  provincesWithCooperatives, className,
}: {
  /** Lower-cased province names. */
  provincesWithCooperatives: Set<string>
  className?: string
}) {
  const { shapes, viewBox } = await archipelago()

  return (
    <svg
      aria-hidden
      viewBox={viewBox}
      preserveAspectRatio="xMidYMid meet"
      className={cn('pointer-events-none select-none', className)}
    >
      {shapes.map(shape => {
        const lit = provincesWithCooperatives.has(shape.name.toLowerCase())
        return (
          <path
            key={shape.name}
            d={shape.d}
            fill={lit ? 'var(--primary)' : 'none'}
            fillOpacity={lit ? 0.2 : 0}
            stroke="var(--primary)"
            strokeOpacity={lit ? 0.65 : 0.4}
            strokeWidth={lit ? 1.5 : 1}
            vectorEffect="non-scaling-stroke"
            strokeLinejoin="round"
          />
        )
      })}
    </svg>
  )
}
