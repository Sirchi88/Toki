-- Toki: Cloud-Sync per Sync-Code (ohne Login).
-- Einmal komplett im Supabase SQL Editor ausführen (New query → einfügen → Run).
-- Gespeichert wird nur der SHA-256-Hash des Codes; direkter Tabellenzugriff ist gesperrt,
-- Lesen/Schreiben geht ausschließlich über die beiden Funktionen.

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.toki_sync (
  code_hash text primary key,
  daten jsonb not null,
  aktualisiert timestamptz not null default now()
);

alter table public.toki_sync enable row level security;
-- bewusst keine Policies: anon/authenticated können die Tabelle nicht direkt lesen oder schreiben

create or replace function public.toki_laden(p_code text)
returns table (daten jsonb, aktualisiert timestamptz)
language sql
security definer
set search_path = ''
as $$
  select s.daten, s.aktualisiert
  from public.toki_sync s
  where s.code_hash = encode(extensions.digest(p_code, 'sha256'), 'hex');
$$;

create or replace function public.toki_speichern(p_code text, p_daten jsonb, p_aktualisiert timestamptz)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_code is null or length(p_code) < 16 then
    raise exception 'Ungültiger Sync-Code';
  end if;
  if pg_column_size(p_daten) > 2000000 then
    raise exception 'Daten zu groß';
  end if;
  insert into public.toki_sync (code_hash, daten, aktualisiert)
  values (encode(extensions.digest(p_code, 'sha256'), 'hex'), p_daten, coalesce(p_aktualisiert, now()))
  on conflict (code_hash) do update
    set daten = excluded.daten, aktualisiert = excluded.aktualisiert;
end;
$$;

revoke all on function public.toki_laden(text) from public;
revoke all on function public.toki_speichern(text, jsonb, timestamptz) from public;
grant execute on function public.toki_laden(text) to anon, authenticated;
grant execute on function public.toki_speichern(text, jsonb, timestamptz) to anon, authenticated;
