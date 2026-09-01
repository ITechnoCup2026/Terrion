/**
 * The Atlas is a full-screen, near-black map with floating chrome. The shared
 * <ListSkeleton> stands in for a document — a white column of cards — so using
 * it here flashed a light page before a dark one. This is the map's own ground
 * with the outline of where the chrome lands.
 */
export default function Loading() {
  return (
    <div
      aria-busy="true"
      className="relative h-dvh w-full overflow-hidden bg-[#0b1410]"
    >
      <span className="sr-only">Memuat peta…</span>
      <div className="absolute inset-0 animate-pulse bg-[radial-gradient(60rem_40rem_at_50%_45%,rgb(47_158_92/0.10),transparent_65%)]" />
      <div className="absolute top-4 left-1/2 hidden h-8 w-32 -translate-x-1/2 animate-pulse rounded-xl bg-white/10 md:block" />
      <div className="absolute right-4 bottom-4 flex gap-2">
        <div className="h-7 w-20 animate-pulse rounded-full bg-white/10" />
        <div className="h-7 w-36 animate-pulse rounded-full bg-white/10" />
      </div>
    </div>
  )
}
