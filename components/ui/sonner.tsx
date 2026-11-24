"use client";

import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect } from "react";
import { Toaster as Sonner, type ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  // DESIGN §6.10: jeda saat fokus. Sonner hanya menjeda saat hover/Alt+T (state `expanded`),
  // bukan saat toast dicapai lewat Tab. ponytail: pinjam handler mouse sonner dengan event
  // sintetis (React menurunkan onMouseMove/onMouseLeave dari mousemove/mouseout); ganti bila
  // sonner punya API pause.
  useEffect(() => {
    const list = (t: EventTarget | null) =>
      t instanceof Element ? t.closest("[data-sonner-toaster]") : null;
    const onIn = (e: FocusEvent) => {
      list(e.target)?.dispatchEvent(new MouseEvent("mousemove", { bubbles: true }));
    };
    const onOut = (e: FocusEvent) => {
      const from = list(e.target);
      if (from && !from.contains(e.relatedTarget as Node | null))
        from.dispatchEvent(
          new MouseEvent("mouseout", { bubbles: true, relatedTarget: document.body }),
        );
    };
    document.addEventListener("focusin", onIn);
    document.addEventListener("focusout", onOut);
    return () => {
      document.removeEventListener("focusin", onIn);
      document.removeEventListener("focusout", onOut);
    };
  }, []);

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      // DESIGN §6.10: kanan-bawah desktop; mobile di atas bottom-nav (56px + safe-area); maks 3.
      position="bottom-right"
      mobileOffset={{ bottom: "calc(72px + env(safe-area-inset-bottom))" }}
      visibleToasts={3}
      containerAriaLabel="Notifikasi"
      toastOptions={{
        classNames: {
          // tombol aksi teks bergaris bawah, area ≥ 44px (override gaya bawaan sonner 24px)
          actionButton:
            "h-11! min-w-11 bg-transparent! px-2! text-body! font-medium! text-ink! underline underline-offset-2 hover:decoration-2",
        },
        style: { boxShadow: "var(--shadow-overlay)" },
      }}
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--rule-strong)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster };
