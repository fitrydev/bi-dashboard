"use client";

import type { ReactNode } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/** Tooltip shadcn: muncul saat hover dan fokus; pemicu = anak (asChild). Perlu <TooltipProvider> di layout. */
export function Tip({
  tip,
  children,
  side = "top",
  align = "center",
}: {
  tip: ReactNode;
  children: ReactNode;
  side?: "top" | "bottom" | "left" | "right";
  align?: "start" | "center" | "end";
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side={side} align={align}>
        {tip}
      </TooltipContent>
    </Tooltip>
  );
}
