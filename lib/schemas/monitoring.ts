import { z } from "zod";

import { Constants } from "@/lib/supabase/database.types";
import { optionalText, pastOrToday, requiredText } from "./date";

export const monitoringInput = z.object({
  asset_code: requiredText("Kode aset", 64),
  monitored_at: pastOrToday("Tanggal monitoring tidak boleh di masa depan."),
  method: z.enum(Constants.public.Enums.monitoring_method, { error: "Pilih metode monitoring." }),
  findings: optionalText(4000),
});

export type MonitoringInput = z.input<typeof monitoringInput>;
export type MonitoringData = z.output<typeof monitoringInput>;
