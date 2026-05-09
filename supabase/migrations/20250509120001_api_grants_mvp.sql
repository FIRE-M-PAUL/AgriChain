-- Ensure anon/authenticated can reach MVP tables over PostgREST (fixes permission denied on some projects).

grant usage on schema public to anon, authenticated;

grant select, insert, update on table public.farmers to anon, authenticated;
grant select, insert, update on table public.products to anon, authenticated;
grant select, insert, update on table public.transactions to anon, authenticated;
grant select, insert, update on table public.buyer_orders to anon, authenticated;
grant select, insert, update on table public.verification_records to anon, authenticated;
