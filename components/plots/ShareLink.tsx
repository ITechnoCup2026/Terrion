'use client'

import { useState } from 'react'

import { buttonVariants } from '@/components/ui/button'

/**
 * Sharing for the public plot page.
 *
 * WhatsApp first, because that is how a link like this actually travels in
 * rural Indonesia -- not email, not a QR code on a poster. Copying is the
 * fallback for anyone opening this on a desktop where the wa.me handoff is
 * awkward.
 *
 * The URL is read from the browser rather than passed in, so the link shared
 * is exactly the one the reader is looking at.
 */
export function ShareLink({ title }: { title: string }) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // A denied clipboard permission is not worth an error state; the
      // WhatsApp button beside this still works.
      setCopied(false)
    }
  }

  const share = () => {
    const text = `${title}\n${window.location.href}`
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener')
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" onClick={share} className={buttonVariants()}>
        Bagikan lewat WhatsApp
      </button>
      <button type="button" onClick={copy} className={buttonVariants({ variant: 'outline' })}>
        {copied ? 'Tersalin' : 'Salin tautan'}
      </button>
    </div>
  )
}
