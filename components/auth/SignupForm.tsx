'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useForm } from 'react-hook-form'

import { signUpBuyer } from '@/app/actions/signup'
import { Button } from '@/components/ui/button'
import { signupSchema, type SignupInput } from '@/lib/schemas/signup'

/**
 * The buyer registration form.
 *
 * Deliberately has no role picker and no cooperative picker. This form makes
 * one kind of account, and the Server Action hard-codes which -- a select box
 * here would imply the choice was the browser's to make.
 */
const field =
  'interactive h-11 rounded-lg border border-input bg-background px-3 text-base font-normal ' +
  'text-foreground hover:border-ring/40 focus:border-ring focus:outline-none'
const labelText = 'flex flex-col gap-1.5 text-sm font-medium text-foreground'
const errorText = 'text-xs text-destructive'

export function SignupForm() {
  const router = useRouter()
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [sentTo, setSentTo] = useState<string | null>(null)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      fullName: '', organisation: '', email: '', password: '', confirmPassword: '',
    },
  })

  const onSubmit = handleSubmit(async values => {
    setSubmitError(null)
    try {
      const result = await signUpBuyer(values)
      if (result.outcome === 'signed_in') {
        router.push('/catalog')
        router.refresh()
        return
      }
      // A failure the server could explain arrives as a value, because a
      // Server Action that throws reaches production as React error #441 --
      // which is what this form used to display to buyers.
      if (result.outcome === 'error') {
        setSubmitError(result.message)
        return
      }
      setSentTo(result.email)
    } catch {
      // Only the genuinely unexpected gets here now: a network drop, or a
      // throw the action did not anticipate. Its message would be redacted
      // anyway, so it is not worth showing.
      setSubmitError('Tidak bisa menghubungi server. Periksa koneksi Anda, lalu coba lagi.')
    }
  })

  // The same panel is shown for a new address and for one already registered,
  // so this form cannot be used to find out who has an account.
  if (sentTo) {
    return (
      <div className="rise mt-7 rounded-xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
        <p className="text-sm font-semibold text-foreground">Periksa email Anda</p>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Kami mengirim tautan konfirmasi ke <span className="text-foreground">{sentTo}</span>.
          Buka tautan itu untuk mengaktifkan akun, lalu masuk.
        </p>
      </div>
    )
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rise mt-7 flex flex-col gap-4 rounded-xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]"
      style={{ ['--rise-delay' as string]: '80ms' }}
    >
      <label className={labelText}>
        Nama lengkap
        <input {...register('fullName')} autoComplete="name"
          placeholder="Ibu Diana Prasetyo" className={`${field} placeholder:text-muted-foreground/60`} />
        {errors.fullName && <span className={errorText}>{errors.fullName.message}</span>}
      </label>

      <label className={labelText}>
        Nama organisasi
        <input {...register('organisation')} autoComplete="organization"
          placeholder="PT Pangan Nusantara" className={`${field} placeholder:text-muted-foreground/60`} />
        {errors.organisation
          ? <span className={errorText}>{errors.organisation.message}</span>
          : <span className="text-xs text-muted-foreground">
              Ditampilkan kepada koperasi saat Anda mengajukan permintaan.
            </span>}
      </label>

      <label className={labelText}>
        Email
        <input {...register('email')} type="email" autoComplete="email"
          placeholder="nama@perusahaan.co.id" className={`${field} placeholder:text-muted-foreground/60`} />
        {errors.email && <span className={errorText}>{errors.email.message}</span>}
      </label>

      <label className={labelText}>
        Kata sandi
        <input {...register('password')} type="password" autoComplete="new-password" className={field} />
        {errors.password && <span className={errorText}>{errors.password.message}</span>}
      </label>

      <label className={labelText}>
        Konfirmasi kata sandi
        <input {...register('confirmPassword')} type="password" autoComplete="new-password" className={field} />
        {errors.confirmPassword && <span className={errorText}>{errors.confirmPassword.message}</span>}
      </label>

      {submitError && (
        <p role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {submitError}
        </p>
      )}

      <Button type="submit" size="lg" disabled={isSubmitting} className="interactive mt-1">
        {isSubmitting ? 'Memproses…' : 'Daftar sebagai pembeli'}
      </Button>
    </form>
  )
}
