// The shared vocabulary of the prediction pipeline.

/** One day of observed or forecast weather. `date` is 'YYYY-MM-DD'. */
export type TempDay = { date: string; tmin: number; tmax: number }

/** The long-run average for one day of the year, used where no forecast reaches. */
export type ClimateNormal = { dayOfYear: number; meanC: number; sdC: number }
export type ClimateNormals = ClimateNormal[]

/** What a crop variety needs to reach harvest, and what it yields when it does. */
export type Variety = {
  gddRequirement: number
  baseTempC: number
  daysToHarvestMin: number
  daysToHarvestMax: number
  yieldPerHaMin: number
  yieldPerHaMax: number
}

/** Learned correction from past harvests: how wrong the model was, and how sure. */
export type Calibration = { offsetDays: number; nObservations: number; residualSd: number }

/** How grown a crop looks: 0 is bare soil, 4 is ready to harvest. */
export type GrowthStage = 0 | 1 | 2 | 3 | 4

/** The prediction: when this block is expected to be harvestable. */
export type HarvestWindow = {
  start: Date
  end: Date
  confidence: 0.8
  gddAccumulated: number
  gddRequired: number
  stage: GrowthStage
  /** Which weather the window rests on — observed is firm, climatology is a guess. */
  basis: 'observed' | 'forecast' | 'climatology'
  /** How the thermal window sits against the variety's published duration.
   *  The published days-to-harvest describes how long this variety usually
   *  takes across many sites — it never trims the window, it only judges it.
   *  'ok' agrees; 'early'/'late' disagree mildly and are still usable;
   *  'implausible' means the variety row or the weather feed is wrong and no
   *  date should be shown as confident. */
  plausibility: 'ok' | 'early' | 'late' | 'implausible'
  cumulativeGdd: { date: string; gdd: number }[]
  /** Null once the crop already matured within known weather. Otherwise the
   *  first date in cumulativeGdd computed from climate normals rather than an
   *  observed or forecast reading -- the slider draws past this differently
   *  so a projection is never read as a fact. */
  projectedFrom: Date | null
}

/** One block's expected harvest, as the collision detector and exports see it. */
export type BlockProjection = {
  blockId: string
  plotId: string
  commodityId: string
  window: { start: Date; end: Date }
  expectedTonnes: number
}
