import { apiFetch } from '@/lib/api/client'
import type { CommodityRaw } from '@/lib/api/types'

export type Variety = {
  id: string
  commodityId: string
  name: string
  daysToHarvestMin: number
  daysToHarvestMax: number
  yieldPerHaMin: number
  yieldPerHaMax: number
}

export type Commodity = {
  id: string
  slug: string
  name: string
  spriteRow: number
  varieties: Variety[]
}

function toCommodity(raw: CommodityRaw): Commodity {
  return {
    id: raw.id,
    slug: raw.slug,
    name: raw.name,
    spriteRow: raw.sprite_row,
    varieties: raw.varieties.map(v => ({
      id: v.id,
      commodityId: v.commodity_id,
      name: v.name,
      daysToHarvestMin: v.days_to_harvest_min,
      daysToHarvestMax: v.days_to_harvest_max,
      yieldPerHaMin: v.yield_per_ha_min,
      yieldPerHaMax: v.yield_per_ha_max,
    })),
  }
}

/** The reference catalogue -- every commodity with its varieties nested, seeded once. */
export async function loadCommodities(): Promise<Commodity[]> {
  const raw = await apiFetch<CommodityRaw[]>('/api/commodities')
  return raw.map(toCommodity)
}
