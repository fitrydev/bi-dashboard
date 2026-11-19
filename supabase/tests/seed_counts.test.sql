-- Bergantung pada supabase/seed.sql (dimuat oleh db reset). Tanggal acuan tetap 2026-11-19.
begin;
select plan(7);

select is((select count(*)::int from public.assets), 136, '136 aset');
select is((select sum(book_value) from public.assets where not value_is_placeholder), 143864027618.46, 'total nilai buku non-placeholder');
select is((select count(*)::int from public.assets where value_is_placeholder), 44, '44 nilai placeholder');
select is((select count(*)::int from public.assets where right_expiry_date < date '2026-11-19'), 3, '3 hak kedaluwarsa');
select is((select count(*)::int from public.assets where right_expiry_date >= date '2026-11-19' and right_expiry_date < date '2026-11-19' + interval '12 months'), 1, '1 hak berakhir < 12 bulan');
select is((select count(*)::int from public.assets where utilization = 'idle_kosong'), 13, '13 idle/kosong');
select results_eq(
  $$select total_score, category from public.assessments where assessed_at = date '2026-11-18'$$,
  $$values (47.0::numeric(4,1), 'medium'::risk_category)$$,
  'penilaian seed 47,0 medium');

select * from finish();
rollback;
