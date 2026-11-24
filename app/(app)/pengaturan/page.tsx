import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PageHeader } from "@/components/ledger/PageHeader";
import { SectionBoundary } from "@/components/ledger/SectionBoundary";
import { Skeleton } from "@/components/ui/skeleton";
import { loadAliases, loadCriteria, loadReview, loadUsers, loadVersions, TAB_LABEL, TABS, type Tab } from "@/lib/settings/load";
import { href } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { AliasTab } from "./alias";
import { ParameterTab } from "./parameter";
import { ReviewTab } from "./review";
import { RubrikTab } from "./rubrik";
import { UsersTab } from "./users";

export const metadata: Metadata = { title: "Pengaturan" };

type SP = PageProps<"/pengaturan">["searchParams"];

export default function Page(props: PageProps<"/pengaturan">) {
  return (
    <>
      <PageHeader
        title="Pengaturan"
        sub="Daftar pengguna, parameter dan rubrik skor berversi, alias impor, dan koreksi data. Khusus admin."
      />
      <SectionBoundary what="Pengaturan">
        <Suspense fallback={<Skeleton aria-busy="true" className="mt-6 h-64 w-full bg-rule/60" />}>
          <Body sp={props.searchParams} />
        </Suspense>
      </SectionBoundary>
    </>
  );
}

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

async function Body({ sp }: { sp: SP }) {
  const supabase = await createClient();
  const [role, claims] = await Promise.all([supabase.rpc("current_app_role"), supabase.auth.getClaims()]);
  // Hanya untuk menampilkan; setiap Server Action tetap requireRole("admin") dan RLS menolak non-admin.
  if (role.data !== "admin") {
    return (
      <div className="mt-6 max-w-[68ch] space-y-2" data-testid="pengaturan-forbidden">
        <p className="text-body-lg text-ink">Halaman ini hanya untuk admin.</p>
        <p className="text-body text-ink-muted">
          Peran Anda tidak mencakup pengaturan. Hubungi admin bila Anda perlu mengubah pengguna, parameter, atau alias.
        </p>
      </div>
    );
  }
  const params = await sp;
  const t = first(params.tab);
  const tab: Tab = (TABS as readonly string[]).includes(t ?? "") ? (t as Tab) : "pengguna";
  const vParam = Number(first(params.versi));

  return (
    <div className="pt-6">
      <nav aria-label="Bagian pengaturan" className="">
        <ul className="flex flex-wrap border-b border-rule-strong">
          {TABS.map((k) => (
            <li key={k}>
              <Link
                href={href("/pengaturan", { tab: k === "pengguna" ? null : k })}
                aria-current={tab === k ? "page" : undefined}
                data-testid={`tab-${k}`}
                className={cn(
                  "inline-flex min-h-11 items-center border-b-2 px-4 text-label whitespace-nowrap lg:min-h-9",
                  tab === k ? "border-ink font-semibold text-ink" : "border-transparent text-ink-muted hover:text-ink",
                )}
              >
                {TAB_LABEL[k]}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <div className="pt-6">
        <Suspense key={tab} fallback={<Skeleton aria-busy="true" className="h-64 w-full bg-rule/60" />}>
        {tab === "pengguna" && <UsersTab users={await loadUsers()} me={String(claims.data?.claims?.email ?? "").toLowerCase()} />}
        {tab === "parameter" && <ParameterTab versions={await loadVersions()} selected={Number.isInteger(vParam) ? vParam : null} />}
        {tab === "rubrik" && <RubrikPane versionParam={vParam} />}
        {tab === "alias" && <AliasTab {...(await loadAliases())} />}
        {tab === "review" && <ReviewTab {...(await loadReview())} />}
        </Suspense>
      </div>
    </div>
  );
}

async function RubrikPane({ versionParam }: { versionParam: number }) {
  const versions = await loadVersions();
  const v = versions.find((x) => x.version === versionParam) ?? versions.find((x) => x.is_active) ?? versions[0];
  if (!v) return <p className="text-body text-ink-muted">Belum ada versi parameter.</p>;
  return <RubrikTab versions={versions} selected={v} criteria={await loadCriteria(v.version)} />;
}
