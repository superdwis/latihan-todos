# Supabase Todo List App (Next.js 16)

Aplikasi Todo List modern dan responsif yang dibangun menggunakan **Next.js 16 (App Router)** dan **Supabase** dengan autentikasi Email & Password serta operasi CRUD lengkap dengan perlindungan Row Level Security (RLS).

---

## 🚀 Fitur Utama

- 🔐 **Autentikasi Fleksibel**:
  - **Google OAuth**: Masuk atau daftar cepat sekali klik dengan akun Google
  - **Email & Password**: Pendaftaran akun baru (`/signup`) & Masuk (`/login`)
  - Session cookies terintegrasi melalui proxy / middleware Next.js
  - Tombol Logout di dashboard
- 📝 **CRUD Todo List**:
  - **Create**: Tambah tugas baru dengan cepat (tekan Enter / klik Tambah)
  - **Read**: Tampilkan daftar tugas terurut dari yang terbaru
  - **Update**:
    - Checklist toggle selesai / belum selesai
    - Edit judul tugas secara inline (ikon pensil atau klik simpan/Enter)
  - **Delete**: Hapus tugas dengan konfirmasi dialog
- 🖼️ **Lampiran Gambar (Supabase Storage)**:
  - Lampirkan gambar ke todo (format PNG, JPG, WEBP, dll.)
  - Pratinjau thumbnail instan sebelum dan sesudah diunggah
  - Lightbox modal interaktif untuk melihat gambar dalam ukuran penuh
  - Disimpan langsung di Supabase Storage bucket `todo-images` dengan isolasi folder user
- 🌙 **Dukungan Dark Mode Penuh**:
  - Tombol toggle Sun / Moon dengan transisi halus
  - Deteksi otomatis preferensi sistem (`prefers-color-scheme`)
  - Tersimpan di `localStorage` tanpa efek flicker (FOUT) saat muat ulang
- 📱 **Progressive Web App (PWA)**:
  - Dapat diinstal di Desktop (Chrome, Edge) & Mobile (Android, iOS)
  - Banner instalasi otomatis / pintasan layar utama
  - Offline readiness dengan Service Worker (`public/sw.js`)
  - Web App Manifest standar (`app/manifest.ts`) dengan ikon 192px, 512px, dan maskable
- 📊 **Fitur Produktivitas**:
  - Progress bar interaktif & persentase penyelesaian
  - Tab Filter: *Semua*, *Aktif*, dan *Selesai*
  - Pencarian tugas secara real-time
- 🛡️ **Row Level Security (RLS)**: Setiap user hanya dapat melihat dan memodifikasi data todo miliknya sendiri.
- 💳 **Lynk.id Webhook**: Verifikasi signature transaksi, simpan order secara idempoten, dan lindungi tabel dengan RLS.

---

## ⚙️ Persiapan Database Supabase

Sebelum menjalankan aplikasi untuk pertama kali, pastikan tabel `todos` telah dibuat di Supabase:

1. Buka [Supabase Dashboard](https://supabase.com/dashboard) dan pilih proyek Anda (`fwufrgxurqaofyfmyxge`).
2. Masuk ke menu **SQL Editor** di panel sebelah kiri.
3. Buat query baru dan paste isi dari file `supabase/schema.sql` berikut:

```sql
-- 1. Buat tabel todos
CREATE TABLE IF NOT EXISTS public.todos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid() NOT NULL,
  title TEXT NOT NULL,
  is_complete BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Aktifkan Row Level Security (RLS)
ALTER TABLE public.todos ENABLE ROW LEVEL SECURITY;

-- 3. Kebijakan RLS
CREATE POLICY "Users can view their own todos"
  ON public.todos FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own todos"
  ON public.todos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own todos"
  ON public.todos FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own todos"
  ON public.todos FOR DELETE
  USING (auth.uid() = user_id);
```

4. Klik **Run**.

### Menyiapkan Lynk.id Webhook

1. Jalankan bagian `LYNK.ID WEBHOOK ORDERS` dari `supabase/schema.sql` di SQL Editor. Tabel `lynk_orders` tidak memiliki policy RLS; endpoint menggunakan service role key khusus server.
2. Daftarkan URL `https://domainkamu.com/api/webhooks/lynk` di dashboard Lynk.id. Setelah disimpan, salin merchant key ke `.env.local` bersama kredensial server berikut:

  ```env
  LYNK_MERCHANT_KEY=merchant_key_dari_dashboard
  NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
  SUPABASE_SERVICE_ROLE_KEY=service_role_key_dari_supabase
  ```

  Jangan gunakan awalan `NEXT_PUBLIC_` untuk service role key dan jangan commit key tersebut.
3. Saat pengembangan lokal, expose server melalui ngrok atau Cloudflare Tunnel lalu daftarkan URL publik dengan path `/api/webhooks/lynk`.

Endpoint memverifikasi `X-Lynk-Signature` dengan SHA-256 dari gabungan `grandTotal + refId + message_id + LYNK_MERCHANT_KEY`. Payload menerima field pada `data.message_data.refId`, `data.message_data.totals.grandTotal`, dan `data.message_id`, atau versi root `refId`, `grandTotal`, dan `message_id`. `message_id` unik membuat pengiriman ulang dibalas sukses tanpa menyimpan transaksi duplikat.

---

## 🔑 Konfigurasi Google Auth di Supabase Dashboard

Untuk mengaktifkan login Google:

1. Buka [Google Cloud Console](https://console.cloud.google.com/) > **APIs & Services** > **Credentials**.
2. Buat **OAuth 2.0 Client IDs** (Web application).
3. Tambahkan URL callback Supabase pada **Authorized redirect URIs**:
   ```
   https://fwufrgxurqaofyfmyxge.supabase.co/auth/v1/callback
   ```
4. Buka [Supabase Dashboard](https://supabase.com/dashboard) > Proyek Anda > **Authentication** > **Providers** > pilih **Google**.
5. Aktifkan Google Provider, lalu masukkan **Client ID** dan **Client Secret** yang diperoleh dari Google Cloud Console.
6. Simpan perubahan.

---

## 🏃 Cara Menjalankan Aplikasi

Kredensial Supabase sudah otomatis terkonfigurasi di `.env.local`.

Untuk menjalankan development server:

```bash
npm run dev
```

Buka peramban Anda dan akses:
👉 [http://localhost:3000](http://localhost:3000)

---

## 📁 Struktur File Proyek

```
supabase/
├── app/
│   ├── auth/
│   │   └── actions.ts        # Server actions untuk Auth
│   ├── login/
│   │   └── page.tsx           # Halaman Login
│   ├── signup/
│   │   └── page.tsx           # Halaman Register
│   ├── globals.css           # Styling Tailwind CSS
│   ├── layout.tsx            # Root layout
│   └── page.tsx              # Dashboard Todo List (Protected)
├── components/
│   └── TodoItem.tsx          # Komponen item Todo (inline edit, toggle, delete)
├── supabase/
│   └── schema.sql            # Skrip SQL untuk tabel & RLS
├── utils/
│   └── supabase/
│       ├── client.ts         # Supabase Client Browser
│       ├── middleware.ts     # Session sync helper
│       └── server.ts         # Supabase Server Client
├── .env.local                # Kredensial Supabase
├── package.json              # Next.js 16, Supabase, Tailwind dependencies
└── proxy.ts                  # Next.js 16 route protection & session handler
```
