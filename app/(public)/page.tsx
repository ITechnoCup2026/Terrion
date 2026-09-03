import {
  ArrowRight,
  CalendarRange,
  CheckCircle2Icon,
  Layers,
  ShieldCheck,
  Sprout,
  Store,
  type LucideIcon,
} from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'

import { Archipelago } from '@/components/landing/Archipelago'
import { CountUp } from '@/components/landing/CountUp'
import { Reveal } from '@/components/landing/Reveal'
import { SupplyRuler } from '@/components/landing/SupplyRuler'
import { WindowDiagram } from '@/components/landing/WindowDiagram'
import { isBackendDown } from '@/lib/api/client'
import { loadAtlasCooperativesIfUp } from '@/lib/atlas/load'
import { homeFor } from '@/lib/auth/display'
import { currentAppUser, type AppUser } from '@/lib/auth/session'
import { LEGAL_FRAMING } from '@/lib/catalog/copy'
import type { Listing } from '@/lib/catalog/listings'
import { loadCatalogListings } from '@/lib/catalog/load'
import { RULER_WEEKS } from '@/lib/supply/ruler'

// The counts are real cooperatives, so this cannot be baked at build time.
export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Terrion — Atlas Pasokan Pertanian Nasional',
  description:
    'Proyeksi panen berbasis GDD, agregasi kebutuhan pupuk RDKK, dan katalog pasokan untuk koperasi tani.',
}

/** The header's own bar. Only routes that exist — a nav is a promise. */
const NAV: [string, string][] = [
  ['/atlas', 'Atlas Pasokan'],
  ['/catalog', 'Katalog Pasokan'],
]

/**
 * Derived analysis outputs with custom visual micro-widget keys
 */
const DERIVED: {
  icon: LucideIcon
  key: string
  title: string
  body: string
  badgeText: string
  widgetType: 'timeline' | 'alert' | 'rdkk' | 'catalog'
}[] = [
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

/** The Atlas, as the four levels it actually descends through. */
const DRILLDOWN: { step: string; name: string; desc: string; detail: string }[] = [
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

const FOR_BUYERS: [string, string][] = [
  [
    'Katalog Terbuka & Real-time',
    'Proyeksi panen dari koperasi terdaftar dapat diakses publik tanpa hambatan registrasi awal.',
  ],
  [
    'Rentang Kepastian, Bukan Janji',
    'Setiap tonase dan estimasi tanggal disajikan sebagai rentang confidence interval beserta parameter dasar perhitungannya.',
  ],
  [
    'Pengajuan Langsung ke Koperasi',
    'Permintaan pembelian langsung terhubung ke koperasi bersangkutan tanpa perantara dan tanpa biaya tersembunyi.',
  ],
]

/** The three fields a kader actually fills in. */
const BLOCK_RECORD: [string, string][] = [
  ['Varietas', 'Ciherang'],
  ['Tanam', '12 Jul 2026'],
  ['Luas Lahan', '1,4 ha'],
]

function Rail({ index, label }: { index: string; label: string }) {
  return (
    <div className="rail flex items-center gap-2.5 lg:sticky lg:top-28">
      <span className="badge-tag font-semibold text-[var(--terrion-green-700)] bg-[var(--terrion-green-50)]">
        {index}
      </span>
      <span aria-hidden className="h-px w-5 bg-border" />
      <span className="font-semibold text-foreground tracking-wider">{label}</span>
    </div>
  )
}

function Container({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={`mx-auto w-full max-w-[76rem] px-5 sm:px-8 lg:px-10 ${className}`}
    >
      {children}
    </div>
  )
}

export default async function LandingPage() {
  let user: AppUser | null = null
  try {
    user = await currentAppUser()
  } catch (error) {
    if (!isBackendDown(error)) throw error
  }

  if (user) redirect(homeFor(user.role))

  const cooperatives = await loadAtlasCooperativesIfUp()

  let listings: Listing[] = []
  try {
    listings = (await loadCatalogListings()).listings
  } catch (error) {
    if (!isBackendDown(error)) throw error
  }

  const plots = cooperatives?.reduce((s, c) => s + c.plotCount, 0) ?? 0
  const hectares = cooperatives?.reduce((s, c) => s + c.hectares, 0) ?? 0
  const provinces = new Set((cooperatives ?? []).map(c => c.province.toLowerCase()))

  return (
    <div className="flex w-full flex-1 flex-col bg-background selection:bg-[var(--terrion-green-100)]">
      {/* ─── HERO POSTER STAGE ────────────────────────────────────────────── */}
      {/* One screen, edge to edge, composed as a poster: the two halves of the
          headline sit at opposite corners and the centrepiece runs between
          them, so the type and the picture occupy one space instead of two
          columns. The words are placed in their own GRID ROWS rather than
          absolutely, which is what keeps the overlap deliberate — the map can
          pass behind them at any width without a collision. */}
      <section className="hero-stage flex min-h-[100svh] flex-col">
        <div className="mx-auto flex w-full max-w-[86rem] flex-1 flex-col px-5 pt-5 sm:px-8 sm:pt-6 lg:px-10">
          {/* Header Navigation */}
          <nav
            aria-label="Navigasi utama"
            className="enter relative z-30 flex shrink-0 items-center justify-between gap-4"
          >
            <Link
              href="/"
              className="interactive flex items-center gap-2 text-[1.0625rem] font-extrabold uppercase tracking-[0.12em] text-white"
            >
              <span className="size-2.5 rounded-full bg-[var(--terrion-green-300)]" />
              Terrion
            </Link>

            <div className="hidden items-center gap-9 sm:flex">
              {NAV.map(([href, label]) => (
                <Link
                  key={href}
                  href={href}
                  className="interactive text-[0.875rem] font-medium text-white/75 transition-colors hover:text-white"
                >
                  {label}
                </Link>
              ))}
            </div>

            <Link
              href="/login"
              className="pill interactive lift bg-white px-6 py-2.5 text-[0.6875rem] font-bold uppercase tracking-[0.14em] text-[var(--terrion-green-700)] shadow-sm hover:bg-[var(--terrion-green-50)]"
            >
              Masuk Koperasi
            </Link>
          </nav>

          {/* The poster. Three rows: the first word, the reading it produces,
              the second word — with the archipelago spanning all three behind
              them. */}
          <div className="relative grid flex-1 grid-rows-[auto_1fr_auto] gap-y-8 pt-6 pb-28 sm:pb-32 lg:gap-y-4 lg:pt-2 lg:pb-40">
            {/* The centrepiece, behind the type and sized by its own width —
                it is a 4:1 drawing, so a height would only letterbox it. */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center"
            >
              <Reveal variant="fade" delay={380} className="w-full">
                <Archipelago
                  provincesWithCooperatives={provinces}
                  emphasis={3.0}
                  animate
                  className="h-auto w-full text-[var(--terrion-green-300)] opacity-80 drop-shadow-[0_24px_48px_rgb(7_49_36/0.5)]"
                />
              </Reveal>
            </div>

            {/* The headline is one sentence placed at two corners, so it has
                to be one <h1> whose halves are separate grid items —
                `display: contents` is what allows both without wrapping the
                picture in the heading. */}
            <h1 className="contents">
              <span className="hero-line relative z-10 row-start-1 justify-self-start">
                <span className="hero-word">PANEN</span>
              </span>
              <span className="hero-line relative z-10 row-start-3 justify-self-end">
                <span
                  className="hero-word text-white/85"
                  style={{ ['--enter-delay' as string]: '160ms' }}
                >
                  TERBACA
                </span>
              </span>
            </h1>

            {/* The reading the map produces, set as a labelled scale rather
                than a card: a bold line, a quiet line, and the range drawn on
                a hairline underneath. Nothing boxed — the stage is the box. */}
            <div
              className="enter relative z-10 row-start-2 max-w-sm self-center justify-self-start"
              style={{ ['--enter-delay' as string]: '640ms' }}
            >
              <p className="text-[0.9375rem] font-bold text-white">
                Rentang Panen Terbaca
              </p>
              <p className="mt-0.5 font-mono text-[0.75rem] text-white/60">
                8–21 Oktober · 80% confidence
              </p>
              <div
                aria-hidden
                className="range-band relative mt-4 h-px w-full bg-white/30"
              >
                <span className="absolute inset-y-0 left-[26%] right-[28%] bg-[var(--terrion-green-300)]" />
                <span className="hero-knob absolute -top-[0.4375rem] left-[26%]" />
                <span className="hero-knob absolute -top-[0.4375rem] left-[72%]" />
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ─── THE PANEL THAT OVERLAPS THE POSTER ───────────────────────────── */}
      {/* One white sheet riding up over the hero's bottom edge: what a kader
          puts in on the left, the claim in the middle, what it adds up to on
          the right. The call to action straddles the top edge, which is why
          the sheet's rounding lives on an inner element — the button must not
          be clipped by it. */}
      <section className="relative z-20 -mt-24 sm:-mt-28 lg:-mt-32">
        <div className="mx-auto w-full max-w-[86rem] px-5 sm:px-8 lg:px-10">
          <Reveal variant="fade" className="relative">
            <Link
              href="/atlas"
              className="pill pill-solid interactive lift absolute -top-6 left-1/2 z-10 -translate-x-1/2 px-8 py-3 text-[0.6875rem] font-bold uppercase tracking-[0.14em]"
            >
              Buka Atlas Pasokan
            </Link>

            <div className="grid overflow-hidden rounded-[2rem] bg-white shadow-[0_2px_8px_rgb(7_49_36/0.06),0_32px_64px_rgb(7_49_36/0.18)] lg:grid-cols-12">
              {/* What a kader actually fills in. */}
              <div className="flex flex-col justify-between gap-5 border-b border-border p-7 sm:p-8 lg:col-span-4 lg:border-b-0 lg:border-r">
                <div>
                  <div className="flex items-center justify-between">
                    <p className="rail font-bold text-[var(--terrion-green-700)]">
                      Input Kader Tani
                    </p>
                    <span className="badge-tag">±40 Detik</span>
                  </div>
                  <dl className="mt-5 space-y-0">
                    {BLOCK_RECORD.map(([field, value]) => (
                      <div
                        key={field}
                        className="flex items-center justify-between border-b border-border/50 py-2.5 text-[0.875rem] last:border-0"
                      >
                        <dt className="rail text-muted-foreground">{field}</dt>
                        <dd className="font-mono font-semibold text-foreground">
                          {value}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
                <Link
                  href="/login"
                  className="cta-rule interactive self-start font-semibold text-[var(--terrion-green-700)]"
                >
                  Catat blok pertama
                </Link>
              </div>

              {/* The claim, centred, in the display weight the reference
                  reserves for the one sentence a reader must leave with. */}
              <div className="flex flex-col items-center justify-center gap-5 px-7 py-12 text-center sm:px-10 lg:col-span-5">
                <p className="max-w-[22ch] text-[clamp(1.375rem,2.4vw,2rem)] font-extrabold leading-[1.25] tracking-tight text-[var(--terrion-green-700)]">
                  Pasokan pangan yang terbaca{' '}
                  <span className="band-underline">sebelum ia dipanen</span>.
                </p>
                <p className="max-w-[38ch] text-[0.8125rem] leading-relaxed text-muted-foreground">
                  Koperasi mencatat lahan, pembeli melihat ketersediaan pasokan
                  secara transparan — tanpa spekulasi, tanpa perantara.
                </p>
                <Link
                  href="/catalog"
                  className="cta-rule interactive group font-semibold text-[var(--terrion-green-700)]"
                >
                  Lihat katalog pasokan
                  <ArrowRight
                    aria-hidden
                    className="size-3.5 transition-transform group-hover:translate-x-1"
                  />
                </Link>
              </div>

              {/* What it adds up to. Flush to the sheet's right edge and dark,
                  so the one live figure on the page is the thing the eye
                  lands on last and remembers. */}
              <div className="flex flex-col justify-center gap-4 bg-[var(--terrion-green-700)] p-7 text-center sm:p-8 lg:col-span-3">
                {cooperatives && cooperatives.length > 0 ? (
                  <>
                    <p className="font-mono text-[clamp(2.5rem,4.5vw,3.5rem)] font-bold leading-none tracking-tight text-white">
                      <CountUp value={hectares} />
                      <span className="ml-1.5 font-sans text-[1rem] font-normal text-white/60">
                        ha
                      </span>
                    </p>
                    <p className="text-[0.8125rem] leading-relaxed text-white/75">
                      terpetakan di {plots} blok lahan, {provinces.size}{' '}
                      provinsi, oleh {cooperatives.length} koperasi tani.
                    </p>
                    <ul className="mt-1 flex flex-wrap justify-center gap-1.5">
                      {cooperatives.slice(0, 2).map(c => (
                        <li
                          key={c.id}
                          className="rounded-full bg-white/12 px-2.5 py-1 font-mono text-[0.6875rem] text-white/90"
                        >
                          {c.name}
                        </li>
                      ))}
                      {cooperatives.length > 2 && (
                        <li className="rounded-full bg-white/12 px-2.5 py-1 font-mono text-[0.6875rem] text-white/90">
                          +{cooperatives.length - 2}
                        </li>
                      )}
                    </ul>
                  </>
                ) : (
                  <>
                    <p className="text-[0.9375rem] font-semibold leading-relaxed text-white">
                      Siap menerima koperasi tani pertama untuk wilayah Anda.
                    </p>
                    <Link
                      href="/login"
                      className="cta-rule interactive self-center text-white"
                    >
                      Daftarkan koperasi
                    </Link>
                  </>
                )}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ─── SECTION 01: DASAR (MODEL GDD & WINDOW DIAGRAM) ─────────────── */}
      <section className="py-20 sm:py-24 border-b border-border/60">
        <Container className="grid gap-x-12 gap-y-10 lg:grid-cols-12 items-start">
          <div className="lg:col-span-3">
            <Rail index="01" label="Dasar Algoritma" />
          </div>

          <Reveal className="lg:col-span-5">
            <span className="chip mb-3">
              <span className="size-2 rounded-full bg-[var(--terrion-green-600)]" />
              Metode Agronomi Presisi
            </span>
            <h2 className="text-[clamp(1.5rem,2.5vw,2.125rem)] leading-[1.25] font-extrabold tracking-tight text-foreground">
              Rentang panen berbasis suhu, bukan sekadar kalender.
            </h2>
            <p className="mt-4 text-[0.9375rem] leading-[1.8] text-muted-foreground">
              Tanaman tidak tumbuh menurut tanggal di kalender, melainkan dari total energi panas yang diserapnya (Growing Degree-Days). Terrion menjumlahkan derajat suhu harian dari data cuaca riil.
            </p>
            <p className="mt-3.5 text-[0.9375rem] leading-[1.8] text-muted-foreground">
              Model kami mensimulasikan dua kondisi iklim (anomali hangat vs dingin pada ±1.28 SD) untuk menghasilkan selisih rentang tanggal panen dengan tingkat kepastian 80%.
            </p>

            <div className="mt-6 flex items-center gap-3 rounded-xl bg-[var(--terrion-green-50)] p-3.5 border border-[var(--terrion-green-200)]">
              <ShieldCheck className="size-5 shrink-0 text-[var(--terrion-green-700)]" />
              <p className="text-xs leading-relaxed text-[var(--terrion-green-900)] font-medium">
                Setiap laporan hasil panen aktual secara otomatis mengkalibrasi ulang presisi prediksi model untuk musim berikutnya.
              </p>
            </div>
          </Reveal>

          <Reveal delay={120} className="lg:col-span-4">
            <WindowDiagram />
          </Reveal>
        </Container>
      </section>

      {/* ─── SECTION 02: KELUARAN (4 DERIVATIVE OUTPUT CARDS) ─────────────── */}
      <section className="py-20 sm:py-24 border-b border-border/60 bg-[var(--terrion-green-50)]/30">
        <Container className="grid gap-x-12 gap-y-10 lg:grid-cols-12">
          <div className="lg:col-span-3">
            <Rail index="02" label="Keluaran Otomatis" />
          </div>

          <div className="lg:col-span-9">
            <Reveal>
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                  <span className="chip mb-2">
                    <span className="size-2 rounded-full bg-[var(--terrion-gold-500)]" />
                    Satu Input · Empat Derivasi
                  </span>
                  <h2 className="text-[clamp(1.5rem,2.5vw,2.125rem)] leading-[1.25] font-extrabold tracking-tight text-foreground">
                    Kader mencatat sekali. Empat analisis ini diturunkan otomatis.
                  </h2>
                </div>
              </div>
            </Reveal>

            <div className="mt-10 grid gap-5 sm:grid-cols-2">
              {DERIVED.map((d, i) => (
                <Reveal key={d.title} delay={100 + i * 70}>
                  <div className="panel panel-hover h-full p-6 sm:p-7 flex flex-col justify-between bg-white border border-border">
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <span className="flex size-11 items-center justify-center rounded-2xl bg-[var(--terrion-green-50)] text-[var(--terrion-green-700)] border border-[var(--terrion-green-200)]">
                          <d.icon className="size-5" />
                        </span>
                        <span className="badge-tag">{d.badgeText}</span>
                      </div>

                      <div className="flex items-baseline gap-2.5">
                        <span className="rail font-bold text-[var(--terrion-green-700)]">
                          {d.key}
                        </span>
                        <h3 className="text-base font-bold text-foreground">
                          {d.title}
                        </h3>
                      </div>
                      <p className="mt-2.5 text-[0.875rem] leading-[1.75] text-muted-foreground">
                        {d.body}
                      </p>
                    </div>

                    {/* Custom Micro-Widget Visuals */}
                    <div className="mt-5 pt-4 border-t border-border/60">
                      {d.widgetType === 'timeline' && (
                        <div className="rounded-lg bg-[var(--terrion-green-50)] p-3 border border-[var(--terrion-green-200)] flex items-center justify-between text-xs font-mono text-[var(--terrion-green-700)]">
                          <span>Tanam: 12 Jul</span>
                          <span className="h-px flex-1 bg-[var(--terrion-green-300)] mx-2" />
                          <span className="font-bold">Panen: 8-21 Okt</span>
                        </div>
                      )}
                      {d.widgetType === 'alert' && (
                        <div className="rounded-lg bg-amber-50 p-3 border border-amber-200 flex items-center justify-between text-xs font-mono text-amber-900">
                          <span className="flex items-center gap-1.5">
                            <span className="size-2 rounded-full bg-amber-500 animate-ping" />
                            Minggu 42 Overlap
                          </span>
                          <span className="font-semibold text-amber-700">Pergeseran H+4 Hari</span>
                        </div>
                      )}
                      {d.widgetType === 'rdkk' && (
                        <div className="rounded-lg bg-emerald-50/70 p-3 border border-emerald-200/80 flex items-center justify-between text-xs font-mono text-emerald-900">
                          <span>Urea: 280kg · NPK: 350kg</span>
                          <span className="badge-tag bg-emerald-100 text-emerald-800 text-[0.625rem]">Batas 2 Ha</span>
                        </div>
                      )}
                      {d.widgetType === 'catalog' && (
                        <div className="rounded-lg bg-blue-50/70 p-3 border border-blue-200/80 flex items-center justify-between text-xs font-mono text-blue-900">
                          <span>Katalog Publik Transparan</span>
                          <span className="font-bold text-blue-700">Langsung ke Koperasi →</span>
                        </div>
                      )}
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </Container>
      </section>

      {/* ─── SECTION 03: JANGKAUAN (ATLAS DRILLDOWN & MAP) ────────────────── */}
      <section className="py-20 sm:py-24 border-b border-border/60">
        <Container className="grid items-start gap-x-12 gap-y-12 lg:grid-cols-12">
          <div className="lg:col-span-3">
            <Rail index="03" label="Jangkauan Atlas" />
          </div>

          <Reveal variant="left" className="lg:col-span-4">
            <span className="chip mb-3">
              <span className="size-2 rounded-full bg-[var(--terrion-green-700)]" />
              Hierarki Spasial 4 Tingkat
            </span>
            <h2 className="text-[clamp(1.5rem,2.5vw,2.125rem)] leading-[1.25] font-extrabold tracking-tight text-foreground">
              Turun dari peta nasional hingga satu bedeng lahan.
            </h2>
            <p className="mt-4 text-[0.9375rem] leading-[1.8] text-muted-foreground">
              Atlas terbuka untuk publik tanpa perlu login. Hanya menampilkan provinsi yang memiliki koperasi terdaftar resmi — bukan klaim cakupan fiktif.
            </p>

            <ol className="mt-8 border-l-2 border-[var(--terrion-green-200)] pl-6 space-y-6">
              {DRILLDOWN.map(item => (
                <li key={item.step} className="relative">
                  <span
                    aria-hidden
                    className="absolute top-1 -left-[calc(1.5rem+5px)] size-2.5 rounded-full bg-[var(--terrion-green-700)] ring-4 ring-background"
                  />
                  <div className="flex items-center gap-2">
                    <span className="badge-tag">{item.step}</span>
                    <h4 className="text-[0.9375rem] font-bold text-foreground">
                      {item.name}
                    </h4>
                  </div>
                  <p className="mt-1 text-[0.875rem] leading-relaxed text-muted-foreground">
                    {item.desc}
                  </p>
                </li>
              ))}
            </ol>

            <Link
              href="/atlas"
              className="pill pill-quiet interactive lift group mt-8 font-semibold text-xs"
            >
              Jelajahi Peta Atlas
              <ArrowRight
                aria-hidden
                className="size-4 transition-transform group-hover:translate-x-1"
              />
            </Link>
          </Reveal>

          <Reveal variant="right" delay={120} className="lg:col-span-5">
            <div className="wash p-7 sm:p-9 shadow-sm border border-border">
              <div className="flex items-center justify-between border-b border-border/80 pb-4 mb-4">
                <span className="rail font-bold text-[var(--terrion-green-700)]">Peta Sebaran Koperasi</span>
                <span className="badge-tag">Real Geography Data</span>
              </div>
              <Archipelago
                provincesWithCooperatives={provinces}
                emphasis={1.8}
                animate
                className="h-52 w-full text-[var(--terrion-green-700)] sm:h-64"
              />
              <dl className="mt-8 flex flex-wrap gap-x-6 gap-y-3 border-t border-[var(--terrion-green-200)] pt-5">
                <div className="flex items-center gap-2">
                  <span
                    aria-hidden
                    className="size-3 shrink-0 rounded-sm bg-[var(--terrion-green-700)]"
                  />
                  <dt className="text-xs font-mono font-medium text-foreground">Koperasi Terdaftar</dt>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    aria-hidden
                    className="size-3 shrink-0 rounded-sm border border-[var(--terrion-soil)] bg-transparent opacity-50"
                  />
                  <dt className="text-xs font-mono font-medium text-muted-foreground">Belum Ada</dt>
                </div>
              </dl>
            </div>
          </Reveal>
        </Container>
      </section>

      {/* ─── SUPPLY RULER SHOWCASE SECTION ────────────────────────────────── */}
      <section className="py-20 sm:py-24 border-b border-border/60 bg-white">
        <Container className="grid items-start gap-x-12 gap-y-10 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <Reveal>
              <span className="chip mb-3">
                <span className="size-2 rounded-full bg-[var(--terrion-green-600)]" />
                Lini Masa Pasokan
              </span>
              <h2 className="text-[clamp(1.5rem,2.5vw,2.125rem)] leading-[1.25] font-extrabold tracking-tight text-foreground">
                Proyeksi pasokan panen 12 minggu ke depan.
              </h2>
              <p className="mt-4 text-base leading-[1.8] text-muted-foreground">
                Koperasi mencatat satu blok lahan di telepon genggam dalam 40 detik. Terrion menyajikan proyeksi agregat ketersediaan komoditas di tingkat nasional.
              </p>
              <div className="mt-6 border-t border-border pt-5 font-mono text-[0.75rem] leading-relaxed text-muted-foreground bg-[var(--terrion-green-50)] p-4 rounded-xl border border-[var(--terrion-green-200)]">
                <strong className="text-[var(--terrion-green-700)] block mb-1">PRINSIP AKURASI:</strong>
                Tidak ada klaim harga fiktif, tidak ada kontrak spekulatif. Semua angka murni berbasis data spasial dan suhu harian terakumulasi.
              </div>
            </Reveal>
          </div>

          <Reveal delay={120} className="lg:col-span-7">
            <div className="wash p-4 sm:p-6 shadow-sm border border-border">
              <div className="flex items-center justify-between px-1 pb-3">
                <p className="rail font-bold text-[var(--terrion-green-700)]">Grafik Pasokan Nasional</p>
                <span className="badge-tag">{RULER_WEEKS} Minggu Kedepan</span>
              </div>
              <SupplyRuler
                listings={listings}
                className="[&>div]:rounded-2xl [&>figcaption]:px-1"
              />
            </div>
          </Reveal>
        </Container>
      </section>

      {/* ─── SECTION 04: PEMBELI (BUYER ACCESS & LEGAL FRAMING) ───────────── */}
      <section className="py-20 sm:py-24 border-b border-border/60">
        <Container className="grid gap-x-12 gap-y-10 lg:grid-cols-12">
          <div className="lg:col-span-3">
            <Rail index="04" label="Akses Pembeli" />
          </div>

          <Reveal className="lg:col-span-4">
            <span className="chip mb-3">
              <span className="size-2 rounded-full bg-[var(--terrion-green-700)]" />
              Transparansi Pasar
            </span>
            <h2 className="text-[clamp(1.5rem,2.5vw,2.125rem)] leading-[1.25] font-extrabold tracking-tight text-foreground">
              Pasokan yang dapat dipantau sebelum dipanen.
            </h2>
            <p className="mt-4 text-[0.9375rem] leading-[1.8] text-muted-foreground">
              Pembeli, off-taker, dan industri pengolah hasil tani dapat melihat ketersediaan komoditas dan mengajukan permintaan pasokan secara langsung.
            </p>
            <Link
              href="/catalog"
              className="pill pill-solid interactive lift group mt-7 font-semibold text-xs"
            >
              Lihat Katalog Pasokan
              <ArrowRight
                aria-hidden
                className="size-4 transition-transform group-hover:translate-x-1"
              />
            </Link>
          </Reveal>

          <div className="lg:col-span-5">
            <dl className="space-y-4">
              {FOR_BUYERS.map(([term, detail], i) => (
                <Reveal
                  key={term}
                  delay={80 + i * 90}
                  className="panel p-5 border border-border shadow-xs"
                >
                  <dt className="text-[0.9375rem] font-bold text-foreground flex items-center gap-2">
                    <CheckCircle2Icon className="size-4 text-[var(--terrion-green-600)]" />
                    {term}
                  </dt>
                  <dd className="mt-2 text-[0.875rem] leading-[1.75] text-muted-foreground pl-6">
                    {detail}
                  </dd>
                </Reveal>
              ))}
            </dl>

            <Reveal delay={340}>
              <div className="mt-6 rounded-2xl bg-[var(--terrion-green-50)] p-5 border border-[var(--terrion-green-200)] font-mono text-[0.75rem] leading-relaxed text-[var(--terrion-green-900)]">
                <span className="font-bold text-[var(--terrion-green-700)] uppercase block mb-1">
                  Jaminan Ketentuan Pasokan:
                </span>
                {LEGAL_FRAMING}
              </div>
            </Reveal>
          </div>
        </Container>
      </section>

      {/* ─── CLOSING CALL TO ACTION ─────────────────────────────────────── */}
      <section className="px-5 py-16 sm:px-8 sm:py-20">
        <Reveal>
          <div className="relative mx-auto max-w-[76rem] overflow-hidden rounded-[2.25rem] bg-[var(--terrion-green-700)] px-6 py-16 text-center shadow-xl sm:px-12 sm:py-20">
            <div aria-hidden className="absolute -top-24 -right-24 size-96 rounded-full bg-white/5 blur-3xl pointer-events-none" />

            <span className="chip bg-white/15 text-white border-white/20 mb-4 inline-flex">
              <span className="size-2 rounded-full bg-[var(--terrion-green-300)]" />
              Mulai Sekarang
            </span>
            <h2 className="mx-auto mt-4 max-w-[22ch] text-[clamp(1.75rem,3.2vw,2.75rem)] leading-[1.15] font-extrabold tracking-tight text-white">
              Semuanya dimulai dari satu pencatatan tanggal tanam.
            </h2>
            <p className="mx-auto mt-4 max-w-[46ch] text-[0.9375rem] sm:text-base leading-[1.8] text-white/80">
              Telusuri peta pasokan hingga ke tingkat kebun, atau masuk sebagai pengurus koperasi untuk memetakan lahan anggota Anda.
            </p>

            <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/atlas"
                className="pill interactive lift border border-white bg-white text-[var(--terrion-green-700)] font-bold hover:bg-[var(--terrion-green-50)] text-xs uppercase tracking-wider"
              >
                Buka Atlas Pasokan
              </Link>
              <Link
                href="/login"
                className="pill interactive lift border border-white/30 text-white font-semibold hover:border-white/70 hover:bg-white/10 text-xs"
              >
                Masuk Koperasi Tani
              </Link>
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  )
}
