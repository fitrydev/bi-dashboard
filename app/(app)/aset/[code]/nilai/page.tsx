import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PageHeader } from "@/components/ledger/PageHeader";
import { Button } from "@/components/ui/button";
import { AuthError, requireRole } from "@/lib/auth/require-role";
import { loadAssetDetail } from "@/lib/aset/detail";
import { getAssessmentDraft } from "@/lib/assessments/draft";
import { initialValues } from "@/lib/assessments/form";
import { asetDetail, safeDecode } from "@/lib/routes";
import { todayJakarta } from "@/lib/schemas/date";
import { AssessmentForm } from "./form";

export const metadata: Metadata = { title: "Nilai Aset" };

function Notice({ code, children }: { code: string; children: string }) {
  return (
    <>
      <PageHeader title="Nilai Aset" />
      <p role="status" className="mt-6 max-w-[68ch] text-body text-ink">
        {children}
      </p>
      <Button asChild variant="secondary" className="mt-4">
        <Link href={asetDetail(code)}>Kembali ke detail aset</Link>
      </Button>
    </>
  );
}

async function Body({ params }: { params: PageProps<"/aset/[code]/nilai">["params"] }) {
  const code = safeDecode((await params).code);
  try {
    await requireRole("editor");
  } catch (e) {
    if (e instanceof AuthError && e.code === "FORBIDDEN")
      return <Notice code={code}>Anda hanya bisa melihat. Minta akses editor untuk menilai.</Notice>;
    throw e;
  }

  // loadAssetDetail memanggil notFound() bila aset tidak ada.
  const [d, draft] = await Promise.all([loadAssetDetail(code), getAssessmentDraft(code)]);
  if (!d.active) return <Notice code={code}>Aset ini nonaktif, tidak bisa dinilai.</Notice>;

  const today = todayJakarta();
  const last = d.row.assessment?.scores ?? null;
  const fallback = initialValues({ draft: null, last, today });
  const fromDraft = draft ? initialValues({ draft: draft.data, last, today }).values : null;

  return (
    <>
      <PageHeader
        title="Nilai Aset"
        sub={
          <>
            {d.row.name} · <span className="font-mono text-ink">{code}</span>
          </>
        }
      />
      <AssessmentForm
        code={code}
        assetName={d.row.name}
        params={d.params}
        rubric={d.rubric}
        draft={draft && fromDraft ? { values: fromDraft, updatedAt: draft.updated_at } : null}
        fallback={{ values: fallback.values, source: fallback.source as "last" | "empty" }}
      />
    </>
  );
}

export default function Page(props: PageProps<"/aset/[code]/nilai">) {
  return (
    <Suspense fallback={<PageHeader title="Nilai Aset" />}>
      <Body params={props.params} />
    </Suspense>
  );
}
