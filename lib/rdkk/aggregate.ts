// Flow D: what a season's planted area means in sacks of fertiliser.
//
// The roll-up is per member first and cooperative second, because Indonesia's
// subsidised-fertiliser allocation is capped per farmer, not per farm and not
// per cooperative. A member past that cap is FLAGGED, never truncated — an RDKK
// that silently drops a farmer's third hectare produces a form that looks
// correct and under-orders, which is worse than one that shows the problem.
//
// Every quantity carries the `fertiliser_rate.source` it came from. The seed
// file marks unverified rates in the data itself, so a source that reads
// "BELUM DIVERIFIKASI" must survive all the way to the printed form.

/** The per-farmer ceiling on subsidised fertiliser area, in hectares. */
export const SUBSIDY_CAP_HA = 2

/** One block planted in the season being aggregated. */
export type PlantedBlock = {
  blockId: string
  memberId: string
  memberName: string
  commodityId: string
  areaHa: number
}

/** A published application rate for one input on one commodity. */
export type FertiliserRate = {
  commodityId: string
  inputItem: string
  kgPerHa: number
  source: string
}

/** A quantity of one input, with every rate document that contributed to it. */
export type RequirementLine = {
  inputItem: string
  quantityKg: number
  sources: string[]
}

export type MemberRequirement = {
  memberId: string
  memberName: string
  plantedHa: number
  /** True when this farmer's total planted area exceeds the subsidy cap. */
  overSubsidyCap: boolean
  /** Hectares beyond the cap; 0 when within it. */
  excessHa: number
  lines: RequirementLine[]
}

export type RdkkAggregate = {
  members: MemberRequirement[]
  totals: RequirementLine[]
  /** Commodities planted this season that have no fertiliser_rate row. Their
   *  area counts toward the cap but nothing can be ordered for it, and the
   *  review screen must say so rather than showing a short total. */
  commoditiesWithoutRates: string[]
}

// Add a quantity onto an input item's running line, keeping sources distinct.
function accumulate(
  into: Map<string, RequirementLine>, inputItem: string, quantityKg: number, source: string,
) {
  const line = into.get(inputItem)
  if (line) {
    line.quantityKg += quantityKg
    if (!line.sources.includes(source)) line.sources.push(source)
  } else {
    into.set(inputItem, { inputItem, quantityKg, sources: [source] })
  }
}

// Order lines by input item so the screen and the printed form agree run to run.
function ordered(lines: Map<string, RequirementLine>): RequirementLine[] {
  return [...lines.values()].sort((a, b) => a.inputItem.localeCompare(b.inputItem))
}

// Turn a season's planted blocks into per-member and cooperative-wide input
// requirements, flagging anyone over the subsidy cap.
export function aggregateInputs(input: {
  blocks: PlantedBlock[]
  rates: FertiliserRate[]
  subsidyCapHa?: number
}): RdkkAggregate {
  const cap = input.subsidyCapHa ?? SUBSIDY_CAP_HA

  const ratesByCommodity = new Map<string, FertiliserRate[]>()
  for (const r of input.rates) {
    const list = ratesByCommodity.get(r.commodityId)
    if (list) list.push(r)
    else ratesByCommodity.set(r.commodityId, [r])
  }

  // Collapse blocks to one area per member per commodity before applying rates.
  type Bucket = { memberName: string; areaByCommodity: Map<string, number> }
  const byMember = new Map<string, Bucket>()
  const unrated = new Set<string>()

  for (const b of input.blocks) {
    if (!ratesByCommodity.has(b.commodityId)) unrated.add(b.commodityId)

    const bucket = byMember.get(b.memberId)
      ?? { memberName: b.memberName, areaByCommodity: new Map<string, number>() }
    bucket.areaByCommodity.set(
      b.commodityId, (bucket.areaByCommodity.get(b.commodityId) ?? 0) + b.areaHa)
    byMember.set(b.memberId, bucket)
  }

  const totals = new Map<string, RequirementLine>()
  const members: MemberRequirement[] = []

  for (const [memberId, bucket] of byMember) {
    const lines = new Map<string, RequirementLine>()
    let plantedHa = 0

    for (const [commodityId, areaHa] of bucket.areaByCommodity) {
      // Unrated area still counts toward the cap — the farmer is still farming
      // it — it simply produces no order line.
      plantedHa += areaHa
      for (const rate of ratesByCommodity.get(commodityId) ?? []) {
        const quantityKg = rate.kgPerHa * areaHa
        accumulate(lines, rate.inputItem, quantityKg, rate.source)
        accumulate(totals, rate.inputItem, quantityKg, rate.source)
      }
    }

    members.push({
      memberId,
      memberName: bucket.memberName,
      plantedHa,
      overSubsidyCap: plantedHa > cap,
      excessHa: Math.max(0, plantedHa - cap),
      lines: ordered(lines),
    })
  }

  members.sort((a, b) =>
    a.memberName.localeCompare(b.memberName) || a.memberId.localeCompare(b.memberId))

  return {
    members,
    totals: ordered(totals),
    commoditiesWithoutRates: [...unrated].sort(),
  }
}
