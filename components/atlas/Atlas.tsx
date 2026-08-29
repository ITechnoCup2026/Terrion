'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import type { AtlasCooperative } from '@/lib/atlas/load'
import {
  clampView, formatView, panBy, parseView, touchDistance, wheelFactor,
  zoomAt, zoomFraction, type View,
} from '@/lib/atlas/camera'
import {
  INDONESIA_BBOX, fitViewBox, geometryToPath, padBbox, project, type Bbox,
} from '@/lib/atlas/projection'
import { cn } from '@/lib/utils'

import { FarmView } from './FarmView'

/**
 * The Atlas: Indonesia, drilled into.
 *
 * Country -> province -> regency -> one cooperative's farm, each step a zoom
 * rather than a page. The zoom is the navigation: keeping the same shapes on
 * screen and moving the camera is what makes the levels feel like one place
 * instead of four screens that happen to be linked.
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
 * loader behind it.
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

// A stable shade per region, so the map has texture without implying data the
// Atlas does not have. Ink-green rather than the grey-green it was: on the
// near-black ground, a desaturated grey read as "no data available" instead of
// "land". Regions WITH cooperatives are coloured separately, and that contrast
// is the only thing on the map carrying meaning.
function idleTint(seed: string): string {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0
  const lightness = 12 + (Math.abs(h) % 6)
  return `hsl(158 16% ${lightness}%)`
}

/** The colours the map is drawn in. Fixed rather than themed: this is a dark
 *  surface in both themes, and half of it is meaning. */
const MAP = {
  ground: '#0d1512',
  idleHover: 'hsl(158 16% 26%)',
  idleStroke: 'rgb(255 255 255 / 0.08)',
  coop: 'rgb(21 128 61 / 0.55)',
  coopHover: 'rgb(34 197 94 / 0.72)',
  coopStroke: 'rgb(74 222 128 / 0.5)',
  active: 'rgb(22 163 74 / 0.32)',
  activeStroke: 'rgb(187 247 208 / 0.9)',
  // Harvest gold. The pin used to be the same green as the land under it,
  // which was the worst legibility problem on the map: the one mark carrying
  // a cooperative's position was camouflaged against the region that has one.
  pin: '#e8b021',
  pinRing: '#0d1512',
} as const

/** The opening camera: the whole country at a wide aspect. A constant, not a
 *  ref read during render -- the first flight or gesture replaces it, and it
 *  depends on nothing. Views are never mutated in place, so every instance
 *  sharing this object is safe. */
const INITIAL_VIEW = clampView(parseView(fitViewBox(INDONESIA_BBOX, 16 / 10)))
const INITIAL_VIEWBOX = formatView(INITIAL_VIEW)

export type AtlasVariant = 'card' | 'full'

export function Atlas({
  cooperatives, variant = 'card',
}: {
  cooperatives: AtlasCooperative[]
  /** 'card' sits in a page; 'full' fills whatever its parent gives it, for
   *  the dedicated /atlas route where the map IS the page. */
  variant?: AtlasVariant
}) {
  const [provinces, setProvinces] = useState<Feature[]>([])
  const [regencies, setRegencies] = useState<Feature[]>([])
  const [level, setLevel] = useState<Level>('country')
  const [province, setProvince] = useState<Feature | null>(null)
  const [regency, setRegency] = useState<Feature | null>(null)
  const [hovered, setHovered] = useState<string | null>(null)
  const [farmId, setFarmId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  // Only for the zoom readout, and only updated when a gesture ends -- so the
  // number can be shown without putting the camera back into React.
  const [zoomShown, setZoomShown] = useState(0)

  const svgRef = useRef<SVGSVGElement>(null)
  const frameRef = useRef<number>(0)

  // INITIAL_VIEWBOX is passed to the element as a plain attribute and never
  // changed by React again: the prop is a constant, so React has nothing to
  // diff and will not overwrite what setAttribute wrote.
  const viewRef = useRef<View>(INITIAL_VIEW)

  /**
   * The one place the camera is written — and with it, the pins.
   *
   * A pin has to be the same size on screen at every zoom, and there are only
   * two honest ways to do that. One is a non-scaling stroke, which is what
   * this used to do: it renders, but the browser hit-tests and measures the
   * UNTRANSFORMED geometry, so the target was nine pixels wide, the bounding
   * box was sixteen degrees across, and at deep zoom the round caps came out
   * as a lozenge rather than a dot.
   *
   * The other is to counter-scale the pin against the camera, which is this.
   * The pins are ordinary filled circles with radii in PIXELS; scaling the
   * group by units-per-pixel turns those radii into whatever number of degrees
   * currently makes a pixel. Filled circles are round, hit-test as circles,
   * and measure as themselves.
   */
  const writeView = useCallback((next: View) => {
    viewRef.current = next
    const svg = svgRef.current
    if (!svg) return
    svg.setAttribute('viewBox', formatView(next))
    syncPins(svg, next)
  }, [])

  // Pins are re-rendered by React whenever the level changes, which drops the
  // transform this writes. Re-applying after every render is cheap — a
  // cooperative list is tens of elements, not thousands.
  useEffect(() => {
    const svg = svgRef.current
    if (svg) syncPins(svg, viewRef.current)
  })

  // Which regions actually have a cooperative. Matched on name because the
  // cooperative table stores names, not BPS codes.
  const coopsByProvince = useMemo(() => {
    const m = new Map<string, AtlasCooperative[]>()
    for (const c of cooperatives) {
      const key = c.province.toLowerCase()
      m.set(key, [...(m.get(key) ?? []), c])
    }
    return m
  }, [cooperatives])

  const coopsByRegency = useMemo(() => {
    const m = new Map<string, AtlasCooperative[]>()
    for (const c of cooperatives) {
      // "Kabupaten Subang" in the app, "Subang" in the boundary data.
      const key = c.district.replace(/^(kabupaten|kota)\s+/i, '').toLowerCase()
      m.set(key, [...(m.get(key) ?? []), c])
    }
    return m
  }, [cooperatives])

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
      setZoomShown(zoomFraction(target))
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
      else setZoomShown(zoomFraction(target))
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
      setZoomShown(zoomFraction(viewRef.current))
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

    const onPointerUp = (e: PointerEvent) => {
      active.delete(e.pointerId)
      if (active.size < 2) pinchStart = null
      if (active.size === 0) {
        last = null
        captured = false
        setZoomShown(zoomFraction(viewRef.current))
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
    setZoomShown(zoomFraction(viewRef.current))
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
      if (farmId) { setFarmId(null); return }
      if (level === 'regency') goProvince()
      else if (level === 'province') goCountry()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [level, farmId, goProvince, goCountry])

  // Pins are drawn only for the level being looked at, so the country view is
  // not a cloud of markers nobody can hit.
  const visibleCoops = useMemo(() => {
    if (level === 'country') return cooperatives
    if (level === 'province' && province) {
      return coopsByProvince.get(province.properties.name.toLowerCase()) ?? []
    }
    if (level === 'regency' && regency) {
      return coopsByRegency.get(regency.properties.name.toLowerCase()) ?? []
    }
    return []
  }, [level, province, regency, cooperatives, coopsByProvince, coopsByRegency])

  const shapes = level === 'country' ? provinces : regencies
  const activeName = regency?.properties.name ?? province?.properties.name ?? null

  return (
    <div
      className={cn(
        'relative w-full overflow-hidden',
        variant === 'full'
          ? 'h-full'
          : 'h-[85vh] min-h-[32rem] rounded-2xl border border-border',
      )}
      style={{ background: MAP.ground }}
    >
      <svg
        ref={svgRef}
        viewBox={INITIAL_VIEWBOX}
        preserveAspectRatio="xMidYMid meet"
        className="size-full cursor-grab touch-none active:cursor-grabbing"
        role="img"
        aria-label="Peta sebaran koperasi di Indonesia"
      >
        <g>
          {shapes.map(f => {
            const key = `${f.properties.code}-${f.properties.name}`
            const hasCoops = level === 'country'
              ? coopsByProvince.has(f.properties.name.toLowerCase())
              : coopsByRegency.has(f.properties.name.toLowerCase())
            const isHovered = hovered === key
            const isActive = activeName === f.properties.name

            return (
              <path
                key={key}
                d={geometryToPath(f.geometry)}
                fill={
                  isActive ? MAP.active
                  : hasCoops ? (isHovered ? MAP.coopHover : MAP.coop)
                  : (isHovered ? MAP.idleHover : idleTint(f.properties.name))
                }
                stroke={
                  isActive ? MAP.activeStroke
                  : hasCoops ? MAP.coopStroke
                  : MAP.idleStroke
                }
                strokeWidth={isActive ? 1.5 : 1}
                vectorEffect="non-scaling-stroke"
                // A region with no cooperative is not clickable, and says so
                // with the cursor rather than by silently doing nothing.
                // No cursor class when there is nothing to click: the shape
                // then inherits the svg's own grab cursor, which is the truth
                // -- an empty region is still something you can drag.
                className={cn('transition-[fill] duration-200', hasCoops && 'cursor-pointer')}
                onMouseEnter={() => setHovered(key)}
                onMouseLeave={() => setHovered(h => (h === key ? null : h))}
                onClick={() => {
                  if (!hasCoops) return
                  if (level === 'country') void openProvince(f)
                  else openRegency(f)
                }}
              />
            )
          })}

          {visibleCoops.map(c => {
            const { x, y } = project([c.lng, c.lat])
            return (
              <g
                key={c.id}
                data-pin=""
                data-x={x}
                data-y={y}
                transform={`translate(${x} ${y})`}
                className="cursor-pointer"
                onClick={() => setFarmId(c.id)}
              >
                <title>{c.name}</title>
                {/* Radii in PIXELS: the group is counter-scaled against the
                    camera in syncPins, so these are the sizes on screen at any
                    zoom. An invisible target first, and it is not optional --
                    the visible dot is 16px across, which is a nine-pixel radius
                    to aim at, and a pin that small reads as unclickable. */}
                <circle r={17} fill="transparent" />
                <circle r={8} fill={MAP.pin} opacity={0.22} />
                <circle r={4.5} fill={MAP.pinRing} />
                <circle r={3} fill={MAP.pin} />
              </g>
            )
          })}
        </g>
      </svg>

      {/* ---- breadcrumb ---- */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-wrap items-center gap-2 p-4">
        <nav
          aria-label="Tingkat wilayah"
          className="pointer-events-auto flex items-center gap-1 rounded-full border border-white/10 bg-black/45 px-3 py-1.5 text-xs text-white/70 backdrop-blur-md"
        >
          <button onClick={goCountry} className="interactive rounded-full px-2 py-0.5 hover:bg-white/10 hover:text-white">
            Indonesia
          </button>
          {province && (
            <>
              <span aria-hidden className="text-white/30">/</span>
              <button onClick={goProvince} className="interactive rounded-full px-2 py-0.5 hover:bg-white/10 hover:text-white">
                {province.properties.name}
              </button>
            </>
          )}
          {regency && (
            <>
              <span aria-hidden className="text-white/30">/</span>
              <span className="px-2 py-0.5 text-white">{regency.properties.name}</span>
            </>
          )}
        </nav>

        {level !== 'country' && (
          <span className="pointer-events-none rounded-full border border-white/10 bg-black/45 px-3 py-1.5 text-[0.7rem] text-white/50 backdrop-blur-md">
            Esc untuk kembali
          </span>
        )}
      </div>

      {/* ---- camera controls ----
           + and - are the zoom, and stay glyphs: they are arithmetic, and
           every map ever made uses them. The reset was a "⤢", which is not --
           it is a symbol the reader has to guess at. It says what it does now,
           which is why it sits beside the stack rather than inside it. */}
      <div className="absolute top-4 right-4 flex items-start gap-1">
        <button
          type="button"
          onClick={goCountry}
          className="interactive rounded-xl border border-white/10 bg-black/45 px-3 py-1.5 text-xs text-white/70 backdrop-blur-md hover:bg-black/60 hover:text-white"
        >
          Seluruh Indonesia
        </button>
        <div className="flex flex-col gap-1 rounded-xl border border-white/10 bg-black/45 p-1 backdrop-blur-md">
          <CameraButton label="Perbesar" onClick={() => stepZoom(1 / 1.6)}>+</CameraButton>
          <CameraButton label="Perkecil" onClick={() => stepZoom(1.6)}>−</CameraButton>
        </div>
      </div>

      {/* ---- legend / counts ---- */}
      <div className="pointer-events-none absolute bottom-4 left-4 rounded-xl border border-white/10 bg-black/45 p-3 text-xs text-white/70 backdrop-blur-md">
        <p className="font-medium text-white">
          {cooperatives.length} koperasi terdaftar
        </p>
        <p className="mt-0.5">
          {cooperatives.reduce((s, c) => s + c.plotCount, 0)} lahan ·{' '}
          {cooperatives.reduce((s, c) => s + c.hectares, 0).toFixed(1).replace('.', ',')} ha terpetakan
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span aria-hidden className="size-2 rounded-sm" style={{ background: MAP.coop }} />
            ada koperasi
          </span>
          <span className="flex items-center gap-1.5">
            <span aria-hidden className="size-2 rounded-sm" style={{ background: idleTint('x') }} />
            belum ada
          </span>
          <span className="flex items-center gap-1.5">
            <span aria-hidden className="size-2 rounded-full" style={{ background: MAP.pin }} />
            lokasi koperasi
          </span>
        </div>
        {/* A bar rather than a number: "zoom 0,43" means nothing, but how far
            along a track the camera sits is read at a glance. */}
        <div className="mt-2 h-1 w-28 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-white/45 transition-[width] duration-200"
            style={{ width: `${Math.round(zoomShown * 100)}%` }}
          />
        </div>
      </div>

      {loading && (
        <div className="absolute inset-0 grid place-items-center" style={{ background: MAP.ground }}>
          <p className="text-sm text-white/50">Memuat peta…</p>
        </div>
      )}

      {level === 'province' && regencies.length === 0 && !loading && (
        <p className="pointer-events-none absolute right-4 bottom-4 rounded-lg border border-white/10 bg-black/45 px-3 py-2 text-xs text-white/60 backdrop-blur-md">
          Batas kabupaten tidak tersedia untuk provinsi ini.
        </p>
      )}

      {farmId && (
        <FarmView key={farmId} cooperativeId={farmId} onClose={() => setFarmId(null)} />
      )}
    </div>
  )
}

/**
 * Sizes every pin against the current camera, so each is the same number of
 * screen pixels however far in the map is zoomed.
 */
function syncPins(svg: SVGSVGElement, view: View) {
  const width = svg.clientWidth
  if (!width) return
  const unitsPerPx = view.w / width
  for (const pin of svg.querySelectorAll<SVGGElement>('[data-pin]')) {
    const { x, y } = pin.dataset
    pin.setAttribute('transform', `translate(${x} ${y}) scale(${unitsPerPx})`)
  }
}

/** One square control on the map's own dark chrome. */
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
      className="interactive grid size-7 place-items-center rounded-lg text-sm text-white/70 hover:bg-white/10 hover:text-white"
    >
      {children}
    </button>
  )
}
