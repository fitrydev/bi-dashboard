-- DIGENERATE oleh scripts/gen-parity-sql.ts dari lib/scoring/fixtures.json. Jangan diedit manual.
begin;
select plan(28);
select is(
  coalesce(public.compute_score(array[1,2,4,3,3,2]::smallint[], 1)::text, 'null') || '/' || coalesce(public.category_for(public.compute_score(array[1,2,4,3,3,2]::smallint[], 1), false, 1)::text, 'unrated'),
  '47.0/medium',
  'paritas: Excel (1,2,4,3,3,2)');
select is(
  coalesce(public.compute_score(array[1,2,4,3,3,2]::smallint[], 1)::text, 'null') || '/' || coalesce(public.category_for(public.compute_score(array[1,2,4,3,3,2]::smallint[], 1), true, 1)::text, 'unrated'),
  '47.0/critical',
  'paritas: override kritis');
select is(
  coalesce(public.compute_score(array[1,1,1,1,1,1]::smallint[], 1)::text, 'null') || '/' || coalesce(public.category_for(public.compute_score(array[1,1,1,1,1,1]::smallint[], 1), false, 1)::text, 'unrated'),
  '20.0/low',
  'paritas: semua 1');
select is(
  coalesce(public.compute_score(array[5,5,5,5,5,5]::smallint[], 1)::text, 'null') || '/' || coalesce(public.category_for(public.compute_score(array[5,5,5,5,5,5]::smallint[], 1), false, 1)::text, 'unrated'),
  '100.0/critical',
  'paritas: semua 5');
select is(
  coalesce(public.compute_score(array[3,3,3,3,3,3]::smallint[], 1)::text, 'null') || '/' || coalesce(public.category_for(public.compute_score(array[3,3,3,3,3,3]::smallint[], 1), false, 1)::text, 'unrated'),
  '60.0/high',
  'paritas: semua 3');
select is(
  coalesce(public.compute_score(array[1,2,null,3,3,2]::smallint[], 1)::text, 'null') || '/' || coalesce(public.category_for(public.compute_score(array[1,2,null,3,3,2]::smallint[], 1), false, 1)::text, 'unrated'),
  'null/unrated',
  'paritas: tak lengkap');
select is(
  coalesce(public.compute_score(array[null,null,null,null,null,null]::smallint[], 1)::text, 'null') || '/' || coalesce(public.category_for(public.compute_score(array[null,null,null,null,null,null]::smallint[], 1), false, 1)::text, 'unrated'),
  'null/unrated',
  'paritas: kosong');
select is(
  coalesce(public.compute_score(array[null,null,null,null,null,null]::smallint[], 1)::text, 'null') || '/' || coalesce(public.category_for(public.compute_score(array[null,null,null,null,null,null]::smallint[], 1), true, 1)::text, 'unrated'),
  'null/critical',
  'paritas: kosong + override');
select is(
  coalesce(public.compute_score(array[1,4,2,2,2,4]::smallint[], 1)::text, 'null') || '/' || coalesce(public.category_for(public.compute_score(array[1,4,2,2,2,4]::smallint[], 1), false, 1)::text, 'unrated'),
  '52.0/medium',
  'paritas: acak 1');
select is(
  coalesce(public.compute_score(array[2,5,4,4,5,4]::smallint[], 1)::text, 'null') || '/' || coalesce(public.category_for(public.compute_score(array[2,5,4,4,5,4]::smallint[], 1), false, 1)::text, 'unrated'),
  '79.0/high',
  'paritas: acak 2');
select is(
  coalesce(public.compute_score(array[4,1,1,4,2,1]::smallint[], 1)::text, 'null') || '/' || coalesce(public.category_for(public.compute_score(array[4,1,1,4,2,1]::smallint[], 1), false, 1)::text, 'unrated'),
  '43.0/medium',
  'paritas: acak 3');
select is(
  coalesce(public.compute_score(array[4,1,2,2,3,4]::smallint[], 1)::text, 'null') || '/' || coalesce(public.category_for(public.compute_score(array[4,1,2,2,3,4]::smallint[], 1), false, 1)::text, 'unrated'),
  '51.0/medium',
  'paritas: acak 4');
select is(
  coalesce(public.compute_score(array[4,2,5,4,4,4]::smallint[], 1)::text, 'null') || '/' || coalesce(public.category_for(public.compute_score(array[4,2,5,4,4,4]::smallint[], 1), false, 1)::text, 'unrated'),
  '73.0/high',
  'paritas: acak 5');
select is(
  coalesce(public.compute_score(array[2,1,2,1,4,1]::smallint[], 1)::text, 'null') || '/' || coalesce(public.category_for(public.compute_score(array[2,1,2,1,4,1]::smallint[], 1), false, 1)::text, 'unrated'),
  '33.0/low',
  'paritas: acak 6');
select is(
  coalesce(public.compute_score(array[1,5,2,5,1,5]::smallint[], 1)::text, 'null') || '/' || coalesce(public.category_for(public.compute_score(array[1,5,2,5,1,5]::smallint[], 1), true, 1)::text, 'unrated'),
  '67.0/critical',
  'paritas: acak 7');
select is(
  coalesce(public.compute_score(array[5,2,1,5,4,1]::smallint[], 1)::text, 'null') || '/' || coalesce(public.category_for(public.compute_score(array[5,2,1,5,4,1]::smallint[], 1), false, 1)::text, 'unrated'),
  '59.0/medium',
  'paritas: acak 8');
select is(
  coalesce(public.compute_score(array[4,3,3,4,3,4]::smallint[], 1)::text, 'null') || '/' || coalesce(public.category_for(public.compute_score(array[4,3,3,4,3,4]::smallint[], 1), false, 1)::text, 'unrated'),
  '70.0/high',
  'paritas: acak 9');
select is(
  coalesce(public.compute_score(array[2,1,2,1,3,4]::smallint[], 1)::text, 'null') || '/' || coalesce(public.category_for(public.compute_score(array[2,1,2,1,3,4]::smallint[], 1), false, 1)::text, 'unrated'),
  '40.0/medium',
  'paritas: acak 10');
select is(
  coalesce(public.compute_score(array[4,3,5,1,4,4]::smallint[], 1)::text, 'null') || '/' || coalesce(public.category_for(public.compute_score(array[4,3,5,1,4,4]::smallint[], 1), false, 1)::text, 'unrated'),
  '69.0/high',
  'paritas: acak 11');
select is(
  coalesce(public.compute_score(array[4,2,2,4,1,5]::smallint[], 1)::text, 'null') || '/' || coalesce(public.category_for(public.compute_score(array[4,2,2,4,1,5]::smallint[], 1), false, 1)::text, 'unrated'),
  '61.0/high',
  'paritas: acak 12');
select is(
  coalesce(public.compute_score(array[3,5,1,1,1,2]::smallint[], 1)::text, 'null') || '/' || coalesce(public.category_for(public.compute_score(array[3,5,1,1,1,2]::smallint[], 1), false, 1)::text, 'unrated'),
  '51.0/medium',
  'paritas: acak 13');
select is(
  coalesce(public.compute_score(array[5,4,1,4,5,5]::smallint[], 1)::text, 'null') || '/' || coalesce(public.category_for(public.compute_score(array[5,4,1,4,5,5]::smallint[], 1), true, 1)::text, 'unrated'),
  '80.0/critical',
  'paritas: acak 14');
select is(
  coalesce(public.compute_score(array[5,3,5,5,3,5]::smallint[], 1)::text, 'null') || '/' || coalesce(public.category_for(public.compute_score(array[5,3,5,5,3,5]::smallint[], 1), false, 1)::text, 'unrated'),
  '86.0/critical',
  'paritas: acak 15');
select is(
  coalesce(public.compute_score(array[2,4,5,2,5,4]::smallint[], 1)::text, 'null') || '/' || coalesce(public.category_for(public.compute_score(array[2,4,5,2,5,4]::smallint[], 1), false, 1)::text, 'unrated'),
  '71.0/high',
  'paritas: acak 16');
select is(
  coalesce(public.compute_score(array[1,5,3,3,1,2]::smallint[], 1)::text, 'null') || '/' || coalesce(public.category_for(public.compute_score(array[1,5,3,3,1,2]::smallint[], 1), false, 1)::text, 'unrated'),
  '55.0/medium',
  'paritas: acak 17');
select is(
  coalesce(public.compute_score(array[4,1,1,4,4,4]::smallint[], 1)::text, 'null') || '/' || coalesce(public.category_for(public.compute_score(array[4,1,1,4,4,4]::smallint[], 1), false, 1)::text, 'unrated'),
  '56.0/medium',
  'paritas: acak 18');
select is(
  coalesce(public.compute_score(array[1,3,4,1,5,5]::smallint[], 1)::text, 'null') || '/' || coalesce(public.category_for(public.compute_score(array[1,3,4,1,5,5]::smallint[], 1), false, 1)::text, 'unrated'),
  '59.0/medium',
  'paritas: acak 19');
select is(
  coalesce(public.compute_score(array[1,1,5,3,4,5]::smallint[], 1)::text, 'null') || '/' || coalesce(public.category_for(public.compute_score(array[1,1,5,3,4,5]::smallint[], 1), false, 1)::text, 'unrated'),
  '56.0/medium',
  'paritas: acak 20');
select * from finish();
rollback;
