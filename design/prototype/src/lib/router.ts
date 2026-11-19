import { useEffect, useState, useCallback } from "react";

export interface Route { path: string[]; params: URLSearchParams; raw: string }
function parse(): Route {
  const h = window.location.hash.replace(/^#/, "") || "/";
  const [p, q = ""] = h.split("?");
  return { path: p.split("/").filter(Boolean), params: new URLSearchParams(q), raw: h };
}
export function useRoute(): Route {
  const [r, setR] = useState<Route>(parse);
  useEffect(() => {
    let last = parse().path.join("/");
    const on = () => {
      const n = parse();
      setR(n);
      const k = n.path.join("/");
      if (k !== last) { window.scrollTo(0, 0); last = k; }
    };
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  return r;
}
export const href = (path: string, q?: Record<string, string | undefined>) => {
  const sp = new URLSearchParams();
  if (q) for (const [k, v] of Object.entries(q)) if (v) sp.set(k, v);
  const s = sp.toString();
  return `#${path}${s ? `?${s}` : ""}`;
};
export function useReplaceParams(route: Route) {
  return useCallback((patch: Record<string, string | null>) => {
    const sp = new URLSearchParams(route.params);
    for (const [k, v] of Object.entries(patch)) { if (v) sp.set(k, v); else sp.delete(k); }
    const s = sp.toString();
    const base = "#/" + route.path.join("/");
    history.replaceState(null, "", s ? `${base}?${s}` : base);
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  }, [route]);
}
