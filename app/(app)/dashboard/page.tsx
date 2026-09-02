import { redirect } from 'next/navigation'

import { DashboardView } from '@/components/dashboard/DashboardView'
import { addDays } from '@/lib/agronomy/dates'
import { currentAppUser } from '@/lib/auth/session'
import { loadDashboard } from '@/lib/dashboard/load'
import { loadPlots } from '@/lib/plots/load'
import { loadSeasonInputs, seasonRequirementLines } from '@/lib/rdkk/load'

export const metadata = { title: 'Dashboard' }

// The projection is a live read of every block; nothing here may be cached
// into next season.
export const dynamic = 'force-dynamic'

const SEASON_LABEL = 'musim ini'

export default async function DashboardPage() {
  const user = await currentAppUser()
  if (!user || user.role === 'buyer') redirect('/login')
  if (!user.cooperative_id) redirect('/login')

  const now = new Date()

  // GET /api/dashboard is one projection covering the 12-week chart, the
  // collision detector's flagged weeks and lead pile-up, its staggering
  // suggestions, the coming week's harvests, and the four impact figures --
  // all pre-computed, so this page is a mapping from that response into the
  // view, not a re-computation of any of it.
  const [dashboard, plots, rdkk] = await Promise.all([
    loadDashboard(),
    loadPlots(),
    loadSeasonInputs({ label: SEASON_LABEL, start: addDays(now, -365), end: now }),
  ])

  return (
    <DashboardView
      dashboard={dashboard}
      plotCount={plots.length}
      rdkkTotals={seasonRequirementLines(rdkk)}
      commoditiesWithoutRates={rdkk.commoditiesWithoutRates}
      seasonLabel={SEASON_LABEL}
    />
  )
}
