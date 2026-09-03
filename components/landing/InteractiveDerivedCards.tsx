'use client'

import {
  CalendarRange,
  ChevronRight,
  Layers,
  LucideIcon,
  Sprout,
  Store,
} from 'lucide-react'

interface DerivedItem {
  icon: LucideIcon
  key: string
  title: string
  body: string
  badgeText: string
  widgetType: 'timeline' | 'alert' | 'rdkk' | 'catalog'
}

const DERIVED: DerivedItem[] = [
  {
    icon: CalendarRange,
    key: 'A',
    title: 'Perkiraan Waktu Panen (GDD)',
    body: 'Rentang tanggal per blok, dari akumulasi suhu dan cuaca riil — bukan sekadar hitungan kalender konvensional.',
    badgeText: '8–21 Okt (80% Confidence)',
    widgetType: 'timeline',
  },
  {
    icon: Layers,
    key: 'B',
    title: 'Peringatan Penumpukan',
    body: 'Deteksi dini minggu ketika terlalu banyak lahan panen bersamaan, lengkap dengan rekomendasi pergeseran jadwal tanam.',
    badgeText: 'Minggu 42 · Risk Alert +45%',
    widgetType: 'alert',
  },
  {
    icon: Sprout,
    key: 'C',
    title: 'Kebutuhan Pupuk (RDKK)',
    body: 'Agregasi otomatis per anggota, lengkap dengan acuan dosis resmi pemerintah dan penanda batas subsidi 2 hektare.',
    badgeText: 'Max 2 Ha Subsidized',
    widgetType: 'rdkk',
  },
  {
    icon: Store,
    key: 'D',
    title: 'Katalog Pasokan Langsung',
    body: 'Proyeksi panen koperasi otomatis tampil sebagai katalog terbuka yang bisa diajukan pembeli secara langsung.',
    badgeText: 'Katalog Terbuka · Direct Order',
    widgetType: 'catalog',
  },
]

export function InteractiveDerivedCards() {
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      {DERIVED.map((d) => (
        <div
          key={d.title}
          className="panel panel-hover h-full p-6 sm:p-7 flex flex-col justify-between bg-white border border-border"
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="flex size-10 items-center justify-center rounded-xl bg-[var(--terrion-green-50)] text-[var(--terrion-green-700)] border border-[var(--terrion-green-200)]">
                <d.icon className="size-4.5" />
              </span>
              <span className="badge-tag">{d.badgeText}</span>
            </div>

            <div className="flex items-baseline gap-2.5">
              <span className="text-sm font-bold text-[var(--terrion-green-700)]">
                {d.key}.
              </span>
              <h3 className="text-base font-bold text-foreground">
                {d.title}
              </h3>
            </div>
            <p className="mt-2.5 text-[0.875rem] leading-[1.75] text-muted-foreground">
              {d.body}
            </p>
          </div>

          {/* Clean Visual Micro-Widgets */}
          <div className="mt-5 pt-4 border-t border-border/60">
            {d.widgetType === 'timeline' && (
              <div className="rounded-xl bg-[var(--terrion-green-50)]/70 p-3 border border-[var(--terrion-green-200)]/80 flex items-center justify-between text-xs text-[var(--terrion-green-900)]">
                <span className="font-medium">Tanam: 12 Jul</span>
                <span className="h-0.5 flex-1 bg-[var(--terrion-green-300)] mx-3 rounded-full" />
                <span className="font-bold text-[var(--terrion-green-700)]">Panen: 8–21 Okt</span>
              </div>
            )}
            {d.widgetType === 'alert' && (
              <div className="rounded-xl bg-amber-50/80 p-3 border border-amber-200/80 flex items-center justify-between text-xs text-amber-950">
                <span className="flex items-center gap-1.5 font-semibold text-amber-900">
                  <span className="size-2 rounded-full bg-amber-500" />
                  Minggu 42 Overlap
                </span>
                <span className="font-bold text-amber-800">Rekomendasi: H+4 Hari</span>
              </div>
            )}
            {d.widgetType === 'rdkk' && (
              <div className="rounded-xl bg-emerald-50/70 p-3 border border-emerald-200/80 flex items-center justify-between text-xs text-emerald-950">
                <span className="font-medium text-emerald-900">Subsidi: Urea 280kg · NPK 350kg</span>
                <span className="badge-tag bg-emerald-100 text-emerald-800 border-emerald-200 text-[0.625rem] font-bold">
                  Max 2 Ha
                </span>
              </div>
            )}
            {d.widgetType === 'catalog' && (
              <div className="rounded-xl bg-blue-50/70 p-3 border border-blue-200/80 flex items-center justify-between text-xs text-blue-950">
                <span className="font-medium text-blue-900">Katalog Publik Transparan</span>
                <span className="font-bold text-blue-700 flex items-center gap-1">
                  Direct Order <ChevronRight className="size-3.5" />
                </span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
