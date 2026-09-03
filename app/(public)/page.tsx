import {
  ArrowRight,
  BarChart3,
  CalendarRange,
  CheckCircle2Icon,
  ChevronRight,
  Compass,
  Layers,
  MapPin,
  Scale,
  ShieldCheck,
  Sparkles,
  Sprout,
  Store,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'

import { AuthMenu } from '@/components/auth/AuthMenu'
import { Archipelago } from '@/components/landing/Archipelago'
import { AtlasInteractiveSteps } from '@/components/landing/AtlasInteractiveSteps'
import { ClosingCtaPoster } from '@/components/landing/ClosingCtaPoster'
import { CountUp } from '@/components/landing/CountUp'
import { InteractiveDerivedCards } from '@/components/landing/InteractiveDerivedCards'
import { Reveal } from '@/components/landing/Reveal'
import { SupplyRuler } from '@/components/landing/SupplyRuler'
import { WindowDiagram } from '@/components/landing/WindowDiagram'
import { Logo } from '@/components/ui/Logo'
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
      <section className="hero-stage flex min-h-[82vh] sm:min-h-[86vh] flex-col pt-[var(--public-header)]">
        <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-5 pt-6 sm:px-8 lg:px-10">

          {/* The poster. Three rows: the first word, the reading it produces,
              the second word — with the archipelago spanning all three behind
              them. */}
          <div className="relative grid flex-1 grid-rows-[auto_1fr_auto] gap-y-6 pt-6 sm:pt-8 lg:pt-10 pb-20 sm:pb-24 lg:pb-28">
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
              <span className="hero-line relative z-10 row-start-3 justify-self-end self-start mb-6 lg:mb-8">
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

      {/* ─── THE PANEL STRADDLING THE HERO BOTTOM EDGE ───────────────────── */}
      <section className="relative z-20 -mt-16 sm:-mt-20 lg:-mt-24">
        <div className="mx-auto w-full max-w-[86rem] px-5 sm:px-8 lg:px-10">
          <Reveal variant="fade" className="relative">
            <Link
              href="/atlas"
              className="pill pill-solid interactive lift absolute -top-6 left-1/2 z-10 -translate-x-1/2 px-8 py-3 text-[0.6875rem] font-bold uppercase tracking-[0.14em]"
            >
              Buka Atlas Pasokan
            </Link>

            <div className="grid overflow-hidden rounded-[1.75rem] bg-white shadow-[0_4px_24px_rgb(7_49_36/0.08),0_24px_48px_rgb(7_49_36/0.16)] lg:grid-cols-12">
              {/* What a kader actually fills in. */}
              <div className="flex flex-col justify-between gap-3 border-b border-border p-5 sm:p-6 lg:col-span-4 lg:border-b-0 lg:border-r">
                <div>
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-xs uppercase tracking-wider text-[var(--terrion-green-700)]">
                      Input Kader Tani
                    </p>
                    <span className="badge-tag text-[0.625rem] py-0.5">±40 Detik</span>
                  </div>
                  <dl className="mt-3 space-y-0">
                    {BLOCK_RECORD.map(([field, value]) => (
                      <div
                        key={field}
                        className="flex items-center justify-between border-b border-border/40 py-1.5 text-xs last:border-0"
                      >
                        <dt className="text-muted-foreground">{field}</dt>
                        <dd className="font-semibold text-foreground">
                          {value}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
                <Link
                  href="/login"
                  className="cta-rule interactive self-start font-bold text-xs text-[var(--terrion-green-700)]"
                >
                  Catat blok pertama
                </Link>
              </div>

              {/* The claim, centred */}
              <div className="flex flex-col items-center justify-center gap-3 px-6 py-6 text-center sm:px-8 sm:py-7 lg:col-span-5">
                <p className="max-w-[24ch] text-[clamp(1.2rem,1.8vw,1.5rem)] font-extrabold leading-[1.25] tracking-tight text-[var(--terrion-green-700)]">
                  Pasokan pangan yang terbaca{' '}
                  <span className="band-underline">sebelum ia dipanen</span>.
                </p>
                <p className="max-w-[38ch] text-[0.78125rem] leading-relaxed text-muted-foreground">
                  Koperasi mencatat lahan, pembeli melihat ketersediaan pasokan
                  secara transparan — tanpa spekulasi, tanpa perantara.
                </p>
                <Link
                  href="/catalog"
                  className="cta-rule interactive group font-bold text-xs text-[var(--terrion-green-700)]"
                >
                  Lihat katalog pasokan
                  <ArrowRight
                    aria-hidden
                    className="size-3.5 transition-transform group-hover:translate-x-1"
                  />
                </Link>
              </div>

              {/* What it adds up to */}
              <div className="flex flex-col justify-center gap-2.5 bg-[var(--terrion-green-700)] p-5 text-center sm:p-6 lg:col-span-3">
                {cooperatives && cooperatives.length > 0 ? (
                  <>
                    <p className="font-mono text-[clamp(2rem,3.2vw,2.5rem)] font-bold leading-none tracking-tight text-white">
                      <CountUp value={hectares} />
                      <span className="ml-1 font-sans text-[0.875rem] font-normal text-white/60">
                        ha
                      </span>
                    </p>
                    <p className="text-[0.75rem] leading-relaxed text-white/80">
                      terpetakan di {plots} blok lahan, {provinces.size}{' '}
                      provinsi, oleh {cooperatives.length} koperasi.
                    </p>
                    <ul className="mt-0.5 flex flex-wrap justify-center gap-1">
                      {cooperatives.slice(0, 2).map(c => (
                        <li
                          key={c.id}
                          className="rounded-full bg-white/12 px-2 py-0.5 text-[0.625rem] text-white/90"
                        >
                          {c.name}
                        </li>
                      ))}
                      {cooperatives.length > 2 && (
                        <li className="rounded-full bg-white/12 px-2 py-0.5 text-[0.625rem] text-white/90">
                          +{cooperatives.length - 2}
                        </li>
                      )}
                    </ul>
                  </>
                ) : (
                  <>
                    <p className="text-xs font-semibold leading-relaxed text-white">
                      Siap menerima koperasi tani pertama untuk wilayah Anda.
                    </p>
                    <Link
                      href="/login"
                      className="cta-rule interactive self-center text-xs text-white"
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

      {/* ─── SECTION 01: DASAR ALGORITMA ─────────────────────────────────── */}
      <section className="py-20 sm:py-24 border-b border-border/60 bg-white">
        <Container className="grid gap-x-12 gap-y-10 lg:grid-cols-12 items-center">
          <Reveal className="lg:col-span-6 space-y-4">
            <div className="flex items-center gap-2.5">
              <span className="badge-tag font-bold text-[var(--terrion-green-700)] bg-[var(--terrion-green-50)] border-[var(--terrion-green-200)]">
                01
              </span>
              <span className="h-px w-4 bg-border" />
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--terrion-green-700)]">
                Dasar Algoritma · Metode Agronomi Presisi
              </span>
            </div>

            <h2 className="text-[clamp(1.625rem,2.8vw,2.25rem)] leading-[1.25] font-extrabold tracking-tight text-[var(--terrion-green-700)]">
              Rentang panen berbasis suhu, bukan sekadar kalender.
            </h2>

            <p className="text-[0.9375rem] leading-[1.8] text-muted-foreground">
              Tanaman tidak tumbuh menurut tanggal di kalender, melainkan dari total energi panas yang diserapnya (Growing Degree-Days). Terrion menjumlahkan derajat suhu harian dari data cuaca riil stasiun setempat.
            </p>

            <p className="text-[0.9375rem] leading-[1.8] text-muted-foreground">
              Model kami mensimulasikan dua kondisi iklim (anomali hangat vs dingin pada ±1.28 SD) untuk menghasilkan selisih rentang tanggal panen dengan tingkat kepastian 80%.
            </p>

            <div className="mt-6 flex items-center gap-3.5 rounded-xl bg-[var(--terrion-green-50)] p-4 border border-[var(--terrion-green-200)]">
              <ShieldCheck className="size-5 shrink-0 text-[var(--terrion-green-700)]" />
              <p className="text-xs leading-relaxed text-[var(--terrion-green-900)] font-medium">
                Setiap laporan hasil panen aktual secara otomatis mengkalibrasi ulang presisi prediksi model untuk musim berikutnya.
              </p>
            </div>
          </Reveal>

          <Reveal delay={120} className="lg:col-span-6">
            <WindowDiagram />
          </Reveal>
        </Container>
      </section>

      {/* ─── SECTION 02: KELUARAN OTOMATIS ───────────────────────────────── */}
      <section className="py-20 sm:py-24 border-b border-border/60 bg-[var(--terrion-green-50)]/40">
        <Container className="space-y-8">
          <Reveal>
            <div className="flex items-center gap-2.5 mb-2.5">
              <span className="badge-tag font-bold text-[var(--terrion-green-700)] bg-[var(--terrion-green-50)] border-[var(--terrion-green-200)]">
                02
              </span>
              <span className="h-px w-4 bg-border" />
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--terrion-green-700)]">
                Keluaran Otomatis · Satu Input Empat Derivasi
              </span>
            </div>
            <h2 className="text-[clamp(1.625rem,2.8vw,2.25rem)] leading-[1.25] font-extrabold tracking-tight text-[var(--terrion-green-700)] max-w-3xl">
              Kader mencatat sekali. Empat analisis ini diturunkan otomatis.
            </h2>
          </Reveal>

          <Reveal delay={100}>
            <InteractiveDerivedCards />
          </Reveal>
        </Container>
      </section>

      {/* ─── SECTION 03: JANGKAUAN ATLAS ─────────────────────────────────── */}
      <section className="py-20 sm:py-24 border-b border-border/60 bg-white">
        <Container className="grid gap-x-12 gap-y-10 lg:grid-cols-12 items-start">
          <Reveal variant="left" className="lg:col-span-6 space-y-4">
            <div className="flex items-center gap-2.5">
              <span className="badge-tag font-bold text-[var(--terrion-green-700)] bg-[var(--terrion-green-50)] border-[var(--terrion-green-200)]">
                03
              </span>
              <span className="h-px w-4 bg-border" />
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--terrion-green-700)]">
                Jangkauan Atlas · Hierarki Spasial 4 Tingkat
              </span>
            </div>

            <h2 className="text-[clamp(1.625rem,2.8vw,2.25rem)] leading-[1.25] font-extrabold tracking-tight text-[var(--terrion-green-700)]">
              Turun dari peta nasional hingga satu bedeng lahan.
            </h2>

            <p className="text-[0.9375rem] leading-[1.8] text-muted-foreground mb-4">
              Atlas terbuka untuk publik tanpa perlu login. Hanya menampilkan provinsi yang memiliki koperasi terdaftar resmi — bukan klaim cakupan fiktif.
            </p>

            <AtlasInteractiveSteps />
          </Reveal>

          <Reveal variant="right" delay={120} className="lg:col-span-6">
            <div className="wash p-7 sm:p-8 shadow-sm border border-border">
              <div className="flex items-center justify-between border-b border-border/80 pb-4 mb-4">
                <span className="font-bold text-[var(--terrion-green-700)] text-sm">Peta Sebaran Koperasi</span>
                <span className="badge-tag">Data Spasial Real-Time</span>
              </div>

              <Archipelago
                provincesWithCooperatives={provinces}
                emphasis={1.8}
                animate
                className="h-56 w-full text-[var(--terrion-green-700)] sm:h-72"
              />

              <dl className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-[var(--terrion-green-200)] pt-5">
                <div className="flex items-center gap-2">
                  <span
                    aria-hidden
                    className="size-3 shrink-0 rounded-sm bg-[var(--terrion-green-700)]"
                  />
                  <dt className="text-xs font-medium text-foreground">Koperasi Terdaftar ({provinces.size} Prov)</dt>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    aria-hidden
                    className="size-3 shrink-0 rounded-sm border border-[var(--terrion-soil)] bg-transparent opacity-50"
                  />
                  <dt className="text-xs font-medium text-muted-foreground">Belum Ada</dt>
                </div>
              </dl>
            </div>
          </Reveal>
        </Container>
      </section>

      {/* ─── SECTION 04: LINI MASA PASOKAN ───────────────────────────────── */}
      <section className="py-20 sm:py-24 border-b border-border/60 bg-[var(--terrion-green-50)]/40">
        <Container className="grid gap-x-12 gap-y-10 lg:grid-cols-12 items-start">
          <Reveal className="lg:col-span-5 space-y-4">
            <div className="flex items-center gap-2.5">
              <span className="badge-tag font-bold text-[var(--terrion-green-700)] bg-[var(--terrion-green-50)] border-[var(--terrion-green-200)]">
                04
              </span>
              <span className="h-px w-4 bg-border" />
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--terrion-green-700)]">
                Lini Masa Pasokan
              </span>
            </div>

            <h2 className="text-[clamp(1.625rem,2.8vw,2.25rem)] leading-[1.25] font-extrabold tracking-tight text-[var(--terrion-green-700)]">
              Proyeksi pasokan panen 12 minggu ke depan.
            </h2>

            <p className="text-[0.9375rem] leading-[1.8] text-muted-foreground">
              Koperasi mencatat satu blok lahan di telepon genggam dalam 40 detik. Terrion menyajikan proyeksi agregat ketersediaan komoditas di tingkat nasional secara real-time.
            </p>

            <div className="mt-6 text-xs leading-relaxed text-muted-foreground bg-white p-4 rounded-xl border border-[var(--terrion-green-200)] shadow-2xs">
              <strong className="text-[var(--terrion-green-700)] block mb-1">PRINSIP AKURASI TRANSPARAN:</strong>
              Tidak ada klaim harga fiktif, tidak ada kontrak spekulatif. Semua angka murni berbasis data spasial riil dan akumulasi derajat suhu harian.
            </div>
          </Reveal>

          <Reveal delay={120} className="lg:col-span-7">
            <div className="panel p-5 sm:p-6 shadow-sm border border-border bg-white">
              <div className="flex items-center justify-between px-1 pb-3 mb-2 border-b border-border/60">
                <p className="font-bold text-[var(--terrion-green-700)] text-sm">Grafik Pasokan Nasional</p>
                <span className="badge-tag">{RULER_WEEKS} Minggu Kedepan</span>
              </div>
              <SupplyRuler
                listings={listings}
                className="[&>div]:rounded-xl [&>figcaption]:px-1"
              />
            </div>
          </Reveal>
        </Container>
      </section>

      {/* ─── SECTION 05: AKSES PEMBELI ───────────────────────────────────── */}
      <section className="py-20 sm:py-24 border-b border-border/60 bg-white">
        <Container className="grid gap-x-12 gap-y-10 lg:grid-cols-12 items-start">
          <Reveal className="lg:col-span-5 space-y-4">
            <div className="flex items-center gap-2.5">
              <span className="badge-tag font-bold text-[var(--terrion-green-700)] bg-[var(--terrion-green-50)] border-[var(--terrion-green-200)]">
                05
              </span>
              <span className="h-px w-4 bg-border" />
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--terrion-green-700)]">
                Akses Pembeli
              </span>
            </div>

            <h2 className="text-[clamp(1.625rem,2.8vw,2.25rem)] leading-[1.25] font-extrabold tracking-tight text-[var(--terrion-green-700)]">
              Pasokan yang dapat dipantau sebelum dipanen.
            </h2>

            <p className="text-[0.9375rem] leading-[1.8] text-muted-foreground">
              Pembeli, off-taker, dan industri pengolah hasil tani dapat melihat ketersediaan komoditas dan mengajukan permintaan pasokan secara langsung tanpa perantara.
            </p>

            <Link
              href="/catalog"
              className="pill pill-solid interactive lift group mt-4 font-semibold text-xs shadow-xs inline-flex"
            >
              Lihat Katalog Pasokan Publik
              <ArrowRight
                aria-hidden
                className="size-4 transition-transform group-hover:translate-x-1"
              />
            </Link>
          </Reveal>

          <div className="lg:col-span-7 space-y-4">
            <dl className="space-y-3">
              {FOR_BUYERS.map(([term, detail], i) => (
                <Reveal
                  key={term}
                  delay={80 + i * 80}
                  className="panel p-5 border border-border shadow-2xs"
                >
                  <dt className="text-[0.9375rem] font-bold text-foreground flex items-center gap-2.5">
                    <CheckCircle2Icon className="size-4 shrink-0 text-[var(--terrion-green-600)]" />
                    {term}
                  </dt>
                  <dd className="mt-2 text-[0.875rem] leading-[1.75] text-muted-foreground pl-6">
                    {detail}
                  </dd>
                </Reveal>
              ))}
            </dl>

            <Reveal delay={300}>
              <div className="rounded-xl bg-[var(--terrion-green-50)] p-5 border border-[var(--terrion-green-200)] text-xs leading-relaxed text-[var(--terrion-green-900)]">
                <span className="font-bold text-[var(--terrion-green-700)] uppercase block mb-1">
                  Jaminan Ketentuan & Keandalan Pasokan:
                </span>
                {LEGAL_FRAMING}
              </div>
            </Reveal>
          </div>
        </Container>
      </section>

      {/* ─── CLOSING CALL TO ACTION ─────────────────────────────────────── */}
      <section className="px-5 py-16 sm:px-8 sm:py-20 bg-white">
        <Reveal>
          <ClosingCtaPoster />
        </Reveal>
      </section>
    </div>
  )
}


