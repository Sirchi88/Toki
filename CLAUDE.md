# Toki – Hinweise für die Weiterentwicklung

- Sprache der App und aller Texte: Deutsch (du-Form).
- Keine Build-Tools/Abhängigkeiten: reines HTML/CSS/JS. `python3 build.py` erzeugt die eigenständige `index.html` im Repo-Root – nach Änderungen in `src/` immer neu bauen und mit committen.
- Rechenlogik gehört nach `src/core.js` (reine Funktionen, keine DOM-Zugriffe) und bekommt einen Test in `tests/core.test.js` (`node tests/core.test.js`).
- Daten liegen unter dem localStorage-Schlüssel `takt-v1` (historischer Name – nicht ändern, sonst gehen Nutzerdaten verloren). Neue Felder über `Core.defaults()` ergänzen; `merge()` füllt sie bei Bestandsdaten auf.
- Fachregeln (vom Nutzer vorgegeben):
  - 35-h-Woche, Tagessoll 7 h; Mehrarbeit erst über 7 h/Tag; max. 10 h/Tag (Warnung, Deckel).
  - Zuschläge je Woche: erste 6 Überstunden +25 %, ab der 7. +50 %.
  - Samstag: keine Brotzeit, ab 6 h Anwesenheit 30 min Mittag (nie unter 6 h); alles Mehrarbeit; Samstag ins Zeitkonto +25 % (abschaltbar).
  - Reihenfolge: MEA-Kontingent des Monats → Rest ins Zeitkonto (±35 h, darüber Warnung + „Mehrarbeit nachbeantragen“).
  - ZK-Urlaubstag senkt das Wochensoll um 7 h; Plus derselben Woche wird zuerst damit verrechnet.
  - Tarifurlaub gilt bis 31.03. des Folgejahres; T-Zug nur im Kalenderjahr; halbe Tage nur bei Tarifurlaub oder Zeitkonto.
  - Urlaubsgeld je Tarifurlaubstag: Grundlohn ÷ 21,75 × 0,5.
- Cloud-Sync: `src/sync.js` spricht die Supabase-REST/Auth-API direkt per `fetch` an (keine Bibliothek). Tabelle `toki_daten` (eine Zeile pro Nutzer, Spalte `daten` = kompletter App-Zustand als JSON), Schema in `supabase/schema.sql`. Nur der Publishable Key gehört in den Code, niemals der Secret Key.
- Keine echten Vereins-/Markenlogos oder -namen in Designs.
