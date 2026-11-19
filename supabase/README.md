# Supabase

Konfigurasi database dan auth lokal untuk bi-dashboard.

## Status

- **Fase 1:** hanya konfigurasi dasar (`config.toml`). Folder `migrations/` masih kosong.
- **Fase 2:** skema database, RLS, dan migrasi pertama masuk ke `migrations/`.

## Menjalankan secara lokal

Butuh Docker.

```bash
bunx supabase start      # menjalankan Postgres, Auth, dan Studio lokal
bunx supabase db reset   # membuat ulang DB dari migrasi + seed
bunx supabase stop       # menghentikan container
```

## Google OAuth

`config.toml` membaca kredensial dari environment, bukan dari file:

- `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID`
- `SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET`

Isi keduanya di shell atau di file `.env` di root proyek (contoh ada di `.env.example`)
sebelum `supabase start`. Redirect URI di Google Cloud Console harus mengarah ke
URL callback Supabase lokal.

## Aturan

- Jangan commit secret, token, atau file `.env*` yang berisi nilai asli.
- Jangan pakai secret key di kode yang dikirim ke browser.
- Perubahan skema hanya lewat file migrasi baru, jangan edit migrasi lama yang sudah dipakai.
