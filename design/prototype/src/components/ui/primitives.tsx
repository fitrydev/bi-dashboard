import { forwardRef, type ButtonHTMLAttributes, type AnchorHTMLAttributes, type ReactNode, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "outline" | "ghost" | "link";
const vcls: Record<Variant, string> = {
  primary: "bg-primary text-primary-foreground border border-primary hover:opacity-90",
  outline: "border border-rule-strong bg-transparent text-ink hover:bg-surface-sunken",
  ghost: "text-ink hover:bg-surface-sunken border border-transparent",
  link: "text-ink underline underline-offset-2 hover:decoration-2 border border-transparent px-0 min-h-0",
};
const base = "tab-t inline-flex min-h-11 lg:min-h-9 items-center justify-center gap-2 rounded-md px-3.5 text-body font-medium disabled:opacity-50 disabled:pointer-events-none cursor-pointer";

export const Button = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }>(
  ({ variant = "outline", className, ...p }, ref) => <button ref={ref} className={cn(base, vcls[variant], className)} {...p} />,
);
Button.displayName = "Button";

export function LinkButton({ variant = "outline", className, ...p }: AnchorHTMLAttributes<HTMLAnchorElement> & { variant?: Variant }) {
  return <a className={cn(base, vcls[variant], className)} {...p} />;
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(({ className, ...p }, ref) => (
  <input ref={ref} className={cn("min-h-11 lg:min-h-9 w-full rounded-md border border-input bg-surface-raised px-3 text-body text-ink placeholder:text-ink-subtle", className)} {...p} />
));
Input.displayName = "Input";

export function Select({ label, value, onChange, options, className }: { label: string; value: string; onChange: (v: string) => void; options: { v: string; l: string }[]; className?: string }) {
  return (
    <label className={cn("flex flex-col gap-1 text-label text-ink-muted", className)}>
      {label}
      <select value={value} onChange={(e) => onChange(e.target.value)} className="min-h-11 lg:min-h-9 rounded-md border border-input bg-surface-raised px-2 text-body text-ink">
        {options.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
      </select>
    </label>
  );
}

/** Bagian bergaris (bukan kartu). */
export function Section({ id, title, sub, tag, action, children, first, level = "info" }: { id?: string; title: ReactNode; sub?: ReactNode; tag?: ReactNode; action?: ReactNode; children: ReactNode; first?: boolean; level?: "action" | "info" }) {
  return (
    <section id={id} aria-labelledby={id ? `${id}-h` : undefined} className={cn("pt-8 pb-4", !first && "border-t border-rule mt-8")}>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
        <div className="min-w-0 max-w-[68ch]">
          {tag && <div className="mb-1">{tag}</div>}
          <h2 id={id ? `${id}-h` : undefined} className={level === "action" ? "text-subtitle sm:text-title text-ink" : "font-sans text-subtitle font-semibold text-ink"}>{title}</h2>
          {sub && <p className="mt-1.5 text-label text-ink-subtle">{sub}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Tag({ children }: { children: ReactNode }) {
  return <span className="inline-flex items-center gap-1 border border-rule-strong px-1.5 py-0.5 text-label text-ink-muted rounded-sm">{children}</span>;
}

export function TableToggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button type="button" aria-pressed={on} onClick={onClick} className="tab-t min-h-11 px-1 text-label text-ink underline underline-offset-2 hover:decoration-2 cursor-pointer lg:min-h-8">
      {on ? "Tampilkan grafik" : "Tampilkan tabel"}
    </button>
  );
}

export function PageHeader({ title, sub, action, slim }: { title: ReactNode; sub?: ReactNode; action?: ReactNode; slim?: boolean }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4 border-b border-rule-strong pb-5">
      <div className="min-w-0 max-w-[68ch]">
        <h1 className={cn("text-title sm:text-display text-ink", slim && "truncate lg:whitespace-normal")}>{title}</h1>
        {sub && <p className={cn("mt-2 text-body text-ink-muted", slim && "hidden lg:block")}>{sub}</p>}
      </div>
      {action}
    </header>
  );
}
