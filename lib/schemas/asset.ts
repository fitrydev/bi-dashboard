import { z } from "zod";

import { Constants } from "@/lib/supabase/database.types";
import { optionalDate, optionalText, requiredText } from "./date";

const E = Constants.public.Enums;

/** Angka opsional ≥ 0. Terima number atau string dari input ("1234.5"); kosong → null. */
const optionalAmount = z
  .union([z.number(), z.string()])
  .nullish()
  .transform((v) => {
    if (v == null) return null;
    if (typeof v === "number") return v;
    const t = v.trim();
    return t === "" ? null : Number(t);
  })
  .pipe(
    z
      .number({ error: "Harus berupa angka." })
      .finite("Harus berupa angka.")
      .min(0, "Tidak boleh negatif.")
      .nullable(),
  );

export const assetInput = z.object({
  asset_code: requiredText("Kode aset", 64),
  name: requiredText("Nama aset", 300),
  type: z.enum(E.asset_type, { error: "Pilih jenis aset." }),
  /** Nama wilayah, mis. "JAWA BARAT"; alias (mis. "JABAR") juga diterima server. */
  region: requiredText("Wilayah", 100),
  address: optionalText(1000),
  land_area_m2: optionalAmount,
  building_area_m2: optionalAmount,
  book_value: optionalAmount,
  legal_status: optionalText(200),
  right_expiry_date: optionalDate,
  utilization: z
    .union([z.enum(E.utilization_status), z.literal("")], { error: "Pilih status pemanfaatan." })
    .nullish()
    .transform((v) => v || null),
  pic_unit: optionalText(200),
  notes: optionalText(4000),
});

export type AssetInput = z.input<typeof assetInput>;
export type AssetData = z.output<typeof assetInput>;
