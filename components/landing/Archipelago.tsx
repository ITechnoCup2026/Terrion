import { archipelago } from '@/lib/atlas/silhouette'
import { cn } from '@/lib/utils'

/**
 * Indonesia in line art.
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
 * It draws in `currentColor`, so the caller owns the hue: `text-primary` on
 * paper, `text-white` on a dark ground. Lit and unlit are told
 * apart by opacity and stroke weight rather than by two different colours,
 * which is why one inherited colour is enough for both.
 *
 * `aria-hidden`, because it is decoration. Every fact it carries is also in
 * the counts strip further up the page, in words.
 */
export async function Archipelago({
  provincesWithCooperatives,
  className,
  emphasis = 1,
  animate = false,
}: {
  /** Lower-cased province names. */
  provincesWithCooperatives: Set<string>
  className?: string
  /**
   * Multiplies every opacity. One is the value tuned for dark ink on paper;
   * a caller drawing white on a mid green finds the same numbers come out as a
   * ghost, and asks for more. A multiplier rather than a second set
   * of colours, so a lit province and an unlit one keep their ratio and the
   * picture cannot start meaning something different on a different ground.
   */
  emphasis?: number
  /**
   * Light the covered provinces one at a time instead of all at once.
   *
   * The page's signature motion, and it earns the attention because it is the
   * coverage ARRIVING rather than a decoration moving: the stagger runs exactly
   * as long as there are real cooperatives to light, so a reader watching it
   * learns that this is a specific, countable set of places and not a green
   * wash over a map of Indonesia.
   *
   * REQUIRES A <Reveal> ANCESTOR. The CSS holds every lit province at zero
   * fill and only starts the stagger under [data-shown='true'], because the
   * map sits well below the fold and an animation that finished before you
   * scrolled to it is one nobody sees. Rendered outside a <Reveal>, the lit
   * provinces would never appear at all.
   *
   * The final fill is handed to CSS as `--lit-fill` because it is computed
   * from `emphasis` here and a keyframe cannot see it. Animating the
   * presentation attribute this way works because a CSS declaration beats the
   * attribute it overrides — which is also why `both` is required: without it
   * the fill would snap back to the attribute when the animation ended.
   */
  animate?: boolean
}) {
  const { shapes, viewBox } = await archipelago()

  // Lit provinces are numbered in their own sequence, so the stagger has no
  // gaps. Counting on the shape index instead would leave the map dark for
  // whole stretches wherever the boundary file happens to list unlit
  // provinces consecutively.
  let litIndex = 0

  return (
    <svg
      aria-hidden
      viewBox={viewBox}
      preserveAspectRatio="xMidYMid meet"
      className={cn('pointer-events-none select-none', className)}
    >
      {shapes.map(shape => {
        const lit = provincesWithCooperatives.has(shape.name.toLowerCase())
        const fillOpacity = lit ? Math.min(0.2 * emphasis, 1) : 0
        const strokeOpacity = Math.min((lit ? 0.65 : 0.4) * emphasis, 1)
        const delay = lit ? 520 + litIndex++ * 55 : 0

        return (
          <path
            key={shape.name}
            d={shape.d}
            fill={lit ? 'currentColor' : 'none'}
            fillOpacity={fillOpacity}
            stroke="currentColor"
            strokeOpacity={strokeOpacity}
            strokeWidth={lit ? 1.5 : 1}
            vectorEffect="non-scaling-stroke"
            strokeLinejoin="round"
            className={
              animate && lit ? 'province-lit' : undefined
            }
            style={
              animate && lit
                ? {
                    ['--lit-fill' as string]: `${fillOpacity}`,
                    ['--lit-delay' as string]: `${delay}ms`,
                  }
                : undefined
            }
          />
        )
      })}
    </svg>
  )
}
