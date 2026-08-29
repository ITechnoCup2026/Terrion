/**
 * Builds the sprite sheets the canvas loads, from the source art in assets/.
 *
 *   pnpm build:sprites
 *
 * Two reasons this is a build step rather than a checked-in file that somebody
 * once exported by hand:
 *
 *   1. assets/ holds 1080x1080 source illustrations. public/ is web-served, so
 *      putting the full-resolution art there publishes the whole pack. Only
 *      built output belongs in public/sprites/.
 *   2. The row order of the source art is NOT the row order the app needs.
 *      commodity.sprite_row decides which row a crop reads from, and row 0 is
 *      padi because padi doubles as the fallback for any commodity without art
 *      of its own. The source sheet happens to start with jagung. Doing that
 *      remap in code means the mapping is stated once, here, instead of being a
 *      property of a binary nobody can diff.
 *
 * Output:
 *   public/sprites/crops.png   160x192 -- 5 growth stages across, 6 crops down
 *   public/sprites/crops.json  what the sheet contains, for the loader
 *   public/sprites/house.png   64x64   -- the farmhouse decoration
 */

import { mkdirSync, writeFileSync } from 'node:fs'
import sharp, { type OverlayOptions } from 'sharp'

const SOURCE_CROPS = 'assets/crops.png'
const SOURCE_HOUSE = 'assets/house.png'
const OUT_DIR = 'public/sprites'

// The source sheet is a 5-column, 6-row grid inside 1080x1080.
const SRC_COLS = 5
const SRC_ROWS = 6
const SRC_W = 1080 / SRC_COLS   // 216
const SRC_H = 1080 / SRC_ROWS   // 180

// Must match lib/canvas/crops.ts.
const CELL = 32
const STAGES = 5

const HOUSE_SIZE = 64

/**
 * Which source row each sprite_row is cut from.
 *
 * Index = commodity.sprite_row (see supabase/seed/commodity.sql).
 * Value = the row in assets/crops.png holding that crop.
 */
const SOURCE_ROW_FOR: { spriteRow: number; slug: string; sourceRow: number }[] = [
  { spriteRow: 0, slug: 'padi',    sourceRow: 3 },   // also the generik fallback
  { spriteRow: 1, slug: 'jagung',  sourceRow: 0 },
  { spriteRow: 2, slug: 'wortel',  sourceRow: 1 },
  { spriteRow: 3, slug: 'cabai',   sourceRow: 2 },
  { spriteRow: 4, slug: 'kentang', sourceRow: 4 },
  { spriteRow: 5, slug: 'beri',    sourceRow: 5 },
]

/** Anything this faint is a scaling artefact, not part of the drawing. */
const ALPHA_FLOOR = 8

type Box = { left: number; top: number; width: number; height: number }

// The drawn part of a cell, ignoring the transparent padding around it.
function opaqueBounds(pixels: Buffer, width: number, height: number): Box | null {
  let minX = width, minY = height, maxX = -1, maxY = -1
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (pixels[(y * width + x) * 4 + 3] <= ALPHA_FLOOR) continue
      if (x < minX) minX = x
      if (x > maxX) maxX = x
      if (y < minY) minY = y
      if (y > maxY) maxY = y
    }
  }
  if (maxX < 0) return null
  return { left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1 }
}

// The drawn bounds of one source cell, in source pixels.
async function cellBounds(source: string, box: Box): Promise<Box | null> {
  const raw = await sharp(source).extract(box).ensureAlpha()
    .raw().toBuffer({ resolveWithObject: true })
  return opaqueBounds(raw.data, raw.info.width, raw.info.height)
}

/** An empty 32x32 tile, for a stage the source art left blank. */
function blankTile(size = CELL): Promise<Buffer> {
  return sharp({
    create: { width: size, height: size, channels: 4,
              background: { r: 0, g: 0, b: 0, alpha: 0 } },
  }).png().toBuffer()
}

/**
 * One crop's five tiles, scaled by a SHARED factor.
 *
 * Scaling each stage to fill its own cell would make a seedling the same size
 * on screen as a full maize stalk, and the whole point of five stages is that
 * the plant visibly grows. So the row is measured first, the largest stage is
 * what gets to fill the tile, and every earlier stage is scaled by that same
 * factor -- then sat on the bottom edge, because plants grow up from soil.
 */
async function buildRow(source: string, sourceRow: number): Promise<Buffer[]> {
  const boxes: Box[] = []
  for (let stage = 0; stage < STAGES; stage++) {
    boxes.push({
      left: Math.round(stage * SRC_W), top: Math.round(sourceRow * SRC_H),
      width: Math.round(SRC_W), height: Math.round(SRC_H),
    })
  }

  const bounds = await Promise.all(boxes.map(b => cellBounds(source, b)))
  const widest = Math.max(...bounds.map(b => b?.width ?? 1))
  const tallest = Math.max(...bounds.map(b => b?.height ?? 1))

  // One pixel of breathing room so neighbouring tiles do not touch.
  const scale = Math.min((CELL - 2) / widest, (CELL - 2) / tallest)

  const tiles: Buffer[] = []
  for (let stage = 0; stage < STAGES; stage++) {
    const b = bounds[stage]
    if (!b) {
      tiles.push(await blankTile())
      continue
    }

    const w = Math.max(1, Math.round(b.width * scale))
    const h = Math.max(1, Math.round(b.height * scale))

    const plant = await sharp(source)
      .extract({
        left: boxes[stage].left + b.left, top: boxes[stage].top + b.top,
        width: b.width, height: b.height,
      })
      .resize(w, h, { kernel: 'lanczos3' })
      .png().toBuffer()

    tiles.push(await sharp({
      create: { width: CELL, height: CELL, channels: 4,
                background: { r: 0, g: 0, b: 0, alpha: 0 } },
    }).composite([{
      input: plant,
      left: Math.round((CELL - w) / 2),
      top: CELL - h - 1,
    }]).png().toBuffer())
  }
  return tiles
}

async function buildCrops(): Promise<void> {
  const composites: OverlayOptions[] = []

  for (const crop of SOURCE_ROW_FOR) {
    const tiles = await buildRow(SOURCE_CROPS, crop.sourceRow)
    tiles.forEach((tile, stage) => {
      composites.push({ input: tile, left: stage * CELL, top: crop.spriteRow * CELL })
    })
    console.log(`  row ${crop.spriteRow}  ${crop.slug.padEnd(8)} <- source row ${crop.sourceRow}`)
  }

  const width = STAGES * CELL
  const height = SOURCE_ROW_FOR.length * CELL

  await sharp({
    create: { width, height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  }).composite(composites).png({ compressionLevel: 9 }).toFile(`${OUT_DIR}/crops.png`)

  writeFileSync(`${OUT_DIR}/crops.json`, JSON.stringify({
    cell: CELL,
    stages: STAGES,
    rows: SOURCE_ROW_FOR.map(c => ({ spriteRow: c.spriteRow, slug: c.slug })),
    note: 'Generated by pnpm build:sprites from assets/crops.png. Do not edit.',
  }, null, 2) + '\n')

  console.log(`  -> ${OUT_DIR}/crops.png  ${width}x${height}`)
}

async function buildHouse(): Promise<void> {
  const meta = await sharp(SOURCE_HOUSE).metadata()
  const box: Box = { left: 0, top: 0, width: meta.width ?? 1080, height: meta.height ?? 1080 }
  const b = await cellBounds(SOURCE_HOUSE, box) ?? box

  // One illustration, so there is no row to stay in proportion with.
  await sharp(SOURCE_HOUSE)
    .extract({ left: b.left, top: b.top, width: b.width, height: b.height })
    .resize(HOUSE_SIZE, HOUSE_SIZE, {
      fit: 'contain', position: 'south',
      background: { r: 0, g: 0, b: 0, alpha: 0 }, kernel: 'lanczos3',
    })
    .png({ compressionLevel: 9 })
    .toFile(`${OUT_DIR}/house.png`)

  console.log(`  -> ${OUT_DIR}/house.png  ${HOUSE_SIZE}x${HOUSE_SIZE}`)
}

// ---------------------------------------------------------------------------
// Terrain: the decorative border drawn OUTSIDE the plot rectangle.
//
// Nothing here may be drawn inside the plot. The spec is explicit about why:
// a tile grid makes no geographic claim, and scattering a river through the
// blocks would rebuild exactly the lie the grid was chosen to avoid. The fence
// is the one exception -- it marks the real boundary, so it is the only piece
// of scenery that is true.
// ---------------------------------------------------------------------------

const TILESET = 'assets/ForgottenMemories/TileSet.png'
const WATER_SRC = 'assets/ForgottenMemories/WaterTiles-6frames.png'
const TREES_SRC = 'assets/ForgottenMemories/Trees_seperated.png'
const TREES_ALT_SRC = 'assets/ForgottenMemories/Trees.png'
const PROPS_SRC = 'assets/ForgottenMemories/Props.png'

// Tile size measured from the pack, not assumed: an edge-energy scan over
// TileSet.png peaks hard at 32 (ratio 3.2 vs the mean), and 16/48/64 are its
// harmonics. Same 32 as CELL, which is why crops and ground line up.
const TILE = 32

/**
 * Ground tiles, by grid position in TileSet.png.
 *
 * Picked by scanning every fully-opaque 32x32 tile for mean colour and
 * standard deviation, rather than by reading coordinates off a screenshot.
 * The flat ones (sd = 0) are autotile interiors; the textured ones carry
 * tufts and pebbles, and exist so a border laid from one flat colour does not
 * read as a painted rectangle.
 */
const GROUND_TILES: { name: string; col: number; row: number }[] = [
  { name: 'grass',        col: 2,  row: 2 },   // rgb(128,132,73) flat
  { name: 'grass_tuft_a', col: 48, row: 1 },
  { name: 'grass_tuft_b', col: 45, row: 2 },
  { name: 'grass_tuft_c', col: 47, row: 3 },
  { name: 'grass_dark',   col: 20, row: 0 },   // rgb(106,106,70)
  { name: 'soil',         col: 0,  row: 0 },   // rgb(152,115,76) flat
  { name: 'soil_pebble_a', col: 45, row: 12 },
  { name: 'soil_pebble_b', col: 46, row: 13 },
  { name: 'sand',         col: 12, row: 2 },   // rgb(158,130,81)
]

// The plain open-water block, measured: 6 frames across at (32,288), each 32px.
const WATER_ORIGIN = { left: 32, top: 288 }
const WATER_FRAMES = 6

/**
 * The three wooden fence pieces, from the loose parts at the bottom of the
 * pack's fence block (grid row 5, columns 57-59).
 *
 * The build used to cut ONE tile, at (1888, 0), and rotate it for the vertical
 * run. That tile is a corner POST, not a rail -- so every side of every farm
 * was a row of identical posts with no fence between them, which is exactly
 * what it looked like. These three are the rail, the rail turned, and a post
 * to punctuate them.
 *
 * The white picket pieces in the pack read as a garden; a farm boundary is wood.
 */
const FENCE_POST = { left: 1824, top: 160, width: TILE, height: TILE }
const FENCE_RAIL_H = { left: 1856, top: 160, width: TILE, height: TILE }
const FENCE_RAIL_V = { left: 1888, top: 160, width: TILE, height: TILE }

const TREE_CELL = 64
const PROP_CELL = 32

/**
 * Is this sprite green foliage?
 *
 * The pack ships autumn and winter variants of every tree and shrub -- orange,
 * red, teal -- plus detached drop-shadows that segment as their own component.
 * Size cannot tell them apart; hue can. Measured across the sheets: the olive
 * willows sit at ~53 deg, the plain green shrubs at ~90 deg, autumn oranges at
 * ~35 deg, reds at ~16 deg and the winter teals at ~184 deg. A shadow has a
 * mean luminance around 38.
 *
 * Subang is equatorial. Nothing there turns orange in October.
 */
function isGreenFoliage(mean: [number, number, number]): boolean {
  const [r, g, b] = mean
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min
  const luminance = 0.299 * r + 0.587 * g + 0.114 * b
  if (luminance < 55 || d < 8) return false

  let hue: number
  if (max === r) hue = 60 * (((g - b) / d + 6) % 6)
  else if (max === g) hue = 60 * ((b - r) / d + 2)
  else hue = 60 * ((r - g) / d + 4)

  return hue >= 45 && hue <= 150
}

type Component = Box & { px: number; mean: [number, number, number] }

/**
 * Every separate drawing in a sheet, found by flood-filling the alpha channel.
 *
 * Used instead of hard-coded rectangles because a hard-coded rectangle silently
 * becomes wrong the day the art is re-exported, and there is nothing in a
 * committed PNG to diff against.
 */
async function components(file: string, region?: Box): Promise<Component[]> {
  const base = sharp(file).ensureAlpha()
  const { data, info } = await (region ? base.extract(region) : base)
    .raw().toBuffer({ resolveWithObject: true })

  const W = info.width, H = info.height
  const seen = new Uint8Array(W * H)
  const found: Component[] = []

  for (let y0 = 0; y0 < H; y0++) {
    for (let x0 = 0; x0 < W; x0++) {
      const start = y0 * W + x0
      if (seen[start] || data[start * 4 + 3] <= ALPHA_FLOOR) continue

      let minX = x0, maxX = x0, minY = y0, maxY = y0, px = 0
      let sr = 0, sg = 0, sb = 0
      const stack = [start]
      seen[start] = 1

      while (stack.length) {
        const q = stack.pop() as number
        const x = q % W, y = (q / W) | 0
        px++
        sr += data[q * 4]; sg += data[q * 4 + 1]; sb += data[q * 4 + 2]
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx, ny = y + dy
            if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue
            const r = ny * W + nx
            if (seen[r] || data[r * 4 + 3] <= ALPHA_FLOOR) continue
            seen[r] = 1
            stack.push(r)
          }
        }
      }
      found.push({
        left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1, px,
        mean: [sr / px, sg / px, sb / px],
      })
    }
  }
  return found.sort((a, b) => b.px - a.px)
}

/** A horizontal strip of same-sized cells, written as one file. */
async function writeStrip(
  tiles: Buffer[], cell: number, file: string,
): Promise<void> {
  await sharp({
    create: { width: cell * tiles.length, height: cell, channels: 4,
              background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite(tiles.map((input, i) => ({ input, left: i * cell, top: 0 })))
    .png({ compressionLevel: 9 })
    .toFile(file)
}

async function buildGround(): Promise<string[]> {
  const tiles = await Promise.all(GROUND_TILES.map(t =>
    sharp(TILESET).extract({
      left: t.col * TILE, top: t.row * TILE, width: TILE, height: TILE,
    }).png().toBuffer()))

  await writeStrip(tiles, TILE, `${OUT_DIR}/ground.png`)
  console.log(`  -> ${OUT_DIR}/ground.png  ${GROUND_TILES.length} tiles`)
  return GROUND_TILES.map(t => t.name)
}

async function buildWater(): Promise<void> {
  const frames = await Promise.all(
    Array.from({ length: WATER_FRAMES }, (_, i) =>
      sharp(WATER_SRC).extract({
        left: WATER_ORIGIN.left + i * TILE, top: WATER_ORIGIN.top,
        width: TILE, height: TILE,
      }).png().toBuffer()))

  await writeStrip(frames, TILE, `${OUT_DIR}/water.png`)
  console.log(`  -> ${OUT_DIR}/water.png  ${WATER_FRAMES} frames`)
}

async function buildFence(): Promise<string[]> {
  const cut = (box: Box) => sharp(TILESET).extract(box).png().toBuffer()
  const tiles = await Promise.all([cut(FENCE_RAIL_H), cut(FENCE_RAIL_V), cut(FENCE_POST)])

  await writeStrip(tiles, TILE, `${OUT_DIR}/fence.png`)
  console.log(`  -> ${OUT_DIR}/fence.png  3 tiles (rail, rail turned, post)`)
  return ['fence_h', 'fence_v', 'fence_post']
}

/**
 * Scatter sprites (trees, props) cut from a sheet and scaled together.
 *
 * One shared scale again, for the same reason as the crop rows: a big tree and
 * a small shrub have to stay a big tree and a small shrub.
 */
type ScatterSource = { file: string; region?: Box }

async function buildScatter(
  sources: ScatterSource[], cell: number, file: string,
  keep: (c: Component) => boolean, limit: number,
): Promise<number> {
  const all: (Component & { source: ScatterSource })[] = []
  for (const src of sources) {
    for (const c of await components(src.file, src.region)) {
      if (keep(c)) all.push({ ...c, source: src })
    }
  }
  all.sort((a, b) => b.px - a.px)

  // Trees.png and Trees_seperated.png are the same art exported twice, so the
  // largest sprites arrive in near-identical pairs. Keep one silhouette each.
  const chosen: typeof all = []
  for (const c of all) {
    const duplicate = chosen.some(k =>
      Math.abs(k.width - c.width) <= 6 && Math.abs(k.height - c.height) <= 6)
    if (!duplicate) chosen.push(c)
    if (chosen.length === limit) break
  }
  if (chosen.length === 0) {
    throw new Error(`No sprites matched in ${sources.map(s => s.file).join(', ')}`)
  }

  const widest = Math.max(...chosen.map(c => c.width))
  const tallest = Math.max(...chosen.map(c => c.height))
  const scale = Math.min((cell - 2) / widest, (cell - 2) / tallest)

  const tiles: Buffer[] = []
  for (const c of chosen) {
    const w = Math.max(1, Math.round(c.width * scale))
    const h = Math.max(1, Math.round(c.height * scale))
    const sprite = await sharp(c.source.file)
      .extract({
        left: (c.source.region?.left ?? 0) + c.left,
        top: (c.source.region?.top ?? 0) + c.top,
        width: c.width, height: c.height,
      })
      .resize(w, h, { kernel: 'lanczos3' }).png().toBuffer()

    tiles.push(await sharp({
      create: { width: cell, height: cell, channels: 4,
                background: { r: 0, g: 0, b: 0, alpha: 0 } },
    }).composite([{
      input: sprite, left: Math.round((cell - w) / 2), top: cell - h - 1,
    }]).png().toBuffer())
  }

  await writeStrip(tiles, cell, file)
  console.log(`  -> ${file}  ${tiles.length} sprites`)
  return tiles.length
}

async function buildTerrain(): Promise<void> {
  const ground = await buildGround()
  await buildWater()
  const fence = await buildFence()

  const trees = await buildScatter(
    [{ file: TREES_SRC }, { file: TREES_ALT_SRC }], TREE_CELL, `${OUT_DIR}/trees.png`,
    c => c.width >= 40 && c.width <= 200 && c.height >= 40 && c.height <= 200
      && isGreenFoliage(c.mean), 6)

  const props = await buildScatter(
    [{ file: PROPS_SRC, region: { left: 0, top: 0, width: 760, height: 420 } }],
    PROP_CELL, `${OUT_DIR}/props.png`,
    c => c.width >= 12 && c.width <= 60 && c.height >= 12 && c.height <= 60
      && isGreenFoliage(c.mean), 8)

  writeFileSync(`${OUT_DIR}/terrain.json`, JSON.stringify({
    tile: TILE,
    ground,
    fence,
    water: { frames: WATER_FRAMES },
    trees: { cell: TREE_CELL, count: trees },
    props: { cell: PROP_CELL, count: props },
    note: 'Generated by pnpm build:sprites. Do not edit.',
  }, null, 2) + '\n')
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true })
  console.log('Crops:')
  await buildCrops()
  console.log('House:')
  await buildHouse()
  console.log('Terrain:')
  await buildTerrain()
  console.log('\nDone.')
}

main().catch(e => {
  console.error(`\n${e instanceof Error ? e.message : e}`)
  process.exit(1)
})
