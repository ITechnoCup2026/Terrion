'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { AtlasPanel, type RegionListItem } from '@/components/atlas/AtlasPanel'
import { MAP, SUPPLY_RAMP } from '@/components/atlas/palette'
import type { AtlasCooperative } from '@/lib/atlas/load'
import {
  peakTonnes, regionKey, supplyByProvince, supplyByRegency, supplyStep,
  type RegionSupply,
} from '@/lib/atlas/supply'
import {
  clampView, formatView, panBy, parseView, touchDistance, wheelFactor,
  zoomAt, type View,
} from '@/lib/atlas/camera'
import {
  INDONESIA_BBOX, fitViewBox, geometryToPath, padBbox, project, type Bbox,
} from '@/lib/atlas/projection'
import type { Listing } from '@/lib/catalog/listings'
import { cn } from '@/lib/utils'

/**
 * The Atlas: Indonesia, drilled into.
 *
 * Country -> province -> regency -> one cooperative's land, each step a zoom
 * rather than a page. The zoom is the navigation: keeping the same shapes on
 * screen and moving the camera is what makes the levels feel like one place
 * instead of four screens that happen to be linked.
 *
 * WHAT THE COLOUR MEANS. The map shades each region by the tonnage its
 * cooperatives have projected over the catalogue's twelve-week horizon, from
 * the same projection the dashboard chart and the public catalogue draw. It
 * used to shade by a hash of the region's NAME into one of six near-blacks --
 * texture that looked like data and meant nothing -- while the only real
 * signal, "is there a cooperative here", was one bit. A buyer opening the
 * Atlas can now see where supply actually is, which is the question they came
 * with.
 *
 * WHY IT IS PAPER. It was a near-black map with six translucent black pills
 * floating in five corners. Three things changed by inverting it: a green ramp
 * on white can encode quantity, which the same ramp on near-black cannot; the
 * chrome could stop floating and become one docked panel with real structure;
 * and the product's own ground everywhere else -- the dashboard, the RDKK form
 * a cooperative prints -- is paper.
 *
 * Mechanically it is one `viewBox` moved around. SVG will not transition
 * `viewBox` on its own, so flights are stepped with requestAnimationFrame on
 * an eased curve -- which also means one interruptible animation rather than a
 * queue of CSS transitions fighting each other when somebody clicks fast.
 *
 * THE VIEWBOX IS NOT REACT STATE. It lives in a ref and is written straight
 * onto the element with setAttribute. It used to be state, and every frame of
 * every flight -- sixty a second -- re-rendered all thirty-eight province
 * paths, each of which is a `d` string tens of kilobytes long. That is why the
 * map felt heavy, and it is why dragging was not offered at all. React now
 * holds only the level, the selection and the hover; nothing re-renders while
 * the camera moves.
 *
 * Everything is public. No session is read anywhere in this component or the
 * loaders behind it.
 */

type Feature = {
  type: 'Feature'
  properties: { code: string; name: string; province?: string; bbox: Bbox }
  geometry: { type: string; coordinates: unknown }
}

type Level = 'country' | 'province' | 'regency'

const EASE = (t: number) => 1 - Math.pow(1 - t, 3)
const FLIGHT_MS = 780

/** Past this much pointer travel a gesture is a drag, and the click that ends
 *  it must not also select whatever is under it. */
const DRAG_SLOP_PX = 4

/** The opening camera: the whole country at a wide aspect. A constant, not a
 *  ref read during render -- the mount fit below replaces it with one measured
 *  against the real element. Views are never mutated in place, so every
 *  instance sharing this object is safe. */
const INITIAL_VIEW = clampView(parseView(fitViewBox(INDONESIA_BBOX, 16 / 10)))
const INITIAL_VIEWBOX = formatView(INITIAL_VIEW)

export function Atlas({
  cooperatives,
  listings,
  homeHref,
  homeLabel,
  showCatalog,
}: {
  cooperatives: AtlasCooperative[]
  /** The public catalogue, which is what the shading is of. Empty is a fine
   *  state: the map falls back to naming where cooperatives are. */
  listings: Listing[]
  homeHref: string
  homeLabel: string
  showCatalog: boolean
}) {
  const [provinces, setProvinces] = useState<Feature[]>([])
  const [regencies, setRegencies] = useState<Feature[]>([])
  const [level, setLevel] = useState<Level>('country')
  const [province, setProvince] = useState<Feature | null>(null)
  const [regency, setRegency] = useState<Feature | null>(null)
  const [hovered, setHovered] = useState<string | null>(null)
  const [hoveredCoop, setHoveredCoop] = useState<string | null>(null)
  const [farmId, setFarmId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const svgRef = useRef<SVGSVGElement>(null)
  const frameRef = useRef<number>(0)

  // INITIAL_VIEWBOX is passed to the element as a plain attribute and never
  // changed by React again: the prop is a constant, so React has nothing to
  // diff and will not overwrite what setAttribute wrote.
  const viewRef = useRef<View>(INITIAL_VIEW)

  /**
   * The one place the camera is written — and with it, the pins and labels.
   *
   * A pin has to be the same size on screen at every zoom, and there are only
   * two honest ways to do that. One is a non-scaling stroke, which is what
   * this used to do: it renders, but the browser hit-tests and measures the
   * UNTRANSFORMED geometry, so the target was nine pixels wide, the bounding
   * box was sixteen degrees across, and at deep zoom the round caps came out
   * as a lozenge rather than a dot.
   *
   * The other is to counter-scale against the camera, which is this. Anything
   * marked [data-map-scale] is positioned in map coordinates and drawn in
   * PIXELS; scaling the group by units-per-pixel turns those numbers into
   * whatever count of degrees currently makes a pixel. Filled circles stay
   * round, hit-test as circles, and measure as themselves; text stays the same
   * size however far in the camera goes.
   */
  const writeView = useCallback((next: View) => {
    viewRef.current = next
    const svg = svgRef.current
    if (!svg) return
    svg.setAttribute('viewBox', formatView(next))
    syncScaled(svg, next)
  }, [])

  // Marks are re-rendered by React whenever the level or hover changes, which
  // drops the transform this writes. Re-applying after every render is cheap —
  // a cooperative list is tens of elements, not thousands.
  useEffect(() => {
    const svg = svgRef.current
    if (svg) syncScaled(svg, viewRef.current)
  })

  /**
   * Keep the camera's shape matched to the element's.
   *
   * INITIAL_VIEW is fitted to a guessed 16:10 so the server has something to
   * render, but the panel takes a third of the width and a phone stacks the
   * two — the real aspect is never the guess. Two different jobs, and both
   * were missing:
   *
   *   the first fit   until the element has a size there is nothing to fit to.
   *                   A mount-time measurement is not enough on its own: an
   *                   element that is still 0x0 when effects run (a minimised
   *                   window, a tab restored in the background) would keep the
   *                   guessed view forever.
   *
   *   every resize    a viewBox fitted to yesterday's aspect crops the country
   *                   as soon as the window changes shape, and crossing the
   *                   `lg` breakpoint changes it a lot. Here the WIDTH and the
   *                   centre are held and the height is re-derived, so the
   *                   reader keeps looking at whatever they were looking at
   *                   instead of being thrown back to the whole country.
   */
  const fittedRef = useRef(false)
  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return

    const observer = new ResizeObserver(() => {
      const rect = svg.getBoundingClientRect()
      if (!rect.width || !rect.height) return
      const aspect = rect.width / rect.height

      if (!fittedRef.current) {
        fittedRef.current = true
        writeView(clampView(parseView(fitViewBox(padBbox(INDONESIA_BBOX, 0.02), aspect))))
        return
      }

      const view = viewRef.current
      const height = view.w / aspect
      writeView(clampView({ ...view, y: view.y + (view.h - height) / 2, h: height }))
    })

    observer.observe(svg)
    return () => observer.disconnect()
  }, [writeView])

  // ---- what is where ------------------------------------------------------
  //
  // Cooperatives and supply are indexed by the same normalised region key, so
  // "Kabupaten Subang" in the app and "Subang" in the boundary data land in
  // the same bucket. Every lookup below goes through regionKey.
  const coopsByProvince = useMemo(() => groupBy(cooperatives, c => regionKey(c.province)), [cooperatives])
  const coopsByRegency = useMemo(() => groupBy(cooperatives, c => regionKey(c.district)), [cooperatives])

  const provinceSupply = useMemo(
    () => supplyByProvince(cooperatives, listings), [cooperatives, listings])
  const regencySupply = useMemo(
    () => supplyByRegency(cooperatives, listings), [cooperatives, listings])

  // The shading scale is relative to the heaviest region AT THE LEVEL BEING
  // LOOKED AT. Scaling regency shades against the national peak would render
  // every regency inside one province as the same faint tint.
  const peak = useMemo(
    () => peakTonnes((level === 'country' ? provinceSupply : regencySupply).values()),
    [level, provinceSupply, regencySupply])

  const national = useMemo<RegionSupply>(() => ({
    cooperatives: cooperatives.length,
    plots: cooperatives.reduce((s, c) => s + c.plotCount, 0),
    hectares: cooperatives.reduce((s, c) => s + c.hectares, 0),
    tonnes: listings.reduce((s, l) => s + l.tonnes, 0),
    listings,
  }), [cooperatives, listings])

  // Animate the camera to a bounding box rather than snapping to it.
  const flyTo = useCallback((box: Bbox) => {
    const svg = svgRef.current
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    const aspect = rect.width / Math.max(rect.height, 1)
    const target = clampView(parseView(fitViewBox(padBbox(box, 0.12), aspect)))
    const from = viewRef.current

    cancelAnimationFrame(frameRef.current)

    // Somebody who asked for less motion gets the destination, not a slower
    // trip to it.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      writeView(target)
      return
    }

    const start = performance.now()
    const step = (now: number) => {
      const t = Math.min((now - start) / FLIGHT_MS, 1)
      const e = EASE(t)
      writeView({
        x: from.x + (target.x - from.x) * e,
        y: from.y + (target.y - from.y) * e,
        w: from.w + (target.w - from.w) * e,
        h: from.h + (target.h - from.h) * e,
      })
      if (t < 1) frameRef.current = requestAnimationFrame(step)
    }
    frameRef.current = requestAnimationFrame(step)
  }, [writeView])

  // Province outlines: one fetch, cached by the browser as a static file.
  useEffect(() => {
    let alive = true
    fetch('/geo/provinces.geojson')
      .then(r => r.json())
      .then((g: { features: Feature[] }) => {
        if (!alive) return
        setProvinces(g.features)
        setLoading(false)
      })
      .catch(() => alive && setLoading(false))
    return () => { alive = false }
  }, [])

  useEffect(() => () => cancelAnimationFrame(frameRef.current), [])

  // ---- free camera -------------------------------------------------------
  //
  // Wheel to zoom about the cursor, drag to pan, pinch on a touch screen. All
  // three write straight to the element, so a drag is one attribute write per
  // frame and no React render at all.
  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return

    const fractionOf = (clientX: number, clientY: number) => {
      const rect = svg.getBoundingClientRect()
      return {
        fx: (clientX - rect.left) / Math.max(rect.width, 1),
        fy: (clientY - rect.top) / Math.max(rect.height, 1),
      }
    }

    // Non-passive: preventDefault is what stops the page scrolling under the
    // map, and a passive listener may not call it.
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      cancelAnimationFrame(frameRef.current)
      const { fx, fy } = fractionOf(e.clientX, e.clientY)
      writeView(zoomAt(viewRef.current, wheelFactor(e.deltaY), fx, fy))
    }

    const active = new Map<number, PointerEvent>()
    let last: { x: number; y: number } | null = null
    let travelled = 0
    let captured = false
    let pinchStart: { distance: number; view: View } | null = null

    const onPointerDown = (e: PointerEvent) => {
      active.set(e.pointerId, e)
      if (active.size === 1) {
        cancelAnimationFrame(frameRef.current)
        last = { x: e.clientX, y: e.clientY }
        travelled = 0
        // NOT setPointerCapture here. Capturing on pointerdown sends every
        // later event for this pointer to the <svg>, and that includes the
        // `click` -- so the province <path> under the cursor never received
        // one and the whole drill-down silently stopped working. Capture is
        // taken below, only once the pointer has actually moved far enough to
        // be a drag, which is the only case that needs it.
      } else if (active.size === 2) {
        const [a, b] = [...active.values()]
        pinchStart = { distance: touchDistance(a, b), view: viewRef.current }
      }
    }

    const onPointerMove = (e: PointerEvent) => {
      if (!active.has(e.pointerId)) return
      active.set(e.pointerId, e)

      if (active.size >= 2 && pinchStart) {
        const [a, b] = [...active.values()]
        const distance = touchDistance(a, b)
        if (distance <= 0) return
        const { fx, fy } = fractionOf((a.clientX + b.clientX) / 2, (a.clientY + b.clientY) / 2)
        writeView(zoomAt(pinchStart.view, pinchStart.distance / distance, fx, fy))
        travelled = Infinity                       // a pinch is never a click
        return
      }

      if (!last) return
      const rect = svg.getBoundingClientRect()
      const dx = (e.clientX - last.x) / Math.max(rect.width, 1)
      const dy = (e.clientY - last.y) / Math.max(rect.height, 1)
      travelled += Math.hypot(e.clientX - last.x, e.clientY - last.y)
      last = { x: e.clientX, y: e.clientY }

      // Now it is a drag rather than a click, so take the pointer: a drag
      // that leaves the element must keep panning, and must not drop the
      // pointerup. Taken here and not on pointerdown, so a plain click still
      // reaches the province path it landed on.
      if (!captured && travelled > DRAG_SLOP_PX) {
        captured = true
        svg.setPointerCapture(e.pointerId)
      }

      writeView(panBy(viewRef.current, dx, dy))
    }

    const onPointerUp = () => {
      active.clear()
      pinchStart = null
      last = null
      captured = false
      // A drag that ends over a province must not also select it.
      if (travelled > DRAG_SLOP_PX) {
        const swallow = (click: MouseEvent) => {
          click.stopPropagation()
          svg.removeEventListener('click', swallow, true)
        }
        svg.addEventListener('click', swallow, true)
        // If no click follows -- a touch drag, usually -- take the trap out
        // again rather than swallowing the next real one.
        setTimeout(() => svg.removeEventListener('click', swallow, true), 0)
      }
    }

    svg.addEventListener('wheel', onWheel, { passive: false })
    svg.addEventListener('pointerdown', onPointerDown)
    svg.addEventListener('pointermove', onPointerMove)
    svg.addEventListener('pointerup', onPointerUp)
    svg.addEventListener('pointercancel', onPointerUp)
    return () => {
      svg.removeEventListener('wheel', onWheel)
      svg.removeEventListener('pointerdown', onPointerDown)
      svg.removeEventListener('pointermove', onPointerMove)
      svg.removeEventListener('pointerup', onPointerUp)
      svg.removeEventListener('pointercancel', onPointerUp)
    }
  }, [writeView])

  // Zoom buttons step about the centre, which is the only point a button can
  // mean.
  const stepZoom = useCallback((factor: number) => {
    cancelAnimationFrame(frameRef.current)
    writeView(zoomAt(viewRef.current, factor, 0.5, 0.5))
  }, [writeView])

  // Enter a province: fetch its regencies, then fly.
  const openProvince = useCallback(async (feature: Feature) => {
    setProvince(feature)
    setRegency(null)
    setLevel('province')
    flyTo(feature.properties.bbox)

    const res = await fetch(`/geo/regencies/${feature.properties.code}.geojson`)
    if (!res.ok) { setRegencies([]); return }
    const g: { features: Feature[] } = await res.json()
    // The 2022 Papua provinces share their parent's BPS code, so the file holds
    // more than one province's regencies. Filtering by name is what separates
    // them; filtering by code alone would show a neighbour's territory.
    setRegencies(
      g.features.filter(f =>
        (f.properties.province ?? '').toLowerCase() === feature.properties.name.toLowerCase()),
    )
  }, [flyTo])

  const openRegency = useCallback((feature: Feature) => {
    setRegency(feature)
    setLevel('regency')
    flyTo(feature.properties.bbox)
  }, [flyTo])

  const goCountry = useCallback(() => {
    setLevel('country'); setProvince(null); setRegency(null); setRegencies([])
    flyTo(INDONESIA_BBOX)
  }, [flyTo])

  const goProvince = useCallback(() => {
    if (!province) return
    setLevel('province'); setRegency(null)
    flyTo(province.properties.bbox)
  }, [province, flyTo])

  // Escape steps back one level, which is what it does everywhere else.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (farmId) return                    // the farm view owns Escape while open
      if (level === 'regency') goProvince()
      else if (level === 'province') goCountry()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [level, farmId, goProvince, goCountry])

  // ---- what this level shows ---------------------------------------------

  const shapes = level === 'country' ? provinces : regencies
  const supplyOf = level === 'country' ? provinceSupply : regencySupply
  const coopsOf = level === 'country' ? coopsByProvince : coopsByRegency
  const activeName = regency?.properties.name ?? province?.properties.name ?? null

  // Pins are drawn only for the level being looked at, so the country view is
  // not a cloud of markers nobody can hit.
  const visibleCoops = useMemo(() => {
    if (level === 'country') return cooperatives
    if (level === 'province' && province) {
      return coopsByProvince.get(regionKey(province.properties.name)) ?? []
    }
    if (level === 'regency' && regency) {
      return coopsByRegency.get(regionKey(regency.properties.name)) ?? []
    }
    return []
  }, [level, province, regency, cooperatives, coopsByProvince, coopsByRegency])

  /**
   * Region names, placed where that region's cooperatives actually are.
   *
   * The map carried no labels at all: you could not tell which province you
   * were looking at without hovering it. Only regions with cooperatives are
   * named -- labelling all thirty-eight would bury the handful that matter --
   * and the anchor is the mean of their pins rather than the bounding box's
   * centre, which for a shape like Sulawesi lands in the sea. Putting the name
   * where the data is also happens to be what the name is about.
   */
  const labels = useMemo(() => {
    if (level === 'regency') return []
    return shapes.flatMap(f => {
      const coops = coopsOf.get(regionKey(f.properties.name))
      if (!coops?.length) return []
      const points = coops.map(c => project([c.lng, c.lat]))
      return [{
        key: f.properties.code + f.properties.name,
        name: f.properties.name,
        x: points.reduce((s, p) => s + p.x, 0) / points.length,
        y: points.reduce((s, p) => s + p.y, 0) / points.length,
      }]
    })
  }, [level, shapes, coopsOf])

  /** The panel's ranked list of places to go next. */
  const regionList = useMemo<RegionListItem[]>(() => {
    if (level === 'regency') return []
    return shapes
      .flatMap(f => {
        const supply = supplyOf.get(regionKey(f.properties.name))
        if (!supply) return []
        return [{
          key: regionKey(f.properties.name),
          name: f.properties.name,
          cooperatives: supply.cooperatives,
          tonnes: supply.tonnes,
        }]
      })
      .sort((a, b) => b.tonnes - a.tonnes || a.name.localeCompare(b.name))
  }, [level, shapes, supplyOf])

  /**
   * The figures for what is SELECTED, which is not always the level being
   * drawn.
   *
   * Standing in a province, the map draws regencies -- so `supplyOf` is the
   * regency index -- but the thing the panel is describing is still the
   * province. Reading the selection out of `supplyOf` therefore looked
   * "Jawa Barat" up among the regencies, missed, and reported a province with
   * a cooperative and sixty tonnes projected as 0 koperasi, 0 lahan, belum
   * ada. Each level is read from its own index.
   */
  const selected: RegionSupply = useMemo(() => {
    if (regency) return regencySupply.get(regionKey(regency.properties.name)) ?? EMPTY_REGION
    if (province) return provinceSupply.get(regionKey(province.properties.name)) ?? EMPTY_REGION
    return national
  }, [regency, province, regencySupply, provinceSupply, national])

  const openRegionByKey = useCallback((key: string) => {
    const feature = shapes.find(f => regionKey(f.properties.name) === key)
    if (!feature) return
    if (level === 'country') void openProvince(feature)
    else openRegency(feature)
  }, [shapes, level, openProvince, openRegency])

  return (
    <div className="flex h-full w-full flex-col-reverse overflow-hidden lg:flex-row">
      <AtlasPanel
        level={level}
        provinceName={province?.properties.name ?? null}
        regencyName={regency?.properties.name ?? null}
        region={selected}
        regions={regionList}
        cooperatives={visibleCoops}
        farmId={farmId}
        homeHref={homeHref}
        homeLabel={homeLabel}
        showCatalog={showCatalog}
        onGoCountry={goCountry}
        onGoProvince={goProvince}
        onOpenRegion={openRegionByKey}
        onOpenFarm={setFarmId}
        onCloseFarm={() => setFarmId(null)}
        onHoverCooperative={setHoveredCoop}
      />

      <div className="relative min-h-0 flex-1" style={{ background: MAP.water }}>
        <svg
          ref={svgRef}
          viewBox={INITIAL_VIEWBOX}
          preserveAspectRatio="xMidYMid meet"
          className="size-full cursor-grab touch-none active:cursor-grabbing"
          role="img"
          aria-label="Peta sebaran pasokan koperasi di Indonesia"
        >
          <g>
            {shapes.map(f => {
              const key = `${f.properties.code}-${f.properties.name}`
              const supply = supplyOf.get(regionKey(f.properties.name))
              const isHovered = hovered === key
              const isActive = activeName === f.properties.name

              return (
                <path
                  key={key}
                  d={geometryToPath(f.geometry)}
                  fill={supply ? SUPPLY_RAMP[supplyStep(supply.tonnes, peak)] : MAP.land}
                  stroke={
                    isActive ? MAP.activeStroke
                    : isHovered && supply ? MAP.hoverStroke
                    : MAP.landStroke
                  }
                  strokeWidth={isActive ? 1.75 : 1}
                  vectorEffect="non-scaling-stroke"
                  // A region with no cooperative is not clickable, and says so
                  // with the cursor rather than by silently doing nothing.
                  // No cursor class when there is nothing to click: the shape
                  // then inherits the svg's own grab cursor, which is the truth
                  // -- an empty region is still something you can drag.
                  className={cn('transition-[fill,stroke] duration-200', supply && 'cursor-pointer')}
                  onMouseEnter={() => setHovered(key)}
                  onMouseLeave={() => setHovered(h => (h === key ? null : h))}
                  onClick={() => {
                    if (!supply) return
                    if (level === 'country') void openProvince(f)
                    else openRegency(f)
                  }}
                />
              )
            })}

            {labels.map(label => (
              <g
                key={label.key}
                data-map-scale=""
                data-x={label.x}
                data-y={label.y}
                className="pointer-events-none"
              >
                {/* paint-order puts the halo behind the glyphs, so one element
                    is both the label and its own knockout — legible on white
                    sea, on white land and on the deepest green alike. */}
                <text
                  textAnchor="middle"
                  y={-13}
                  fontSize={11}
                  fontWeight={500}
                  fill={MAP.pin}
                  stroke={MAP.pinHalo}
                  strokeWidth={3.5}
                  strokeLinejoin="round"
                  style={{ paintOrder: 'stroke' }}
                >
                  {label.name}
                </text>
              </g>
            ))}

            {visibleCoops.map(c => {
              const { x, y } = project([c.lng, c.lat])
              const lit = hoveredCoop === c.id
              return (
                <g
                  key={c.id}
                  data-map-scale=""
                  data-x={x}
                  data-y={y}
                  className="cursor-pointer"
                  onClick={() => setFarmId(c.id)}
                >
                  <title>{c.name}</title>
                  {/* Radii in PIXELS: the group is counter-scaled against the
                      camera in syncScaled, so these are the sizes on screen at
                      any zoom. An invisible target first, and it is not
                      optional -- the visible dot is 10px across, which is a
                      five-pixel radius to aim at, and a pin that small reads
                      as unclickable. */}
                  <circle r={17} fill="transparent" />
                  <circle r={lit ? 7.5 : 5.5} fill={MAP.pinHalo} />
                  <circle r={lit ? 5 : 3.25} fill={MAP.pin} />
                </g>
              )
            })}
          </g>
        </svg>

        {/* The only chrome left over the map. Zoom is arithmetic, so + and −
            stay glyphs; everything else that used to float here — breadcrumb,
            reset, legend, counts, links — is the panel's job now. */}
        <div className="absolute right-4 bottom-4 flex flex-col overflow-hidden rounded-md border border-border bg-background shadow-[var(--shadow-md)]">
          <CameraButton label="Perbesar" onClick={() => stepZoom(1 / 1.6)}>+</CameraButton>
          <span aria-hidden className="h-px bg-border" />
          <CameraButton label="Perkecil" onClick={() => stepZoom(1.6)}>−</CameraButton>
        </div>

        {loading && (
          <div
            className="absolute inset-0 grid place-items-center"
            style={{ background: MAP.water }}
          >
            <p className="text-sm text-muted-foreground">Memuat peta…</p>
          </div>
        )}

        {level === 'province' && regencies.length === 0 && !loading && (
          <p className="pointer-events-none absolute bottom-4 left-4 max-w-xs rounded-md border border-border bg-background px-3 py-2 text-xs text-muted-foreground shadow-[var(--shadow-sm)]">
            Batas kabupaten tidak tersedia untuk provinsi ini.
          </p>
        )}
      </div>
    </div>
  )
}

const EMPTY_REGION: RegionSupply = {
  cooperatives: 0, plots: 0, hectares: 0, tonnes: 0, listings: [],
}

function groupBy<T>(items: readonly T[], key: (item: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>()
  for (const item of items) {
    const k = key(item)
    map.set(k, [...(map.get(k) ?? []), item])
  }
  return map
}

/**
 * Sizes every pin and label against the current camera, so each is the same
 * number of screen pixels however far in the map is zoomed.
 */
function syncScaled(svg: SVGSVGElement, view: View) {
  const width = svg.clientWidth
  if (!width) return
  const unitsPerPx = view.w / width
  for (const mark of svg.querySelectorAll<SVGGElement>('[data-map-scale]')) {
    const { x, y } = mark.dataset
    mark.setAttribute('transform', `translate(${x} ${y}) scale(${unitsPerPx})`)
  }
}

/** One control on the map's own chrome. */
function CameraButton({
  label, onClick, children,
}: {
  label: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="interactive grid size-8 place-items-center text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
    >
      {children}
    </button>
  )
}
