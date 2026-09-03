import { calibrationCrop, describeOffset, type Calibration } from '@/lib/calibration/model'
import { Card } from '@/components/ui/Card'
import { SectionHeading } from '@/components/ui/Page'

/**
 * What this cooperative's own harvests have taught the predictor.
 *
 * The one panel on the dashboard that is about the product rather than about
 * the crop: it says that the numbers everywhere else are not a fixed formula,
 * and that recording a harvest is what sharpens them.
 *
 * Renders nothing at all when no harvest has been recorded. An empty state here
 * would be a box saying the model has learned nothing, in the one place a
 * reader has come to see what it knows -- the honest move is to let the panel
 * appear the first time there is something true to put in it.
 */
export function CalibrationPanel({ calibrations }: { calibrations: Calibration[] }) {
  if (calibrations.length === 0) return null

  // Biggest correction first: the variety the base model was furthest out on is
  // the one worth reading about.
  const sorted = [...calibrations]
    .sort((a, b) => Math.abs(b.appliedOffsetDays) - Math.abs(a.appliedOffsetDays))

  return (
    <section className="flex flex-col gap-2">
      <SectionHeading>Model belajar dari panen koperasi ini</SectionHeading>

      <Card>
        <ul className="flex list-none flex-col gap-3">
          {sorted.map(calibration => (
            <li key={calibration.varietyId} className="flex flex-col gap-0.5">
              <span className="flex items-baseline justify-between gap-3">
                <span className="text-sm font-medium text-foreground">
                  {calibrationCrop(calibration)}
                </span>
                <span className="shrink-0 text-sm tabular-nums text-foreground">
                  {describeOffset(calibration.appliedOffsetDays)}
                </span>
              </span>
              <span className="text-xs text-muted-foreground">
                {calibration.nObservations} panen tercatat
                {/* The raw average is shown beside the applied figure whenever
                    they differ, because the gap between them is the whole
                    reason a small sample does not get to move a prediction as
                    far as a large one. */}
                {Math.abs(calibration.offsetDays - calibration.appliedOffsetDays) >= 0.5
                  && ` · rata-rata mentah ${describeOffset(calibration.offsetDays)}`}
              </span>
            </li>
          ))}
        </ul>
      </Card>

      <p className="text-xs leading-relaxed text-muted-foreground">
        Perkiraan panen mulai dari model dasar, lalu digeser oleh panen yang
        sudah dicatat di koperasi ini. Semakin banyak panen dicatat, semakin
        besar bobot pengalaman lahan sendiri dibanding model dasar.
      </p>
    </section>
  )
}
