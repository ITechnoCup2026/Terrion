'use client'

import { ChevronRight, Home } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const BREADCRUMB_MAP: Record<string, { group?: string; label: string }> = {
  '/dashboard': { group: 'Ringkasan', label: 'Dasbor' },
  '/plots': { group: 'Operasi', label: 'Lahan Koperasi' },
  '/requests': { group: 'Perdagangan', label: 'Pengajuan Hasil Panen' },
  '/purchases': { group: 'Perdagangan', label: 'Pembelian Kolektif' },
  '/catalog': { group: 'Publik', label: 'Katalog Hasil Panen' },
  '/garden': { group: 'Publik', label: 'Kebun Digital' },
  '/my-requests': { group: 'Publik', label: 'Pengajuan Saya' },
}

export function Breadcrumbs() {
  const pathname = usePathname()
  const info = BREADCRUMB_MAP[pathname] || { label: 'Halaman' }

  return (
    <nav aria-label="Breadcrumb" className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
      <Link href="/dashboard" className="interactive flex items-center gap-1 hover:text-foreground">
        <Home className="size-3.5" />
        <span className="sr-only">Beranda</span>
      </Link>
      {info.group && (
        <>
          <ChevronRight className="size-3 text-muted-foreground/40 shrink-0" />
          <span className="text-muted-foreground/70">{info.group}</span>
        </>
      )}
      <ChevronRight className="size-3 text-muted-foreground/40 shrink-0" />
      <span className="text-foreground font-semibold truncate max-w-[160px]">{info.label}</span>
    </nav>
  )
}
