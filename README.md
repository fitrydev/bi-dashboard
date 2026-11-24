# bi-dashboard — Risk-Based Asset Monitoring 2027

Pengganti Excel `source/Template_Matriks_Risiko_Monitoring_Aset_2027.xlsx`. Stack: Next.js 16, Supabase (Postgres + Auth Google + allowlist), Vercel. Rencana: `docs/PLAN.md`.

## Setup lokal

```bash
colima start                       # Docker runtime
bun install
# data asli TIDAK ada di repo: salin dari pemilik data design/data/assets.json
# (ekstraksi Excel Fase 0; skrip ekstraksinya tidak ada di repo), lalu
bun run db:seed-gen                # assets.json → supabase/seed.sql (gitignored)
bunx supabase start                # migrasi + seed (136 aset, admin@example.com)
bunx supabase status -o env        # salin API_URL / PUBLISHABLE_KEY / SECRET_KEY ke .env.local (lihat .env.example)
bun dev
```

Google OAuth lokal (opsional): isi `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID/SECRET` di env sebelum `supabase start`, redirect URI `http://127.0.0.1:54321/auth/v1/callback`.

## Gate (wajib hijau sebelum push)

Butuh data lokal: tanpa `supabase/seed.sql` (dan `source/*.xlsx` untuk `e2e/import.spec.ts`), `test db` dan e2e gagal karena mengharapkan 136 aset dan admin `admin@example.com`. Typecheck, lint, test, contrast, dan build tetap jalan di clone bersih.

```bash
bunx supabase db reset && bunx supabase test db && bunx supabase db lint
bun run typecheck && bun run lint && bun run test
bun scripts/check-contrast.ts && bun run build && bun run test:e2e
```

## Produksi

| | |
|---|---|
| DB/Auth | Supabase Free, `ap-southeast-1` |
| App | Vercel Hobby, fungsi `sin1`, deploy otomatis dari `main` (integrasi GitHub) |
| Env Vercel | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` saja. App tidak butuh secret key. CSP `connect-src` dibaca dari URL ini saat build: ganti URL → redeploy. |
| Anti-pause | `.github/workflows/keep-alive.yml` harian (repo vars `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`) |

### Migrasi baru

Skema hanya maju: buat file baru di `supabase/migrations/`, lulus gate, lalu

```bash
bunx supabase db push --linked --dry-run   # cek
bunx supabase db push --linked
```

Tidak ada migrasi turun. Rollback DB = migrasi maju yang membalik perubahan. `config.toml` **tidak** ikut ter-push; setelan Auth hosted diatur di dashboard (bawah).

### Setelan Auth hosted (manual, dashboard Supabase)

- Providers: hanya **Google** aktif (Client ID/secret dari Google Cloud, redirect `https://<ref>.supabase.co/auth/v1/callback`). Email, Phone, Anonymous **mati**.
- Email provider (walau mati): Confirm email + Secure email change **aktif**.
- Auth Hooks → Before User Created → Postgres `public.hook_before_user_created`.
- URL Configuration: Site URL `https://<app>.vercel.app`, Redirect URLs `https://<app>.vercel.app/auth/callback`.
- Sessions: JWT expiry 3600, refresh token rotation aktif.
- Advisors → Security & Performance: 0 error.

### Tambah / ganti admin

Lewat app: `/pengaturan` → Allowlist (admin). Darurat (tidak ada admin yang bisa login), SQL Editor:

```sql
insert into public.allowed_emails (email, role) values ('nama@domain.com', 'admin')
on conflict (email) do update set role = 'admin';
```

### Rotasi kunci

1. Supabase → Project Settings → API Keys: buat publishable key baru.
2. Vercel → Env `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` ganti → Redeploy. Perbarui repo var GitHub.
3. Hapus key lama. Secret key dan Google client secret: rotasi di dashboard masing-masing (app tidak memakainya).

### Rollback deploy

Vercel → Deployments → deploy sebelumnya → **Instant Rollback**. DB tidak ikut mundur; pastikan deploy lama kompatibel dengan skema (migrasi dibuat aditif).

### Backup

Free tanpa PITR: ekspor Excel penuh dari `/aset` secara berkala, atau `bunx supabase db dump --linked -f backup.sql` (data: `--data-only`).
