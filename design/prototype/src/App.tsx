import { useEffect, useState, type ReactNode } from "react";
import { LayoutDashboard, Table2, CalendarClock, ClipboardCheck, FileUp, BookOpen, Sun, Moon, Monitor } from "lucide-react";
import { useRoute } from "@/lib/router";
import { cn } from "@/lib/utils";
import { ToastProvider } from "@/components/ui/toast";
import { UnassessedPattern } from "@/components/risk/UnassessedPattern";
import { Dashboard } from "@/pages/Dashboard";
import { Aset } from "@/pages/Aset";
import { Detail } from "@/pages/Detail";
import { Nilai } from "@/pages/Nilai";
import { Import } from "@/pages/Import";
import { Jadwal, Panduan } from "@/pages/Simple";

type Tema = "terang" | "gelap" | "sistem";
function useTema() {
  const [t, setT] = useState<Tema>(() => { try { return (localStorage.getItem("tema") as Tema) || "sistem"; } catch { return "sistem"; } });
  useEffect(() => {
    const root = document.documentElement;
    // "Ikuti sistem" menghormati data-theme dari host (mis. viewer artifact), lalu preferensi OS.
    const sistemGelap = () => {
      const dt = root.getAttribute("data-theme");
      return dt ? dt === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
    };
    const apply = () => root.classList.toggle("dark", t === "gelap" || (t === "sistem" && sistemGelap()));
    apply();
    try { localStorage.setItem("tema", t); } catch { /* abaikan */ }
    const mq = matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", apply);
    const mo = new MutationObserver(apply);
    mo.observe(root, { attributes: true, attributeFilter: ["data-theme"] });
    return () => { mq.removeEventListener("change", apply); mo.disconnect(); };
  }, [t]);
  return [t, setT] as const;
}

const NAV = [
  { k: "", l: "Dashboard", icon: LayoutDashboard, main: true },
  { k: "aset", l: "Aset", icon: Table2, main: true },
  { k: "jadwal", l: "Jadwal", icon: CalendarClock, main: true },
  { k: "nilai", l: "Input", icon: ClipboardCheck, main: true },
  { k: "import", l: "Import", icon: FileUp, main: false },
  { k: "panduan", l: "Panduan", icon: BookOpen, main: false },
];

function ThemeToggle({ t, setT }: { t: Tema; setT: (t: Tema) => void }) {
  const opts: { v: Tema; l: string; i: typeof Sun }[] = [{ v: "terang", l: "Terang", i: Sun }, { v: "gelap", l: "Gelap", i: Moon }, { v: "sistem", l: "Ikuti sistem", i: Monitor }];
  return (
    <div role="group" aria-label="Tema tampilan" className="flex border border-rule-strong rounded-md">
      {opts.map((o) => (
        <button key={o.v} type="button" aria-pressed={t === o.v} aria-label={o.l} title={o.l} onClick={() => setT(o.v)}
          className={cn("tab-t flex min-h-11 min-w-11 flex-1 items-center justify-center lg:min-h-9 lg:min-w-9 cursor-pointer", t === o.v ? "bg-accent text-accent-fg" : "text-ink-muted hover:bg-surface-sunken")}>
          <o.i size={16} strokeWidth={1.5} aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}

export function App() {
  const route = useRoute();
  const [tema, setTema] = useTema();
  const seg = route.path[0] ?? "";
  let page: ReactNode;
  switch (seg) {
    case "": page = <Dashboard />; break;
    case "aset": page = route.path[1] ? <Detail code={route.path[1]} /> : <Aset route={route} />; break;
    case "nilai": page = <Nilai code={route.path[1]} />; break;
    case "import": page = <Import />; break;
    case "jadwal": page = <Jadwal />; break;
    case "panduan": page = <Panduan />; break;
    default: page = <Dashboard />;
  }
  return (
    <ToastProvider>
      <UnassessedPattern />
      <a href="#konten" onClick={(e) => { e.preventDefault(); document.getElementById("konten")?.focus(); }}
        className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-60 focus:bg-surface-raised focus:px-3 focus:py-2 focus:border focus:border-rule-strong">Lewati ke konten utama</a>
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-56 flex-col border-r border-rule bg-surface lg:flex">
        <div className="border-b border-rule px-5 py-5">
          <div className="font-serif text-subtitle font-semibold leading-tight">Buku Besar Risiko</div>
          <div className="mt-0.5 text-label text-ink-subtle">Monitoring Aset 2027</div>
        </div>
        <nav aria-label="Navigasi utama" className="flex-1 px-3 py-4">
          <ul className="flex flex-col gap-0.5">
            {NAV.map((n) => {
              const act = seg === n.k;
              return (
                <li key={n.k}>
                  <a href={`#/${n.k}`} aria-current={act ? "page" : undefined}
                    className={cn("tab-t flex min-h-10 items-center gap-3 rounded-md px-2 text-body hover:bg-surface-sunken", act ? "font-semibold text-ink" : "text-ink-muted")}>
                    <n.icon size={18} strokeWidth={1.5} aria-hidden="true" />
                    <span className={cn("border-b-2 py-0.5", act ? "border-ink" : "border-transparent")}>{n.l}</span>
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="border-t border-rule p-4">
          <ThemeToggle t={tema} setT={setTema} />
          <p className="mt-3 text-label text-ink-subtle">Prototipe · data dari Excel 19 Nov 2026</p>
        </div>
      </aside>

      <header className="sticky top-0 z-20 flex items-center justify-between gap-2 border-b border-rule bg-surface px-4 py-2 lg:hidden">
        <div className="min-w-0">
          <div className="font-serif text-body-lg font-semibold leading-tight">Buku Besar Risiko</div>
          <div className="text-label text-ink-subtle">Monitoring Aset 2027</div>
        </div>
        <div className="flex items-center gap-1">
          <a href="#/import" aria-label="Import" className={cn("flex min-h-11 min-w-11 items-center justify-center", seg === "import" && "text-ink font-semibold")}><FileUp size={18} strokeWidth={1.5} /></a>
          <a href="#/panduan" aria-label="Panduan" className={cn("flex min-h-11 min-w-11 items-center justify-center", seg === "panduan" && "text-ink font-semibold")}><BookOpen size={18} strokeWidth={1.5} /></a>
          <ThemeToggle t={tema} setT={setTema} />
        </div>
      </header>

      <main id="konten" tabIndex={-1} className="min-w-0 px-4 pb-28 pt-6 outline-none lg:ml-56 lg:px-10 lg:pb-16 lg:pt-10">
        <div className="mx-auto w-full max-w-[1360px]">{page}</div>
      </main>

      <nav aria-label="Navigasi bawah" className="fixed inset-x-0 bottom-0 z-20 border-t border-rule bg-surface lg:hidden">
        <ul className="grid grid-cols-4">
          {NAV.filter((n) => n.main).map((n) => {
            const act = seg === n.k;
            return (
              <li key={n.k}>
                <a href={`#/${n.k}`} aria-current={act ? "page" : undefined}
                  className={cn("flex min-h-14 flex-col items-center justify-center gap-0.5 text-label", act ? "font-semibold text-ink" : "text-ink-muted")}>
                  <n.icon size={20} strokeWidth={1.5} aria-hidden="true" />
                  <span className={cn("border-b-2", act ? "border-ink" : "border-transparent")}>{n.l}</span>
                </a>
              </li>
            );
          })}
        </ul>
      </nav>
    </ToastProvider>
  );
}
