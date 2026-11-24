-- Fase 7 · import_commit — implementasi penuh (kontrak: lib/import/contract.ts).
-- SECURITY INVOKER: RLS & trigger (aktor, versi parameter, tanggal masa depan, batas teks, audit) tetap berlaku.
-- Satu transaksi; tiap baris dalam subtransaksi (begin … exception) → baris gagal dilewati, sisanya masuk.
-- Kunci yang tidak ada di `data` (atau bernilai JSON null) = kolom tidak diubah.
-- Catatan RLS: update penilaian lama hanya admin (assessments_update). Untuk editor, penilaian (aset, tanggal)
-- yang sudah ada dan BERBEDA dilaporkan sebagai error baris; yang sama tetap 'unchanged'.

create or replace function public.import_commit(batch_id uuid, rows jsonb)
returns jsonb
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  v_status text;
  v_item jsonb;
  v_kind text;
  v_rownum integer;
  d jsonb;
  v_code text;
  v_action text;
  v_msg text;
  v_state text;
  v_constraint text;
  v_results jsonb := '[]'::jsonb;
  v_ins integer := 0;
  v_upd integer := 0;
  v_same integer := 0;
  v_err integer := 0;
  v_result jsonb;
  -- aset
  a public.assets%rowtype;
  n public.assets%rowtype;
  v_exists boolean;
  v_txt text;
  -- penilaian
  s public.assessments%rowtype;
  t public.assessments%rowtype;
  v_asset_id uuid;
  v_asset_active boolean;
  v_key text;
begin
  if not public.has_role('editor') then
    raise exception 'Anda tidak memiliki hak untuk mengimpor data.' using errcode = '42501';
  end if;

  if not exists (select 1 from public.import_batches b where b.id = import_commit.batch_id) then
    raise exception 'Batch impor tidak ditemukan.' using errcode = 'P0002';
  end if;
  -- FOR UPDATE ikut kebijakan RLS update: batch milik user lain tidak terlihat di sini.
  -- Kunci baris juga mencegah dua commit bersamaan atas batch yang sama.
  select b.status into v_status from public.import_batches b where b.id = import_commit.batch_id for update;
  if not found then
    raise exception 'Batch impor ini bukan milik Anda.' using errcode = '42501';
  end if;
  if v_status <> 'validated' then
    raise exception 'Batch impor berstatus "%"; hanya batch tervalidasi yang dapat di-commit.', v_status
      using errcode = '22023';
  end if;

  -- ===== Validasi bentuk (gagal = seluruh commit dibatalkan) =====
  if rows is null or jsonb_typeof(rows) <> 'array' then
    raise exception 'Format baris impor harus berupa array JSON.' using errcode = '22023';
  end if;
  if jsonb_array_length(rows) > 5000 then
    raise exception 'Maksimal 5.000 baris per impor.' using errcode = '22023';
  end if;
  if exists (
    select 1 from jsonb_array_elements(rows) e
    where jsonb_typeof(e) <> 'object'
       or coalesce(e->>'kind', '') not in ('asset', 'assessment')
       or jsonb_typeof(e->'row') is distinct from 'number'
       or (e->>'row')::numeric <> trunc((e->>'row')::numeric)
       or jsonb_typeof(e->'data') is distinct from 'object'
       or jsonb_typeof(e->'data'->'asset_code') is distinct from 'string'
       or btrim(e->'data'->>'asset_code') = ''
  ) then
    raise exception 'Format baris impor tidak valid (kind/row/data/asset_code).' using errcode = '22023';
  end if;

  -- Aset dulu, lalu penilaian (penilaian boleh merujuk aset baru di batch yang sama).
  for v_item in
    select e from jsonb_array_elements(rows) with ordinality x(e, i)
    order by (e->>'kind') = 'assessment', i
  loop
    v_kind := v_item->>'kind';
    v_rownum := (v_item->>'row')::numeric::integer;
    d := jsonb_strip_nulls(v_item->'data');
    v_code := btrim(d->>'asset_code');
    v_msg := null;

    begin
      -- Tipe nilai: angka harus JSON number, tanggal 'YYYY-MM-DD', teks string, boolean boolean.
      for v_key in select k from jsonb_object_keys(d) k loop
        if v_key in ('land_area_m2', 'building_area_m2', 'book_value', 's_legal', 's_control', 's_physical',
                     's_utilization', 's_location', 's_strategic') then
          if jsonb_typeof(d->v_key) <> 'number' then
            raise exception 'Kolom % harus berupa angka.', v_key;
          end if;
        elsif v_key in ('right_expiry_date', 'last_monitored_at', 'assessed_at', 'target_date') then
          if jsonb_typeof(d->v_key) <> 'string' or (d->>v_key) !~ '^\d{4}-\d{2}-\d{2}$' then
            raise exception 'Kolom % harus berupa tanggal YYYY-MM-DD.', v_key;
          end if;
          perform (d->>v_key)::date; -- tanggal mustahil → 22008
        elsif v_key = 'critical_override' then
          if jsonb_typeof(d->v_key) <> 'boolean' then
            raise exception 'Kolom critical_override harus berupa boolean.';
          end if;
        elsif jsonb_typeof(d->v_key) <> 'string' then
          raise exception 'Kolom % harus berupa teks.', v_key;
        end if;
      end loop;

      if v_kind = 'asset' then
        select * into a from public.assets x where x.asset_code = v_code;
        v_exists := found;
        if v_exists and not a.is_active then
          raise exception 'Aset nonaktif; pulihkan dulu.';
        end if;
        if not v_exists then
          if not (d ? 'name' and d ? 'type' and d ? 'region') then
            raise exception 'Aset baru wajib memiliki nama, jenis, dan wilayah.';
          end if;
          a := null;
        end if;
        n := a;
        n.asset_code := v_code;

        if d ? 'name' then n.name := btrim(d->>'name'); end if;
        if d ? 'type' then
          v_txt := lower(btrim(d->>'type'));
          if v_txt not in ('tanah', 'bangunan', 'gabungan') then
            raise exception 'Jenis aset "%" tidak dikenal.', left(d->>'type', 50);
          end if;
          n.type := v_txt::public.asset_type;
        end if;
        if d ? 'region' then
          v_txt := upper(btrim(d->>'region'));
          select r.id into n.region_id from public.regions r where r.name = v_txt;
          if not found then
            select ra.region_id into n.region_id from public.region_aliases ra where ra.alias = v_txt;
            if not found then
              raise exception 'Wilayah "%" tidak dikenal.', left(d->>'region', 100);
            end if;
          end if;
        end if;
        if d ? 'address' then n.address := btrim(d->>'address'); end if;
        if d ? 'land_area_m2' then n.land_area_m2 := (d->>'land_area_m2')::numeric(14, 2); end if;
        if d ? 'building_area_m2' then n.building_area_m2 := (d->>'building_area_m2')::numeric(14, 2); end if;
        if d ? 'book_value' then n.book_value := (d->>'book_value')::numeric(18, 2); end if;
        if d ? 'legal_status' then n.legal_status := btrim(d->>'legal_status'); end if;
        if d ? 'right_expiry_date' then n.right_expiry_date := (d->>'right_expiry_date')::date; end if;
        if d ? 'utilization' then
          v_txt := lower(btrim(d->>'utilization'));
          select ua.status, ua.needs_review into n.utilization, n.utilization_needs_review
            from public.utilization_aliases ua where ua.raw = v_txt;
          if not found then
            if v_txt::text in (select unnest(enum_range(null::public.utilization_status))::text) then
              n.utilization := v_txt::public.utilization_status;
              n.utilization_needs_review := false;
            else
              raise exception 'Status pemanfaatan "%" tidak dikenal.', left(d->>'utilization', 100);
            end if;
          end if;
          n.utilization_raw := btrim(d->>'utilization');
        end if;
        if d ? 'pic_unit' then n.pic_unit := btrim(d->>'pic_unit'); end if;
        if d ? 'notes' then n.notes := btrim(d->>'notes'); end if;
        if d ? 'last_monitored_at' then n.last_monitored_at := (d->>'last_monitored_at')::date; end if;

        if not v_exists then
          insert into public.assets (asset_code, name, type, region_id, address, land_area_m2, building_area_m2,
            book_value, legal_status, right_expiry_date, utilization, utilization_raw, utilization_needs_review,
            pic_unit, notes, last_monitored_at)
          values (n.asset_code, n.name, n.type, n.region_id, n.address, n.land_area_m2, n.building_area_m2,
            n.book_value, n.legal_status, n.right_expiry_date, n.utilization, n.utilization_raw,
            coalesce(n.utilization_needs_review, false), n.pic_unit, n.notes, n.last_monitored_at);
          v_action := 'inserted';
        elsif (n.name, n.type, n.region_id, n.address, n.land_area_m2, n.building_area_m2, n.book_value,
               n.legal_status, n.right_expiry_date, n.utilization, n.utilization_raw, n.utilization_needs_review,
               n.pic_unit, n.notes, n.last_monitored_at)
          is distinct from
              (a.name, a.type, a.region_id, a.address, a.land_area_m2, a.building_area_m2, a.book_value,
               a.legal_status, a.right_expiry_date, a.utilization, a.utilization_raw, a.utilization_needs_review,
               a.pic_unit, a.notes, a.last_monitored_at) then
          update public.assets x
             set name = n.name, type = n.type, region_id = n.region_id, address = n.address,
                 land_area_m2 = n.land_area_m2, building_area_m2 = n.building_area_m2, book_value = n.book_value,
                 legal_status = n.legal_status, right_expiry_date = n.right_expiry_date,
                 utilization = n.utilization, utilization_raw = n.utilization_raw,
                 utilization_needs_review = n.utilization_needs_review, pic_unit = n.pic_unit, notes = n.notes,
                 last_monitored_at = n.last_monitored_at
           where x.id = a.id;
          v_action := 'updated';
        else
          v_action := 'unchanged';
        end if;

      else -- assessment
        if not d ? 'assessed_at' then
          raise exception 'Tanggal penilaian wajib diisi.';
        end if;
        select x.id, x.is_active into v_asset_id, v_asset_active from public.assets x where x.asset_code = v_code;
        if not found then
          raise exception 'Kode aset "%" tidak ditemukan.', left(v_code, 64);
        end if;
        if not v_asset_active then
          raise exception 'Aset nonaktif; pulihkan dulu.';
        end if;

        select * into s from public.assessments x
         where x.asset_id = v_asset_id and x.assessed_at = (d->>'assessed_at')::date
         order by x.created_at desc, x.id desc
         limit 1;
        v_exists := found;
        if not v_exists then
          s := null;
          s.critical_override := false;
        end if;
        t := s;
        if d ? 's_legal' then t.s_legal := (d->>'s_legal')::numeric; end if;
        if d ? 's_control' then t.s_control := (d->>'s_control')::numeric; end if;
        if d ? 's_physical' then t.s_physical := (d->>'s_physical')::numeric; end if;
        if d ? 's_utilization' then t.s_utilization := (d->>'s_utilization')::numeric; end if;
        if d ? 's_location' then t.s_location := (d->>'s_location')::numeric; end if;
        if d ? 's_strategic' then t.s_strategic := (d->>'s_strategic')::numeric; end if;
        if (d ? 's_legal' and (d->>'s_legal')::numeric <> t.s_legal)
           or (d ? 's_control' and (d->>'s_control')::numeric <> t.s_control)
           or (d ? 's_physical' and (d->>'s_physical')::numeric <> t.s_physical)
           or (d ? 's_utilization' and (d->>'s_utilization')::numeric <> t.s_utilization)
           or (d ? 's_location' and (d->>'s_location')::numeric <> t.s_location)
           or (d ? 's_strategic' and (d->>'s_strategic')::numeric <> t.s_strategic) then
          raise exception 'Skor harus bilangan bulat 1–5.';
        end if;
        if d ? 'critical_override' then t.critical_override := (d->>'critical_override')::boolean; end if;
        if d ? 'override_reason' then t.override_reason := btrim(d->>'override_reason'); end if;
        if d ? 'findings' then t.findings := btrim(d->>'findings'); end if;
        if d ? 'follow_up' then t.follow_up := btrim(d->>'follow_up'); end if;
        if d ? 'follow_up_pic' then t.follow_up_pic := btrim(d->>'follow_up_pic'); end if;
        if d ? 'target_date' then t.target_date := (d->>'target_date')::date; end if;

        if not v_exists then
          -- params_version diisi trigger (non-admin dipaksa versi aktif); nilai awal = versi aktif.
          insert into public.assessments (asset_id, assessed_at, params_version, s_legal, s_control, s_physical,
            s_utilization, s_location, s_strategic, critical_override, override_reason, findings, follow_up,
            follow_up_pic, target_date)
          values (v_asset_id, (d->>'assessed_at')::date, public.active_params_version(), t.s_legal, t.s_control,
            t.s_physical, t.s_utilization, t.s_location, t.s_strategic, t.critical_override, t.override_reason,
            t.findings, t.follow_up, t.follow_up_pic, t.target_date);
          v_action := 'inserted';
        elsif (t.s_legal, t.s_control, t.s_physical, t.s_utilization, t.s_location, t.s_strategic,
               t.critical_override, t.override_reason, t.findings, t.follow_up, t.follow_up_pic, t.target_date)
          is distinct from
              (s.s_legal, s.s_control, s.s_physical, s.s_utilization, s.s_location, s.s_strategic,
               s.critical_override, s.override_reason, s.findings, s.follow_up, s.follow_up_pic, s.target_date) then
          update public.assessments x
             set s_legal = t.s_legal, s_control = t.s_control, s_physical = t.s_physical,
                 s_utilization = t.s_utilization, s_location = t.s_location, s_strategic = t.s_strategic,
                 critical_override = t.critical_override, override_reason = t.override_reason,
                 findings = t.findings, follow_up = t.follow_up, follow_up_pic = t.follow_up_pic,
                 target_date = t.target_date
           where x.id = s.id;
          if not found then -- RLS: koreksi penilaian hanya admin
            raise exception 'Penilaian aset ini pada tanggal yang sama sudah ada dan berbeda; koreksi hanya dapat dilakukan admin.';
          end if;
          v_action := 'updated';
        else
          v_action := 'unchanged';
        end if;
      end if;

    exception when others then
      get stacked diagnostics v_state = returned_sqlstate, v_constraint = constraint_name, v_msg = message_text;
      v_action := 'error';
      v_msg := case
        when v_state = 'P0001' then v_msg                                   -- raise kita sendiri (di atas)
        when v_state in ('22007', '23514') and coalesce(v_constraint, '') = '' then v_msg -- raise trigger kita
        when v_constraint like '%text_len' then 'Teks melebihi batas panjang yang diizinkan.'
        when v_constraint like '%_range' then 'Skor harus bilangan bulat 1–5.'
        when v_constraint like '%nonneg' then 'Nilai luas/nilai buku tidak boleh negatif.'
        when v_constraint = 'assessments_override_reason' then 'Override kritis wajib disertai alasan.'
        when v_state = '23502' then 'Kolom wajib belum diisi.'
        when v_state = '23505' then 'Data duplikat.'
        when v_state = '23503' then 'Referensi data tidak valid.'
        when v_state = '42501' then 'Anda tidak memiliki hak untuk mengubah data ini.'
        when v_state in ('22003', '22P02', '22008', '22007') then 'Format atau besaran nilai tidak valid.'
        else 'Baris gagal diproses.'
      end;
    end;

    case v_action
      when 'inserted' then v_ins := v_ins + 1;
      when 'updated' then v_upd := v_upd + 1;
      when 'unchanged' then v_same := v_same + 1;
      else v_err := v_err + 1;
    end case;
    v_results := v_results || jsonb_strip_nulls(jsonb_build_object(
      'kind', v_kind, 'row', v_rownum, 'asset_code', v_code, 'action', v_action, 'message', v_msg));
  end loop;

  v_result := jsonb_build_object(
    'batch_id', batch_id, 'inserted', v_ins, 'updated', v_upd, 'unchanged', v_same, 'errors', v_err,
    'rows', v_results);

  -- rows_ok = baris yang berhasil di-commit; rows_error = ditolak saat validasi + gagal saat commit.
  update public.import_batches b
     set status = 'committed', committed_at = now(),
         rows_ok = v_ins + v_upd + v_same, rows_error = b.rows_error + v_err,
         report = b.report || jsonb_build_object('commit', v_result)
   where b.id = import_commit.batch_id;

  return v_result;
end;
$$;

revoke all on function public.import_commit(uuid, jsonb) from public, anon;
grant execute on function public.import_commit(uuid, jsonb) to authenticated;
