"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { EmptyState } from "@/components/ledger/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addAllowedEmail, revokeAllowedEmail, updateAllowedRole } from "@/lib/actions/settings";
import { formatTanggal } from "@/lib/format";
import { emailInput } from "@/lib/schemas/settings";
import type { AppRole, UserRow } from "@/lib/settings/types";
import { Busy, Confirm, Field, Sel } from "./ui";

const ROLES: Record<AppRole, string> = { admin: "Admin", editor: "Editor", viewer: "Viewer" };
const SELF = "Anda tidak dapat mengubah atau mencabut akses Anda sendiri.";

export function UsersTab({ users, me }: { users: UserRow[]; me: string }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<AppRole>("viewer");
  const [err, setErr] = useState<string>();
  const [pending, start] = useTransition();

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    const p = emailInput.safeParse({ email, role });
    if (!p.success) return setErr(p.error.issues[0].message);
    setErr(undefined);
    start(async () => {
      const r = await addAllowedEmail(p.data);
      if (!r.ok) return setErr(r.fieldErrors?.email?.[0] ?? r.error);
      toast.success(`${p.data.email} ditambahkan sebagai ${ROLES[p.data.role]}`);
      setEmail("");
    });
  };

  return (
    <div className="space-y-8">
      <form onSubmit={add} noValidate aria-label="Tambah pengguna" className="flex flex-wrap items-start gap-3">
        <Field id="u-email" label="Email Google" error={err} hint="Hanya mendaftarkan email ke daftar izin. Orangnya masuk sendiri lewat Google; akun dibuat saat login pertama." className="min-w-64 flex-1 basis-64">
          <Input
            id="u-email"
            type="email"
            inputMode="email"
            autoComplete="off"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={!!err}
            aria-describedby={err ? "u-email-err" : "u-email-hint"}
            className="text-base"
          />
        </Field>
        <Field id="u-role" label="Peran">
          <Sel id="u-role" value={role} onChange={(e) => setRole(e.target.value as AppRole)} className="w-full sm:w-40">
            {Object.entries(ROLES).map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </Sel>
        </Field>
        <div className="pt-[1.375rem] max-sm:w-full">
          <Busy type="submit" pending={pending} className="max-sm:w-full">
            Tambah pengguna
          </Busy>
        </div>
      </form>

      {users.length === 0 ? (
        <EmptyState purpose="Belum ada email yang diizinkan." why="Tambahkan email di atas agar orangnya bisa masuk." />
      ) : (
        <ul className="divide-y divide-rule border-y border-rule" aria-label="Pengguna yang diizinkan" data-testid="user-list">
          {users.map((u) => (
            <UserItem key={u.email} u={u} self={u.email === me} />
          ))}
        </ul>
      )}
    </div>
  );
}

function UserItem({ u, self }: { u: UserRow; self: boolean }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const change = (role: AppRole) =>
    start(async () => {
      const r = await updateAllowedRole({ email: u.email, role });
      if (!r.ok) return void toast.error(r.error);
      const old = u.role;
      toast(`Peran ${u.email} menjadi ${ROLES[role]}`, {
        duration: 8000,
        action: {
          label: "Urungkan",
          onClick: () => void updateAllowedRole({ email: u.email, role: old }).then((x) => (x.ok ? router.refresh() : toast.error(x.error))),
        },
      });
    });
  const revoke = async () => {
    const r = await revokeAllowedEmail({ email: u.email });
    if (r.ok) toast.success(`Akses ${u.email} dicabut`);
    else toast.error(r.error);
  };
  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3" data-testid={`user-${u.email}`}>
      <div className="min-w-0 flex-1 basis-56">
        <div className="truncate text-body text-ink">
          {u.email}
          {self && <span className="ml-2 text-caption text-ink-muted">(Anda)</span>}
        </div>
        <div className="text-caption text-ink-subtle">Ditambahkan {formatTanggal(u.created_at)}</div>
      </div>
      <div className="flex items-center gap-2">
        <label htmlFor={`r-${u.email}`} className="sr-only">
          Peran {u.email}
        </label>
        <Sel
          id={`r-${u.email}`}
          value={u.role}
          disabled={self || pending}
          aria-describedby={self ? `self-${u.email}` : undefined}
          onChange={(e) => change(e.target.value as AppRole)}
        >
          {Object.entries(ROLES).map(([k, l]) => (
            <option key={k} value={k}>
              {l}
            </option>
          ))}
        </Sel>
        <Confirm
          title={`Cabut akses ${u.email}?`}
          body={<p>Orang ini tidak akan bisa masuk lagi. Data yang pernah ia ubah tetap tercatat. Anda bisa menambahkannya kembali kapan saja.</p>}
          confirmLabel="Cabut akses"
          destructive
          onConfirm={revoke}
          trigger={(open) => (
            <Button
              type="button"
              variant="outline"
              size="icon"
              disabled={self}
              onClick={open}
              aria-label={`Cabut akses ${u.email}`}
              aria-describedby={self ? `self-${u.email}` : undefined}
            >
              <Trash2 aria-hidden="true" />
            </Button>
          )}
        />
      </div>
      {self && (
        <p id={`self-${u.email}`} className="basis-full text-caption text-ink-muted">
          {SELF}
        </p>
      )}
    </li>
  );
}
