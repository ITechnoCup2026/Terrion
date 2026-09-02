'use client'

import { CheckCircle2, ChevronUp, Plus, Sprout, X } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

import { PlotForm } from '@/components/plots/PlotForm'
import { PlotBrowser } from '@/components/plots/PlotBrowser'
import type { CommodityRef } from '@/components/plots/PlotCard'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/ui/Page'
import type { PlotSummary } from '@/lib/plots/summary'

type Commodity = { id: string; name: string }
type Variety = { id: string; commodity_id: string; name: string }

type Props = {
  plots: PlotSummary[]
  commodities: CommodityRef[]
  formData: {
    commodities: Commodity[]
    varieties: Variety[]
    origin: { lat: number; lng: number }
    seasonShortcuts: { label: string; date: string }[]
  }
}

export function PlotsView({ plots, commodities, formData }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const formRef = useRef<HTMLDivElement>(null)

  const isNewParam = searchParams.get('new') === '1' || searchParams.get('action') === 'new'
  const [formOpen, setFormOpen] = useState(isNewParam)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  useEffect(() => {
    if (isNewParam) {
      setFormOpen(true)
      formRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [isNewParam])

  const toggleForm = () => {
    setFormOpen(prev => {
      const next = !prev
      if (next) {
        setTimeout(() => {
          formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
        }, 100)
      }
      return next
    })
  }

  const handleSuccess = (_plotId: string, plotName: string) => {
    setSuccessMessage(`Lahan "${plotName || 'baru'}" berhasil didaftarkan!`)
    router.refresh()
    setTimeout(() => {
      setSuccessMessage(null)
      setFormOpen(false)
    }, 1200)
  }

  return (
    <>
      <PageHeader
        title="Lahan"
        description="Setiap lahan koperasi ini, dengan perkiraan panen terdekatnya."
        actions={
          <Button
            onClick={toggleForm}
            variant={formOpen ? 'outline' : 'default'}
            className="interactive transition-all"
          >
            {formOpen ? (
              <>
                <ChevronUp className="mr-1.5 size-4" />
                Tutup Form
              </>
            ) : (
              <>
                <Plus className="mr-1.5 size-4" />
                Daftarkan Lahan
              </>
            )}
          </Button>
        }
      />

      {/* Expandable Dropdown Form Card */}
      {formOpen && (
        <div
          ref={formRef}
          className="rise overflow-hidden rounded-lg border border-border bg-card p-5 sm:p-6"
        >
          <div className="mb-5 flex items-center justify-between border-b border-border pb-3.5">
            <div className="flex items-center gap-2.5">
              <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                <Sprout className="size-5" />
              </div>
              <div>
                <h2 className="text-base font-semibold tracking-tight text-foreground">
                  Form Pendaftaran Lahan
                </h2>
                <p className="text-xs text-muted-foreground">
                  Isi data petani, komoditas, dan lokasi lahan tanpa perlu berpindah halaman.
                </p>
              </div>
            </div>

            <Button variant="ghost" size="sm" onClick={() => setFormOpen(false)} aria-label="Tutup form">
              <X className="size-4" />
            </Button>
          </div>

          {successMessage && (
            <div className="mb-5 flex items-center gap-2.5 rounded-xl border border-emerald-300 bg-emerald-50 p-3.5 text-sm font-medium text-emerald-900 shadow-sm dark:border-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-200">
              <CheckCircle2 className="size-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>{successMessage}</span>
            </div>
          )}

          <PlotForm
            commodities={formData.commodities}
            varieties={formData.varieties}
            previous={null}
            registered={plots.length}
            origin={formData.origin}
            seasonShortcuts={formData.seasonShortcuts}
            onSuccess={handleSuccess}
            onCancel={() => setFormOpen(false)}
          />
        </div>
      )}

      {/* Plot List / Browser */}
      <PlotBrowser
        plots={plots}
        commodities={commodities}
        onRegisterClick={() => setFormOpen(true)}
      />
    </>
  )
}
