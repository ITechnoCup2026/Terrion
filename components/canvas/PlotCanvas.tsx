'use client'
import { useCallback, useEffect, useRef } from 'react'
import type { TileLayout } from '@/lib/tilegrid/types'
import {
  drawBaseLayer, drawBlockLabels, drawGrid, drawSelection, drawSpriteLayer, type BlockStyle,
} from '@/lib/canvas/renderer'
import {
  drawFieldSoil, drawHouse, drawTerrainLayer, drawWaterLayer,
  houseAt, resolveHousePlacement, type HousePlacement,
} from '@/lib/canvas/terrain'
import type { TerrainSheets } from '@/lib/canvas/sheets'
import type { TerrainLayout } from '@/lib/terrain/generate'
import {
  fitView, pinchScale, scaleStep, snapScale, WHEEL_STEP, type View,
} from '@/lib/canvas/view'
import { tileAt, type TileHit } from '@/lib/canvas/hittest'

// A drag of more than this many pixels is a pan, not a click.
const CLICK_SLOP_PX = 4

// Six frames of water want roughly 125 ms each. Sixty would spend the whole
// frame budget on decoration.
const WATER_FRAME_MS = 125

/**
 * Draws a plot as a tile grid inside a generated landscape, with pan, zoom and
 * click-to-select.
 *
 * Layers are cached off-screen and stamped onto the visible canvas each frame:
 * terrain and water underneath, then the grid, then the crops, then the house.
 * Only water ever ticks, and only when there is water to draw.
 */
/**
 * Draws only the overlapping part of a cached layer.
 *
 * Source and destination rectangles are the same, so this is visually
 * identical to `drawImage(img, 0, 0)` under the current transform -- it just
 * declines to hand the rasteriser pixels that fall outside the canvas.
 */
function drawVisible(
  ctx: CanvasRenderingContext2D,
  img: HTMLCanvasElement,
  visible: { x: number; y: number; w: number; h: number },
) {
  const x = Math.max(0, Math.floor(visible.x))
  const y = Math.max(0, Math.floor(visible.y))
  const right = Math.min(img.width, Math.ceil(visible.x + visible.w))
  const bottom = Math.min(img.height, Math.ceil(visible.y + visible.h))
  const w = right - x
  const h = bottom - y
  if (w <= 0 || h <= 0) return
  ctx.drawImage(img, x, y, w, h, x, y, w, h)
}

export function PlotCanvas({
  layout, styles, crops, cellPx = 32, onSelectBlock, selectedBlockId,
  terrain = null, sheets = null, house, onSelectHouse, initialView = null,
}: {
  layout: TileLayout
  styles: Map<string, BlockStyle>
  crops: HTMLImageElement | null
  cellPx?: number
  /** The click position comes with the selection: the panel opens at the
   *  pointer, and this canvas is the only thing that knows where that was.
   *
   *  The tile comes with it too. The hit test has always resolved a click down
   *  to one square and then thrown that away to report only which block it fell
   *  in; the public garden wants to talk about the square itself, and the
   *  square is something only this canvas can identify. Callers that care only
   *  about the block ignore the third argument. */
  onSelectBlock?: (
    blockId: string | null,
    at: { x: number; y: number } | null,
    tile: TileHit | null,
  ) => void
  selectedBlockId?: string | null
  terrain?: TerrainLayout | null
  sheets?: TerrainSheets | null
  house?: HousePlacement
  onSelectHouse?: (at: { x: number; y: number }) => void
  /** The opening camera, worked out by whoever sized the world -- see
   *  lib/canvas/frame.ts. Without one this falls back to fitting the whole
   *  picture on screen, which is right for a canvas with no scenery around it
   *  but wrong for one whose scenery deliberately runs off the edges. */
  initialView?: View | null
}) {
  const mainRef = useRef<HTMLCanvasElement>(null)
  const terrainRef = useRef<HTMLCanvasElement | null>(null)
  const waterRef = useRef<HTMLCanvasElement | null>(null)
  const baseRef = useRef<HTMLCanvasElement | null>(null)
  const spriteRef = useRef<HTMLCanvasElement | null>(null)
  // null means "not fitted yet" — the next composite picks the opening camera.
  const viewRef = useRef<View | null>(null)
  const dragRef = useRef<{ x: number; y: number; moved: boolean } | null>(null)
  // Every pointer currently down, so a second finger can start a pinch.
  const pointersRef = useRef(new Map<number, { x: number; y: number }>())
  const pinchRef = useRef<
    { startDistance: number; startScale: number; worldX: number; worldY: number } | null
  >(null)
  // A pinch still ends in a click event; this swallows it.
  const suppressClickRef = useRef(false)

  // The whole picture, terrain included. Without terrain this is just the plot.
  const drawn = terrain
    ? { cols: terrain.cols, rows: terrain.rows, border: terrain.border }
    : { cols: layout.cols, rows: layout.rows, border: 0 }
  const { cols: fullCols, rows: fullRows, border } = drawn
  const shift = border * cellPx

  // May be null: on a narrow screen the scenery border is two tiles and there
  // is nowhere outside the fence to put a 2x2 house.
  const placement = house ?? (terrain ? resolveHousePlacement(terrain) : null) ?? undefined

  // Stamps the cached layers onto the visible canvas at the current camera.
  const composite = useCallback(() => {
    const canvas = mainRef.current
    if (!canvas || !baseRef.current || !spriteRef.current) return
    const { clientWidth: w, clientHeight: h } = canvas
    if (w === 0 || h === 0) return

    const dpr = window.devicePixelRatio || 1
    // Only when it actually changed. Assigning canvas.width or .height
    // REALLOCATES the backing store and resets every context property, and
    // this runs on every frame of every pan -- on a 2560x1400 screen at dpr 2
    // that is a fourteen-megapixel buffer thrown away and remade sixty times a
    // second, which is where the whole frame budget was going.
    const backingW = Math.round(w * dpr)
    const backingH = Math.round(h * dpr)
    if (canvas.width !== backingW || canvas.height !== backingH) {
      canvas.width = backingW
      canvas.height = backingH
    }

    const ctx = canvas.getContext('2d')!
    ctx.imageSmoothingEnabled = false
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, w, h)

    if (!viewRef.current) {
      viewRef.current = initialView
        ?? fitView(fullCols, fullRows, cellPx, w, h, scaleStep(dpr))
    }
    const v = viewRef.current

    ctx.setTransform(dpr * v.scale, 0, 0, dpr * v.scale, dpr * v.offsetX, dpr * v.offsetY)
    // Only the part of each layer that is actually on screen. The world is
    // deliberately larger than the viewport now, so blitting whole layers and
    // letting the browser clip means sampling pixels that were never going to
    // be seen -- on every frame of every pan.
    const visible = {
      x: -v.offsetX / v.scale,
      y: -v.offsetY / v.scale,
      w: w / v.scale,
      h: h / v.scale,
    }
    const blit = (img: HTMLCanvasElement | null) => {
      if (img) drawVisible(ctx, img, visible)
    }
    blit(terrainRef.current)
    blit(waterRef.current)
    blit(baseRef.current)
    blit(spriteRef.current)

    if (terrain && sheets && placement) drawHouse(ctx, terrain, sheets, placement, cellPx)

    // The grid is drawn here rather than baked into the base layer, because
    // how much of it to draw depends on the zoom -- and the cached layer has
    // no idea what the zoom is. Zoomed out, a line on every tile turns a farm
    // into a spreadsheet.
    ctx.save()
    ctx.translate(shift, shift)
    drawGrid(ctx, layout, cellPx, v.scale)
    // After the crops, so a tall plant on a block's first tile cannot paint
    // out that block's own name.
    drawBlockLabels(ctx, layout, styles, cellPx)
    ctx.restore()

    const selected = layout.blockRanges.findIndex(r => r.blockId === selectedBlockId)
    if (selected >= 0) {
      ctx.save()
      ctx.translate(shift, shift)
      drawSelection(ctx, layout, selected, cellPx, v.scale)
      ctx.restore()
    }
  }, [layout, styles, cellPx, selectedBlockId, fullCols, fullRows, shift, terrain, sheets,
      placement, initialView])

  // Held in a ref so redrawing never invalidates the cached layers below.
  const compositeRef = useRef(composite)
  useEffect(() => {
    compositeRef.current = composite
    composite()
  }, [composite])

  // A fresh off-screen canvas covering the whole picture.
  const newLayer = useCallback(() => {
    const c = document.createElement('canvas')
    c.width = fullCols * cellPx
    c.height = fullRows * cellPx
    return c
  }, [fullCols, fullRows, cellPx])

  // Layer 0: the landscape. Depends only on the seed, so effectively never redrawn.
  useEffect(() => {
    if (!terrain || !sheets) { terrainRef.current = null; return }
    const c = newLayer()
    const ctx = c.getContext('2d')!
    // Terrain first: it clears the layer, and the two cover disjoint regions
    // -- the border is all this draws, the interior is all the soil draws.
    drawTerrainLayer(ctx, terrain, sheets, cellPx)
    drawFieldSoil(ctx, terrain, sheets, cellPx, layout)
    terrainRef.current = c
    compositeRef.current()
  }, [terrain, sheets, cellPx, newLayer, layout])

  // Re-fit when the PICTURE changes size, not only when the canvas does.
  // Splitting a block adds a field, which makes the grid taller -- and a
  // camera fitted to the old grid then holds its zoom and crops the new field
  // off the bottom, which is exactly what it did.
  useEffect(() => {
    viewRef.current = null
    compositeRef.current()
  }, [fullCols, fullRows, cellPx, initialView])

  // Layer 1: the ground. Rebuilt only when the layout or styling changes.
  useEffect(() => {
    const c = newLayer()
    const ctx = c.getContext('2d')!
    ctx.translate(shift, shift)
    drawBaseLayer(ctx, layout, styles, cellPx)
    baseRef.current = c
    compositeRef.current()
  }, [layout, styles, cellPx, newLayer, shift])

  // Layer 2: the crops. Rebuilt when growth stages or the sprite sheet change.
  useEffect(() => {
    const c = newLayer()
    const ctx = c.getContext('2d')!
    ctx.translate(shift, shift)
    drawSpriteLayer(ctx, layout, styles, crops, cellPx)
    spriteRef.current = c
    compositeRef.current()
  }, [layout, styles, crops, cellPx, newLayer, shift])

  // Layer 0.5: the water, the only thing here that moves.
  //
  // Four gates, all required: no water means no loop at all; a hidden tab, a
  // canvas scrolled out of view, or a reduced-motion preference each hold it on
  // a single static frame.
  useEffect(() => {
    const canvas = mainRef.current
    if (!terrain || !sheets || !canvas) { waterRef.current = null; return }
    if (!terrain.hasWater) { waterRef.current = null; return }

    const c = newLayer()
    const ctx = c.getContext('2d')!
    waterRef.current = c

    let frame = 0
    drawWaterLayer(ctx, terrain, sheets, frame, cellPx)
    compositeRef.current()

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (reduced.matches) return

    let visible = true
    const observer = new IntersectionObserver(
      entries => { visible = entries.some(e => e.isIntersecting) },
      { threshold: 0 },
    )
    observer.observe(canvas)

    const timer = window.setInterval(() => {
      if (document.hidden || !visible) return
      frame = (frame + 1) % sheets.waterFrames
      drawWaterLayer(ctx, terrain, sheets, frame, cellPx)
      compositeRef.current()
    }, WATER_FRAME_MS)

    return () => {
      window.clearInterval(timer)
      observer.disconnect()
    }
  }, [terrain, sheets, cellPx, newLayer])

  // Re-fit whenever the canvas changes size, so the picture always frames itself.
  useEffect(() => {
    const canvas = mainRef.current
    if (!canvas) return
    const observer = new ResizeObserver(() => {
      viewRef.current = null
      compositeRef.current()
    })
    observer.observe(canvas)
    return () => observer.disconnect()
  }, [])

  // Wheel zoom, stepping whole scales and keeping the point under the cursor put.
  // Registered manually because preventDefault needs a non-passive listener.
  useEffect(() => {
    const canvas = mainRef.current
    if (!canvas) return

    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const view = viewRef.current
      if (!view) return
      const step = scaleStep(window.devicePixelRatio || 1)
      const next = snapScale(view.scale + WHEEL_STEP * Math.sign(-e.deltaY), step)
      if (next === view.scale) return

      const rect = canvas.getBoundingClientRect()
      const cx = e.clientX - rect.left
      const cy = e.clientY - rect.top
      const worldX = (cx - view.offsetX) / view.scale
      const worldY = (cy - view.offsetY) / view.scale

      viewRef.current = { scale: next, offsetX: cx - worldX * next, offsetY: cy - worldY * next }
      compositeRef.current()
    }

    canvas.addEventListener('wheel', onWheel, { passive: false })
    return () => canvas.removeEventListener('wheel', onWheel)
  }, [])

  // The midpoint between two fingers, in canvas coordinates.
  function pinchMidpoint(rect: DOMRect) {
    const [a, b] = [...pointersRef.current.values()]
    return { x: (a.x + b.x) / 2 - rect.left, y: (a.y + b.y) / 2 - rect.top }
  }

  function pinchDistance() {
    const [a, b] = [...pointersRef.current.values()]
    return Math.hypot(a.x - b.x, a.y - b.y)
  }

  function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    e.currentTarget.setPointerCapture(e.pointerId)
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

    if (pointersRef.current.size === 2) {
      // Second finger down: stop panning and remember where the pinch began,
      // including the ground under its midpoint so that point can stay put.
      const view = viewRef.current
      if (!view) return
      const mid = pinchMidpoint(e.currentTarget.getBoundingClientRect())
      pinchRef.current = {
        startDistance: pinchDistance(),
        startScale: view.scale,
        worldX: (mid.x - view.offsetX) / view.scale,
        worldY: (mid.y - view.offsetY) / view.scale,
      }
      dragRef.current = null
      suppressClickRef.current = true
      return
    }

    dragRef.current = { x: e.clientX, y: e.clientY, moved: false }
  }

  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    const view = viewRef.current
    if (!view) return
    if (pointersRef.current.has(e.pointerId)) {
      pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    }

    const pinch = pinchRef.current
    if (pinch && pointersRef.current.size >= 2) {
      // Zoom by how far the fingers spread, then put the ground that was under
      // the midpoint back under the midpoint — which pans as well as zooms.
      const scale = pinchScale(
        pinch.startScale, pinch.startDistance, pinchDistance(),
        scaleStep(window.devicePixelRatio || 1),
      )
      const mid = pinchMidpoint(e.currentTarget.getBoundingClientRect())
      viewRef.current = {
        scale,
        offsetX: mid.x - pinch.worldX * scale,
        offsetY: mid.y - pinch.worldY * scale,
      }
      compositeRef.current()
      return
    }

    const drag = dragRef.current
    if (!drag) return
    const dx = e.clientX - drag.x
    const dy = e.clientY - drag.y
    if (Math.abs(dx) > CLICK_SLOP_PX || Math.abs(dy) > CLICK_SLOP_PX) drag.moved = true
    viewRef.current = { ...view, offsetX: view.offsetX + dx, offsetY: view.offsetY + dy }
    drag.x = e.clientX
    drag.y = e.clientY
    compositeRef.current()
  }

  function onPointerUp(e: React.PointerEvent<HTMLCanvasElement>) {
    e.currentTarget.releasePointerCapture(e.pointerId)
    pointersRef.current.delete(e.pointerId)

    if (pointersRef.current.size < 2) pinchRef.current = null
    // One finger left after a pinch: re-anchor so panning does not jump.
    if (pointersRef.current.size === 1) {
      const [remaining] = [...pointersRef.current.values()]
      dragRef.current = { x: remaining.x, y: remaining.y, moved: true }
    }
  }

  // A pan or a pinch ends in a click too, so only a still tap selects.
  function onClick(e: React.MouseEvent<HTMLCanvasElement>) {
    const drag = dragRef.current
    dragRef.current = null
    if (suppressClickRef.current) {
      suppressClickRef.current = false
      return
    }
    if (drag?.moved) return

    const view = viewRef.current
    if (!view) return
    const rect = e.currentTarget.getBoundingClientRect()

    // The house is hit-tested first and falls through to the tiles on a miss,
    // because it overlaps blocks that are still selectable around it.
    if (terrain && placement && onSelectHouse) {
      const worldX = (e.clientX - rect.left - view.offsetX) / view.scale
      const worldY = (e.clientY - rect.top - view.offsetY) / view.scale
      if (houseAt(terrain, placement, worldX, worldY, cellPx)) {
        onSelectHouse({ x: e.clientX, y: e.clientY })
        return
      }
    }

    if (!onSelectBlock) return
    // The plot sits `border` tiles into the picture, so the camera handed to the
    // tile lookup is shifted by that much rather than the layout being moved.
    const plotView: View = {
      ...view,
      offsetX: view.offsetX + shift * view.scale,
      offsetY: view.offsetY + shift * view.scale,
    }
    const hit = tileAt(plotView, cellPx, layout, e.clientX, e.clientY, rect)
    onSelectBlock(
      hit ? layout.blockRanges[hit.blockIndex].blockId : null,
      hit ? { x: e.clientX, y: e.clientY } : null,
      hit,
    )
  }

  return (
    <div className="relative h-full w-full">
      <canvas
        ref={mainRef}
        className="h-full w-full cursor-grab touch-none active:cursor-grabbing"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClick={onClick}
      />
      {/* The scenery says it is scenery, in the UI and not only in the README —
          the same discipline as labelling synthetic data. */}
      {terrain && (
        // On its own plate. The scenery reaches the edge of the canvas now, so
        // this sits on grass rather than on the page — and muted ink on grass
        // is not a colour anybody can read.
        <p className="pointer-events-none absolute bottom-2 left-2 rounded-md bg-background/75 px-2 py-1 text-xs text-muted-foreground backdrop-blur-sm">
          Pemandangan sekitar hanya ilustrasi.
        </p>
      )}
    </div>
  )
}
