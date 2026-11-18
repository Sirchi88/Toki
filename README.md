<p align="center"><img src="assets/Toki-Logo.svg" width="140" alt="Toki"></p>

# Toki

**Feierabendrechner, Mehrarbeit, Zeitkonto, Urlaub und Netto – in einer App.**
Läuft im Browser am Handy (hochkant) und am PC, ohne Installation, ohne Login.

## Funktionen

| Reiter | Was er kann |
|---|---|
| **Feierabend** | Beginn eintragen → Gehzeiten für 7/8/9/10 h, Antippen übernimmt die Zeit. Pausen & halber Urlaubstag zuklappbar. Warnung bei > 10 h (gezählt wird max. 10 h). Konto-Ampel: Zeitkonto, offene MEA, Resturlaub. |
| **Mehrarbeit** | MEA-Kontingent je Monat, Wochen (KW) / Monate / Jahr, Zuschläge je Woche (erste 6 h +25 %, danach +50 %), Diagramme „Kommen & Gehen“ und „Stunden pro Tag“, Mehrarbeit nachbeantragen. |
| **Urlaub** | Kalender mit KW, Tarifurlaub, Zeitkonto, FZA, T-Zug, Sonderurlaub, Krank. Jahresüberblick, Urlaubsgeld, Resturlaub bis 31.03. des Folgejahres. |
| **Gehalt** | Netto des Monats – Ansicht **Aktuell** (alles aus dem Monat) oder **Auszahlung** (Mehrarbeit, Urlaubsgeld & Sonderzahlungen aus dem Vormonat) (Lohnsteuer-Tarif & SV-Werte 2026), aufgeteilt in Grundgehalt und Mehrarbeit, mit allen Sätzen und Rechenweg. **God Mode** zum freien Durchspielen. Export als **PDF-Bericht** und **Excel** mit Statistiken. |
| **⚙ (oben rechts)** | Einstellungen (Design, Arbeitszeit, Verdienst, Zeitkonto, Urlaub pro Jahr, Steuer) und Datentransport (Export/Import). |

**Designs:** Dark, Standard, Schwarz/Weiß, Blau, Grün, Rot-Weiß Arena, Neon City, Auswechselspieler, Werkhalle, Schaltschrank, Weihnachten, Airfryer.

## Rechenregeln (Kurzfassung)

- Soll: Wochenstunden ÷ 5 (Standard 35 h → 7 h/Tag). Mehrarbeit erst über dem Tagessoll.
- Wochentag-Pausen: Brotzeit 15 + Mittag 30 min. **Samstag/Sonn-/Feiertag:** keine Brotzeit, ab 6 h Anwesenheit 30 min Mittag (nie unter 6 h), alles zählt als Mehrarbeit.
- Überstunden gehen zuerst ins **MEA-Kontingent** des Monats, der Rest ins **Zeitkonto**. Endet ein Monat mitten in der Woche, zählt jeder Tag zum Kontingent seines Monats; Zuschläge und ZK-Verrechnung bleiben wochenweise. Samstagsstunden ins Zeitkonto: +25 % (abschaltbar).
- Zeitkonto-Tag: Wochensoll sinkt um 7 h, Plus derselben Woche wird zuerst damit verrechnet.
- Zeitkonto: fester Stand + Stichtag; ab dann rechnet Toki selbst. Geplante ZK-Tage werden als „verplant“ angezeigt.
- Urlaubsgeld je Tarifurlaubstag: Grundlohn ÷ 21,75 × 0,5 (einstellbar).
- Netto: Näherung nach § 32a EStG 2026 und SV-Werten 2026, getestet gegen veröffentlichte Vergleichswerte.

## Projektaufbau

```
src/
  core.js       Rechenkern (reine Funktionen, auch in Node nutzbar)
  app.js        Oberfläche, alle Reiter
  fx.js         animierte Design-Hintergründe
  sync.js       Sync per persönlichem Code (Supabase-RPC)
  report.js     PDF-Bericht und Excel-Export (xlsx ohne Bibliothek)
  style.css     Layout und Designs
  index.html    HTML-Vorlage
  logo*.svg     Logo
tests/
  core.test.js  Tests für den Rechenkern
supabase/
  schema.sql    Tabelle und Zugriffsregeln für den Cloud-Sync
build.py        baut alles zu einer einzigen index.html zusammen
index.html      fertige App (gebaut, direkt nutzbar)
assets/         Logo als PNG/SVG
```

## Bauen & Testen

```bash
python3 build.py          # erzeugt index.html aus src/
node tests/core.test.js   # Tests für den Rechenkern
```

Nach jeder Änderung in `src/` einmal `build.py` laufen lassen und die neue `index.html` mit committen.

## Online stellen (GitHub Pages)

Im Repository unter **Settings → Pages** als Quelle den Branch `main` und den Ordner `/ (root)` wählen. Danach ist Toki unter `https://<benutzer>.github.io/<repo>/` erreichbar und lässt sich am Handy über „Zum Home-Bildschirm“ wie eine App ablegen.

## Daten & Sync (Handy ↔ Laptop)

- Ohne Sync liegen alle Daten nur im Browser des jeweiligen Geräts (localStorage). Übertragen geht auch per **Mehr → Datentransport** (Export/Import).
- **Sync per persönlichem Code** (Mehr → Handy ↔ Laptop): Auf dem ersten Gerät „Sync-Code erstellen“, auf dem zweiten den Code eingeben oder den Sync-Link öffnen. Kein Login, kein Passwort, keine E-Mail.
- Jede Änderung wird automatisch hochgeladen; beim Öffnen der App wird der neueste Stand geholt (neuester Stand gewinnt, beim ersten Verbinden mit eigenen Daten wird gefragt).
- In Supabase liegt nur der SHA-256-Hash des Codes; die Tabelle ist direkt gesperrt, Zugriff nur über die Funktionen `toki_laden` / `toki_speichern`. Einrichtung: `supabase/schema.sql` einmal im SQL Editor ausführen.
- Der Sync funktioniert nur unter der eigenen Adresse (GitHub Pages), nicht in der Claude-Vorschau.

---
Keine Gewähr für Netto- und Steuerwerte – maßgeblich ist die Lohnabrechnung.
