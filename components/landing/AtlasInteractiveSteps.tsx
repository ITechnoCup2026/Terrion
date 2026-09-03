'use client'

import { useState } from 'react'
import { ArrowRight } from 'lucide-react'
import Link from 'next/link'

interface StepItem {
  step: string
  name: string
  desc: string
  detail: string
}

const DRILLDOWN: StepItem[] = [
  {
    step: '01',
    name: 'Provinsi',
    desc: 'Hanya menampilkan wilayah yang memiliki koperasi aktif terdaftar.',
    detail: 'Berdasarkan data spasial batas provinsi riil',
  },
  {
    step: '02',
    name: 'Koperasi',
    desc: 'Nama koperasi, domisili, serta total luas lahan anggotanya.',
    detail: 'Terverifikasi dengan status legal koperasi tani',
  },
  {
    step: '03',
    name: 'Kebun',
    desc: 'Satu hamparan kawasan bertani dengan blok-blok spesifik.',
    detail: 'Pemetaan petak lahan presisi tinggi',
  },
  {
    step: '04',
    name: 'Blok Lahan',
    desc: 'Varietas tanaman, tanggal tanam, dan rentang panen aktual.',
    detail: 'Perhitungan GDD & penyerapan energi matahari',
  },
]

export function AtlasInteractiveSteps() {
  const [activeStepIndex, setActiveStepIndex] = useState(0)
  const activeItem = DRILLDOWN[activeStepIndex]

  return (
    <div className="space-y-4">
      <div className="space-y-2.5">
        {DRILLDOWN.map((item, idx) => {
          const isActive = idx === activeStepIndex
          return (
            <button
              key={item.step}
              type="button"
              onClick={() => setActiveStepIndex(idx)}
              onMouseEnter={() => setActiveStepIndex(idx)}
              className={`group flex w-full items-start gap-3.5 rounded-xl p-3.5 text-left transition-all duration-200 outline-none cursor-pointer ${
                isActive
                  ? 'bg-[var(--terrion-green-50)] border-2 border-[var(--terrion-green-700)] shadow-2xs'
                  : 'bg-white border border-border/80 hover:border-[var(--terrion-green-300)]'
              }`}
            >
              <span
                className={`flex size-7 shrink-0 items-center justify-center rounded-lg font-mono text-xs font-bold transition-colors ${
                  isActive
                    ? 'bg-[var(--terrion-green-700)] text-white'
                    : 'bg-muted text-[var(--terrion-green-700)]'
                }`}
              >
                {item.step}
              </span>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4
                    className={`text-[0.9375rem] font-bold transition-colors ${
                      isActive ? 'text-[var(--terrion-green-700)]' : 'text-foreground'
                    }`}
                  >
                    {item.name}
                  </h4>
                </div>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                  {item.desc}
                </p>
              </div>
            </button>
          )
        })}
      </div>

      <div className="rounded-xl bg-[var(--terrion-green-50)]/70 p-3.5 border border-[var(--terrion-green-200)] text-xs text-[var(--terrion-green-900)] leading-relaxed font-mono">
        <strong className="text-[var(--terrion-green-700)] block mb-0.5">
          LEVEL {activeItem.step} ({activeItem.name.toUpperCase()}):
        </strong>
        {activeItem.detail}
      </div>

      <Link
        href="/atlas"
        className="pill pill-solid interactive lift group mt-2 font-semibold text-xs shadow-xs"
      >
        Jelajahi Peta Atlas
        <ArrowRight
          aria-hidden
          className="size-3.5 transition-transform group-hover:translate-x-1"
        />
      </Link>
    </div>
  )
}
