/* Tests für den Rechenkern: `node tests/core.test.js` */
const assert = require('assert');
const C = require('../src/core.js');

let passed = 0;
const tests = [];
const test = (name, fn) => tests.push([name, fn]);
const ent = (s, e, p = 45) => { const r = C.workedRaw(s, e, p); return { start: s, end: e, pause: p, ...C.capDay(r), raw: r }; };
const base = () => { const S = C.defaults(); S.lohn.grundlohn = 4000; return S; };

test('Arbeitszeit: 07:00–15:45 mit 45 min Pause = 8 h', () => {
  assert.strictEqual(C.workedRaw('07:00', '15:45', 45), 8);
});

test('Deckel bei 10 Stunden', () => {
  assert.deepStrictEqual(C.capDay(10.75), { hours: 10, capped: true });
});

test('Samstag: keine Brotzeit, ab 6 h Anwesenheit 30 min Mittag, nie unter 6 h', () => {
  assert.strictEqual(C.specialPause(5 * 60), 0);
  assert.strictEqual(C.specialPause(6 * 60 + 20), 20);
  assert.strictEqual(C.specialPause(8 * 60), 30);
});

test('Zeitkonto-Tag: Mo–Do je +1 h, Fr ZK => −3 h, Kontingent bleibt unberührt', () => {
  const S = base(); S.zk.stand = 10; S.zk.datum = '2026-11-01';
  const st = { settings: S, entries: {}, absences: [{ id: 'a', from: '2026-11-13', to: '2026-11-13', type: 'zk', created: 1 }], kontingent: { '2026-11': 10 }, nach: [] };
  for (const d of ['2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12']) st.entries[d] = ent('07:00', '15:45');
  const c = C.compute(st, '2026-11-16');
  const w = c.weekMap.get('2026-11-09');
  assert.strictEqual(w.mehr, 0);
  assert.strictEqual(w.zkChange, -3);
  assert.strictEqual(c.zk, 7);
});

test('Kontingent zuerst, Rest ins Zeitkonto, Zuschläge je Woche', () => {
  const S = base();
  const st = { settings: S, entries: {}, absences: [], kontingent: { '2026-11': 6 }, nach: [] };
  for (const d of ['2026-11-16', '2026-11-17', '2026-11-18', '2026-11-19', '2026-11-20']) st.entries[d] = ent('07:00', '16:45');
  st.entries['2026-11-21'] = ent('07:00', '11:00', 0);
  const w = C.compute(st, '2026-11-21').weekMap.get('2026-11-16');
  assert.strictEqual(w.mehr, 6);
  assert.strictEqual(w.toZK, 8);
  assert.strictEqual(w.pay.h25, 6);
});

test('Samstag ins Zeitkonto: +25 % Zeitzuschlag', () => {
  const S = base();
  const st = { settings: S, entries: {}, absences: [], kontingent: { '2026-11': 2 }, nach: [] };
  for (const d of ['2026-11-16', '2026-11-17', '2026-11-18', '2026-11-19', '2026-11-20']) st.entries[d] = ent('07:00', '16:45');
  st.entries['2026-11-21'] = ent('07:00', '11:00', 0);
  const w = C.compute(st, '2026-11-21').weekMap.get('2026-11-16');
  assert.strictEqual(w.bonus, 0.5);
});

test('Nachbeantragte Mehrarbeit wird separat ausgewiesen', () => {
  const S = base();
  const st = { settings: S, entries: {}, absences: [], kontingent: { '2026-11': 2 }, nach: [{ month: '2026-11', hours: 4 }] };
  for (const d of ['2026-11-16', '2026-11-17', '2026-11-18', '2026-11-19', '2026-11-20']) st.entries[d] = ent('07:00', '16:45');
  const w = C.compute(st, '2026-11-21').weekMap.get('2026-11-16');
  assert.strictEqual(w.mehr, 6);
  assert.strictEqual(w.mehrNach, 4);
});

test('Nachgetragener ZK-Tag vor dem Stichtag wird abgezogen, geplanter als "verplant"', () => {
  const S = base(); S.zk.stand = 34.88; S.zk.datum = '2026-11-16'; S.zk.setAt = 1000;
  const st = { settings: S, entries: {}, absences: [{ id: 'a', from: '2026-11-13', to: '2026-11-13', type: 'zk', created: 2000 }, { id: 'b', from: '2026-11-27', to: '2026-11-27', type: 'zk', created: 2000 }], kontingent: {}, nach: [] };
  const c = C.compute(st, '2026-11-16');
  assert.strictEqual(Math.round(c.zk * 100) / 100, 27.88);
  assert.strictEqual(c.zkVerplant, 7);
});

test('Feiertage Bayern 2026 (Ostern 05.04.)', () => {
  const h = C.holidays(2026, { land: 'BY', mariae: true });
  assert.strictEqual(C.easter(2026), '2026-04-05');
  assert.ok(h.has('2026-04-03') && h.has('2026-06-04') && h.has('2026-11-01') && h.has('2026-08-15'));
});

test('Urlaub: Stand 11 Tage, Heiligabend als halber Tag, Rest bis 31.03. ins Folgejahr', () => {
  const S = base(); S.urlaub.jahre = { 2026: { rest: 11, restDatum: '2026-11-16' } }; S.arbeit.halb24 = true;
  const st = { settings: S, entries: {}, absences: [{ id: 1, from: '2026-12-21', to: '2026-12-31', type: 'tarif' }, { id: 2, from: '2027-03-29', to: '2027-04-02', type: 'tarif' }] };
  const v = C.vacation(st, '2026-11-16');
  assert.strictEqual(v[2026].rest, 3.5);
  assert.strictEqual(v[2027].fromCarry, 2);
  assert.strictEqual(v[2027].verfallen, 1.5);
});

test('Netto 2026 trifft Vergleichswerte (StKl I, kinderlos, ohne KiSt, 2,9 %)', () => {
  const S = base(); S.steuer.kirche = false;
  for (const [brutto, lst, netto] of [[2500, 187.33, 1768.92], [3000, 293.08, 2054.42], [4000, 524.5, 2605.5]]) {
    const n = C.netto(brutto, 0, S);
    assert.strictEqual(Math.round(n.lst * 100) / 100, lst);
    assert.strictEqual(Math.round(n.net * 100) / 100, netto);
  }
});

test('Monatswechsel in der Woche: jeder Tag zählt zum Kontingent seines Monats', () => {
  const S = base();
  const st = { settings: S, entries: { '2026-11-30': ent('07:00', '17:45') }, absences: [], kontingent: { '2026-11': 2, '2026-12': 10 }, nach: [] };
  for (const d of ['2026-12-01', '2026-12-02', '2026-12-03', '2026-12-04']) st.entries[d] = ent('07:00', '15:45');
  const c = C.compute(st, '2026-12-06');
  assert.strictEqual(c.months.get('2026-11').mehr, 2);
  assert.strictEqual(c.months.get('2026-12').mehr, 4);
  assert.strictEqual(c.weekMap.get('2026-11-30').pay.h25, 6);
});

test('Monatswechsel + ZK-Tag in derselben Woche: Wochenbetrachtung, Plus geht ans Zeitkonto', () => {
  const S = base();
  const st = { settings: S, entries: { '2026-11-30': ent('07:00', '16:45') }, absences: [{ id: 'z', from: '2026-12-04', to: '2026-12-04', type: 'zk' }], kontingent: { '2026-11': 10, '2026-12': 10 }, nach: [] };
  for (const d of ['2026-12-01', '2026-12-02', '2026-12-03']) st.entries[d] = ent('07:00', '15:45');
  const w = C.compute(st, '2026-12-06').weekMap.get('2026-11-30');
  assert.strictEqual(w.mehr, 0);
  assert.strictEqual(w.zkChange, -2);
});

test('Netto-Monat nutzt die Mehrarbeit desselben Monats', () => {
  const S = base(); S.lohn.stundenlohn = 25;
  const st = { settings: S, entries: {}, absences: [], kontingent: { '2026-11': 10 }, nach: [] };
  for (const d of ['2026-11-16', '2026-11-17']) st.entries[d] = ent('07:00', '16:45');
  const c = C.compute(st, '2026-11-20');
  const mp = C.monthPay(st, c, '2026-11');
  assert.ok(mp.lines.some((l) => l.mehr && Math.abs(l.v - 4 * 25 * 1.25) < 1e-9));
});

test('Gehalt "Auszahlung": Mehrarbeit kommt aus dem Vormonat, Weihnachtsgeld mit dem Grundlohn', () => {
  const S = base(); S.lohn.stundenlohn = 25; S.lohn.sonder = [{ name: 'Weihnachtsgeld', art: 'einmalig', monat: 11, modus: 'betrag', wert: 2000 }];
  const st = { settings: S, entries: {}, absences: [], kontingent: { '2026-11': 10 }, nach: [] };
  for (const d of ['2026-11-16', '2026-11-17']) st.entries[d] = ent('07:00', '16:45');
  const c = C.compute(st, '2026-12-05');
  const akt = C.monthPay(st, c, '2026-12', 'aktuell');
  const aus = C.monthPay(st, c, '2026-12', 'auszahlung');
  assert.ok(!akt.lines.some((l) => l.mehr) && !akt.lines.some((l) => l.k.startsWith('Weihnachtsgeld')));
  assert.ok(aus.lines.some((l) => l.mehr && Math.abs(l.v - 125) < 1e-9));
  // Weihnachtsgeld wird mit dem Grundlohn gezahlt: bleibt im eigenen Monat (November), auch bei „Auszahlung“
  assert.ok(!aus.lines.some((l) => l.k.startsWith('Weihnachtsgeld')));
  assert.ok(C.monthPay(st, c, '2026-11', 'auszahlung').lines.some((l) => l.k === 'Weihnachtsgeld' && l.v === 2000));
});

test('QR-Code für den Sync-Link: Version 4, Ruhezone und Suchmuster stimmen', () => {
  const QR = require('../src/qr.js');
  const m = QR.matrix('https://sirchi88.github.io/Toki/#sync=ABCDEFGHJKLMNP23');
  assert.strictEqual(m.length, 33);
  for (const [x, y] of [[0, 0], [26, 0], [0, 26]]) { assert.ok(m[y][x] && m[y + 6][x + 6] && !m[y + 1][x + 1] && m[y + 3][x + 3]); }
});

test('Krankenkassen-Liste 2026 ist vollständig hinterlegt', () => {
  assert.ok(C.KASSEN.length >= 90);
  assert.deepStrictEqual(C.KASSEN.find(([n]) => n.startsWith('Techniker')), ['Techniker Krankenkasse (TK)', 2.69]);
  assert.ok(C.KASSEN.every(([, v]) => v > 2 && v < 5));
});

test('Sonderzahlungen & Urlaubsgeld zählen zur Mehrarbeit, Weihnachtsgeld zum Grundgehalt', () => {
  const S = base(); S.lohn.stundenlohn = 25;
  S.lohn.sonder = [{ name: 'Weihnachtsgeld', art: 'einmalig', monat: 12, modus: 'betrag', wert: 2000 }, { name: 'Prämie', art: 'einmalig', monat: 11, modus: 'betrag', wert: 300 }];
  const st = { settings: S, entries: {}, absences: [{ id: 'u', from: '2026-11-23', to: '2026-11-24', type: 'tarif' }], kontingent: { '2026-11': 10 }, nach: [] };
  for (const d of ['2026-11-16', '2026-11-17']) st.entries[d] = ent('07:00', '16:45');
  const c = C.compute(st, '2026-12-05');
  const nov = C.monthPay(st, c, '2026-11', 'aktuell');
  const ug = 2 * (4000 / 21.75) * 0.5;
  assert.ok(Math.abs(nov.extra - (125 + 300 + ug)) < 1e-6);
  // Auszahlung Dezember: Weihnachtsgeld (Dez, mit Grundlohn) + Mehrarbeit/Prämie/Urlaubsgeld aus November
  const dez = C.monthPay(st, c, '2026-12', 'auszahlung');
  assert.ok(dez.lines.some((l) => l.k === 'Weihnachtsgeld' && !l.extra));
  assert.ok(Math.abs(dez.extra - (125 + 300 + ug)) < 1e-6);
});

test('Grundgehalt ist Basis für Stundenlohn; Einmalzahlung-Steuer ohne Mehrarbeit in der Basis', () => {
  const S = base(); S.lohn.grundlohn = 3500; S.lohn.stundenlohn = 0;
  assert.strictEqual(C.monatsentgelt(S), 3500);
  assert.ok(Math.abs(C.stundenlohn(S) - 3500 / (35 * 4.35)) < 1e-9);
  const a = C.netto(3800, 1000, S, 5, 0, 3500), b = C.netto(3800, 0, S, 5, 0, 3500);
  const ezA = C.steuerJahr(3500 * 12 + 1000, S).lst - C.steuerJahr(3500 * 12, S).lst;
  assert.ok(Math.abs((a.lst - b.lst) - ezA) < 1e-9);
});

test('Im Voraus eingetragene Arbeitszeit zählt sofort ins Zeitkonto, künftige ZK-Tage nur als verplant', () => {
  const S = base(); S.zk.stand = 10; S.zk.datum = '2026-11-01';
  const st = { settings: S, entries: {}, absences: [{ id: 'z', from: '2026-11-30', to: '2026-11-30', type: 'zk' }], kontingent: { '2026-11': 2.5 }, nach: [] };
  st.entries['2026-11-20'] = ent('07:00', '17:45'); // 3 h Mehrarbeit am Freitag (in der Zukunft)
  const c = C.compute(st, '2026-11-18');
  assert.ok(Math.abs(c.zk - 10.5) < 1e-9); // 2,5 h Kontingent, 0,5 h ins Zeitkonto
  assert.ok(Math.abs(c.zkPlanned - 3.5) < 1e-9); // abzüglich verplantem ZK-Tag (7 h)
});

test('Zeitnachweis-PDF: Tage erkennen, vergleichen und übernehmen', () => {
  const R = (...a) => ({ items: a.map(([x, s]) => ({ x, s })) });
  const head = R([51, 'Dat'], [65, 'Tag'], [83, 'Beschreibung'], [191, 'von'], [211, 'bis'], [252, 'Istz.'], [278, 'Sollz'], [306, 'Pause'], [338, 'Saldo'], [371, 'ZKT'], [400, 'ZKT K'], [435, 'MA'], [460, 'MAAus.'], [493, 'MEAV'], [524, 'FZA K'], [556, 'TAZP']);
  const rows = [R([335, 'Zeitraum:'], [417, '01.06.2026'], [467, '-'], [477, '30.06.2026']), head,
    R([51, '08'], [66, 'MO'], [84, 'Kur'], [256, '7,00'], [406, '5,00'], [531, '10,00']),
    R([51, '09'], [66, 'DI'], [84, 'Kur'], [256, '7,00'], [406, '5,00'], [531, '10,00']),
    R([51, '10'], [66, 'MI'], [84, 'anwesend'], [188, '07:00'], [208, '10:00'], [256, '8,50'], [406, '5,50'], [531, '10,00']),
    R([84, 'anwesend'], [188, '10:30'], [208, '17:00']),
    R([52, 'Woche'], [253, '22,50']),
    R([51, '11'], [66, 'DO'], [84, 'Urlaub'], [256, '7,00'], [406, '5,50'], [531, '10,00']),
    R([51, '12'], [66, 'FR'], [84, 'Krankheit ohne Attest'], [256, '7,00'], [406, '5,50'], [531, '9,00']),
    R([49, 'Monatsübersicht zum Stichtag']), R([52, 'monatliches Kontingent Mehrarbeit'], [179, '20,00'])];
  const z = C.parseZeitnachweis(rows);
  assert.strictEqual(z.month, '2026-06');
  assert.deepStrictEqual(z.days[2].work, { start: '07:00', end: '17:00', pause: 90, hours: 8.5 }); // zwei Buchungen → eine mit Pause
  assert.deepStrictEqual([z.zk.value, z.fza.value, z.kontingent], [5.5, 9, 20]);
  const S = base(); S.zk.stand = 1; S.zk.datum = '2026-05-31';
  const st = { settings: S, entries: { '2026-06-11': ent('07:00', '15:45') }, absences: [{ id: 'a', from: '2026-05-28', to: '2026-06-02', type: 'tarif' }], kontingent: {}, nach: [] };
  const plan = C.importPlan(st, z);
  assert.deepStrictEqual(plan.diffs.map((d) => d.date), ['2026-06-08', '2026-06-09', '2026-06-10', '2026-06-11', '2026-06-12']);
  C.applyImport(st, plan, 1, (() => { let i = 0; return () => `n${i++}`; })());
  assert.ok(!st.entries['2026-06-11'] && st.entries['2026-06-10'].hours === 8.5);
  const by = (t) => st.absences.filter((a) => a.type === t).map((a) => `${a.from}..${a.to}`);
  assert.deepStrictEqual(by('tarif'), ['2026-05-28..2026-05-31', '2026-06-11..2026-06-11']);
  assert.deepStrictEqual(by('sonder'), ['2026-06-08..2026-06-09']);
  assert.strictEqual(st.absences.find((a) => a.type === 'sonder').note, 'Kur');
  assert.deepStrictEqual(by('krank'), ['2026-06-12..2026-06-12']);
  assert.deepStrictEqual([S.zk.stand, S.zk.datum, S.urlaub.fzaStand, st.kontingent['2026-06']], [5.5, '2026-06-30', 9, 20]);
  assert.deepStrictEqual(C.importPlan(st, z).diffs, []);
});

test('PDF-Textleser: Text und Position aus einem Flate-Stream', async () => {
  const zlib = require('zlib'); const Pdf = require('../src/pdf.js');
  const content = zlib.deflateSync(Buffer.from('BT /F1 1 Tf 9 0 0 9 50 700 Tm (Zeitraum:)Tj 0 -2 Td (Gr\\374\\337e \\(Test\\))Tj ET', 'latin1'));
  const pdf = Buffer.concat([Buffer.from('%PDF-1.4\n4 0 obj\n<</Filter/FlateDecode/Length ' + content.length + '>>stream\n', 'latin1'), content, Buffer.from('\nendstream\nendobj\n%%EOF', 'latin1')]);
  const rows = await Pdf.lines(pdf);
  assert.deepStrictEqual(rows.map((r) => r.items.map((i) => [Math.round(i.x), Math.round(i.y), i.s])), [[[50, 700, 'Zeitraum:']], [[50, 682, 'Grüße (Test)']]]);
});

test('Kurzarbeit: erst 7 h je Tag vom MAV-Konto, dann 60 % bzw. 67 % vom Tagesgehalt', () => {
  const S = base(); S.mav.stunden = 10; S.kurz = { aktiv: true, monat: '2026-08' };
  const st = { settings: S, entries: {}, absences: [{ id: 'k', from: '2026-08-10', to: '2026-08-12', type: 'kurz' }], kontingent: {}, nach: [] };
  const kp = C.kurzPlan(st);
  assert.deepStrictEqual([...kp.days.values()], [true, false, false]);
  assert.ok(Math.abs(kp.rest - 3) < 1e-9);
  const tag = C.stundenlohn(S) * 7;
  let mp = C.monthPay(st, C.compute(st, '2026-08-31'), '2026-08');
  assert.ok(Math.abs(mp.laufend - (4000 - 2 * tag)) < 1e-9 && Math.abs(mp.kug - 2 * tag * 0.6) < 1e-9);
  S.steuer.kinderFB = 0.5;
  mp = C.monthPay(st, C.compute(st, '2026-08-31'), '2026-08');
  assert.ok(Math.abs(mp.kug - 2 * tag * 0.67) < 1e-9);
  const n = C.netto(mp.laufend, 0, S, 8, mp.abzug, mp.basis);
  assert.ok(Math.abs(n.net - (n.gross - n.svSum - n.taxSum + mp.kug)) < 1e-9); // KUG steuer- und SV-frei obendrauf
});

test('Mehrarbeit zur Verrechnung: Auszahlung im gewählten Monat, danach Konto auf 0', () => {
  const S = base(); S.mav = { stunden: 12, datum: '', auszahlen: true, monat: '2026-12', ausgezahlt: [] };
  const st = { settings: S, entries: {}, absences: [], kontingent: {}, nach: [] };
  const rate = C.stundenlohn(S);
  const dez = C.monthPay(st, C.compute(st, '2026-12-01'), '2026-12');
  const l = dez.lines.find((x) => x.mav);
  assert.ok(l && l.extra && !l.laufend && Math.abs(l.v - 12 * rate) < 1e-9);
  assert.ok(!C.monthPay(st, C.compute(st, '2026-12-01'), '2026-11').lines.some((x) => x.mav));
  assert.strictEqual(C.mavRollover(st, '2026-12-20'), false);
  assert.strictEqual(C.mavRollover(st, '2027-01-02'), true);
  assert.deepStrictEqual([S.mav.stunden, S.mav.auszahlen, S.mav.ausgezahlt], [0, false, [{ monat: '2026-12', stunden: 12 }]]);
  // Dezember bleibt nachträglich korrekt (aus dem Verlauf), Auszahlung-Ansicht Januar zeigt sie als Vormonat
  assert.ok(C.monthPay(st, C.compute(st, '2027-01-02'), '2027-01', 'auszahlung').lines.some((x) => x.mav === 12));
});

test('Tarifurlaub ins Minus: Vorgriff wird vom Folgejahr einbehalten', () => {
  const S = base(); S.urlaub.tarifTage = 5;
  const st = { settings: S, entries: {}, absences: [{ id: 't', from: '2026-03-02', to: '2026-03-10', type: 'tarif' }], kontingent: {}, nach: [] };
  const v = C.vacation(st, '2026-01-10');
  assert.deepStrictEqual([v[2026].rest, v[2026].vorgriff, v[2027].einbehalten, v[2027].rest], [-2, 2, 2, 3]);
});

test('Demo-Daten: ganzes Jahr, gemischt, mit 6 Tagen Kurzarbeit im August', () => {
  const st = C.demoState(2026);
  assert.strictEqual(st.settings.lohn.grundlohn, 3600);
  const c = C.compute(st, '2026-12-31');
  const mehr = [...c.months.values()].filter((m) => m.month.startsWith('2026')).map((m) => m.mehr);
  assert.ok(mehr.some((x) => x === 0) && mehr.some((x) => x > 5));
  assert.strictEqual([...C.kurzPlan(st).days.keys()].filter((d) => d.startsWith('2026-08')).length, 6);
  assert.ok(Object.keys(st.entries).some((d) => d.startsWith('2026-12')));
});

test('Entgeltabrechnung: Kennzahlen lesen, vergleichen, lernen', () => {
  const R = (y, ...a) => ({ y, items: a.map(([x, s]) => ({ x, s })) });
  const rows = [R(800, [282, 'Abrechnungszeitraum']), R(790, [282, 'März 2026']),
    R(700, [65, 'Bezeichnung'], [259, 'Tg./St.'], [319, 'Faktor'], [404, 'Monatswert'], [498, 'Jahreswert']),
    R(690, [63, '1850'], [89, 'ERA Entgelt gesamt'], [230, 'LSG'], [415, '3.000,00']),
    R(680, [63, '4110'], [89, 'Mehrarb. Zuschlag 25%'], [230, 'LSG'], [281, '4,00'], [341, '4,31'], [421, '17,24']),
    R(670, [63, '/10E'], [89, 'Gesamtbrutto (EBeschV)'], [406, '3.017,24'], [505, '9.017,24']),
    R(660, [63, 'Y$04'], [89, 'Steuer-Brutto, lfd.'], [406, '3.017,24'], [505, '9.017,24']),
    R(650, [63, 'Y$32'], [89, 'Lohnsteuer, lfd.'], [405, '300,00 -'], [499, '900,00']),
    R(640, [63, 'Y$11'], [89, 'Rentenversicherung, lfd.'], [405, '280,60 -'], [499, '841,80']),
    R(630, [63, 'Y$12'], [89, 'Arbeitslosenvers., lfd.'], [407, '39,22 -'], [503, '117,66']),
    R(620, [63, 'Y$13'], [89, 'Krankenversicherung'], [405, '260,00 -'], [499, '780,00']),
    R(610, [63, 'Y$14'], [89, 'Pflegeversicherung'], [405, '54,00 -'], [499, '162,00']),
    R(600, [63, '/55E'], [89, 'Gesetzl. Netto (EBeschV)'], [406, '2.083,42'])];
  const a = C.parseAbrechnung(rows);
  assert.strictEqual(a.month, '2026-03');
  assert.deepStrictEqual([a.grund, a.brutto, a.lst, a.rv, a.av, a.kv, a.pv], [3000, 3017.24, 300, 280.6, 39.22, 260, 54]);
  assert.deepStrictEqual([a.mehr.h25, a.mehr.z25, a.mehr.base], [4, 17.24, 0]);
  assert.ok(Math.abs(a.netto - 2083.42) < 1e-9 && Math.abs(a.sv - 633.82) < 1e-9);
  assert.deepStrictEqual([a.jahr.lst, a.jahr.rv], [900, 841.8]);
  const S = base(); S.lohn.grundlohn = 2900;
  const st = { settings: S, entries: {}, absences: [], kontingent: {}, nach: [], abrechnungen: {} };
  const v = C.abrechnungVergleich(st, C.compute(st, '2026-03-31'), a);
  assert.ok(v.grundAnders && v.nurZuschlag && Number.isFinite(v.korr));
  st.abrechnungen['2026-03'] = { ...a, korr: 12 };
  assert.strictEqual(C.lernKorrektur(st), 12);
  const g = C.gehaltJahr(st, C.compute(st, '2026-06-30'), 2026, '2026-06-30');
  assert.strictEqual(g.months[2].echt, true);
  assert.strictEqual(g.sum.echt, 1);
  const k = C.steuerKlaerung(st, C.compute(st, '2026-06-30'), 2026, '2026-06-30');
  assert.strictEqual(k.bis, '2026-03');
  assert.ok(Math.abs(k.sum.lst - (900 + g.months.slice(3).reduce((x, r) => x + r.lst, 0))) < 1e-6);
});

test('Mehrarbeit nur Zuschläge: Grundvergütung wird nicht ausgezahlt', () => {
  const S = base(); S.lohn.mehrNurZuschlag = true;
  const st = { settings: S, entries: {}, absences: [], kontingent: { '2026-06': 20 }, nach: [] };
  st.entries['2026-06-08'] = ent('07:00', '17:45');
  const c = C.compute(st, '2026-06-30');
  const l = C.monthPay(st, c, '2026-06').lines.find((x) => x.mehr);
  const mm = c.months.get('2026-06');
  assert.ok(l.nurZ && Math.abs(l.v - (mm.pay.z25 + mm.pay.z50)) < 1e-9);
});

test('Jahres-Statistik: Arbeitstage, stärkste Woche, Krankheitstage', () => {
  const S = base();
  const st = { settings: S, entries: {}, absences: [{ id: 'k', from: '2026-03-09', to: '2026-03-10', type: 'krank' }], kontingent: {}, nach: [] };
  st.entries['2026-02-02'] = ent('07:00', '15:45'); st.entries['2026-02-03'] = ent('07:00', '17:45'); st.entries['2026-02-09'] = ent('07:00', '15:00');
  const c = C.compute(st, '2026-12-31');
  const t = C.yearStats(st, c, 2026, C.vacation(st, '2026-12-31'));
  assert.strictEqual(t.arbeitstage, 3);
  assert.strictEqual(t.topWeek.kw, 6);
  assert.strictEqual(t.longest.date, '2026-02-03');
  assert.strictEqual(t.krank, 2);
});

(async () => {
  for (const [name, fn] of tests) { await fn(); passed++; console.log(`✓ ${name}`); }
  console.log(`\n${passed} Tests bestanden.`);
})().catch((e) => { console.error(e); process.exit(1); });
