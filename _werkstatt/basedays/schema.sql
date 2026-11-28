-- BaseDays | Datenbank-Schema für Supabase (Postgres)
-- Einmal komplett im Supabase-Dashboard ausführen: SQL Editor -> New query -> einfügen -> Run.
-- Das Skript ist wiederholbar (löscht und erstellt die BaseDays-Objekte neu). ACHTUNG: dabei gehen alle Daten verloren.
--
-- Grundsatz: Die Zugriffsrechte stehen hier in der Datenbank (Row Level Security), nicht im Browser.
-- Auch wer den JavaScript-Code verändert, kommt nur an Kalender, in denen er Mitglied ist.
--
-- Rollen pro Kalender:
--   owner  = Besitzer:in: alles, inkl. Mitglieder verwalten, einladen, Kalender löschen
--   editor = Bearbeiten: Termine anlegen, ändern, löschen
--   viewer = Lesen: nur ansehen (eigene "erledigt"-Häkchen setzen darf jede Rolle)
--
-- Ganztägige Termine: beginn/ende = Tag 00:00 UTC, ende = letzter Tag (einschließlich).
-- Termine mit Uhrzeit: echte Zeitpunkte (timestamptz).

-- ---------- Aufräumen (für erneutes Ausführen) ----------
drop table if exists public.event_user_flags cascade;
drop table if exists public.events cascade;
drop table if exists public.invitations cascade;
drop table if exists public.calendar_members cascade;
drop table if exists public.calendars cascade;
drop table if exists public.profiles cascade;
drop type if exists public.rolle cascade;
drop function if exists public.bd_neuer_benutzer() cascade;

create type public.rolle as enum ('owner', 'editor', 'viewer');

-- ---------- Tabellen ----------
create table public.profiles (
  id        uuid primary key references auth.users (id) on delete cascade,
  name      text not null check (char_length(name) between 1 and 60),
  farbe     text not null default '#6A1B2B' check (farbe ~ '^#[0-9A-Fa-f]{6}$'),
  erstellt  timestamptz not null default now()
);

create table public.calendars (
  id           uuid primary key default gen_random_uuid(),
  name         text not null check (char_length(name) between 1 and 60),
  farbe        text not null default '#6A1B2B' check (farbe ~ '^#[0-9A-Fa-f]{6}$'),
  erstellt_von uuid not null references public.profiles (id) on delete cascade,
  erstellt     timestamptz not null default now()
);

create table public.calendar_members (
  calendar_id uuid not null references public.calendars (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  rolle       public.rolle not null default 'viewer',
  sichtbar    boolean not null default true,
  beigetreten timestamptz not null default now(),
  primary key (calendar_id, user_id)
);
create index on public.calendar_members (user_id);

create table public.invitations (
  id           uuid primary key default gen_random_uuid(),
  calendar_id  uuid not null references public.calendars (id) on delete cascade,
  token        uuid not null unique default gen_random_uuid(),   -- 122 Bit Zufall, steckt im Einladungslink
  rolle        public.rolle not null default 'editor' check (rolle <> 'owner'),
  erstellt_von uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  gueltig_bis  timestamptz not null default now() + interval '14 days',
  erstellt     timestamptz not null default now()
);

create table public.events (
  id               uuid primary key default gen_random_uuid(),
  calendar_id      uuid not null references public.calendars (id) on delete cascade,
  titel            text not null check (char_length(btrim(titel)) between 1 and 120),
  beschreibung     text not null default '' check (char_length(beschreibung) <= 4000),
  ort              text not null default '' check (char_length(ort) <= 200),
  ganztaegig       boolean not null default false,
  beginn           timestamptz not null,
  ende             timestamptz not null,
  farbe            text check (farbe is null or farbe ~ '^#[0-9A-Fa-f]{6}$'),   -- null = Farbe des Kalenders
  wiederholung     text not null default 'keine'
                   check (wiederholung in ('keine', 'taeglich', 'woechentlich', 'monatlich', 'jaehrlich')),
  wiederholung_bis date,
  erstellt_von     uuid default auth.uid() references public.profiles (id) on delete set null,
  erstellt         timestamptz not null default now(),
  geaendert        timestamptz not null default now(),
  check (ende >= beginn),
  check (wiederholung_bis is null or wiederholung_bis >= (beginn at time zone 'UTC')::date - 1)
);
create index on public.events (calendar_id, beginn);

create table public.event_user_flags (
  event_id uuid not null references public.events (id) on delete cascade,
  user_id  uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  datum    date not null,                       -- Tag des Vorkommens (wichtig bei Wiederholungen)
  erledigt boolean not null default true,
  primary key (event_id, user_id, datum)
);

-- ---------- Hilfsfunktionen für die Regeln ----------
-- security definer: lesen calendar_members ohne selbst an dessen Regeln zu hängen (sonst Endlosschleife).
create or replace function public.bd_rolle(kal uuid) returns public.rolle
language sql stable security definer set search_path = public as $$
  select rolle from public.calendar_members where calendar_id = kal and user_id = auth.uid()
$$;

create or replace function public.bd_ist_mitglied(kal uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.bd_rolle(kal) is not null
$$;

create or replace function public.bd_darf_schreiben(kal uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.bd_rolle(kal) in ('owner', 'editor'), false)
$$;

create or replace function public.bd_ist_owner(kal uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.bd_rolle(kal) = 'owner', false)
$$;

create or replace function public.bd_teilt_kalender_mit(anderer uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.calendar_members a
    join public.calendar_members b on a.calendar_id = b.calendar_id
    where a.user_id = auth.uid() and b.user_id = anderer)
$$;

-- ---------- Trigger ----------
-- Neues Konto: Profil + erster Kalender "Mein Kalender".
create or replace function public.bd_neuer_benutzer() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  farben text[] := array['#6A1B2B', '#1C2E4A', '#5B4B8A', '#2F6690', '#1F6B6B', '#1F7A47', '#8A5A1C', '#5A6070'];
  kal uuid;
  n text := btrim(coalesce(new.raw_user_meta_data ->> 'name', ''));
begin
  if n = '' then n := split_part(new.email, '@', 1); end if;
  insert into public.profiles (id, name, farbe)
    values (new.id, left(n, 60), farben[1 + floor(random() * 8)::int]);
  insert into public.calendars (name, farbe, erstellt_von) values ('Mein Kalender', '#1C2E4A', new.id) returning id into kal;
  insert into public.calendar_members (calendar_id, user_id, rolle) values (kal, new.id, 'owner');
  return new;
end $$;
create trigger bd_neuer_benutzer after insert on auth.users
  for each row execute function public.bd_neuer_benutzer();

-- Mitgliedschaften: Rolle ändern nur durch Owner, nie zu/von Owner; "sichtbar" nur für sich selbst.
create or replace function public.bd_mitglied_pruefen() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.calendar_id <> old.calendar_id or new.user_id <> old.user_id then
    raise exception 'Kalender und Person einer Mitgliedschaft sind fest.';
  end if;
  if new.rolle is distinct from old.rolle then
    if not public.bd_ist_owner(old.calendar_id) or old.rolle = 'owner' or new.rolle = 'owner' then
      raise exception 'Rolle darf nur die Besitzerin oder der Besitzer ändern (nicht die eigene).';
    end if;
  end if;
  if new.sichtbar is distinct from old.sichtbar and old.user_id <> auth.uid() then
    raise exception 'Sichtbarkeit stellt jede Person nur für sich selbst ein.';
  end if;
  return new;
end $$;
create trigger bd_mitglied_pruefen before update on public.calendar_members
  for each row execute function public.bd_mitglied_pruefen();

-- Termine: Ersteller:in und Erstellzeit fest, Änderungszeit automatisch.
create or replace function public.bd_termin_stempel() returns trigger
language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    new.erstellt_von := auth.uid();
    new.erstellt := now();
  else
    new.erstellt_von := old.erstellt_von;
    new.erstellt := old.erstellt;
  end if;
  new.geaendert := now();
  return new;
end $$;
create trigger bd_termin_stempel before insert or update on public.events
  for each row execute function public.bd_termin_stempel();

-- Kalender: Ersteller:in fest.
create or replace function public.bd_kalender_fest() returns trigger
language plpgsql as $$
begin
  new.erstellt_von := old.erstellt_von;
  new.erstellt := old.erstellt;
  return new;
end $$;
create trigger bd_kalender_fest before update on public.calendars
  for each row execute function public.bd_kalender_fest();

-- ---------- Row Level Security ----------
alter table public.profiles         enable row level security;
alter table public.calendars        enable row level security;
alter table public.calendar_members enable row level security;
alter table public.invitations      enable row level security;
alter table public.events           enable row level security;
alter table public.event_user_flags enable row level security;

-- Profile: sich selbst und Personen aus gemeinsamen Kalendern sehen; nur das eigene ändern.
create policy profil_lesen on public.profiles for select to authenticated
  using (id = auth.uid() or public.bd_teilt_kalender_mit(id));
create policy profil_aendern on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- Kalender: Mitglieder lesen, Owner ändert/löscht. Anlegen nur über bd_kalender_anlegen().
create policy kalender_lesen on public.calendars for select to authenticated
  using (public.bd_ist_mitglied(id));
create policy kalender_aendern on public.calendars for update to authenticated
  using (public.bd_ist_owner(id)) with check (public.bd_ist_owner(id));
create policy kalender_loeschen on public.calendars for delete to authenticated
  using (public.bd_ist_owner(id));

-- Mitglieder: Mitglieder sehen einander. Eintreten nur über Einladung (Funktion).
create policy mitglied_lesen on public.calendar_members for select to authenticated
  using (public.bd_ist_mitglied(calendar_id));
create policy mitglied_aendern on public.calendar_members for update to authenticated
  using (user_id = auth.uid() or public.bd_ist_owner(calendar_id));
create policy mitglied_entfernen on public.calendar_members for delete to authenticated
  using (rolle <> 'owner' and (user_id = auth.uid() or public.bd_ist_owner(calendar_id)));

-- Einladungen: nur Owner sehen, erstellen, löschen. Annehmen über bd_einladung_annehmen().
create policy einladung_lesen on public.invitations for select to authenticated
  using (public.bd_ist_owner(calendar_id));
create policy einladung_anlegen on public.invitations for insert to authenticated
  with check (public.bd_ist_owner(calendar_id) and erstellt_von = auth.uid());
create policy einladung_loeschen on public.invitations for delete to authenticated
  using (public.bd_ist_owner(calendar_id));

-- Termine: Mitglieder lesen; Owner und Editor schreiben (auch beim Verschieben in einen anderen Kalender).
create policy termin_lesen on public.events for select to authenticated
  using (public.bd_ist_mitglied(calendar_id));
create policy termin_anlegen on public.events for insert to authenticated
  with check (public.bd_darf_schreiben(calendar_id));
create policy termin_aendern on public.events for update to authenticated
  using (public.bd_darf_schreiben(calendar_id)) with check (public.bd_darf_schreiben(calendar_id));
create policy termin_loeschen on public.events for delete to authenticated
  using (public.bd_darf_schreiben(calendar_id));

-- Erledigt-Häkchen: alle Mitglieder sehen sie, jede Person setzt nur die eigenen.
create policy haken_lesen on public.event_user_flags for select to authenticated
  using (exists (select 1 from public.events e where e.id = event_id and public.bd_ist_mitglied(e.calendar_id)));
create policy haken_anlegen on public.event_user_flags for insert to authenticated
  with check (user_id = auth.uid()
    and exists (select 1 from public.events e where e.id = event_id and public.bd_ist_mitglied(e.calendar_id)));
create policy haken_aendern on public.event_user_flags for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy haken_loeschen on public.event_user_flags for delete to authenticated
  using (user_id = auth.uid());

-- Nicht angemeldete Besucher:innen bekommen gar nichts.
revoke all on public.profiles, public.calendars, public.calendar_members, public.invitations,
  public.events, public.event_user_flags from anon;

-- ---------- Funktionen für die App (RPC) ----------
create or replace function public.bd_kalender_anlegen(p_name text, p_farbe text)
returns public.calendars language plpgsql security definer set search_path = public as $$
declare k public.calendars;
begin
  if auth.uid() is null then raise exception 'Nicht angemeldet.'; end if;
  insert into public.calendars (name, farbe, erstellt_von) values (btrim(p_name), p_farbe, auth.uid()) returning * into k;
  insert into public.calendar_members (calendar_id, user_id, rolle) values (k.id, auth.uid(), 'owner');
  return k;
end $$;

-- Vorschau vor dem Annehmen: welcher Kalender, von wem, mit welcher Rolle.
create or replace function public.bd_einladung_ansehen(p_token uuid)
returns table (kalender text, farbe text, von text, rolle public.rolle, gueltig_bis timestamptz, schon_mitglied boolean)
language sql stable security definer set search_path = public as $$
  select c.name, c.farbe, p.name, i.rolle, i.gueltig_bis, public.bd_ist_mitglied(c.id)
  from public.invitations i
  join public.calendars c on c.id = i.calendar_id
  join public.profiles p on p.id = i.erstellt_von
  where i.token = p_token and i.gueltig_bis > now() and auth.uid() is not null
$$;

-- Annehmen: Mitgliedschaft anlegen. Ein Link gilt für beliebig viele Personen bis zum Ablauf.
-- Wer schon Mitglied ist, behält die bisherige Rolle.
create or replace function public.bd_einladung_annehmen(p_token uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare e public.invitations;
begin
  if auth.uid() is null then raise exception 'Nicht angemeldet.'; end if;
  select * into e from public.invitations where token = p_token and gueltig_bis > now();
  if not found then raise exception 'Einladung ungültig oder abgelaufen.'; end if;
  insert into public.calendar_members (calendar_id, user_id, rolle)
    values (e.calendar_id, auth.uid(), e.rolle)
    on conflict (calendar_id, user_id) do nothing;
  return e.calendar_id;
end $$;

-- Konto löschen (DSGVO): löscht Login, Profil, eigene Kalender samt Terminen, alle Mitgliedschaften.
create or replace function public.bd_konto_loeschen()
returns void language plpgsql security definer set search_path = public, auth as $$
begin
  if auth.uid() is null then raise exception 'Nicht angemeldet.'; end if;
  delete from auth.users where id = auth.uid();
end $$;

revoke execute on function public.bd_kalender_anlegen(text, text), public.bd_einladung_ansehen(uuid),
  public.bd_einladung_annehmen(uuid), public.bd_konto_loeschen() from public, anon;
grant execute on function public.bd_kalender_anlegen(text, text), public.bd_einladung_ansehen(uuid),
  public.bd_einladung_annehmen(uuid), public.bd_konto_loeschen() to authenticated;
revoke execute on function public.bd_rolle(uuid), public.bd_ist_mitglied(uuid), public.bd_darf_schreiben(uuid),
  public.bd_ist_owner(uuid), public.bd_teilt_kalender_mit(uuid) from public, anon;
grant execute on function public.bd_rolle(uuid), public.bd_ist_mitglied(uuid), public.bd_darf_schreiben(uuid),
  public.bd_ist_owner(uuid), public.bd_teilt_kalender_mit(uuid) to authenticated;

-- ---------- Realtime ----------
-- Änderungen an diesen Tabellen werden an angemeldete Mitglieder gemeldet (Realtime prüft dieselben Regeln).
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin alter publication supabase_realtime add table public.events; exception when duplicate_object then null; end;
    begin alter publication supabase_realtime add table public.calendars; exception when duplicate_object then null; end;
    begin alter publication supabase_realtime add table public.calendar_members; exception when duplicate_object then null; end;
    begin alter publication supabase_realtime add table public.event_user_flags; exception when duplicate_object then null; end;
  end if;
end $$;
