'use client'

import { useState } from 'react'

import { buttonVariants } from '@/components/ui/button'
import {
  CARD_HEIGHT, CARD_WIDTH, drawHarvestCard, harvestCardContent,
  type HarvestCardFacts,
} from '@/lib/share/harvest-card'

/**
 * Everything but the URL, which only the browser knows.
 *
 * The page is server-rendered and has no reliable host to build a link from,
 * and the card must show the address a reader can actually type back in.
 */
type CardFacts = Omit<HarvestCardFacts, 'url'>

/**
 * Turns the plot into a picture and hands it to whatever the phone shares with.
 *
 * The link beside this is the right thing for someone who will open it. This is
 * for the group chat, where a forwarded image reads without a connection and
 * without anybody tapping through -- which is how a cooperative's news actually
 * moves.
 *
 * Rendered on demand rather than on mount. Most readers never press this, and a
 * 1080x1350 canvas rasterised on every garden page load would be paid for by
 * every one of them.
 */
export function HarvestCardButton({ facts }: { facts: CardFacts }) {
  const [state, setState] = useState<'idle' | 'working' | 'saved' | 'failed'>('idle')

  const make = async () => {
    setState('working')
    try {
      const blob = await renderCard(facts)
      if (!blob) { setState('failed'); return }

      const file = new File([blob], fileName(facts.plotName), { type: 'image/png' })

      // The share sheet is the whole point on a phone: it offers WhatsApp
      // directly. canShare must be asked about the FILE -- a browser can
      // support navigator.share for links and refuse it for attachments.
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: facts.plotName })
        setState('idle')
        return
      }

      download(blob, file.name)
      setState('saved')
      setTimeout(() => setState('idle'), 2500)
    } catch (error) {
      // Dismissing the share sheet rejects, and that is not a failure worth
      // showing anybody an error for.
      if (error instanceof DOMException && error.name === 'AbortError') {
        setState('idle')
        return
      }
      setState('failed')
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={make}
        disabled={state === 'working'}
        className={buttonVariants({ variant: 'outline' })}
      >
        {LABELS[state]}
      </button>
      {state === 'failed' && (
        <p className="mt-1.5 text-xs text-destructive">
          Kartu tidak bisa dibuat di peramban ini. Bagikan tautannya saja.
        </p>
      )}
    </div>
  )
}

const LABELS: Record<'idle' | 'working' | 'saved' | 'failed', string> = {
  idle: 'Kartu panen',
  working: 'Membuat…',
  saved: 'Tersimpan',
  failed: 'Kartu panen',
}

/** Paints the card offscreen and hands back a PNG. */
function renderCard(facts: CardFacts): Promise<Blob | null> {
  const canvas = document.createElement('canvas')
  canvas.width = CARD_WIDTH
  canvas.height = CARD_HEIGHT

  const ctx = canvas.getContext('2d')
  if (!ctx) return Promise.resolve(null)

  drawHarvestCard(ctx, harvestCardContent({ ...facts, url: shownUrl() }))
  return new Promise(resolve => canvas.toBlob(resolve, 'image/png'))
}

function download(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = name
  link.click()
  URL.revokeObjectURL(url)
}

/** The address as a reader would type it: no scheme, no query. */
function shownUrl(): string {
  return `${window.location.host}${window.location.pathname}`
}

/** A filename a farmer can find again in their gallery. */
function fileName(plotName: string): string {
  const slug = plotName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  return `terrion-${slug || 'kebun'}.png`
}
