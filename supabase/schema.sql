-- Toki: Tabelle für den Cloud-Sync (einmal im Supabase SQL Editor ausführen)
create table public.toki_daten (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  daten jsonb not null default '{}'::jsonb,
  aktualisiert timestamptz not null default now()
);

alter table public.toki_daten enable row level security;

create policy "eigene Daten lesen" on public.toki_daten
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "eigene Daten anlegen" on public.toki_daten
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "eigene Daten ändern" on public.toki_daten
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
