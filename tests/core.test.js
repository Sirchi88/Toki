/* Tests für den Rechenkern: `node tests/core.test.js` */
const assert = require('assert');
const C = require('../src/core.js');

let passed = 0;
const test = (name, fn) => { fn(); passed++; console.log(`✓ ${name}`); };
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

test('Gehalt "Auszahlung": Mehrarbeit und Sonderzahlung kommen aus dem Vormonat', () => {
  const S = base(); S.lohn.stundenlohn = 25; S.lohn.sonder = [{ name: 'Weihnachtsgeld', art: 'einmalig', monat: 11, modus: 'betrag', wert: 2000 }];
  const st = { settings: S, entries: {}, absences: [], kontingent: { '2026-11': 10 }, nach: [] };
  for (const d of ['2026-11-16', '2026-11-17']) st.entries[d] = ent('07:00', '16:45');
  const c = C.compute(st, '2026-12-05');
  const akt = C.monthPay(st, c, '2026-12', 'aktuell');
  const aus = C.monthPay(st, c, '2026-12', 'auszahlung');
  assert.ok(!akt.lines.some((l) => l.mehr) && !akt.lines.some((l) => l.k.startsWith('Weihnachtsgeld')));
  assert.ok(aus.lines.some((l) => l.mehr && Math.abs(l.v - 125) < 1e-9));
  assert.ok(aus.lines.some((l) => l.k.startsWith('Weihnachtsgeld') && l.v === 2000));
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

console.log(`\n${passed} Tests bestanden.`);
