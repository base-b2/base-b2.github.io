-- BaseDays | Tests der Zugriffsregeln (Row Level Security)
-- Nach schema.sql im Supabase SQL Editor ausführen. Alles läuft in einer Transaktion und wird am Ende
-- zurückgerollt: Es bleiben keine Testdaten übrig.
-- Ergebnis: Eine Zeile "Alle 24 Zugriffstests bestanden." oder ein Fehler mit der Nummer des Tests.
--
-- Personen: Anna (Owner ihres Kalenders), Ben (tritt als Editor bei), Cem (tritt als Viewer bei).

begin;

insert into auth.users (id, email, aud, role, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'anna@test.invalid', 'authenticated', 'authenticated', '{"name":"Anna"}'),
  ('00000000-0000-0000-0000-00000000000b', 'ben@test.invalid',  'authenticated', 'authenticated', '{"name":"Ben"}'),
  ('00000000-0000-0000-0000-00000000000c', 'cem@test.invalid',  'authenticated', 'authenticated', '{"name":"Cem"}');

do $$
begin
  if (select count(*) from public.profiles where id::text like '00000000-0000-0000-0000-00000000000_') <> 3 then
    raise exception 'Test 1: Profile wurden nicht automatisch angelegt.'; end if;
  if (select count(*) from public.calendar_members m join public.calendars c on c.id = m.calendar_id
      where m.user_id = '00000000-0000-0000-0000-00000000000a' and m.rolle = 'owner' and c.name = 'Mein Kalender') <> 1 then
    raise exception 'Test 2: Erster Kalender fehlt.'; end if;
  perform set_config('bd.kal_a', (select id::text from public.calendars where erstellt_von = '00000000-0000-0000-0000-00000000000a'), true);
end $$;

-- ---------- Anna ----------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);

do $$
declare kal uuid := current_setting('bd.kal_a')::uuid; t uuid;
begin
  if (select count(*) from public.calendars) <> 1 then raise exception 'Test 3: Anna sieht nicht genau ihren Kalender.'; end if;
  insert into public.events (calendar_id, titel, beginn, ende) values (kal, 'Zahnarzt', '2026-12-01 09:00+01', '2026-12-01 10:00+01');
  if (select erstellt_von from public.events limit 1) <> auth.uid() then raise exception 'Test 4: erstellt_von nicht gesetzt.'; end if;
  insert into public.invitations (calendar_id, rolle) values (kal, 'editor') returning token into t;
  perform set_config('bd.einl_editor', t::text, true);
  insert into public.invitations (calendar_id, rolle) values (kal, 'viewer') returning token into t;
  perform set_config('bd.einl_viewer', t::text, true);
  insert into public.invitations (calendar_id, rolle, gueltig_bis) values (kal, 'editor', now() - interval '1 day') returning token into t;
  perform set_config('bd.einl_alt', t::text, true);
end $$;

-- ---------- Ben, noch kein Mitglied ----------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}', true);

do $$
declare kal uuid := current_setting('bd.kal_a')::uuid; ok boolean; n int;
begin
  if exists (select 1 from public.events where calendar_id = kal) or exists (select 1 from public.calendars where id = kal) then
    raise exception 'Test 5: Ben sieht fremden Kalender ohne Einladung.'; end if;
  ok := false; begin insert into public.events (calendar_id, titel, beginn, ende) values (kal, 'X', now(), now()); exception when others then ok := true; end;
  if not ok then raise exception 'Test 6: Ben konnte ohne Mitgliedschaft einen Termin anlegen.'; end if;
  ok := false; begin insert into public.calendar_members (calendar_id, user_id, rolle) values (kal, auth.uid(), 'owner'); exception when others then ok := true; end;
  if not ok then raise exception 'Test 7: Ben konnte sich selbst als Mitglied eintragen.'; end if;
  if exists (select 1 from public.invitations) then raise exception 'Test 8: Ben sieht Einladungen.'; end if;
  ok := false; begin perform public.bd_einladung_annehmen(current_setting('bd.einl_alt')::uuid); exception when others then ok := true; end;
  if not ok then raise exception 'Test 9: Abgelaufene Einladung wurde angenommen.'; end if;
  select count(*) into n from public.bd_einladung_ansehen(current_setting('bd.einl_editor')::uuid);
  if n <> 1 then raise exception 'Test 10: Einladungsvorschau fehlt.'; end if;
  perform public.bd_einladung_annehmen(current_setting('bd.einl_editor')::uuid);
  if (select count(*) from public.events where calendar_id = kal) <> 1 then raise exception 'Test 11: Ben sieht nach Beitritt die Termine nicht.'; end if;
end $$;

-- ---------- Ben als Editor ----------
do $$
declare kal uuid := current_setting('bd.kal_a')::uuid; ok boolean; n int;
begin
  insert into public.events (calendar_id, titel, beginn, ende) values (kal, 'Einkauf', '2026-12-02 17:00+01', '2026-12-02 18:00+01');
  update public.events set titel = 'Zahnarzt (verschoben)' where titel = 'Zahnarzt';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'Test 12: Editor konnte Termin nicht ändern.'; end if;
  ok := false; begin update public.calendar_members set rolle = 'owner' where user_id = auth.uid(); exception when others then ok := true; end;
  if not ok then raise exception 'Test 13: Editor konnte sich zum Owner machen.'; end if;
  ok := false; begin insert into public.invitations (calendar_id, rolle) values (kal, 'editor'); exception when others then ok := true; end;
  if not ok then raise exception 'Test 14: Editor konnte einladen.'; end if;
  delete from public.calendars where id = kal;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'Test 15: Editor konnte den Kalender löschen.'; end if;
end $$;

-- ---------- Cem als Viewer ----------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000c","role":"authenticated"}', true);

do $$
declare kal uuid := current_setting('bd.kal_a')::uuid; ok boolean; n int; ev uuid;
begin
  perform public.bd_einladung_annehmen(current_setting('bd.einl_viewer')::uuid);
  if (select count(*) from public.events where calendar_id = kal) <> 2 then raise exception 'Test 16: Viewer sieht die Termine nicht.'; end if;
  ok := false; begin insert into public.events (calendar_id, titel, beginn, ende) values (kal, 'X', now(), now()); exception when others then ok := true; end;
  if not ok then raise exception 'Test 17: Viewer konnte einen Termin anlegen.'; end if;
  update public.events set titel = 'gehackt' where calendar_id = kal;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'Test 18: Viewer konnte Termine ändern.'; end if;
  delete from public.events where calendar_id = kal;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'Test 19: Viewer konnte Termine löschen.'; end if;
  select id into ev from public.events where calendar_id = kal limit 1;
  insert into public.event_user_flags (event_id, datum) values (ev, '2026-12-01');
  ok := false; begin insert into public.event_user_flags (event_id, user_id, datum) values (ev, '00000000-0000-0000-0000-00000000000b', '2026-12-01'); exception when others then ok := true; end;
  if not ok then raise exception 'Test 20: Häkchen für eine andere Person gesetzt.'; end if;
  update public.calendar_members set sichtbar = false where user_id = '00000000-0000-0000-0000-00000000000b';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'Test 21: Viewer konnte Einstellungen anderer ändern.'; end if;
end $$;

-- ---------- Anna verwaltet Mitglieder ----------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);

do $$
declare kal uuid := current_setting('bd.kal_a')::uuid; ok boolean; n int;
begin
  update public.calendar_members set rolle = 'editor' where calendar_id = kal and user_id = '00000000-0000-0000-0000-00000000000c';
  ok := false; begin update public.calendar_members set rolle = 'owner' where calendar_id = kal and user_id = '00000000-0000-0000-0000-00000000000b'; exception when others then ok := true; end;
  if not ok then raise exception 'Test 22: Weitere Owner-Rolle vergeben.'; end if;
  delete from public.calendar_members where calendar_id = kal and user_id = auth.uid();
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'Test 23: Owner hat sich selbst entfernt (Kalender wäre verwaist).'; end if;
  delete from public.calendar_members where calendar_id = kal and user_id = '00000000-0000-0000-0000-00000000000b';
end $$;

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}', true);
do $$
begin
  if exists (select 1 from public.events where calendar_id = current_setting('bd.kal_a')::uuid) then
    raise exception 'Test 24: Entferntes Mitglied sieht weiter Termine.'; end if;
end $$;

select 'Alle 24 Zugriffstests bestanden.' as ergebnis;

rollback;
