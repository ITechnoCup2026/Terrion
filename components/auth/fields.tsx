'use client'

import { Eye, EyeOff, type LucideIcon } from 'lucide-react'
import { useState } from 'react'
import type { UseFormRegisterReturn } from 'react-hook-form'

/**
 * Icon-adorned inputs shared by the login and signup forms.
 *
 * Both forms used to inline the same border/focus classes on a bare
 * `<input>`. Pulled out once both grew an icon and the password field grew a
 * show/hide toggle -- copy-pasting that across two forms is how they drift.
 *
 * Sized and shaped to the landing page rather than to the app: a 0.75rem
 * radius against the panel's 1.25rem, and the focus state is the green ring
 * rather than a grey one, because under `.landing` every hairline on the
 * screen is already warmed towards the green and a slate focus ring is the
 * one object that would give away that this screen came from a UI kit.
 *
 * The label is a rail -- small, wide-tracked, quiet -- which is the same
 * device the landing page uses to name a section, and it lets the value
 * inside the field be the loudest thing in the row.
 */
const fieldShell =
  'interactive flex h-12 items-center gap-2.5 rounded-xl border border-input bg-card px-3.5 ' +
  'text-foreground shadow-2xs transition-colors focus-within:border-[var(--terrion-green-600)] ' +
  'focus-within:ring-2 focus-within:ring-[var(--terrion-green-600)]/15 hover:border-[var(--terrion-green-300)]'

const fieldShellInvalid =
  'interactive flex h-12 items-center gap-2.5 rounded-xl border border-destructive/50 bg-card px-3.5 ' +
  'text-foreground shadow-2xs transition-colors focus-within:border-destructive ' +
  'focus-within:ring-2 focus-within:ring-destructive/15'

const labelRow =
  'text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-[var(--terrion-green-700)]'

const inputBase =
  'h-full w-full bg-transparent text-[0.9375rem] font-normal outline-none placeholder:font-normal placeholder:text-muted-foreground/55'

type BaseProps = {
  icon: LucideIcon
  label: string
  error?: string
  hint?: string
}

export function AuthField({
  icon: Icon,
  label,
  error,
  hint,
  ...input
}: BaseProps &
  (React.InputHTMLAttributes<HTMLInputElement> | UseFormRegisterReturn)) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className={labelRow}>{label}</span>
      <span className={error ? fieldShellInvalid : fieldShell}>
        <Icon
          aria-hidden
          className="size-4 shrink-0 text-[var(--terrion-green-600)]/70"
        />
        <input
          {...(input as React.InputHTMLAttributes<HTMLInputElement>)}
          aria-invalid={error ? true : undefined}
          className={inputBase}
        />
      </span>
      {error ? (
        <span className="text-xs font-medium text-destructive">{error}</span>
      ) : hint ? (
        <span className="text-xs leading-relaxed text-muted-foreground">{hint}</span>
      ) : null}
    </label>
  )
}

export function AuthPasswordField({
  icon: Icon,
  label,
  error,
  ...input
}: BaseProps &
  (React.InputHTMLAttributes<HTMLInputElement> | UseFormRegisterReturn)) {
  const [visible, setVisible] = useState(false)

  return (
    <label className="flex flex-col gap-1.5">
      <span className={labelRow}>{label}</span>
      <span className={error ? fieldShellInvalid : fieldShell}>
        <Icon
          aria-hidden
          className="size-4 shrink-0 text-[var(--terrion-green-600)]/70"
        />
        <input
          {...(input as React.InputHTMLAttributes<HTMLInputElement>)}
          type={visible ? 'text' : 'password'}
          aria-invalid={error ? true : undefined}
          className={inputBase}
        />
        <button
          type="button"
          onClick={() => setVisible(v => !v)}
          aria-label={visible ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
          className="interactive shrink-0 rounded-md text-muted-foreground hover:text-[var(--terrion-green-700)]"
        >
          {visible ? <EyeOff aria-hidden className="size-4" /> : <Eye aria-hidden className="size-4" />}
        </button>
      </span>
      {error && <span className="text-xs font-medium text-destructive">{error}</span>}
    </label>
  )
}

/**
 * A live read on a new password, shown only while registering.
 *
 * The schema's own bar is eight characters -- this doesn't raise it, since
 * that would silently reject passwords the server accepts. It only tells a
 * buyer, before they submit, whether "8 characters" is also a *weak* choice,
 * which the schema's error message has no room to say.
 */
const strengthLevels = [
  { label: 'Sangat lemah', color: 'var(--destructive)' },
  { label: 'Lemah', color: 'var(--terrion-gold-600)' },
  { label: 'Cukup', color: 'var(--terrion-gold-500)' },
  { label: 'Kuat', color: 'var(--terrion-green-500)' },
  { label: 'Sangat kuat', color: 'var(--terrion-green-700)' },
] as const

function passwordScore(value: string): number {
  if (!value) return 0
  let score = 0
  if (value.length >= 8) score++
  if (value.length >= 12) score++
  if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score++
  if (/[0-9]/.test(value)) score++
  if (/[^a-zA-Z0-9]/.test(value)) score++
  return Math.min(score, strengthLevels.length)
}

export function PasswordStrength({ value }: { value: string }) {
  if (!value) return null

  const score = passwordScore(value)
  const level = strengthLevels[Math.max(score - 1, 0)]

  return (
    <div className="-mt-1 flex items-center gap-2.5" aria-live="polite">
      <div className="flex h-1 flex-1 gap-1 overflow-hidden rounded-full bg-[var(--terrion-green-100)]">
        {strengthLevels.map((_, i) => (
          <span
            key={i}
            className="h-full flex-1 rounded-full transition-colors duration-300"
            style={{ background: i < score ? level.color : undefined }}
          />
        ))}
      </div>
      <span className="font-mono text-[0.6875rem] tracking-[0.04em] text-muted-foreground">
        {level.label}
      </span>
    </div>
  )
}
