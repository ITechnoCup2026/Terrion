'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { Building2, Lock, Mail, User } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useForm } from 'react-hook-form'

import { signUpBuyer } from '@/app/actions/signup'
import { AuthField, AuthPasswordField, PasswordStrength } from '@/components/auth/fields'
import { Button } from '@/components/ui/button'
import { signupSchema, type SignupInput } from '@/lib/schemas/signup'

/**
 * The buyer registration form.
 *
 * Deliberately has no role picker and no cooperative picker. This form makes
 * one kind of account, and the Server Action hard-codes which -- a select box
 * here would imply the choice was the browser's to make.
 */
export function SignupForm() {
  const router = useRouter()
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [sentTo, setSentTo] = useState<string | null>(null)

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      fullName: '', organisation: '', email: '', password: '', confirmPassword: '',
    },
  })
  const password = watch('password')

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
      <div className="rise mt-7 rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
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
      className="rise relative mt-7 flex flex-col gap-4 overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]"
      style={{ ['--rise-delay' as string]: '80ms' }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full"
        style={{ background: 'color-mix(in oklch, var(--terrion-gold-500), transparent 88%)' }}
      />

      <AuthField
        icon={User}
        label="Nama lengkap"
        {...register('fullName')}
        autoComplete="name"
        placeholder="Ibu Diana Prasetyo"
        error={errors.fullName?.message}
      />

      <AuthField
        icon={Building2}
        label="Nama organisasi"
        {...register('organisation')}
        autoComplete="organization"
        placeholder="PT Pangan Nusantara"
        error={errors.organisation?.message}
        hint={errors.organisation ? undefined : 'Ditampilkan kepada koperasi saat Anda mengajukan permintaan.'}
      />

      <AuthField
        icon={Mail}
        label="Email"
        {...register('email')}
        type="email"
        autoComplete="email"
        placeholder="nama@perusahaan.co.id"
        error={errors.email?.message}
      />

      <div className="flex flex-col gap-2">
        <AuthPasswordField
          icon={Lock}
          label="Kata sandi"
          {...register('password')}
          autoComplete="new-password"
          error={errors.password?.message}
        />
        <PasswordStrength value={password ?? ''} />
      </div>

      <AuthPasswordField
        icon={Lock}
        label="Konfirmasi kata sandi"
        {...register('confirmPassword')}
        autoComplete="new-password"
        error={errors.confirmPassword?.message}
      />

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
