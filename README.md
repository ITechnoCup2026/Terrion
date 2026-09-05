# Terrion_Frontend

Antarmuka **Terrion** — sistem pelacakan lahan dan perencanaan tanam untuk
koperasi tani Indonesia. Next.js 16, React 19, Tailwind v4.

| Repo | Isi |
| --- | --- |
| `Terrion_Frontend` | repo ini — antarmuka |
| [`Terrion_Backend`](https://github.com/ITechnoCup2026/Terrion_Backend) | API, basis data, model agronomi |
| `Terrion_AI` | layanan perencanaan Python, opsional |

---

## 1. Penjelasan aplikasi

Sebuah koperasi dengan puluhan lahan hampir selalu menanam pada waktu yang
berdekatan — hujan datang bersamaan, dan tetangga menanam bersamaan. Tiga bulan
kemudian seluruh lahan panen di minggu yang sama: gudang tidak muat, truk tidak
cukup, dan harga jatuh persis ketika semua orang punya paling banyak untuk
dijual.

Terrion melihat keempat puluh lahan itu sekaligus. Repo ini adalah layar yang
dipakai kader dan pengurus untuk melihatnya: lahan, proyeksi panen, penumpukan
yang akan datang, dan rencana tanam musim berikutnya.

Antarmuka ini **tidak menyentuh basis data**. Seluruh data datang dari
`Terrion_Backend` lewat HTTP, dan sesi pengguna disimpan di sana di balik cookie
`httpOnly` — tidak ada token Supabase yang pernah menyentuh JavaScript peramban.

---

## 2. Fitur utama

| Layar | Isinya |
| --- | --- |
| **Dashboard** | Proyeksi panen 12 minggu ke depan, dengan minggu yang melewati kapasitas ditandai dan blok penyumbangnya disebut |
| **Lahan** | Daftar lahan, kanvas petak per lahan, jendela panen tiap blok, dan panel harga acuan |
| **Rencana tanam** | Tiga rencana untuk musim depan, dibandingkan berdampingan: Aman, Pendapatan, dan Terikat pasar |
| **Pembelian** | RDKK — kebutuhan pupuk musim ini dan pesanan kelompok |
| **Permintaan** | Permintaan pasokan dari pembeli, untuk diterima atau ditolak pengurus |
| **Atlas & Katalog** | Peta koperasi dan pasokan seperti yang dilihat publik dan pembeli |

Tiga sikap yang membentuk hampir semua keputusan tampilan di sini:

**Rentang, bukan satu angka.** Jendela panen ditampilkan sebagai rentang dan
perkiraan hasil sebagai rentang, karena keduanya memang perkiraan. Model yang
belum melihat satu panen pun mengembalikan rentang selebar acuan varietasnya,
dan lebar itulah cara sistem mengaku belum tahu.

**Provenans ikut sampai ke layar.** Panel harga acuan membawa field `source`,
dan selama isinya `SINTETIS` layar mengatakannya di samping angkanya. Rupiah
yang belum bisa dianggarkan tidak boleh terlihat seperti rupiah yang bisa.

**Mesin mana yang menjawab disebutkan.** Kalau layanan AI mati, rencana tetap
tersusun oleh mesin di dalam Terrion sendiri, dan layar menyebut mesin
cadangan alih-alih diam-diam menampilkan hasil yang lebih lemah.

---

## 3. Teknologi yang digunakan

| Pustaka | Peruntukan | Kenapa ini |
| --- | --- | --- |
| `next` 16 | Kerangka React, App Router | Server Components membuat pemanggilan API dan penjagaan peran berjalan di server, sehingga kunci sesi tidak pernah masuk ke bundel peramban |
| `react` / `react-dom` 19 | Pustaka UI | Server Actions dipakai untuk setiap mutasi, jadi tidak ada rute API tiruan di sisi ini |
| `tailwindcss` v4 | Styling | Token desain sebagai variabel CSS; tidak ada stylesheet terpisah yang bisa menyimpang dari komponen |
| `@base-ui/react` | Primitif aksesibel | Dialog, popover, dan menu dengan fokus dan ARIA yang benar tanpa menulisnya sendiri |
| `shadcn` | Basis komponen | Komponen disalin ke dalam repo, bukan dipasang sebagai dependensi, sehingga bisa diubah tanpa melawan pustaka |
| `class-variance-authority`, `clsx`, `tailwind-merge` | Varian kelas | Satu tempat memutuskan konflik kelas Tailwind |
| `react-hook-form` + `@hookform/resolvers` + `zod` | Formulir dan validasi | Skema yang sama memvalidasi di peramban dan di Server Action |
| `lucide-react` | Ikon | — |
| `vitest` | Uji | 578 uji unit, berjalan tanpa peramban |
| `sharp`, `tsx` | Pipeline sprite | `scripts/build-sprites.ts` mengompilasi atlas ubin untuk kanvas lahan |

---

## 4. Cara instalasi

Prasyarat: Node.js 20+, pnpm, dan `Terrion_Backend` yang berjalan.

```bash
git clone https://github.com/ITechnoCup2026/Terrion_Frontend.git
cd Terrion_Frontend
pnpm install

echo "NEXT_PUBLIC_API_URL=http://localhost:8080" > .env.local
```

| Variabel | Guna |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | Alamat `Terrion_Backend`. Satu-satunya konfigurasi yang dibutuhkan |

---

## 5. Cara penggunaan

```bash
pnpm dev            # http://localhost:3000
pnpm build          # build produksi
pnpm start          # menjalankan hasil build
pnpm test           # 578 uji unit
pnpm lint
```

Alur yang paling menjelaskan produknya, dari layar ke layar:

1. Masuk sebagai pengurus, buka **Dashboard** — minggu yang menumpuk ditandai.
2. Buka **Rencana tanam**, pilih rentang musim, tekan *Susun rencana*.
3. Bandingkan ketiganya. Perhatikan bahwa masing-masing menjawab pertanyaan
   yang berbeda, dan bahwa layar menyebut mesin mana yang menyusunnya.
4. Terapkan satu rencana. Blok baru muncul di **Lahan**, dan **Dashboard**
   menunjukkan puncak panen yang lebih rata daripada sebelumnya.
5. Catat panen pada sebuah blok. Prediksi berikutnya untuk varietas itu
   bergeser — dan besarnya pergeseran sebanding dengan berapa banyak panen yang
   sudah tercatat.

---

## 6. Keamanan

**Tidak ada token yang bisa dibaca JavaScript.** Login menghasilkan sesi yang
disimpan `Terrion_Backend` di Redis, dan peramban hanya memegang cookie
`httpOnly` `SameSite=Lax` berisi pengenal sesinya. Token Supabase tidak pernah
menyeberang ke sisi ini.

**Panggilan API hanya terjadi di server.** `lib/api/client.ts` menerima
pengenal sesi sebagai argumen alih-alih membaca cookie sendiri, sehingga ia
tidak punya dependensi pada `next/headers` dan tidak bisa terbawa ke bundel
peramban.

**Penjagaan peran ada di dua tempat, dan hanya satu yang menentukan.** Setiap
halaman memeriksa peran untuk menghindari layar kosong, tetapi yang benar-benar
menegakkan batas adalah backend. Rail navigasi menyembunyikan tautan yang akan
ditolak, supaya ia tidak mengundang orang ke jalan buntu.

**Halaman publik tidak memuat koordinat.** Bukan karena disembunyikan di lapis
tampilan, melainkan karena view `public_plot` di basis data memang tidak punya
kolomnya.

---

## Struktur

```
app/
  (app)/      layar koperasi: dashboard, lahan, rencana, pembelian, permintaan
  (auth)/     masuk dan daftar
  (public)/   katalog dan permintaan pembeli
  atlas/      peta koperasi
  actions/    Server Action — satu berkas per mutasi
components/   komponen per domain, ditambah components/ui untuk primitifnya
lib/
  api/        satu-satunya tempat aplikasi ini berbicara HTTP
  agronomy/   tipe dan pembacaan jendela panen
  canvas/     renderer kanvas lahan
  planning/   tipe rencana tanam dan kosakata layarnya
  schemas/    skema zod, dipakai peramban dan Server Action
scripts/      pipeline sprite
```
