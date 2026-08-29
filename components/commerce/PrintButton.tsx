'use client'

import { Button } from '@/components/ui/button'

/**
 * Hands the form to the browser's own print dialog.
 *
 * That dialog is also how it becomes a PDF — every browser can already save a
 * print to one — so the export needs no PDF library, no server-side renderer
 * and no font bundle. The page's print stylesheet is the whole export.
 */
export function PrintButton({ label }: { label: string }) {
  return (
    <Button type="button" onClick={() => window.print()}>
      {label}
    </Button>
  )
}
