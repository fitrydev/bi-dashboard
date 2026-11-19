import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { Check } from "lucide-react";

const Ctx = createContext<(m: string) => void>(() => {});
export const useToast = () => useContext(Ctx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<{ id: number; m: string }[]>([]);
  const push = useCallback((m: string) => {
    const id = Date.now() + Math.random();
    setItems((s) => [...s.slice(-2), { id, m }]);
    setTimeout(() => setItems((s) => s.filter((x) => x.id !== id)), 4000);
  }, []);
  return (
    <Ctx.Provider value={push}>
      {children}
      <div role="status" aria-live="polite" className="fixed bottom-[76px] right-4 z-60 flex w-[min(360px,calc(100vw-2rem))] flex-col gap-2 lg:bottom-6">
        {items.map((t) => (
          <div key={t.id} className="flex items-start gap-2 rounded-md border border-rule-strong bg-surface-raised px-3 py-3 text-body text-ink shadow-overlay">
            <Check size={16} className="mt-0.5 shrink-0 text-status-success" aria-hidden="true" />
            <span>{t.m}</span>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
