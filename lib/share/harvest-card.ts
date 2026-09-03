/**
 * The shareable harvest card: what a farmer actually forwards.
 *
 * A link is the right thing to share with someone who will open it. A picture
 * is the right thing to share into a WhatsApp group, which is where a
 * cooperative's news actually travels in rural Indonesia -- it survives being
 * forwarded, it reads without a connection, and it shows up in the thread
 * rather than as a grey preview box somebody has to tap.
 *
 * Composition is split from drawing on purpose. `harvestCardContent` decides
 * what the card SAYS and is a pure function over facts, so the wording -- and
 * particularly the hedging on a projected figure -- is testable without a
 * canvas. `drawHarvestCard` only decides where those strings go.
 */

/** What the page knows, in the words it already uses on screen. */
export type HarvestCardFacts = {
  plotName: string
  memberName: string
  /** "Sukamaju, Kabupaten Subang". */
  place: string
  areaHa: number
  crops: {
    name: string
    /** The harvest window, already formatted as a range. Null when unknown. */
    window: string | null
    /** The expected yield range, already formatted. Null when the variety has none. */
    tonnes: string | null
  }[]
  /** The public garden URL this card is a picture of. */
  url: string
  /** True when the projection is running on stale or missing weather. */
  degraded: boolean
}

export type HarvestCardRow = {
  label: string
  value: string
}

export type HarvestCardContent = {
  heading: string
  subheading: string
  meta: string
  rows: HarvestCardRow[]
  /** The hedge. Never omitted -- see below. */
  footnote: string
  url: string
}

/** How many crops fit before the card starts summarising instead of listing. */
const MAX_ROWS = 4

/**
 * What the card says.
 *
 * The footnote is not optional and not configurable. Every number on this card
 * is a projection, the card will be forwarded away from the page that explains
 * that, and a tonnage in a WhatsApp group with no hedge on it is exactly how a
 * projection turns into a promise somebody trades on. The whole product is
 * careful about this on screen; a picture that leaves the room must be more
 * careful, not less.
 */
export function harvestCardContent(facts: HarvestCardFacts): HarvestCardContent {
  const rows: HarvestCardRow[] = facts.crops.slice(0, MAX_ROWS).map(crop => ({
    label: crop.name,
    value: [crop.window, crop.tonnes].filter(Boolean).join(' · ') || 'Belum ada perkiraan',
  }))

  const hidden = facts.crops.length - rows.length
  if (hidden > 0) {
    rows.push({ label: `+${hidden} komoditas lain`, value: 'Lihat halaman kebun' })
  }

  return {
    heading: facts.plotName,
    subheading: facts.memberName || 'Petani tidak tercatat',
    meta: `${formatHa(facts.areaHa)} ha · ${facts.place}`,
    rows,
    footnote: facts.degraded
      ? 'Perkiraan panen, dihitung tanpa data cuaca terbaru. Dapat berubah.'
      : 'Perkiraan panen dari cuaca yang tercatat. Rentang, bukan janji.',
    url: facts.url,
  }
}

function formatHa(value: number): string {
  return value.toFixed(2).replace('.', ',')
}

/** Portrait, which is the shape a phone shows a chat image in without cropping. */
export const CARD_WIDTH = 1080
export const CARD_HEIGHT = 1350

const INK = '#10251c'
const INK_SOFT = '#4f5c50'
const GREEN = '#0f4d3c'
const PAPER = '#ffffff'
const RULE = '#dfe5e0'

/**
 * Paints the card onto a 2D context sized CARD_WIDTH x CARD_HEIGHT.
 *
 * Plain typography and no imagery, which is a decision rather than a shortcut:
 * the card has to render identically on every device with no font loading and
 * no network, and a picture of a farm here would be the generated scenery --
 * decoration the page is careful to label as illustration, which cannot carry
 * that label into a group chat.
 */
export function drawHarvestCard(
  ctx: CanvasRenderingContext2D, content: HarvestCardContent,
): void {
  const stack = 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif'

  ctx.fillStyle = PAPER
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT)

  // A green band across the head, so the card is recognisable as Terrion's at
  // thumbnail size in a chat list.
  ctx.fillStyle = GREEN
  ctx.fillRect(0, 0, CARD_WIDTH, 22)

  const margin = 88
  let y = 190

  ctx.fillStyle = GREEN
  ctx.font = `600 34px ${stack}`
  ctx.textBaseline = 'alphabetic'
  ctx.fillText('TERRION', margin, 120)

  ctx.fillStyle = INK
  ctx.font = `700 76px ${stack}`
  y = drawWrapped(ctx, content.heading, margin, y, CARD_WIDTH - margin * 2, 88)

  ctx.fillStyle = INK_SOFT
  ctx.font = `400 40px ${stack}`
  y += 18
  ctx.fillText(content.subheading, margin, y)

  y += 52
  ctx.font = `400 34px ${stack}`
  ctx.fillText(content.meta, margin, y)

  y += 64
  ctx.strokeStyle = RULE
  ctx.lineWidth = 2
  line(ctx, margin, y, CARD_WIDTH - margin)

  y += 76
  for (const row of content.rows) {
    ctx.fillStyle = INK
    ctx.font = `600 44px ${stack}`
    ctx.fillText(row.label, margin, y)

    ctx.fillStyle = INK_SOFT
    ctx.font = `400 36px ${stack}`
    y += 48
    y = drawWrapped(ctx, row.value, margin, y, CARD_WIDTH - margin * 2, 46)

    y += 46
  }

  // The footnote and the URL sit on the floor of the card rather than after the
  // last row, so a plot with one crop and a plot with four both carry the hedge
  // in the same place.
  const floor = CARD_HEIGHT - 96

  ctx.strokeStyle = RULE
  line(ctx, margin, floor - 132, CARD_WIDTH - margin)

  ctx.fillStyle = INK_SOFT
  ctx.font = `400 30px ${stack}`
  drawWrapped(ctx, content.footnote, margin, floor - 78, CARD_WIDTH - margin * 2, 38)

  ctx.fillStyle = GREEN
  ctx.font = `600 32px ${stack}`
  ctx.fillText(content.url, margin, floor)
}

function line(ctx: CanvasRenderingContext2D, from: number, y: number, to: number): void {
  ctx.beginPath()
  ctx.moveTo(from, y)
  ctx.lineTo(to, y)
  ctx.stroke()
}

/** Draws text broken onto as many lines as it needs; returns the last baseline. */
function drawWrapped(
  ctx: CanvasRenderingContext2D,
  text: string, x: number, y: number, maxWidth: number, lineHeight: number,
): number {
  const words = text.split(' ')
  let current = ''
  let baseline = y

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word
    if (ctx.measureText(candidate).width > maxWidth && current) {
      ctx.fillText(current, x, baseline)
      baseline += lineHeight
      current = word
    } else {
      current = candidate
    }
  }
  if (current) ctx.fillText(current, x, baseline)
  return baseline
}
