// A stable visual identity per commodity, for the catalogue grid.
//
// The catalogue carries no photographs. Listings are derived — cooperative x
// commodity x ISO week — so there is no stored row to hang an image on, and a
// stock photo of somebody else's rice field would be decoration pretending to
// be evidence.
//
// Colour does the work instead. Each crop keeps the same hue everywhere it
// appears, so a buyer scanning forty cards finds the one they came for by
// shape rather than by reading every heading. The glyph is a second channel:
// colour alone is not an identifier for a reader who cannot distinguish two of
// these hues, and it survives greyscale printing.

export type CommodityStyle = {
  /** Tailwind-safe inline colours, so a new commodity needs no class list. */
  hue: string
  tint: string
  /** An SVG path drawn at 24x24, stroked not filled. */
  glyph: string
  /** High-resolution photo asset path if available. */
  image?: string
}

// Deliberately not the chart palette: these identify a crop, they do not encode
// a quantity, and reusing the series colours would imply an order that is not
// there.
const STYLES: Record<string, CommodityStyle> = {
  padi: {
    hue: '#b08900', tint: '#fdf6e3',
    glyph: 'M12 21V11M12 11c0-2 1.4-3.6 3.6-4-.2 2.4-1.6 4-3.6 4Zm0 0c0-2-1.4-3.6-3.6-4 .2 2.4 1.6 4 3.6 4Zm0-5c0-2 1.4-3.6 3.6-4-.2 2.4-1.6 4-3.6 4Zm0 0c0-2-1.4-3.6-3.6-4 .2 2.4 1.6 4 3.6 4Z',
    image: '/crops/padi.png',
  },
  jagung: {
    hue: '#c98a00', tint: '#fdf3e0',
    glyph: 'M12 3c2.5 1.6 3.5 4.2 3.5 7s-1 5.4-3.5 7c-2.5-1.6-3.5-4.2-3.5-7S9.5 4.6 12 3ZM9.4 7h5.2M9 11h6M9.4 15h5.2M12 17v4',
    image: '/crops/jagung.png',
  },
  cabai: {
    hue: '#c2410c', tint: '#fdf0ea',
    glyph: 'M14 5c0-1 .8-2 2-2M14 5c-3.4 0-6.5 3-6.5 7.5S10 20 13 20c3.4 0 5.5-3.4 5.5-7C18.5 8.6 16.8 5 14 5Z',
    image: '/crops/cabai.png',
  },
  kentang: {
    hue: '#8a6a3f', tint: '#f8f3ec',
    glyph: 'M8.5 6.5c3.5-2 8 0 8.6 4.2.6 4-2.4 7.6-6 8.2-3.4.6-6.6-1.8-7-5.2-.4-3.2 1.2-5.6 4.4-7.2ZM10 11h.01M14 13h.01M11.5 15.5h.01',
  },
  wortel: {
    hue: '#d1660a', tint: '#fdf2e8',
    glyph: 'M11 8 6.5 19.5 18 15 11 8Zm0 0 2-3m-2 3-3-2m5-1V3m0 2 3-1',
    image: '/crops/wortel.png',
  },
  beri: {
    hue: '#9d2c5b', tint: '#fbeef3',
    glyph: 'M12 8c-1 0-3 .4-3 2.6 0 2 1.4 3.4 3 3.4s3-1.4 3-3.4C15 8.4 13 8 12 8Zm-3.5 4.6C7.6 12.9 6 13.9 6 16c0 2 1.4 3.4 3 3.4 1.2 0 2.2-.8 2.7-2M15.5 12.6c.9.3 2.5 1.3 2.5 3.4 0 2-1.4 3.4-3 3.4-1.2 0-2.2-.8-2.7-2M12 8V5m0 0-1.5-2M12 5l1.5-2',
  },
}

// A neutral identity for a crop the seed does not cover, so an unknown
// commodity renders as itself rather than as nothing.
const FALLBACK: CommodityStyle = {
  hue: '#15803d', tint: '#f2f9f4',
  glyph: 'M12 20V9M12 12c0-3 2-5.5 5.5-6 .2 3.4-1.8 6-5.5 6Zm0 2c0-2.6-1.8-4.8-5-5.2C6.8 11.7 8.6 14 12 14Z',
}

/** The identity for a commodity, matched on its display name. */
export function commodityStyle(name: string): CommodityStyle {
  const key = name.toLowerCase().trim()
  // Matched on inclusion rather than equality: the seed names a crop "Padi
  // sawah" or "Cabai merah", and both should carry their crop's colour.
  for (const [slug, style] of Object.entries(STYLES)) {
    if (key.includes(slug)) return style
  }
  return FALLBACK
}
