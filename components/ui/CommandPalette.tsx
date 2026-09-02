'use client'

import { Dialog } from '@base-ui/react/dialog'
import { CornerDownLeft, PackagePlus, Printer, Search } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'

import type { NavGroup, NavItem } from '@/lib/nav/items'
import { cn } from '@/lib/utils'

/**
 * Jump anywhere with the keyboard.
 *
 * Everything in it is a destination that already exists in <Sidebar>, plus the
 * two actions one level down that are worth reaching directly. It is
 * deliberately NOT a search over the cooperative's data: no endpoint searches
 * plots or members by name, and a box that looks like it searches your records
 * while only matching menu labels is worse than no box at all. The placeholder
 * says "halaman", and that is all it does.
 *
 * Ctrl/Cmd+K opens it. The shortcut is bound on the window rather than on the
 * trigger, so it works while focus is down in a table.
 */
type Command = NavItem & { group: string }

const EXTRA: readonly Command[] = [
  {
    href: '/plots/new',
    label: 'Daftarkan lahan',
    hint: 'Tambah lahan baru ke koperasi',
    icon: PackagePlus,
    group: 'Tindakan',
  },
  {
    href: '/purchases/rdkk',
    label: 'Ekspor RDKK',
    hint: 'Cetak formulir kebutuhan pupuk musim ini',
    icon: Printer,
    group: 'Tindakan',
  },
]

/** Case-insensitive, and matches the hint too, so "pupuk" finds Pembelian. */
function matches(command: Command, query: string): boolean {
  if (!query) return true
  const q = query.toLowerCase()
  return (
    command.label.toLowerCase().includes(q) ||
    command.hint.toLowerCase().includes(q) ||
    command.group.toLowerCase().includes(q)
  )
}

export function CommandPalette({
  groups,
  open,
  onOpenChange,
}: {
  groups: readonly NavGroup[]
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [cursor, setCursor] = useState(0)
  const listRef = useRef<HTMLUListElement>(null)

  const commands = useMemo<Command[]>(
    () => [
      ...groups.flatMap(g => g.items.map(item => ({ ...item, group: g.label }))),
      // An action is only offered to somebody whose rail contains the section
      // it belongs to; a kader with no /requests gets nothing under it either.
      ...EXTRA.filter(extra =>
        groups.some(g => g.items.some(i => extra.href.startsWith(`${i.href}/`)))),
    ],
    [groups],
  )

  const results = useMemo(() => commands.filter(c => matches(c, query)), [commands, query])

  // A cursor left past the end of a list that just shrank highlights nothing,
  // and Enter then does nothing, which reads as a broken palette.
  useEffect(() => { setCursor(0) }, [query])

  // Each opening starts clean: last time's query hides the destination
  // somebody just opened this to reach.
  useEffect(() => { if (open) setQuery('') }, [open])

  function go(command: Command | undefined) {
    if (!command) return
    onOpenChange(false)
    router.push(command.href)
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setCursor(c => (results.length ? (c + 1) % results.length : 0))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setCursor(c => (results.length ? (c - 1 + results.length) % results.length : 0))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      go(results[cursor])
    }
  }

  // Keep the highlighted row on screen as the cursor moves by keyboard.
  useEffect(() => {
    listRef.current
      ?.querySelector('[data-active="true"]')
      ?.scrollIntoView({ block: 'nearest' })
  }, [cursor])

  let lastGroup: string | null = null

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-foreground/20 transition-opacity duration-200 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
        <Dialog.Popup
          className={cn(
            'fixed top-[12vh] left-1/2 z-50 w-[min(34rem,calc(100vw-2rem))] -translate-x-1/2',
            'overflow-hidden rounded-xl border border-border bg-popover shadow-[var(--shadow-xl)]',
            'transition-[transform,opacity] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]',
            'data-[starting-style]:opacity-0 data-[ending-style]:opacity-0',
          )}
        >
          <Dialog.Title className="sr-only">Cari halaman</Dialog.Title>

          <div className="flex items-center gap-2.5 border-b border-border px-4">
            <Search aria-hidden className="size-4 shrink-0 text-muted-foreground" />
            <input
              autoFocus
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Cari halaman…"
              aria-label="Cari halaman"
              className="h-12 w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
            <kbd className="hidden rounded border border-border px-1.5 py-0.5 text-[0.65rem] text-muted-foreground sm:block">
              Esc
            </kbd>
          </div>

          {results.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              Tidak ada halaman yang cocok dengan &ldquo;{query}&rdquo;.
            </p>
          ) : (
            <ul ref={listRef} className="max-h-[min(24rem,60vh)] overflow-y-auto p-2">
              {results.map((command, index) => {
                const Icon = command.icon
                const header = command.group !== lastGroup ? command.group : null
                lastGroup = command.group
                const active = index === cursor
                return (
                  <li key={command.href}>
                    {header && (
                      <p className="px-2 pt-2 pb-1 text-[0.6875rem] text-[var(--terrion-ink-faint)]">
                        {header}
                      </p>
                    )}
                    <button
                      type="button"
                      data-active={active}
                      onMouseMove={() => setCursor(index)}
                      onClick={() => go(command)}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left',
                        active ? 'bg-muted' : 'bg-transparent',
                      )}
                    >
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                        <Icon aria-hidden className="size-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium text-foreground">{command.label}</span>
                        <span className="block truncate text-xs text-muted-foreground">{command.hint}</span>
                      </span>
                      {active && (
                        <CornerDownLeft aria-hidden className="size-3.5 shrink-0 text-muted-foreground" />
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

/** Binds Ctrl/Cmd+K on the window. The caller owns the open state. */
export function useCommandShortcut(onOpen: () => void) {
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        onOpen()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onOpen])
}
