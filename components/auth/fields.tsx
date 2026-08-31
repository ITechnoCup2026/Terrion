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
 */
const fieldShell =
  'interactive flex h-11 items-center gap-2.5 rounded-lg border border-input bg-background px-3 ' +
  'text-foreground transition-colors focus-within:border-ring has-[input:focus]:border-ring ' +
  'hover:border-ring/40'

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
    <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
      {label}
      <span className={fieldShell}>
        <Icon aria-hidden className="size-4 shrink-0 text-muted-foreground" />
        <input
          {...(input as React.InputHTMLAttributes<HTMLInputElement>)}
          className="h-full w-full bg-transparent text-base font-normal outline-none placeholder:text-muted-foreground/60"
        />
      </span>
      {error ? (
        <span className="text-xs text-destructive">{error}</span>
      ) : hint ? (
        <span className="text-xs text-muted-foreground">{hint}</span>
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
    <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
      {label}
      <span className={fieldShell}>
        <Icon aria-hidden className="size-4 shrink-0 text-muted-foreground" />
        <input
          {...(input as React.InputHTMLAttributes<HTMLInputElement>)}
          type={visible ? 'text' : 'password'}
          className="h-full w-full bg-transparent text-base font-normal outline-none placeholder:text-muted-foreground/60"
        />
        <button
          type="button"
          onClick={() => setVisible(v => !v)}
          aria-label={visible ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
          className="interactive shrink-0 text-muted-foreground hover:text-foreground"
        >
          {visible ? <EyeOff aria-hidden className="size-4" /> : <Eye aria-hidden className="size-4" />}
        </button>
      </span>
      {error && <span className="text-xs text-destructive">{error}</span>}
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
    <div className="-mt-1 flex items-center gap-2" aria-live="polite">
      <div className="flex h-1 flex-1 gap-1 overflow-hidden rounded-full bg-muted">
        {strengthLevels.map((_, i) => (
          <span
            key={i}
            className="h-full flex-1 rounded-full transition-colors duration-300"
            style={{ background: i < score ? level.color : undefined }}
          />
        ))}
      </div>
      <span className="text-xs text-muted-foreground">{level.label}</span>
    </div>
  )
}
