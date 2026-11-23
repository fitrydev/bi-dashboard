"use client";

import { useSyncExternalStore } from "react";

const Q = "(prefers-reduced-motion: reduce)";
const sub = (cb: () => void) => {
  const m = window.matchMedia(Q);
  m.addEventListener("change", cb);
  return () => m.removeEventListener("change", cb);
};

/** true bila pengguna meminta gerak dikurangi. SSR = true (aman: tanpa animasi). Pakai: isAnimationActive={!useReducedMotion()}. */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(
    sub,
    () => window.matchMedia(Q).matches,
    () => true,
  );
}
