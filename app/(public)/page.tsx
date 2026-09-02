import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Archipelago } from "@/components/landing/Archipelago";
import { SupplyRuler } from "@/components/landing/SupplyRuler";
import { buttonVariants } from "@/components/ui/button";
import { isBackendDown } from "@/lib/api/client";
import { loadAtlasCooperativesIfUp } from "@/lib/atlas/load";
import { homeFor } from "@/lib/auth/display";
import { currentAppUser, type AppUser } from "@/lib/auth/session";
import type { Listing } from "@/lib/catalog/listings";
import { loadCatalogListings } from "@/lib/catalog/load";
import { formatNumberId } from "@/lib/format/number";
import { cn } from "@/lib/utils";

// The counts are real cooperatives, so this cannot be baked at build time.
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Terrion — atlas pasokan pertanian",
  description:
    "Proyeksi panen, agregasi kebutuhan pupuk dan katalog pasokan untuk koperasi tani.",
};

/**
 * The four things Terrion derives from one recorded planting.
 *
 * Not numbered. They are four parallel outputs of the same input, not four
 * steps of a process, and 01/02/03 down the side of a list that is not a
 * sequence tells the reader something untrue about how the product works.
 */
const DERIVED = [
  {
    title: "Perkiraan waktu panen",
    body: "Rentang tanggal per blok, dari akumulasi suhu dan cuaca yang benar-benar terjadi — bukan hitungan hari sejak tanam.",
  },
  {
    title: "Peringatan penumpukan",
    body: "Minggu ketika terlalu banyak lahan panen bersamaan, dengan saran pergeseran tanam yang bisa langsung diterapkan.",
  },
  {
    title: "Kebutuhan pupuk (RDKK)",
    body: "Agregasi per anggota, lengkap dengan acuan dosis resmi dan penanda batas subsidi dua hektare.",
  },
  {
    title: "Katalog pasokan",
    body: "Proyeksi panen koperasi tampil sebagai katalog yang bisa diajukan pembeli secara langsung.",
  },
];

const FOR_BUYERS: [string, string][] = [
  ["Katalog terbuka", "Proyeksi panen koperasi, tanpa perlu masuk lebih dulu."],
  [
    "Rentang, bukan janji",
    "Setiap tonase dan tanggal tampil sebagai rentang, dengan dasar perhitungannya.",
  ],
  [
    "Ajukan langsung",
    "Permintaan kontrak masuk ke koperasi yang bersangkutan, tanpa perantara.",
  ],
];

export default async function LandingPage() {
  let user: AppUser | null = null;
  try {
    user = await currentAppUser();
  } catch (error) {
    if (!isBackendDown(error)) throw error;
  }

  // Redirect signed-in users directly to their designated workspace/home
  if (user) {
    redirect(homeFor(user.role));
  }

  // null is "could not ask", which the page shows as nothing at all. An empty
  // array is the different, sayable claim that nobody has registered yet.
  const cooperatives = await loadAtlasCooperativesIfUp();

  // The hero draws real supply. If the catalogue cannot be reached the ruler
  // simply is not there and the headline stands on its own -- a landing page
  // that renders a fabricated chart when the backend is down is lying in the
  // one place the product's whole claim is honesty about uncertainty.
  let listings: Listing[] = [];
  try {
    listings = (await loadCatalogListings()).listings;
  } catch (error) {
    if (!isBackendDown(error)) throw error;
  }

  const plots = cooperatives?.reduce((s, c) => s + c.plotCount, 0) ?? 0;
  const hectares = cooperatives?.reduce((s, c) => s + c.hectares, 0) ?? 0;
  const provinces = new Set(
    (cooperatives ?? []).map((c) => c.province.toLowerCase()),
  );

  return (
    <div className="flex w-full flex-1 flex-col">
      {/* The hero is left-aligned against the ruler beneath it. Centred
          headline, centred paragraph, centred button pair is the shape every
          landing page arrives in; here the type and the chart share one left
          edge, so the page reads as an instrument panel rather than a poster. */}
      <section className="px-4 pt-14 pb-16 sm:pt-20 sm:pb-20">
        <div className="mx-auto w-full max-w-5xl">
          <div className="max-w-3xl">
            {cooperatives && (
              <p className="text-[0.8125rem] text-muted-foreground">
                {cooperatives.length === 0
                  ? "Belum ada koperasi terdaftar"
                  : `${formatNumberId(cooperatives.length)} koperasi terdaftar di ${formatNumberId(provinces.size)} provinsi`}
              </p>
            )}

            <h1 className="mt-4 max-w-[19ch] text-[length:var(--text-display-sm)] leading-[1.08] tracking-tight text-foreground sm:text-[length:var(--text-display)]">
              Satu tanggal tanam, seluruh gambaran pasokan.
            </h1>

            <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground">
              Koperasi mencatat lahan anggotanya sebagai diagram blok. Dari satu
              catatan itu Terrion menurunkan waktu panen, peringatan penumpukan,
              kebutuhan pupuk, dan katalog pasokan yang bisa dilihat pembeli.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/atlas"
                className={cn(buttonVariants({ size: "lg" }), "interactive")}
              >
                Buka Atlas
              </Link>
              <Link
                href="/catalog"
                className={cn(
                  buttonVariants({ variant: "outline", size: "lg" }),
                  "interactive",
                )}
              >
                Lihat katalog pasokan
              </Link>
            </div>
          </div>

          <SupplyRuler listings={listings} className="mt-12 sm:mt-14" />
        </div>
      </section>

      {cooperatives && (
        <section className="px-4">
          <dl className="mx-auto grid w-full max-w-5xl grid-cols-2 overflow-hidden rounded-lg border border-border bg-card shadow-[var(--shadow-xs)] sm:grid-cols-4">
            {[
              { label: "Koperasi", value: formatNumberId(cooperatives.length) },
              { label: "Provinsi", value: formatNumberId(provinces.size) },
              { label: "Lahan terpetakan", value: formatNumberId(plots) },
              { label: "Hektare", value: formatNumberId(hectares) },
            ].map((stat) => (
              <div
                key={stat.label}
                className={cn(
                  "p-4 sm:p-5",
                  "even:border-l even:border-border",
                  "[&:nth-child(n+3)]:border-t [&:nth-child(n+3)]:border-border",
                  "sm:[&:nth-child(n+2)]:border-l sm:[&:nth-child(n+3)]:border-t-0",
                )}
              >
                <dt className="text-xs text-muted-foreground">{stat.label}</dt>
                <dd className="mt-1.5 text-[1.75rem] leading-none font-semibold tracking-tight tabular-nums text-foreground">
                  {stat.value}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      <section className="px-4 py-20 sm:py-24">
        <div className="mx-auto w-full max-w-5xl">
          <div className="max-w-3xl">
            <h2 className="text-2xl leading-tight tracking-tight text-foreground sm:text-3xl">
              Kader mencatat sekali di lahan. Empat hal di bawah ini diturunkan
              dari catatan itu.
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Tanggal tanam, luas, varietas — sekitar 40 detik per blok, dari
              telepon genggam, di tempat.
            </p>
          </div>

          <dl className="mt-10 grid overflow-hidden rounded-lg border border-border bg-card shadow-[var(--shadow-xs)] sm:grid-cols-2">
            {DERIVED.map((d) => (
              <div
                key={d.title}
                className={cn(
                  "p-5 sm:p-6",
                  "[&:not(:first-child)]:border-t [&:not(:first-child)]:border-border",
                  "sm:[&:nth-child(n+3)]:border-t sm:[&:nth-child(2)]:border-t-0",
                  "sm:even:border-l sm:even:border-border",
                )}
              >
                <dt className="text-[0.9375rem] font-semibold text-foreground">
                  {d.title}
                </dt>
                <dd className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {d.body}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="border-y border-border bg-card px-4 py-20 sm:py-24">
        <div className="mx-auto grid w-full max-w-5xl items-center gap-12 lg:grid-cols-2">
          <div>
            <h2 className="max-w-md text-2xl leading-tight tracking-tight text-foreground sm:text-3xl">
              Pasokan yang bisa dilihat sebelum dipanen.
            </h2>

            <dl className="mt-8 flex flex-col gap-5">
              {FOR_BUYERS.map(([term, detail]) => (
                <div key={term}>
                  <dt className="text-sm font-semibold text-foreground">{term}</dt>
                  <dd className="mt-1 max-w-sm text-sm leading-relaxed text-muted-foreground">
                    {detail}
                  </dd>
                </div>
              ))}
            </dl>

            <Link
              href="/catalog"
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "interactive mt-8",
              )}
            >
              Lihat katalog pasokan
            </Link>
          </div>

          <div className="overflow-hidden rounded-lg border border-border">
            <Image
              src="/brand/field.jpg"
              alt=""
              width={1040}
              height={640}
              className="h-56 w-full object-cover sm:h-72"
            />
            <div className="border-t border-border bg-card p-6">
              <Archipelago
                provincesWithCooperatives={provinces}
                className="h-40 w-full"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-20 sm:py-24">
        <div className="mx-auto grid w-full max-w-5xl gap-4 md:grid-cols-3">
          <Tile
            href="/atlas"
            className="md:col-span-2"
            title="Atlas"
            body="Indonesia, digali sampai satu kebun. Provinsi, kabupaten, lalu lahan koperasi itu sendiri."
            action="Buka Atlas"
          />
          <Tile
            href="/catalog"
            title="Katalog pasokan"
            body="Apa yang akan panen, di mana, dan kapan."
            action="Lihat katalog"
          />
          <Tile
            href="/login"
            className="md:col-span-3"
            title="Dashboard koperasi"
            body="Peringatan penumpukan panen, proyeksi mingguan, dan ekspor RDKK."
            action="Masuk sebagai koperasi"
          />
        </div>
      </section>
    </div>
  );
}

/**
 * A destination.
 *
 * No lift, no shadow bloom, no arrow glyph tacked onto the label. The card
 * responds to a pointer by darkening its rule and underlining the thing you
 * would be clicking, which is the whole of what hover has to communicate.
 */
function Tile({
  href,
  title,
  body,
  action,
  className,
}: {
  href: string;
  title: string;
  body: string;
  action: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "interactive group flex min-h-40 flex-col justify-end rounded-lg border border-border bg-card p-5 shadow-[var(--shadow-xs)] hover:border-[var(--terrion-green-200)] hover:shadow-[var(--shadow-sm)]",
        className,
      )}
    >
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      <p className="mt-1.5 max-w-md text-sm leading-relaxed text-muted-foreground">
        {body}
      </p>
      <span className="mt-4 text-sm text-primary underline-offset-4 group-hover:underline">
        {action}
      </span>
    </Link>
  );
}
