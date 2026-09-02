import { redirect } from 'next/navigation'

export const metadata = { title: 'Daftarkan lahan' }

export default function NewPlotPage() {
  redirect('/plots?new=1')
}
