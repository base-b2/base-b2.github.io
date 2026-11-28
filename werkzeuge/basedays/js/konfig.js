/* BaseDays | Verbindung zu Supabase.
   Beide Werte stehen im Supabase-Dashboard unter Project Settings -> API (bzw. "Data API" und "API Keys").
   Sie sind ÖFFENTLICH und für den Browser gedacht: Der "anon"/"publishable"-Schlüssel erlaubt nur, was die
   Zugriffsregeln in _werkstatt/basedays/schema.sql zulassen. Den geheimen "service_role"/"secret"-Schlüssel
   NIEMALS hier oder sonst im Repository eintragen.
   Leer gelassen zeigt BaseDays einen Hinweis statt der Anmeldung. */
export const SUPABASE_URL = '';        // z. B. 'https://abcdefghijklmnop.supabase.co'
export const SUPABASE_ANON_KEY = '';   // z. B. 'eyJhbGciOi...' oder 'sb_publishable_...'
