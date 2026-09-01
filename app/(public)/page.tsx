import Image from "next/image";
import Link from "next/link";

import { Archipelago } from "@/components/landing/Archipelago";
import { buttonVariants } from "@/components/ui/button";
import { loadAtlasCooperativesIfUp } from "@/lib/atlas/load";
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
 * The landing page.
 *
 * The Atlas is NOT here any more. It was a map you could not drag, a third of
 * a window tall, wedged under a headline — too small to explore and too big to
 * be an illustration. It has its own full-screen page now, and this page's job
 * is to get you there.
 *
 * What stays is the one claim that is actually unusual: a cooperative enters a
 * planting date, and four separate things fall out of it. Everything below is
 * arranged around that sentence.
 *
 * Every number on this page is read from the database. There are no logos, no
 * testimonials and no rounded-up totals, because Terrion has none of those and
 * inventing them would put the only unmeasured thing on the page.
 *
 * That rule is also why the counts vanish rather than fall back to zero when
 * the backend cannot be reached: "0 koperasi" is a measurement, and a wrong
 * one. The rest of the page needs no data at all, so it still renders -- a
 * stranger who followed a link here should learn what Terrion is even during
 * an outage, which an error screen does not tell them.
 */

const DERIVED = [
  {
    metric: "L1 · L2",
    title: "Perkiraan waktu panen",
    body: "Rentang tanggal per blok, dari akumulasi suhu dan cuaca nyata — bukan hitungan hari sejak tanam.",
  },
  {
    metric: "L3",
    title: "Peringatan penumpukan",
    body: "Minggu ketika terlalu banyak lahan panen bersamaan, dengan saran pergeseran tanam yang konkret.",
  },
  {
    metric: "RDKK",
    title: "Kebutuhan pupuk",
    body: "Agregasi per anggota, lengkap dengan acuan dosis resmi dan penanda batas subsidi 2 ha.",
  },
  {
    metric: "Katalog",
    title: "Pasokan yang terlihat",
    body: "Proyeksi panen koperasi tampil sebagai katalog yang bisa diajukan pembeli langsung.",
  },
];

export default async function LandingPage() {
  // null is "could not ask", which the page shows as nothing at all. An empty
  // array is the different, sayable claim that nobody has registered yet.
  const cooperatives = await loadAtlasCooperativesIfUp();

  const plots = cooperatives?.reduce((s, c) => s + c.plotCount, 0) ?? 0;
  const hectares = cooperatives?.reduce((s, c) => s + c.hectares, 0) ?? 0;
  const provinces = new Set(
    (cooperatives ?? []).map((c) => c.province.toLowerCase()),
  );

  return (
    <div className="flex w-full flex-1 flex-col">
      {/* ---- the first screen ----
           Hero and counts together fill the viewport below the header, with
           the counts resting at its foot. `min-h`, never `h`: on a short
           laptop window the headline still needs room to be three lines, and
           a fixed height would crop it rather than push the page down.

           The subtraction is only right because the header pins itself to the
           same token -- see (public)/layout.tsx. */}
      <div className="flex min-h-[calc(100dvh-var(--public-header))] flex-col">

      {/* ---- hero ----
           Oversized centred type with the archipelago behind it. The map is
           the background, not a panel beside the words, which is what lets the
           headline be the size it wants to be. */}
      <section className="relative isolate flex flex-1 items-center overflow-hidden px-4 py-12 sm:py-16">
        <Archipelago
          provincesWithCooperatives={provinces}
          className="absolute inset-x-0 top-1/2 -z-10 h-[125%] w-full -translate-y-1/2"
        />
        {/* Clears a well behind the words so the type never competes with a
            coastline running through it -- but only behind the words. Pushed
            any wider and the archipelago disappears entirely, which is what
            happened at first: the picture was there and nobody could see it. */}
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_50%_42%_at_center,var(--background)_45%,transparent_100%)]"
        />

        <div className="mx-auto flex w-full max-w-4xl flex-col items-center gap-6 text-center">
          {/* The pulse says the projection is live, so the badge goes away
              entirely when nothing could be read -- a dot pulsing beside a
              number nobody could fetch is the one lie this page can tell. */}
          {cooperatives && (
            <p className="rise inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
              <span aria-hidden className="relative flex size-1.5">
                {/* A slow pulse: the projection is live, and one moving pixel
                    says so more cheaply than the word "live" would. */}
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-60" />
                <span className="relative inline-flex size-1.5 rounded-full bg-primary" />
              </span>
              {cooperatives.length === 0
                ? "Belum ada koperasi terdaftar"
                : `${formatNumberId(cooperatives.length)} koperasi · ${provinces.size} provinsi`}
            </p>
          )}

          <h1
            className="rise text-[length:var(--text-display-sm)] leading-[1.04] font-bold tracking-tight text-balance text-foreground sm:text-[length:var(--text-display)]"
            style={{ ["--rise-delay" as string]: "60ms" }}
          >
            Satu tanggal tanam,{" "}
            {/* nowrap holds the highlight together: it is one absolutely
                positioned bar under the span, and a span that wraps would
                stretch it across the gap. */}
            <span className="relative whitespace-nowrap">
              <span className="relative z-10">seluruh gambaran</span>
              <span
                aria-hidden
                className="absolute inset-x-0 bottom-1 -z-0 h-3 rounded-sm bg-accent/25 sm:bottom-2 sm:h-5"
              />
            </span>{" "}
            pasokan
          </h1>

          <p
            className="rise max-w-xl text-base leading-relaxed text-pretty text-muted-foreground"
            style={{ ["--rise-delay" as string]: "120ms" }}
          >
            Koperasi mencatat lahan anggotanya sebagai diagram lahan. Dari satu
            data itu Terrion menurunkan perkiraan waktu panen, peringatan
            penumpukan panen, agregasi kebutuhan pupuk, dan katalog pasokan yang
            bisa dilihat pembeli.
          </p>

          <div
            className="rise flex flex-wrap justify-center gap-3"
            style={{ ["--rise-delay" as string]: "180ms" }}
          >
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
      </section>

      {/* ---- counts ----
           Where the reference page puts a logo wall. Terrion has no customer
           logos, and inventing some would put the only unmeasured thing on the
           page. These are read from the database on every request.

           Deliberately the last thing on the first screen rather than the
           first thing on the second: four numbers at the foot of the fold are
           what say the page above them is describing something real. */}
      {cooperatives && (
      <section className="shrink-0 border-y border-border bg-secondary/40">
        <dl className="mx-auto grid w-full max-w-5xl grid-cols-2 divide-border px-4 py-6 sm:grid-cols-4 sm:divide-x">
          {[
            { label: "Koperasi", value: formatNumberId(cooperatives.length) },
            { label: "Provinsi", value: formatNumberId(provinces.size) },
            { label: "Lahan terpetakan", value: formatNumberId(plots) },
            { label: "Hektare", value: formatNumberId(hectares) },
          ].map((stat) => (
            <div key={stat.label} className="px-2 py-2 text-center">
              <dt className="text-xs text-muted-foreground">{stat.label}</dt>
              <dd className="mt-0.5 text-2xl font-semibold tabular-nums text-foreground">
                {stat.value}
              </dd>
            </div>
          ))}
        </dl>
      </section>
      )}

      </div>

      {/* ---- the derivation, as an inset band ---- */}
      <section className="px-4 py-16 sm:py-20">
        <div className="mx-auto w-full max-w-5xl overflow-hidden rounded-3xl bg-primary px-6 py-12 text-primary-foreground sm:px-12 sm:py-16">
          <h2 className="mx-auto max-w-2xl text-center text-2xl font-semibold text-balance sm:text-3xl">
            Kader mencatat sekali di lahan. Semuanya di bawah ini diturunkan.
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-sm text-primary-foreground/75">
            Tanggal tanam, luas, varietas — sekitar 40 detik per blok.
          </p>

          <ol className="mx-auto mt-10 flex max-w-2xl flex-col">
            {DERIVED.map((d, i) => (
              <li
                key={d.title}
                className="flex gap-5 border-t border-primary-foreground/15 py-5 first:border-t-0 first:pt-0"
              >
                <span className="mt-0.5 shrink-0 font-mono text-xs tracking-wider text-primary-foreground/60">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <p className="font-mono text-[0.7rem] tracking-wider text-primary-foreground/60">
                    {d.metric}
                  </p>
                  <h3 className="mt-1 text-base font-semibold">{d.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-primary-foreground/75">
                    {d.body}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ---- two alternating feature sections ---- */}
      <Feature
        eyebrow="Untuk koperasi"
        heading={["Lihat minggu padat", "sebelum minggu itu", "tiba"]}
        points={[
          [
            "Proyeksi 12 minggu",
            "Setiap blok yang berdiri, dijumlahkan per minggu.",
          ],
          ["Peringatan berdasar kapasitas", "Dibandingkan kapasitas koperasi."],
          [
            "Saran yang bisa diterapkan",
            "Geser n blok sebesar m hari, satu klik, tercatat.",
          ],
        ]}
        media={
          // Atmosphere, not evidence: cropped, tinted towards the palette and
          // carrying no numbers, so it cannot be mistaken for a screenshot of
          // real coverage.
          <div className="relative overflow-hidden rounded-2xl border border-border shadow-[var(--shadow-lg)]">
            <Image
              src="/brand/field.jpg"
              alt=""
              width={1040}
              height={640}
              className="h-64 w-full object-cover sm:h-80"
            />
            <div
              aria-hidden
              className="absolute inset-0 bg-gradient-to-t from-primary/25 via-transparent to-transparent"
            />
          </div>
        }
      />

      <Feature
        reversed
        eyebrow="Untuk pembeli"
        heading={["Pasokan yang bisa", "dilihat sebelum", "dipanen"]}
        points={[
          ["Katalog terbuka", "Proyeksi panen koperasi, tanpa perlu masuk."],
          [
            "Rentang, bukan janji",
            "Setiap tonase dan tanggal tampil sebagai rentang, dengan dasarnya.",
          ],
          [
            "Ajukan langsung",
            "Permintaan kontrak masuk ke koperasi yang bersangkutan.",
          ],
        ]}
        media={
          // The repo has exactly one photograph, and using it twice on one
          // page reads as a placeholder. This section gets the geography
          // instead -- which is also the more honest picture of "where the
          // supply is", since it is drawn from the cooperatives that exist.
          <div className="flex h-64 items-center justify-center overflow-hidden rounded-2xl border border-border bg-secondary/50 p-6 sm:h-80">
            <Archipelago
              provincesWithCooperatives={provinces}
              className="h-full w-full"
            />
          </div>
        }
      />

      {/* ---- bento ---- */}
      <section className="px-4 pb-20">
        {/* Two rows rather than one tall card and two short ones: with only
            three tiles, a double-height card is mostly empty space, which
            reads as unfinished rather than as emphasis. */}
        <div className="mx-auto grid w-full max-w-5xl gap-4 md:grid-cols-3">
          <Tile
            href="/atlas"
            className="md:col-span-2"
            title="Atlas"
            body="Indonesia, digali sampai satu kebun. Provinsi, kabupaten, lalu lahan koperasi itu sendiri. Geser dan zoom bebas."
            action="Buka Atlas"
            tall
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
            title="Dasbor koperasi"
            body="Peringatan penumpukan panen, proyeksi mingguan, dan ekspor RDKK."
            action="Masuk sebagai koperasi"
          />
        </div>
      </section>
    </div>
  );
}

/**
 * One alternating feature block: a three-line heading on one side, its three
 * captions beneath, and whatever the caller wants to show on the other.
 */
function Feature({
  eyebrow,
  heading,
  points,
  media,
  reversed = false,
}: {
  eyebrow: string;
  heading: string[];
  points: [string, string][];
  media: React.ReactNode;
  reversed?: boolean;
}) {
  return (
    <section className="px-4 py-12 sm:py-16">
      <div className="mx-auto grid w-full max-w-5xl items-center gap-10 lg:grid-cols-2">
        <div className={cn("flex flex-col gap-6", reversed && "lg:order-2")}>
          <div>
            <p className="font-mono text-xs tracking-wider text-primary">
              {eyebrow}
            </p>
            <h2 className="mt-3 text-3xl leading-[1.1] font-semibold tracking-tight text-foreground sm:text-4xl">
              {heading.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </h2>
          </div>

          <dl className="flex flex-col gap-4">
            {points.map(([term, detail]) => (
              <div key={term} className="border-l-2 border-primary/30 pl-4">
                <dt className="text-sm font-semibold text-foreground">
                  {term}
                </dt>
                <dd className="mt-0.5 text-sm leading-relaxed text-muted-foreground">
                  {detail}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <div className={cn(reversed && "lg:order-1")}>{media}</div>
      </div>
    </section>
  );
}

/**
 * One card in the closing grid.
 *
 * `action` names where the card actually goes. All three used to read "Buka"
 * with an arrow after it, which is three cards saying the same word: the
 * reader has to look back up at the title to find out what they open, and the
 * arrow is decoration standing in for the missing noun.
 */
function Tile({
  href,
  title,
  body,
  action,
  className,
  tall = false,
}: {
  href: string;
  title: string;
  body: string;
  action: string;
  className?: string;
  tall?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "interactive group flex flex-col justify-end rounded-2xl border border-border bg-card p-6",
        "shadow-[var(--shadow-xs)] transition-all hover:-translate-y-0.5 hover:border-input hover:shadow-[var(--shadow-md)]",
        tall ? "min-h-56" : "min-h-40",
        className,
      )}
    >
      <h3
        className={cn(
          "font-semibold text-foreground",
          tall ? "text-2xl" : "text-base",
        )}
      >
        {title}
      </h3>
      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
        {body}
      </p>
      <span className="mt-3 text-sm font-medium text-primary underline-offset-4 group-hover:underline">
        {action}
      </span>
    </Link>
  );
}
