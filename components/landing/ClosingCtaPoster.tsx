'use client'

import { ArrowRight } from 'lucide-react'
import Link from 'next/link'

export function ClosingCtaPoster() {
  return (
    <div className="relative mx-auto max-w-[76rem] overflow-hidden rounded-[2.25rem] bg-[var(--terrion-green-700)] px-6 py-16 text-center shadow-xl sm:px-12 sm:py-20 text-white">
      {/* Background ambient lighting */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -right-24 size-96 rounded-full bg-white/5 blur-3xl"
      />

      <div className="relative z-10 flex flex-col items-center">
        {/* Eyebrow: Clean line eyebrow using standard font */}
        <div className="mb-4 flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--terrion-green-300)]">
          <span className="h-0.5 w-5 rounded-full bg-[var(--terrion-green-300)]" />
          Mulai Terhubung
        </div>

        {/* Main Headline */}
        <h2 className="mx-auto max-w-[24ch] text-[clamp(1.75rem,3.2vw,2.75rem)] leading-[1.15] font-extrabold tracking-tight text-white">
          Semuanya dimulai dari satu pencatatan tanggal tanam.
        </h2>

        {/* Body Text */}
        <p className="mx-auto mt-4 max-w-[46ch] text-[0.9375rem] sm:text-base leading-[1.8] text-white/80">
          Telusuri peta pasokan nasional hingga ke tingkat kebun, atau masuk sebagai pengurus koperasi untuk memetakan lahan anggota Anda.
        </p>

        {/* Action Buttons */}
        <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/atlas"
            className="pill interactive lift group border border-white bg-white text-[var(--terrion-green-700)] font-bold hover:bg-[var(--terrion-green-50)] text-xs uppercase tracking-wider px-7 py-3 shadow-md"
          >
            Buka Atlas Pasokan
            <ArrowRight
              aria-hidden
              className="size-3.5 transition-transform group-hover:translate-x-1"
            />
          </Link>
          <Link
            href="/login"
            className="pill interactive lift border border-white/30 text-white font-semibold hover:border-white/70 hover:bg-white/10 text-xs tracking-wider px-7 py-3"
          >
            Masuk Koperasi Tani
          </Link>
        </div>
      </div>
    </div>
  )
}
