/* Toki – Rechenkern. Reine Funktionen, keine DOM-Zugriffe. */
const Core = (() => {
  'use strict';

  // ---------- Zeit ----------
  const toMin = (s) => {
    const m = /^(\d{1,2}):(\d{2})$/.exec(s || '');
    return m ? Number(m[1]) * 60 + Number(m[2]) : null;
  };
  const fmtClock = (min) => {
    const t = ((Math.round(min) % 1440) + 1440) % 1440;
    return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
  };
  const leaveAt = (start, pauseMin, hours) => {
    const s = toMin(start);
    return s === null ? null : fmtClock(s + hours * 60 + pauseMin);
  };
  const workedRaw = (start, end, pauseMin) => {
    const s = toMin(start), e = toMin(end);
    if (s === null || e === null) return null;
    let d = e - s;
    if (d < 0) d += 1440;
    return Math.max(0, d - pauseMin) / 60;
  };
  const MAX_DAY = 10;
  const capDay = (h) => (h > MAX_DAY ? { hours: MAX_DAY, capped: true } : { hours: h, capped: false });

  // ---------- Datum (ISO yyyy-mm-dd, UTC-Mittag) ----------
  const D = (iso) => new Date(iso + 'T12:00:00Z');
  const iso = (d) => d.toISOString().slice(0, 10);
  const addDays = (s, n) => { const d = D(s); d.setUTCDate(d.getUTCDate() + n); return iso(d); };
  const dow = (s) => D(s).getUTCDay(); // 0 So … 6 Sa
  const monday = (s) => addDays(s, -((dow(s) + 6) % 7));
  const isoWeek = (s) => {
    const t = D(s);
    t.setUTCDate(t.getUTCDate() + 3 - ((t.getUTCDay() + 6) % 7));
    const f = new Date(Date.UTC(t.getUTCFullYear(), 0, 4));
    return 1 + Math.round(((t - f) / 864e5 - 3 + ((f.getUTCDay() + 6) % 7)) / 7);
  };
  const ym = (s) => s.slice(0, 7);
  const todayIso = () => { const n = new Date(); return new Date(n.getTime() - n.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); };
  const range = (from, to) => { const out = []; for (let d = from; d <= to; d = addDays(d, 1)) out.push(d); return out; };

  // ---------- Feiertage ----------
  const LAENDER = {
    BW: 'Baden-Württemberg', BY: 'Bayern', BE: 'Berlin', BB: 'Brandenburg', HB: 'Bremen', HH: 'Hamburg',
    HE: 'Hessen', MV: 'Mecklenburg-Vorpommern', NI: 'Niedersachsen', NW: 'Nordrhein-Westfalen',
    RP: 'Rheinland-Pfalz', SL: 'Saarland', SN: 'Sachsen', ST: 'Sachsen-Anhalt', SH: 'Schleswig-Holstein', TH: 'Thüringen',
  };
  const easter = (y) => {
    const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4;
    const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
    return `${y}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };
  const hCache = new Map();
  const holidays = (y, opt) => {
    const land = opt.land || 'BY';
    const key = `${y}|${land}|${opt.mariae}`;
    if (hCache.has(key)) return hCache.get(key);
    const map = new Map();
    const add = (d, n, lands) => { if (!lands || lands.includes(land)) map.set(d, n); };
    const o = easter(y);
    add(`${y}-01-01`, 'Neujahr');
    add(`${y}-01-06`, 'Heilige Drei Könige', ['BW', 'BY', 'ST']);
    add(`${y}-03-08`, 'Frauentag', ['BE', 'MV']);
    add(addDays(o, -2), 'Karfreitag');
    add(addDays(o, 1), 'Ostermontag');
    add(`${y}-05-01`, 'Tag der Arbeit');
    add(addDays(o, 39), 'Christi Himmelfahrt');
    add(addDays(o, 50), 'Pfingstmontag');
    add(addDays(o, 60), 'Fronleichnam', ['BW', 'BY', 'HE', 'NW', 'RP', 'SL']);
    if (land === 'SL' || (land === 'BY' && opt.mariae)) add(`${y}-08-15`, 'Mariä Himmelfahrt');
    add(`${y}-09-20`, 'Weltkindertag', ['TH']);
    add(`${y}-10-03`, 'Tag der Deutschen Einheit');
    add(`${y}-10-31`, 'Reformationstag', ['BB', 'MV', 'SN', 'ST', 'TH', 'HB', 'HH', 'NI', 'SH']);
    add(`${y}-11-01`, 'Allerheiligen', ['BW', 'BY', 'NW', 'RP', 'SL']);
    if (land === 'SN') { // Mittwoch vor dem 23.11.
      let d = `${y}-11-22`; while (dow(d) !== 3) d = addDays(d, -1); add(d, 'Buß- und Bettag');
    }
    add(`${y}-12-25`, '1. Weihnachtstag');
    add(`${y}-12-26`, '2. Weihnachtstag');
    hCache.set(key, map);
    return map;
  };
  const holidayName = (s, opt) => holidays(Number(s.slice(0, 4)), opt).get(s) || null;
  const isWorkday = (s, opt) => { const w = dow(s); return w >= 1 && w <= 5 && !holidayName(s, opt); };
  const workdaysBetween = (from, to, opt, skip) => range(from, to).filter((d) => isWorkday(d, opt) && !(skip && skip(d)));

  // ---------- Einstellungen ----------
  const defaults = () => ({
    theme: 'dark',
    arbeit: { wochenstunden: 35, brotzeit: 15, mittag: 30, land: 'BY', mariae: true, halb24: false, halb31: false },
    lohn: {
      grundlohn: 0, stundenlohn: 0, zeigen: true, auszahlung: 'folgemonat', nettoAbzug: 0, mehrNurZuschlag: false, lernen: true,
      sonder: [{ id: 'weihnachtsgeld', name: 'Weihnachtsgeld', art: 'einmalig', monat: 11, modus: 'betrag', wert: 0 }],
    },
    zk: { stand: 0, datum: '', samstagBonus: true, max: 35, min: -35 },
    // Konto „Mehrarbeit zur Verrechnung“ (Stunden), optional als einmalige Sonderzahlung in einem Monat
    mav: { stunden: 0, datum: '', auszahlen: false, monat: '', ausgezahlt: [] },
    kurz: { aktiv: false, monat: '' },
    urlaub: { tarifTage: 30, ugFaktor: 0.5, ugTeiler: 21.75, fzaStand: 0, fzaDatum: '', tzugTage: 8, jahre: {} },
    mail: { anrede: '', an: '', name: '' },
    // PDFs lokal auf diesem Gerät aufbewahren (nicht synchronisiert)
    dokumente: { zeit: false, lohn: false },
    steuer: { klasse: 1, kirche: true, kinderFB: 0, kinderPV: 0, geburtsjahr: 0, kasse: '', kvZusatz: 2.9, freiwillig: false, geprueft: false, km: 0 },
  });
  const merge = (base, over) => {
    if (Array.isArray(base)) return Array.isArray(over) ? over : base;
    if (base && typeof base === 'object') {
      const out = { ...base };
      if (over && typeof over === 'object') for (const k of Object.keys(over)) out[k] = k in base ? merge(base[k], over[k]) : over[k];
      return out;
    }
    return over === undefined || over === null ? base : over;
  };
  const tagessoll = (S) => (Number(S.arbeit.wochenstunden) || 35) / 5;
  /** Grundgehalt (inkl. fester Zulagen) – Basis für Stundenlohn, Urlaubsgeld, Faktor-Sonderzahlungen */
  const monatsentgelt = (S) => Number(S.lohn.grundlohn) || 0;
  const stundenlohn = (S) => {
    const h = Number(S.lohn.stundenlohn);
    if (h > 0) return h;
    const g = monatsentgelt(S);
    return g > 0 ? g / ((Number(S.arbeit.wochenstunden) || 35) * 4.35) : 0;
  };
  const holOpt = (S) => ({ land: S.arbeit.land, mariae: S.arbeit.mariae, halb24: S.arbeit.halb24, halb31: S.arbeit.halb31 });
  /** Halber Arbeitstag (Heiligabend/Silvester, falls eingestellt) */
  const halfDay = (d, S) => { const md = d.slice(5); return (md === '12-24' && S.arbeit.halb24) || (md === '12-31' && S.arbeit.halb31); };
  /** Wie viele Urlaubstage ein freier Arbeitstag kostet */
  const dayNeed = (d, S) => (halfDay(d, S) ? 0.5 : 1);
  const yearCfg = (S, y) => { const j = (S.urlaub.jahre || {})[y] || {}; return { tarif: j.tarif ?? S.urlaub.tarifTage, tzug: j.tzug ?? S.urlaub.tzugTage, rest: j.rest, restDatum: j.restDatum || '', tzugRest: j.tzugRest } };

  // ---------- Abwesenheiten ----------
  const TYPES = {
    tarif: { label: 'Tarifurlaub', short: 'TU' },
    zk: { label: 'Zeitkonto', short: 'ZK' },
    fza: { label: 'FZA-Konto', short: 'FZA' },
    tzug: { label: 'T-Zug', short: 'TZ' },
    sonder: { label: 'Sonderurlaub', short: 'SU' },
    krank: { label: 'Krank', short: 'K' },
    kurz: { label: 'Kurzarbeit', short: 'KA' },
  };
  /** Samstag/Sonn-/Feiertag: keine Brotzeit, ab 6 Std. Anwesenheit 30 min Mittag (nie unter 6 Std.) */
  const specialPause = (presenceMin) => (presenceMin > 360 ? Math.min(30, presenceMin - 360) : 0);
  const presence = (start, end) => { const a = toMin(start), b = toMin(end); if (a === null || b === null) return null; let d = b - a; if (d < 0) d += 1440; return d; };
  /** Liefert Map iso -> {type, units, id, note} für alle Arbeitstage unter Abwesenheiten (+ halbe Urlaubstage aus Einträgen). */
  const absenceDays = (st) => {
    const opt = holOpt(st.settings);
    const map = new Map();
    for (const a of st.absences || []) {
      const days = workdaysBetween(a.from, a.to || a.from, opt);
      for (const d of days) {
        const need = dayNeed(d, st.settings);
        const units = a.half && days.length === 1 ? Math.min(0.5, need) : need;
        map.set(d, { type: a.type, units, full: units >= need, id: a.id, note: a.note || '' });
      }
    }
    for (const [d, e] of Object.entries(st.entries || {})) {
      if (e.half && !map.has(d)) map.set(d, { type: e.halfType || 'tarif', units: 0.5, full: false, fromEntry: true });
    }
    return map;
  };

  // ---------- Tagesauswertung ----------
  const dayTarget = (d, e, S, absMap) => {
    const opt = holOpt(S);
    const w = dow(d);
    if (w === 0 || w === 6 || holidayName(d, opt)) return 0;
    const ab = absMap && absMap.get(d);
    if (ab && ab.full) return 0;
    if (halfDay(d, S)) return tagessoll(S) / 2;
    if ((e && e.half) || (ab && !ab.full)) return tagessoll(S) / 2;
    return tagessoll(S);
  };

  // ---------- Hauptberechnung: Wochen, Monate, Konten ----------
  const zuschlag = (mehr, rate) => {
    const h25 = Math.min(Math.max(mehr, 0), 6), h50 = Math.max(0, mehr - 6);
    const base = mehr * rate, z25 = h25 * rate * 0.25, z50 = h50 * rate * 0.5;
    return { h25, h50, base, z25, z50, total: base + z25 + z50 };
  };

  const compute = (st, today = todayIso()) => {
    const S = st.settings;
    const opt = holOpt(S);
    const soll = tagessoll(S);
    const rate = stundenlohn(S);
    const absMap = absenceDays(st);
    const entries = st.entries || {};
    const kont = st.kontingent || {};
    const nachByMonth = {};
    for (const n of st.nach || []) nachByMonth[n.month] = (nachByMonth[n.month] || 0) + (Number(n.hours) || 0);

    // Wochen sammeln
    const dates = [...Object.keys(entries), ...absMap.keys()];
    const weeks = [];
    const weekMap = new Map();
    if (dates.length) {
      const first = monday(dates.reduce((a, b) => (a < b ? a : b)));
      const lastDate = dates.reduce((a, b) => (a > b ? a : b));
      const last = monday(lastDate > today ? lastDate : today);
      for (let m = first; m <= last; m = addDays(m, 7)) {
        const w = { monday: m, sunday: addDays(m, 6), kw: isoWeek(m), month: ym(addDays(m, 3)), days: [] };
        weeks.push(w); weekMap.set(m, w);
      }
    }

    const used = {}; // Kontingent je Monat verbraucht
    let zk = Number(S.zk.stand) || 0;
    let fza = Number(S.urlaub.fzaStand) || 0;
    const zkStart = S.zk.datum || '';
    const fzaStart = S.urlaub.fzaDatum || '';
    let zkToday = null, fzaToday = null, zkTodaySum = 0, fzaTodaySum = 0, zkVerplant = 0, zkVerplantTage = 0;

    for (const w of weeks) {
      let wd = 0, sat = 0, satOnly = 0, worked = 0, zkUnits = 0, fzaUnits = 0, capped = 0;
      for (let i = 0; i < 7; i++) {
        const d = addDays(w.monday, i);
        const e = entries[d];
        const ab = absMap.get(d) || null;
        const hol = holidayName(d, opt);
        const day = { date: d, entry: e || null, absence: ab, holiday: hol, target: 0, delta: 0 };
        if (ab && ab.type === 'zk') zkUnits += ab.units;
        if (ab && ab.type === 'fza' && (!fzaStart || d > fzaStart)) fzaUnits += ab.units;
        if (e && !(ab && ab.full)) {
          const t = dayTarget(d, e, S, absMap);
          day.target = t;
          day.delta = e.hours - t;
          worked += e.hours;
          if (e.capped) capped++;
          if (t > 0) wd += e.hours - t;
          else { sat += e.hours; if (dow(d) === 6) satOnly += e.hours; }
        }
        w.days.push(day);
      }
      const zkDebit = zkUnits * soll;
      let T = wd + sat;
      let offset = 0;
      if (zkDebit > 0 && T > 0) { offset = Math.min(T, zkDebit); T -= offset; }
      let zkChange = -zkDebit + offset;
      let mehr = 0, mehrNach = 0, toZK = 0, bonus = 0, under = 0, satMehr = 0, satZK = 0, satH = 0;
      const parts = [];
      if (T < 0) { under = -T; zkChange += T; }
      else if (T > 0) {
        // Endet ein Monat innerhalb der Woche, zählt jeder Tag zum Kontingent seines Monats.
        // ZK-Verrechnung (offset) und Zuschläge bleiben wochenweise.
        const segs = new Map();
        for (const day of w.days) {
          const mo = ym(day.date);
          if (!segs.has(mo)) segs.set(mo, { month: mo, c: 0, sat: 0 });
          if (day.entry && !(day.absence && day.absence.full)) {
            const sg = segs.get(mo);
            sg.c += day.entry.hours - day.target;
            if (dow(day.date) === 6) sg.sat += day.entry.hours;
          }
        }
        const pos = [...segs.values()].filter((x) => x.c > 0);
        const sumPos = pos.reduce((a, x) => a + x.c, 0) || 1;
        for (const sg of pos) {
          const share = (sg.c / sumPos) * T; // Anteil am Wochen-Plus (nach ZK-Verrechnung und Unterzeit)
          const u = used[sg.month] || 0;
          const baseK = Number(kont[sg.month]) || 0;
          const totalK = baseK + (nachByMonth[sg.month] || 0);
          const avail = Math.max(0, totalK - u);
          // Zeitlich: erst füllt das Plus der Wochentage das Kontingent, dann der Samstag;
          // was vom Samstag danach übrig bleibt, geht ins Zeitkonto und bekommt den 25-%-Bonus
          const satEff = Math.min(sg.sat, share);
          const wdToMehr = Math.min(share - satEff, avail);
          const satToMehr = Math.min(satEff, avail - wdToMehr);
          const m1 = satToMehr + wdToMehr;
          const nach1 = Math.max(0, m1 - Math.max(0, baseK - u));
          used[sg.month] = u + m1;
          const z1 = share - m1;
          const b1 = S.zk.samstagBonus ? (satEff - satToMehr) * 0.25 : 0;
          parts.push({ month: sg.month, mehr: m1, mehrNach: nach1, toZK: z1, bonus: b1, satH: sg.sat, satMehr: satToMehr, satZK: satEff - satToMehr });
          mehr += m1; mehrNach += nach1; toZK += z1; bonus += b1; satMehr += satToMehr; satZK += satEff - satToMehr; satH += sg.sat;
        }
        zkChange += toZK + bonus;
      }
      const pay = zuschlag(mehr, rate);
      const Tfull = T + offset;
      /** Zeitkonto-Wirkung nur der Tage lo < d <= hi (Mehrarbeit wird zuerst aus den frühen Tagen bedient) */
      const zkPart = (lo, hi) => {
        if ((!lo || w.monday > lo) && (!hi || w.sunday <= hi)) return zkChange;
        if ((lo && w.sunday <= lo) || (hi && w.monday > hi)) return 0;
        let tp = 0, satP = 0, debitP = 0, beforeT = 0;
        for (const day of w.days) {
          const c = day.entry && !(day.absence && day.absence.full) ? day.entry.hours - day.target : 0;
          if (lo && day.date <= lo) { beforeT += c; continue; }
          if (hi && day.date > hi) continue;
          if (day.absence && day.absence.type === 'zk') debitP += day.absence.units * soll;
          tp += c; if (c && dow(day.date) === 6) satP += day.entry.hours;
        }
        const offP = debitP > 0 && tp > 0 ? Math.min(tp, debitP) : 0;
        let restP = tp - offP;
        if (restP > 0) { const mehrP = Math.max(0, mehr - Math.max(0, beforeT)); restP = Math.max(0, restP - mehrP); }
        const bonusP = restP > 0 && S.zk.samstagBonus ? Math.min(restP, satP) * 0.25 : 0;
        return -debitP + offP + restP + bonusP;
      };
      void Tfull;
      const zkEff = zkPart(zkStart, null);
      zkTodaySum += zkPart(zkStart, today);
      zk += zkEff;
      let fzaNow = 0;
      for (const day of w.days) if (day.absence && day.absence.type === 'fza' && (!fzaStart || day.date > fzaStart) && day.date <= today) fzaNow += day.absence.units * soll;
      fzaTodaySum += fzaNow;
      fza -= fzaUnits * soll;
      for (const day of w.days) if (day.absence && day.absence.type === 'zk' && day.date > today) { zkVerplant += day.absence.units * soll; zkVerplantTage += day.absence.units; }
      Object.assign(w, { parts, worked, wd, sat, satOnly, zkUnits, zkDebit, offset, mehr, mehrNach, toZK, bonus, satMehr, satZK, satH, under, zkChange: zkEff, zkAfter: zk, fzaAfter: fza, pay, capped });
    }
    // Nachträglich eingetragene ZK-/FZA-Tage, die vor dem Stichtag liegen, trotzdem abziehen
    let late = 0, lateF = 0;
    for (const a of st.absences || []) {
      if (!a.created) continue;
      if (a.type === 'zk' && a.created > (Number(S.zk.setAt) || 0) && zkStart) for (const [d, x] of absMap) if (x.id === a.id && d <= zkStart) late += x.units * soll;
      if (a.type === 'fza' && a.created > (Number(S.urlaub.fzaSetAt) || 0) && fzaStart) for (const [d, x] of absMap) if (x.id === a.id && d <= fzaStart) lateF += x.units * soll;
    }
    zk -= late; fza -= lateF;
    // Stand „heute“: alle eingetragenen Arbeitszeiten zählen (auch im Voraus erfasste), nur künftige ZK-Tage sind „verplant“
    zkToday = zk + zkVerplant; void zkTodaySum;
    fzaToday = (Number(S.urlaub.fzaStand) || 0) - fzaTodaySum - lateF;

    // Monate
    const months = new Map();
    const mget = (m) => {
      if (!months.has(m)) months.set(m, { month: m, worked: 0, mehr: 0, mehrNach: 0, toZK: 0, bonus: 0, satMehr: 0, satZK: 0, satH: 0, zkChange: 0, under: 0, weeks: [], pay: { h25: 0, h50: 0, base: 0, z25: 0, z50: 0, total: 0 }, days: 0 });
      return months.get(m);
    };
    for (const [d, e] of Object.entries(entries)) { const m = mget(ym(d)); m.worked += e.hours; m.days++; }
    for (const w of weeks) {
      const m = mget(w.month);
      m.weeks.push(w);
      for (const k of ['zkChange', 'under']) m[k] += w[k];
      // Mehrarbeit und Bezahlung gehören zu dem Monat, in dem sie geleistet wurde
      for (const pt of w.parts) {
        const pm = mget(pt.month);
        if (pm !== m && !pm.weeks.includes(w)) pm.weeks.push(w);
        for (const k of ['mehr', 'mehrNach', 'toZK', 'bonus', 'satMehr', 'satZK', 'satH']) pm[k] += pt[k] || 0;
        const share = w.mehr > 0 ? pt.mehr / w.mehr : 0;
        for (const k of Object.keys(pm.pay)) pm.pay[k] += w.pay[k] * share;
      }
    }
    for (const [m, k] of Object.entries(kont)) { const o = mget(m); o.kontingent = Number(k) || 0; }
    for (const m of months.values()) { m.kontingent = Number(kont[m.month]) || 0; m.nach = nachByMonth[m.month] || 0; m.used = used[m.month] || 0; }

    return { weeks, weekMap, months, zk: zkToday, zkPlanned: zk, zkVerplant, zkVerplantTage, fza: fzaToday, fzaPlanned: fza, absMap, rate, soll };
  };

  // ---------- Urlaubskonten (pro Kalenderjahr) ----------
  const vacation = (st, today = todayIso()) => {
    const S = st.settings;
    const absMap = absenceDays(st);
    const byYear = {};
    const yr = (y) => (byYear[y] ||= { tarif: [], tzug: [], sonder: 0, zk: 0, fza: 0, krank: 0, kurz: 0 });
    for (const [d, a] of [...absMap.entries()].sort((x, y) => (x[0] < y[0] ? -1 : 1))) {
      const y = Number(d.slice(0, 4));
      if (a.type === 'tarif' || a.type === 'tzug') yr(y)[a.type].push([d, a.units]);
      else yr(y)[a.type] += a.units;
    }
    const cfgYears = Object.keys(S.urlaub.jahre || {}).map(Number);
    const curY = Number(today.slice(0, 4));
    const startY = Math.min(curY, ...cfgYears, ...Object.keys(byYear).map(Number));
    const endY = Math.max(curY + 1, ...cfgYears, ...Object.keys(byYear).map(Number));
    const res = {};
    let carryIn = 0, debt = 0;
    for (let y = startY; y <= endY; y++) {
      const c = yearCfg(S, y), o = yr(y);
      const hasStand = c.rest !== undefined && c.rest !== null && c.rest !== '';
      const anspruch = Number(c.tarif) || 0;
      let carry = hasStand ? 0 : carryIn;
      let pool = hasStand ? Number(c.rest) : anspruch;
      // Vorgriff aus dem Vorjahr (Tarifurlaub ins Minus geplant) wird direkt einbehalten
      const einbehalten = hasStand ? 0 : debt;
      pool -= einbehalten;
      let fromCarry = 0, fromPool = 0, taken = 0, takenUntilToday = 0, vorStand = 0;
      for (const [d, u] of o.tarif) {
        taken += u;
        if (d <= today) takenUntilToday += u;
        if (hasStand && c.restDatum && d <= c.restDatum) { vorStand += u; continue; }
        if (d <= `${y}-03-31` && carry > 0) { const t = Math.min(carry, u); carry -= t; fromCarry += t; fromPool += u - t; }
        else fromPool += u;
      }
      const rest = pool - fromPool;
      const tzugTaken = o.tzug.reduce((s2, x) => s2 + x[1], 0);
      const tzugHasStand = c.tzugRest !== undefined && c.tzugRest !== null && c.tzugRest !== '';
      const tzugAfter = tzugHasStand && c.restDatum ? o.tzug.filter(([d]) => d > c.restDatum).reduce((s2, x) => s2 + x[1], 0) : tzugTaken;
      res[y] = {
        year: y, anspruch, hasStand, stand: hasStand ? Number(c.rest) : null, standDatum: c.restDatum,
        carryIn: hasStand ? 0 : carryIn, fromCarry, carryLeft: carry, verfallen: carry, // Rest nach 31.03. verfällt
        taken, takenUntilToday, vorStand, rest,
        tzug: tzugTaken, tzugMax: Number(c.tzug) || 0, tzugRest: (tzugHasStand ? Number(c.tzugRest) : Number(c.tzug) || 0) - tzugAfter,
        sonder: o.sonder, krank: o.krank, kurz: o.kurz, zkDays: o.zk, fzaDays: o.fza,
        einbehalten, vorgriff: Math.max(0, -rest),
      };
      carryIn = Math.max(0, rest); debt = Math.max(0, -rest);
    }
    return res;
  };

  /** Zusatzbeiträge der gesetzlichen Krankenkassen 2026 (Stand 01.11.2026, Quellen: krankenkasse-guenstiger.de, krankenkassen.de) */
  const KASSEN = [
    ['AOK Baden-Württemberg', 2.99],
    ['AOK Bayern', 2.69],
    ['AOK Bremen/Bremerhaven', 3.29],
    ['AOK Hessen', 2.98],
    ['AOK Niedersachsen', 2.98],
    ['AOK Nordost', 3.5],
    ['AOK NordWest', 2.99],
    ['AOK PLUS', 3.1],
    ['AOK Rheinland-Pfalz/Saarland', 2.47],
    ['AOK Rheinland/Hamburg', 3.29],
    ['AOK Sachsen-Anhalt', 2.89],
    ['Audi BKK', 2.6],
    ['BAHN-BKK', 3.65],
    ['BARMER', 3.29],
    ['Bergische Krankenkasse', 3.79],
    ['Bertelsmann BKK', 3.2],
    ['BIG direkt gesund', 3.69],
    ['BKK Akzo Nobel Bayern', 3.39],
    ['BKK B. Braun Aesculap', 3.65],
    ['BKK Deutsche Bank', 3.4],
    ['BKK Diakonie', 3.8],
    ['BKK DürkoppAdler', 3.88],
    ['BKK EUREGIO', 3.39],
    ['BKK evm', 2.5],
    ['BKK EWE', 3.19],
    ['BKK exklusiv', 3.49],
    ['BKK Faber-Castell & Partner', 2.48],
    ['BKK firmus', 2.18],
    ['BKK Freudenberg', 2.99],
    ['BKK Gildemeister Seidensticker', 3.4],
    ['BKK Groz-Beckert', 4.2],
    ['BKK Herkules', 3.48],
    ['BKK Linde', 2.99],
    ['BKK MAHLE', 4.2],
    ['BKK melitta hmr', 3.9],
    ['BKK Miele', 3.2],
    ['BKK mkk', 3.5],
    ['BKK Mobil', 3.89],
    ['BKK MTU', 2.8],
    ['BKK Pfaff', 2.78],
    ['BKK Pfalz', 3.9],
    ['BKK ProVita', 3.79],
    ['BKK Public', 2.5],
    ['BKK PwC', 2.8],
    ['BKK Rieker.Ricosta.Weisser', 4.2],
    ['BKK Salzgitter', 3.5],
    ['BKK Scheufelen', 3.99],
    ['BKK Schwarzwald-Baar-Heuberg', 2.79],
    ['BKK Technoform', 3.49],
    ['BKK VDN', 3.19],
    ['BKK VerbundPlus', 3.89],
    ['BKK Werra-Meissner', 4.35],
    ['BKK Wirtschaft & Finanzen', 3.99],
    ['BKK Würth', 3.4],
    ['BKK24', 4.39],
    ['BMW BKK', 2.9],
    ['Bosch BKK', 3.18],
    ['Continentale BKK', 3.33],
    ['DAK-Gesundheit', 3.2],
    ['Debeka BKK', 3.25],
    ['energie-BKK', 3.98],
    ['EY BKK', 2.75],
    ['Heimat Krankenkasse', 3.9],
    ['HEK', 2.89],
    ['hkk', 2.59],
    ['IKK Brandenburg und Berlin', 4.35],
    ['IKK classic', 3.85],
    ['IKK gesund plus', 3.39],
    ['IKK Südwest', 3.87],
    ['IKK – Die Innovationskasse', 4.3],
    ['Karl Mayer BKK', 2.99],
    ['KKH', 3.78],
    ['Knappschaft', 4.3],
    ['Koenig & Bauer BKK', 3.18],
    ['Krones BKK', 2.2],
    ['Mercedes-Benz BKK', 3.2],
    ['Merck BKK', 3.97],
    ['mhplus BKK', 3.86],
    ['novitas bkk', 3.6],
    ['Pronova BKK', 3.7],
    ['R+V BKK', 3.49],
    ['Salus BKK', 3.29],
    ['SBK', 3.8],
    ['SECURVITA BKK', 3.9],
    ['SKD BKK', 3.65],
    ['Südzucker BKK', 3.5],
    ['Techniker Krankenkasse (TK)', 2.69],
    ['TUI BKK', 2.5],
    ['VIACTIV Krankenkasse', 4.19],
    ['vivida bkk', 3.79],
    ['WMF BKK', 2.85],
    ['ZF BKK', 3.4],
  ];

  // ---------- Steuer & Sozialversicherung 2026 (Näherung) ----------
  const P = {
    gfb: 12348, bbgKV: 5812.5, bbgRV: 8450, rv: 0.093, av: 0.013, kv: 0.073, pv: 0.018, pvKinderlos: 0.006,
    anPausch: 1230, saPausch: 36, entlastung2: 4260, kfb: 9756, soliFrei: 20350,
  };
  const est = (zve) => {
    const x = Math.floor(Math.max(0, zve));
    let t;
    if (x <= 12348) t = 0;
    else if (x <= 17799) { const y = (x - 12348) / 1e4; t = (914.51 * y + 1400) * y; }
    else if (x <= 69878) { const z = (x - 17799) / 1e4; t = (173.1 * z + 2397) * z + 1034.87; }
    else if (x <= 277825) t = 0.42 * x - 11135.63;
    else t = 0.45 * x - 19470.38;
    return Math.floor(t);
  };
  const tarifFor = (zve, klasse) => {
    if (klasse === 3) return 2 * est(zve / 2);
    if (klasse === 5 || klasse === 6) {
      const diff = (est(zve * 1.25) - est(zve * 0.75)) * 2;
      return Math.max(diff, Math.floor(zve * 0.14));
    }
    return est(zve);
  };
  const svRates = (T, land) => {
    const kv = P.kv + (Number(T.kvZusatz) || 0) / 200;
    let pv = P.pv + (land === 'SN' ? 0.005 : 0);
    const kids = Number(T.kinderPV) || 0;
    const age = Number(T.geburtsjahr) ? new Date().getFullYear() - Number(T.geburtsjahr) : 99;
    if (kids === 0 && age >= 23) pv += P.pvKinderlos;
    if (kids >= 2) pv -= Math.min(4, kids - 1) * 0.0025;
    return { kv, pv, rv: P.rv, av: P.av };
  };
  /** Lohnsteuer + Soli + KiSt auf Jahresbasis */
  const steuerJahr = (brutto, S) => {
    const T = S.steuer, k = Number(T.klasse) || 1;
    const r = svRates(T, S.arbeit.land);
    // Vorsorgepauschale wie im PAP: KV mit ermäßigtem Satz (7,0 % + halber Zusatzbeitrag)
    const vors = Math.min(brutto, P.bbgRV * 12) * r.rv + Math.min(brutto, P.bbgKV * 12) * (r.kv - 0.003 + r.pv);
    let zve = brutto - vors;
    if (k !== 6) zve -= P.anPausch + P.saPausch;
    if (k === 2) zve -= P.entlastung2;
    zve = Math.max(0, zve);
    const lst = tarifFor(zve, k);
    const kids = Number(T.kinderFB) || 0;
    const lstKfb = kids ? tarifFor(Math.max(0, zve - kids * P.kfb * (k === 4 ? 0.5 : 1)), k) : lst;
    const frei = k === 3 ? P.soliFrei * 2 : P.soliFrei;
    const soli = lstKfb > frei ? Math.min(lstKfb * 0.055, (lstKfb - frei) * 0.119) : 0;
    const kistSatz = ['BY', 'BW'].includes(S.arbeit.land) ? 0.08 : 0.09;
    const kist = T.kirche ? lstKfb * kistSatz : 0;
    const grenz = (tarifFor(zve + 100, k) - lst) / 100;
    return { lst, soli, kist, zve, vors, kistSatz, grenz, soliFrei: frei, lstKfb, pausch: k !== 6 ? P.anPausch + P.saPausch : 0, entl: k === 2 ? P.entlastung2 : 0 };
  };
  /** Monatsabrechnung: laufend = regelmäßiger Lohn dieses Monats, einmal = sonstige Bezüge */
  const netto = (laufend, einmal, S, mo = 12, extraAbzug = 0, basisLaufend = laufend) => {
    const r = svRates(S.steuer, S.arbeit.land);
    const gross = laufend + einmal;
    // Einmalzahlungen: anteilige Jahres-BBG bis zum Auszahlungsmonat (bei gleichbleibendem laufendem Lohn)
    const capE = (bbg) => Math.min(einmal, Math.max(0, (bbg - Math.min(laufend, bbg)) * mo));
    const kvBase = Math.min(laufend, P.bbgKV) + capE(P.bbgKV), rvBase = Math.min(laufend, P.bbgRV) + capE(P.bbgRV);
    const sv = { kv: kvBase * r.kv, pv: kvBase * r.pv, rv: rvBase * r.rv, av: rvBase * r.av };
    const yL = steuerJahr(laufend * 12, S);
    let lst = yL.lst / 12, soli = yL.soli / 12, kist = yL.kist / 12;
    if (einmal > 0) {
      // Einmalzahlung nach Jahreslohn-Methode; Basis = regelmäßiger Lohn ohne Mehrarbeit (trifft die Abrechnung besser)
      const yB = steuerJahr(basisLaufend * 12, S), yE = steuerJahr(basisLaufend * 12 + einmal, S);
      lst += yE.lst - yB.lst; soli += yE.soli - yB.soli; kist += yE.kist - yB.kist;
    }
    const svSum = sv.kv + sv.pv + sv.rv + sv.av;
    const taxSum = lst + soli + kist;
    const abzug = Number(extraAbzug) || 0;
    return { gross, laufend, einmal, sv, svSum, lst, soli, kist, taxSum, abzug, net: gross - svSum - taxSum - abzug, zveJahr: yL.zve, rates: r, jahr: yL, kvBase, rvBase };
  };

  /** Brutto-Bestandteile eines Monats */
  /** Vormonat als yyyy-mm */
  const prevMonth = (m) => { const [y, mo] = m.split('-').map(Number); return mo === 1 ? `${y - 1}-12` : `${y}-${String(mo - 1).padStart(2, '0')}`; };
  const MONATE = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
  /**
   * Brutto-Bestandteile eines Monats.
   * modus 'aktuell': Grundlohn + Mehrarbeit, Urlaubsgeld und Sonderzahlungen dieses Monats.
   * modus 'auszahlung': Grundlohn dieses Monats + Mehrarbeit, Urlaubsgeld und einmalige Sonderzahlungen des Vormonats.
   */
  /** Gehört eine Sonderzahlung zum Grundgehalt (z. B. Weihnachtsgeld) oder zur Mehrarbeit (alles andere)? */
  const sonderGruppe = (s) => s.gruppe || (/weihnacht/i.test(s.name || '') ? 'grund' : 'mehr');
  /**
   * Brutto-Bestandteile eines Monats.
   * Mehrarbeit, Urlaubsgeld und Sonderzahlungen zählen zum Block „Mehrarbeit“ (extra: true),
   * außer Sonderzahlungen, die mit dem Grundlohn gezahlt werden (z. B. Weihnachtsgeld).
   * modus 'aktuell': alles aus diesem Monat.
   * modus 'auszahlung': Grundlohn (+ Zahlungen mit dem Grundlohn) aus diesem Monat, Mehrarbeit-Block aus dem Vormonat.
   */
  const monthPay = (st, calc, m, modus = 'aktuell') => {
    const S = st.settings;
    const g = monatsentgelt(S);
    const src = modus === 'auszahlung' ? prevMonth(m) : m;
    const mo = Number(m.slice(5, 7)), srcMo = Number(src.slice(5, 7));
    const aus = src !== m ? ` (aus ${MONATE[srcMo - 1]})` : '';
    const lines = [{ k: 'Grundgehalt', v: Number(S.lohn.grundlohn) || 0, laufend: true, extra: false }];
    for (const s of S.lohn.sonder || []) {
      const val = s.modus === 'faktor' ? g * (Number(s.wert) || 0) : Number(s.wert) || 0;
      if (!val) continue;
      const extra = sonderGruppe(s) === 'mehr';
      if (s.art === 'monatlich') lines.push({ k: s.name || 'Sonderzahlung', v: val, laufend: true, extra });
      else if (Number(s.monat) === (extra ? srcMo : mo)) lines.push({ k: (s.name || 'Sonderzahlung') + (extra ? aus : ''), v: val, laufend: false, extra });
    }
    const mm = calc.months.get(src);
    // Arbeitgeber zahlt evtl. nur die Zuschläge aus (Grundstunden → Konto Mehrarbeit zur Verrechnung) – aus der Abrechnung gelernt
    const nurZ = !!S.lohn.mehrNurZuschlag;
    const mPay = mm ? (nurZ ? mm.pay.z25 + mm.pay.z50 : mm.pay.total) : 0;
    if (mPay) lines.push({ k: 'Mehrarbeit' + (nurZ ? ' (Zuschläge)' : '') + aus, v: mPay, laufend: true, mehr: mm, nurZ, extra: true });
    let tu = 0;
    for (const [d, a] of calc.absMap) if (a.type === 'tarif' && ym(d) === src) tu += a.units;
    const ugTag = (g / (Number(S.urlaub.ugTeiler) || 21.75)) * (Number(S.urlaub.ugFaktor) || 0);
    if (tu && ugTag) lines.push({ k: `Urlaubsgeld (${String(tu).replace('.', ',')} ${tu === 1 ? 'Tag' : 'Tage'})`, v: tu * ugTag, laufend: false, extra: true });
    // Konto „Mehrarbeit zur Verrechnung“ als einmalige Sonderzahlung (zählt zum Block Mehrarbeit)
    const rate = stundenlohn(S);
    const kp = kurzPlan(st, calc.absMap);
    const paid = ((S.mav && S.mav.ausgezahlt) || []).find((x) => x.monat === src);
    const mavH = paid ? Number(paid.stunden) || 0 : S.mav && S.mav.auszahlen && S.mav.monat === src ? kp.rest : 0;
    if (mavH > 0 && rate) lines.push({ k: `Mehrarbeit zur Verrechnung (${String(Math.round(mavH * 100) / 100).replace('.', ',')} h)${aus}`, v: mavH * rate, laufend: false, extra: true, mav: mavH });
    // Kurzarbeit im Monat m: Tage über das MAV-Konto (7 h) sind normal bezahlt, sonst Ausfall + Kurzarbeitergeld 60/67 %
    const tag = rate * tagessoll(S);
    const pct = (Number(S.steuer.kinderFB) || 0) >= 0.5 ? 0.67 : 0.6;
    let ku = 0, kc = 0;
    for (const [d, cov] of kp.days) if (ym(d) === m) { if (cov) kc++; else ku++; }
    if (ku || kc) lines.push({ k: `Kurzarbeit – Ausfall (${ku} ${ku === 1 ? 'Tag' : 'Tage'}${kc ? `; ${kc} ${kc === 1 ? 'Tag' : 'Tage'} über Mehrarbeits-Konto ausgeglichen` : ''})`, v: -ku * tag, laufend: true, extra: false, kurz: true });
    const kug = ku * tag * pct;
    const sum = (f) => lines.filter(f).reduce((a2, b2) => a2 + b2.v, 0);
    const laufend = sum((l) => l.laufend), einmal = sum((l) => !l.laufend);
    const extraL = sum((l) => l.laufend && l.extra), extraE = sum((l) => !l.laufend && l.extra);
    const mehrL = sum((l) => l.mehr);
    return { lines, laufend, einmal, extraL, extraE, extra: extraL + extraE, basis: laufend - mehrL, abzug: -kug, kug, kurz: { tage: ku, konto: kc, pct, tag }, mavH, src, tu, ugTag, modus };
  };

  /** Kurzarbeitstage chronologisch: solange das Konto „Mehrarbeit zur Verrechnung“ ≥ 7 h hat, werden je Tag 7 volle Stunden genommen */
  const kurzPlan = (st, absMap = absenceDays(st)) => {
    const S = st.settings, M = S.mav || {};
    let rest = Number(M.stunden) || 0;
    const days = new Map();
    for (const [d, a] of [...absMap.entries()].sort((x, y) => (x[0] < y[0] ? -1 : 1))) {
      if (a.type !== 'kurz') continue;
      const cov = (!M.datum || d > M.datum) && rest >= 7;
      if (cov) rest -= 7;
      days.set(d, cov);
    }
    return { days, rest };
  };
  /** Auszahlungsmonat des MAV-Kontos vorbei und Haken noch gesetzt → gilt als ausbezahlt: Konto auf 0. Verändert st. */
  const mavRollover = (st, today = todayIso()) => {
    const M = st.settings.mav;
    if (!M || !M.auszahlen || !M.monat || M.monat >= ym(today)) return false;
    const rest = kurzPlan(st).rest;
    M.ausgezahlt = [...(M.ausgezahlt || []).filter((x) => x.monat !== M.monat), { monat: M.monat, stunden: Math.round(rest * 100) / 100 }];
    Object.assign(M, { stunden: 0, datum: today, auszahlen: false, monat: '' });
    return true;
  };

  /** Demo-Daten (erfunden) für das ganze Jahr – zum Vorzeigen ohne echte Daten */
  const demoState = (year = 2026) => {
    let seed = 20260815;
    const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
    const S = merge(defaults(), {
      theme: 'dark',
      arbeit: { land: 'BY', mariae: true },
      lohn: { grundlohn: 3600, sonder: [{ id: 'weihnachtsgeld', name: 'Weihnachtsgeld', art: 'einmalig', monat: 11, modus: 'faktor', wert: 0.55, gruppe: 'grund' }] },
      zk: { stand: 6, datum: `${year - 1}-12-31` },
      urlaub: { fzaStand: 14, fzaDatum: `${year - 1}-12-31` },
      mav: { stunden: 24, datum: `${year - 1}-12-31`, auszahlen: false, monat: '', ausgezahlt: [] },
      kurz: { aktiv: true, monat: `${year}-08` },
      mail: { anrede: 'Hallo Chef', an: '', name: 'Demo' },
      steuer: { klasse: 1, kirche: false, kinderFB: 1, kinderPV: 1, geburtsjahr: 1990, kasse: 'Techniker Krankenkasse (TK)', kvZusatz: 2.69, geprueft: true },
    });
    const A = (from, to, type, note = '') => ({ id: `demo-${from}-${type}`, created: 0, from, to, type, half: false, note });
    const y = String(year);
    const absences = [
      A(`${y}-01-02`, `${y}-01-02`, 'tzug'), A(`${y}-02-16`, `${y}-02-20`, 'tarif', 'Fasching'), A(`${y}-03-10`, `${y}-03-11`, 'krank'),
      A(`${y}-04-07`, `${y}-04-07`, 'zk'), A(`${y}-06-01`, `${y}-06-05`, 'tarif', 'Pfingsten'), A(`${y}-07-03`, `${y}-07-03`, 'zk'),
      A(`${y}-07-17`, `${y}-07-17`, 'sonder', 'Hochzeit'), A(`${y}-08-10`, `${y}-08-17`, 'kurz'), A(`${y}-08-24`, `${y}-09-04`, 'tarif', 'Sommerurlaub'),
      A(`${y}-09-18`, `${y}-09-18`, 'tzug'), A(`${y}-10-02`, `${y}-10-02`, 'fza'), A(`${y}-10-26`, `${y}-10-30`, 'tarif', 'Herbstferien'),
      A(`${y}-11-03`, `${y}-11-03`, 'krank'), A(`${y}-12-23`, `${y}-12-23`, 'tzug'), A(`${y}-12-28`, `${y}-12-31`, 'tarif'),
    ];
    const st = { settings: S, entries: {}, absences, kontingent: {}, nach: [], pref: {}, meta: { demo: true } };
    const kont = [15, 10, 0, 15, 15, 10, 0, 0, 10, 0, 20, 10];
    kont.forEach((k, i) => { if (k) st.kontingent[`${y}-${String(i + 1).padStart(2, '0')}`] = k; });
    const ruhig = [3, 7, 8, 10]; // Monate ohne Mehrarbeit
    const abs = absenceDays(st), opt = holOpt(S);
    const clock = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
    for (const d of range(`${y}-01-01`, `${y}-12-31`)) {
      const mo = Number(d.slice(5, 7)), w = dow(d), a = abs.get(d);
      if (a && a.full) continue;
      let start, dur, pause;
      if (isWorkday(d, opt)) {
        start = 375 + Math.round(rnd() * 60);
        dur = ruhig.includes(mo) ? 405 + Math.round(rnd() * 25) : 415 + Math.round(rnd() * (mo % 2 ? 80 : 60));
        pause = 45;
      } else if (w === 6 && !ruhig.includes(mo) && rnd() < 0.15) {
        start = 330 + Math.round(rnd() * 30); dur = 300 + Math.round(rnd() * 120);
        pause = specialPause(dur); dur = Math.max(dur - pause, 0);
      } else continue;
      const end = start + dur + pause;
      const raw = workedRaw(clock(start), clock(end), pause), c = capDay(raw);
      st.entries[d] = { start: clock(start), end: clock(end), pause, hours: c.hours, raw, capped: c.capped, half: false };
    }
    return st;
  };

  /** Jahres-Statistik (Arbeitstage, Rekorde, Abwesenheiten) */
  const yearStats = (st, calc, y, vac) => {
    const S = st.settings, opt = holOpt(S), Y = String(y);
    const ent = Object.entries(st.entries).filter(([d]) => d.startsWith(Y)).sort();
    const sollTage = range(`${Y}-01-01`, `${Y}-12-31`).filter((d) => isWorkday(d, opt)).length;
    const feiertage = [...holidays(y, opt).keys()].filter((d) => d.startsWith(Y) && dow(d) >= 1 && dow(d) <= 5).length;
    let longest = null, earliest = null, latest = null, sumH = 0, sumStart = 0, sumEnd = 0, sat = 0, satH = 0, over9 = 0, capped = 0, pause = 0;
    for (const [d, e] of ent) {
      const a = toMin(e.start); let b = toMin(e.end); if (b < a) b += 1440;
      sumH += e.hours; sumStart += a; sumEnd += b; pause += Number(e.pause) || 0;
      if (!longest || e.hours > longest.hours) longest = { date: d, hours: e.hours };
      if (!earliest || a < earliest.min) earliest = { date: d, min: a };
      if (!latest || b > latest.min) latest = { date: d, min: b };
      if (dow(d) === 6) { sat++; satH += e.hours; }
      if (e.hours > 9) over9++;
      if (e.capped) capped++;
    }
    const n = ent.length;
    let topWeek = null;
    for (const w of calc.weeks) {
      const h = w.days.filter((x) => x.date.startsWith(Y) && x.entry).reduce((acc, x) => acc + x.entry.hours, 0);
      if (h > 0 && (!topWeek || h > topWeek.hours)) topWeek = { kw: w.kw, monday: w.monday, sunday: w.sunday, hours: h };
    }
    let topMonth = null;
    for (const m of calc.months.values()) if (m.month.startsWith(Y) && m.mehr > 0 && (!topMonth || m.mehr > topMonth.mehr)) topMonth = { month: m.month, mehr: m.mehr };
    const v = (vac && vac[y]) || {};
    const urlaub = (v.taken || 0) + (v.tzug || 0) + (v.sonder || 0) + (v.zkDays || 0) + (v.fzaDays || 0);
    return {
      arbeitstage: n, sollTage, feiertage, samstage: sat, samstagH: satH, stunden: sumH,
      schnitt: n ? sumH / n : 0, beginn: n ? Math.round(sumStart / n) : null, ende: n ? Math.round(sumEnd / n) : null,
      longest, earliest, latest, topWeek, topMonth, over9, capped, pauseH: pause / 60,
      krank: v.krank || 0, kurz: v.kurz || 0, urlaub,
    };
  };

  // ---------- Entgeltabrechnung (PDF des Arbeitgebers) ----------
  const MONATE_LANG = ['januar', 'februar', 'märz', 'april', 'mai', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'dezember'];
  /**
   * Entgeltabrechnung (Zeilen mit Textstücken {x, s}) → Kennzahlen des Monats.
   * Werte-Spalten (Tg./St., Faktor, Monatswert, Jahreswert) über die Kopfzeile, sonst Standard-Positionen.
   */
  const parseAbrechnung = (rows) => {
    const seen = new Set();
    rows = rows.map((r) => ({ ...r, items: r.items.filter((i) => { const k = `${Math.round(i.x)}|${Math.round(r.y)}|${i.s}`; if (seen.has(k)) return false; seen.add(k); return true; }) }));
    let month = null, cols = null;
    for (let i = 0; i < rows.length && !month; i++) {
      const t = rows[i].items.map((x) => x.s).join(' ');
      if (/Abrechnungszeitraum|Abrechnungsmonat/i.test(t) || i > 0) {
        const m = new RegExp(`(${MONATE_LANG.join('|')}|maerz)\\s+(20\\d\\d)`, 'i').exec(t);
        if (m) { const idx = MONATE_LANG.indexOf(m[1].toLowerCase().replace('maerz', 'märz')); month = `${m[2]}-${String(idx + 1).padStart(2, '0')}`; }
      }
    }
    const num = (s) => { const t = String(s || '').trim(); const neg = /-\s*$/.test(t) || /^-/.test(t); const v = deZahl(t.replace(/-\s*$/, '').replace(/^-/, '').trim()); return v === null ? null : neg ? -v : v; };
    const out = { month, lines: [] };
    for (const r of rows) {
      const its = r.items;
      const t = its.map((x) => x.s).join(' ');
      if (/Monatswert/.test(t) && /Jahreswert/.test(t)) {
        const f = (re) => (its.find((x) => re.test(x.s)) || {}).x;
        cols = { tg: f(/Tg\.|St\./), faktor: f(/Faktor/), monat: f(/Monatswert/), jahr: f(/Jahreswert/) };
        continue;
      }
      const label = its.filter((x) => num(x.s) === null && !/^[\/A-Z0-9#$]{3,4}$/.test(x.s.trim()) && !/^[ELSGZ]{2,5}$/.test(x.s.trim())).map((x) => x.s.trim()).join(' ').trim();
      const nums = its.filter((x) => num(x.s) !== null);
      if (!label || !nums.length) continue;
      const C2 = cols || { tg: 259, faktor: 319, monat: 404, jahr: 498 };
      const slot = (x) => { const cand = Object.entries(C2).filter(([, hx]) => hx !== undefined && hx <= x + 6).sort((a, b) => b[1] - a[1]); return cand.length ? cand[0][0] : 'monat'; };
      const v = {}; for (const n of nums) v[slot(n.x)] = num(n.s);
      out.lines.push({ label, ...v });
    }
    const find = (re) => out.lines.find((l) => re.test(l.label));
    const val = (re, k = 'monat') => { const l = find(re); return l && l[k] !== undefined ? Math.abs(l[k]) : 0; };
    const z25 = find(/Mehrarb\w*\.?\s*Zuschl\w*\.?\s*25/i), z50 = find(/Mehrarb\w*\.?\s*Zuschl\w*\.?\s*50/i);
    const base = out.lines.find((l) => /Mehrarb/i.test(l.label) && !/Zus|Nacht/i.test(l.label));
    const ug = find(/Urlaubsgeld/i);
    const kvFrei = val(/Beitrag freiw\.?\s*KV/i), pvFrei = val(/Beitrag freiw\.?\s*PV/i), kvZ = val(/AG-Zuschuss KV/i), pvZ = val(/AG-Zuschuss PV/i);
    const r = {
      month,
      grund: val(/Entgelt gesamt/i) || val(/Grundentgelt|Grundgehalt|Gehalt/i),
      brutto: val(/Gesamtbrutto|Gesamt-Brutto/i), bruttoJahr: val(/Gesamtbrutto|Gesamt-Brutto/i, 'jahr'),
      stEZ: val(/Steuer-?Brutto,?\s*EZ/i), stL: val(/Steuer-?Brutto,?\s*lfd/i), stJahr: val(/Steuer-?Brutto,?\s*lfd/i, 'jahr') + val(/Steuer-?Brutto,?\s*EZ/i, 'jahr'),
      lst: val(/Lohnsteuer,?\s*EZ/i) + val(/Lohnsteuer,?\s*lfd/i) || val(/^Lohnsteuer/i),
      lstJahr: val(/Lohnsteuer,?\s*EZ/i, 'jahr') + val(/Lohnsteuer,?\s*lfd/i, 'jahr'),
      soli: val(/Solidarit/i), kist: val(/Kirchensteuer/i),
      rv: val(/Rentenvers\w*,?\s*EZ/i) + val(/Rentenvers\w*,?\s*lfd/i) || val(/Rentenvers/i),
      av: val(/Arbeitslosenv\w*\.?,?\s*EZ/i) + val(/Arbeitslosenv\w*\.?,?\s*lfd/i) || val(/Arbeitslosenv/i),
      kv: kvFrei ? kvFrei - kvZ : val(/Krankenvers/i), pv: pvFrei ? pvFrei - pvZ : val(/Pflegevers/i),
      freiwillig: !!kvFrei,
      gesetzlNetto: val(/Gesetzl\w*\.?\s*Netto/i),
      restzahlung: val(/Restzahlung/i),
      vlAG: val(/Verm\S*\s*AG|VWL|vermögenswirks/i),
      kug: val(/Kurzarbeitergeld/i),
      mehr: { h25: z25 ? Math.abs(z25.tg || 0) : 0, h50: z50 ? Math.abs(z50.tg || 0) : 0, z25: z25 ? Math.abs(z25.monat || 0) : 0, z50: z50 ? Math.abs(z50.monat || 0) : 0, base: base ? Math.abs(base.monat || 0) : 0, baseH: base ? Math.abs(base.tg || 0) : 0, satz: (z25 && z25.faktor) || 0 },
      ug: ug ? { tage: Math.abs(ug.tg || 0), tag: Math.abs(ug.faktor || 0), eur: Math.abs(ug.monat || 0) } : null,
      weihnacht: val(/Weihnacht/i),
    };
    const vj = (re) => val(re, 'jahr');
    r.jahr = {
      brutto: r.bruttoJahr, steuerBrutto: r.stJahr, lst: r.lstJahr, soli: vj(/Solidarit/i), kist: vj(/Kirchensteuer/i),
      rv: vj(/Rentenvers\w*,?\s*EZ/i) + vj(/Rentenvers\w*,?\s*lfd/i), av: vj(/Arbeitslosenv\w*\.?,?\s*EZ/i) + vj(/Arbeitslosenv\w*\.?,?\s*lfd/i),
      kv: kvFrei ? vj(/Beitrag freiw\.?\s*KV/i) - vj(/AG-Zuschuss KV/i) : vj(/Krankenvers/i), pv: pvFrei ? vj(/Beitrag freiw\.?\s*PV/i) - vj(/AG-Zuschuss PV/i) : vj(/Pflegevers/i),
    };
    r.steuer = r.lst + r.soli + r.kist;
    r.sv = r.rv + r.av + r.kv + r.pv;
    // Netto wie in Toki: gesetzliches Netto + AG-Zuschüsse − freiwillige Beiträge (bzw. Brutto − Steuern − SV)
    r.netto = r.gesetzlNetto ? r.gesetzlNetto + kvZ + pvZ - kvFrei - pvFrei : r.brutto - r.steuer - r.sv;
    if (!month || !r.brutto) throw new Error('Das sieht nicht nach einer Entgeltabrechnung aus – ich finde Monat oder Gesamtbrutto nicht.');
    return r;
  };

  /** Vergleich Abrechnung ↔ Toki (Ansicht „Auszahlung“) und Lern-Korrektur der Abzüge */
  const abrechnungVergleich = (st, calc, a) => {
    const S = st.settings, mo = Number(a.month.slice(5, 7));
    const mp = monthPay(st, calc, a.month, 'auszahlung');
    const t = netto(mp.laufend, mp.einmal, S, mo, mp.abzug, mp.basis);
    // Toki-Abzüge auf exakt das Brutto der Abrechnung → reine Modell-Abweichung bei Steuer/SV
    const mehrEur = a.mehr.z25 + a.mehr.z50 + a.mehr.base;
    const lauf = a.stL || a.brutto - a.stEZ, ein = a.stEZ;
    const t2 = netto(lauf, ein, S, mo, 0, Math.max(0, lauf - mehrEur));
    const realAbz = a.steuer + a.sv, tokiAbz = t2.taxSum + t2.svSum;
    const mehrToki = mp.lines.filter((l) => l.mehr).reduce((x, l) => x + l.v, 0);
    const ugToki = mp.lines.filter((l) => /^Urlaubsgeld/.test(l.k)).reduce((x, l) => x + l.v, 0);
    return {
      zeilen: [
        { k: 'Grundgehalt', toki: Number(S.lohn.grundlohn) || 0, real: a.grund },
        { k: 'Mehrarbeit', toki: mehrToki, real: mehrEur, info: a.mehr.base ? '' : 'laut Abrechnung nur Zuschläge' },
        { k: 'Urlaubsgeld', toki: ugToki, real: a.ug ? a.ug.eur : 0 },
        { k: 'Brutto', toki: t.gross, real: a.brutto },
        { k: 'Steuern', toki: t.taxSum, real: a.steuer },
        { k: 'Sozialversicherung', toki: t.svSum, real: a.sv },
        { k: 'Netto', toki: t.net, real: a.netto },
      ],
      korr: tokiAbz - realAbz, // > 0: Toki zieht zu viel ab
      nurZuschlag: !a.mehr.base && (a.mehr.z25 + a.mehr.z50) > 0,
      grundAnders: a.grund > 0 && Math.abs(a.grund - (Number(S.lohn.grundlohn) || 0)) > 0.5,
    };
  };
  /** Lern-Korrektur: Mittel der letzten (bis zu 3) Abweichungen bei den Abzügen */
  const lernKorrektur = (st) => {
    const list = Object.values(st.abrechnungen || {}).filter((a) => Number.isFinite(a.korr)).sort((a, b) => (a.month < b.month ? 1 : -1)).slice(0, 3);
    return list.length ? list.reduce((x, a) => x + a.korr, 0) / list.length : 0;
  };

  /** Jahres-Gehalt: je Monat Abrechnung (falls eingelesen) sonst Toki-Rechnung (Ansicht „Auszahlung“) */
  const gehaltJahr = (st, calc, y, today = todayIso()) => {
    const S = st.settings, months = [];
    const sum = { brutto: 0, steuerBrutto: 0, lst: 0, soli: 0, kist: 0, rv: 0, av: 0, kv: 0, pv: 0, steuer: 0, sv: 0, netto: 0, kug: 0, mehr: 0, ug: 0, sonder: 0, echt: 0, prognose: 0 };
    for (let i = 1; i <= 12; i++) {
      const m = `${y}-${String(i).padStart(2, '0')}`;
      const a = (st.abrechnungen || {})[m];
      let r;
      if (a) {
        r = { m, echt: true, brutto: a.brutto, steuerBrutto: a.stL + a.stEZ, lst: a.lst, soli: a.soli, kist: a.kist, rv: a.rv, av: a.av, kv: a.kv, pv: a.pv, steuer: a.steuer, sv: a.sv, netto: a.netto + (a.kug || 0), kug: a.kug || 0,
          mehr: a.mehr.z25 + a.mehr.z50 + a.mehr.base, ug: a.ug ? a.ug.eur : 0, sonder: a.weihnacht || 0 };
      } else {
        const mp = monthPay(st, calc, m, 'auszahlung');
        const n = netto(mp.laufend, mp.einmal, S, i, mp.abzug, mp.basis);
        const korr = S.lohn.lernen ? lernKorrektur(st) : 0;
        const ln = (re) => mp.lines.filter((l) => re(l)).reduce((x, l) => x + l.v, 0);
        r = { m, echt: false, brutto: n.gross, steuerBrutto: n.gross, lst: n.lst, soli: n.soli, kist: n.kist, rv: n.sv.rv, av: n.sv.av, kv: n.sv.kv, pv: n.sv.pv, steuer: n.taxSum, sv: n.svSum, netto: n.net + korr, kug: mp.kug || 0,
          mehr: ln((l) => l.mehr), ug: ln((l) => /^Urlaubsgeld/.test(l.k)), sonder: ln((l) => !l.mehr && !l.mav && !l.kurz && !/^Urlaubsgeld|^Grundgehalt/.test(l.k)) };
      }
      r.prognose = !r.echt && m > ym(today);
      months.push(r);
      for (const k of Object.keys(sum)) if (typeof r[k] === 'number') sum[k] += r[k];
      if (r.echt) sum.echt++; if (r.prognose) sum.prognose++;
    }
    return { y, months, sum };
  };

  /** Daten für die Steuererklärung (Anlage N/Vorsorge) + grober Tarif-Tipp */
  const steuerKlaerung = (st, calc, y, today = todayIso()) => {
    const S = st.settings, T = S.steuer;
    const gj = gehaltJahr(st, calc, y, today);
    const Y = String(y);
    const arbeitstage = Object.keys(st.entries).filter((d) => d.startsWith(Y)).length;
    const km = Number(T.km) || 0;
    const pendler = km * 0.38 * arbeitstage;
    const wkPausch = P.anPausch;
    const slips = Object.values(st.abrechnungen || {}).filter((a) => a.month.startsWith(Y)).sort((a, b) => (a.month < b.month ? 1 : -1));
    const last = slips[0] || null;
    // Bis zur letzten Abrechnung zählen deren Jahreswerte (exakt), danach Toki/weitere Abrechnungen
    const sum = { ...gj.sum };
    let bis = null;
    if (last && last.jahr && last.jahr.steuerBrutto) {
      bis = last.month;
      const after = gj.months.filter((r) => r.m > last.month);
      const add = (k) => after.reduce((x, r) => x + (r[k] || 0), 0);
      for (const k of ['steuerBrutto', 'lst', 'soli', 'kist', 'rv', 'av', 'kv', 'pv']) sum[k] = (last.jahr[k] || 0) + add(k);
      sum.brutto = (last.jahr.brutto || 0) + add('brutto');
      sum.steuer = sum.lst + sum.soli + sum.kist; sum.sv = sum.rv + sum.av + sum.kv + sum.pv;
    }
    const sj = steuerJahr(sum.steuerBrutto, S);
    const split = Number(T.klasse) === 3 || Number(T.klasse) === 4;
    const grenze42 = split ? 139758 : 69879, grundfrei = split ? 24696 : 12348;
    return {
      y, gj, sum, bis, arbeitstage, km, pendler, wkPausch, wkMehr: Math.max(0, pendler + 16 - wkPausch), // 16 € Kontoführung (üblich anerkannt)
      kug: gj.sum.kug, krank: 0, last,
      zve: sj.zve, grenz: sj.grenz, grenze42, grundfrei, split, bisGrenze: grenze42 - sj.zve,
    };
  };

  // ---------- Zeitnachweis (PDF des Arbeitgebers) ----------
  const deZahl = (s) => { const t = String(s || '').trim().replace(/\./g, '').replace(',', '.'); return /^-?\d+(\.\d+)?$/.test(t) ? Number(t) : null; };
  const deDatum = (s) => { const m = /(\d{2})\.(\d{2})\.(\d{4})/.exec(s || ''); return m ? `${m[3]}-${m[2]}-${m[1]}` : null; };
  /** Art eines Tages aus der Beschreibung → Toki-Abwesenheit (oder null) */
  const nachweisArt = (desc) => {
    const d = String(desc || '').toLowerCase();
    if (!d || /anwesend|dienstgang|dienstreise|homeoffice|mobil/.test(d)) return null;
    if (/sonderurlaub/.test(d)) return { type: 'sonder', note: desc };
    if (/kurzarbeit/.test(d)) return { type: 'kurz', note: '' };
    if (/\bkur\b|reha/.test(d)) return { type: 'sonder', note: desc };
    if (/krank/.test(d)) return { type: 'krank', note: /^krank(heit)?$/i.test(desc.trim()) ? '' : desc };
    if (/t-?zug|tarifl.*zusatz/.test(d)) return { type: 'tzug', note: '' };
    if (/fza|freizeitausgleich/.test(d)) return { type: 'fza', note: '' };
    if (/zeitkonto|zeitausgleich|gleit|zk\b/.test(d)) return { type: 'zk', note: '' };
    if (/urlaub/.test(d)) return { type: 'tarif', note: '' };
    return { type: '?', note: desc };
  };
  /**
   * Zeitnachweis-PDF (als Zeilen mit Textstücken {x, s}) → Monatsdaten.
   * Spalten werden über die Kopfzeile (Dat, Tag, Beschreibung, von, bis, Istz., …) zugeordnet.
   */
  const parseZeitnachweis = (rows) => {
    const txt = (r) => r.items.map((i) => i.s).join(' ');
    let from = null, to = null, head = null; const days = []; let summary = false;
    const out = { from: null, to: null, month: null, days, zk: null, fza: null, mav: null, kontingent: null, verbraucht: null, ist: null };
    for (const r of rows) {
      const line = txt(r);
      if (!from && /Zeitraum/.test(line)) { const ds = line.match(/\d{2}\.\d{2}\.\d{4}/g) || []; from = deDatum(ds[0]); to = deDatum(ds[1]); continue; }
      if (!head && r.items.some((i) => i.s.trim() === 'Dat') && /Beschreibung/.test(line)) { head = r.items.map((i) => ({ k: i.s.trim(), x: i.x })); continue; }
      if (/Monats(ü|ue)bersicht/.test(line)) { summary = true; continue; }
      if (summary) {
        for (let k = 0; k < r.items.length; k++) {
          const lab = r.items[k].s.trim(), val = r.items[k + 1] ? deZahl(r.items[k + 1].s) : null;
          if (val === null) continue;
          if (/^monatliches Kontingent/i.test(lab)) out.kontingent = val;
          else if (/^verbrauchtes Kontingent/i.test(lab)) out.verbraucht = val;
          else if (/^Ist-Zeit/i.test(lab)) out.ist = val;
        }
        continue;
      }
      if (!head || !from) continue;
      const col = (x) => head.reduce((b, h) => (Math.abs(h.x - x) < Math.abs(b.x - x) ? h : b)).k;
      const cells = {};
      for (const i of r.items) { const k = col(i.x); cells[k] = cells[k] ? `${cells[k]} ${i.s.trim()}` : i.s.trim(); }
      if (/^Woche/.test((r.items[0] || {}).s || '')) continue;
      const dn = /^\d{1,2}$/.test(cells.Dat || '') ? Number(cells.Dat) : null;
      const seg = { desc: cells.Beschreibung || '', von: /^\d{1,2}:\d{2}$/.test(cells.von || '') ? cells.von.padStart(5, '0') : null, bis: /^\d{1,2}:\d{2}$/.test(cells.bis || '') ? cells.bis.padStart(5, '0') : null };
      if (dn !== null) {
        const date = `${from.slice(0, 8)}${String(dn).padStart(2, '0')}`;
        if (date < from || date > to) continue;
        days.push({ date, segs: seg.desc || seg.von ? [seg] : [], ist: deZahl(cells['Istz.']), soll: deZahl(cells.Sollz), zkt: deZahl(cells.ZKT), zktK: deZahl(cells['ZKT K']), ma: deZahl(cells.MA), meav: deZahl(cells.MEAV), fzaK: deZahl(cells['FZA K']), holiday: '' });
      } else if (days.length && (seg.desc || seg.von)) {
        const d = days[days.length - 1];
        if (!seg.von && !seg.bis && !d.segs.length) d.holiday = seg.desc; else d.segs.push(seg);
      }
    }
    if (!from || !head || !days.length) throw new Error('Das sieht nicht nach einem Zeitnachweis aus – ich finde keine Tagesliste.');
    Object.assign(out, { from, to, month: ym(from) });
    const last = days.filter((d) => d.zktK !== null).pop(); if (last) out.zk = { date: to, value: last.zktK };
    const lastF = days.filter((d) => d.fzaK !== null).pop(); if (lastF) out.fza = { date: to, value: lastF.fzaK };
    const lastM = days.filter((d) => d.meav !== null && d.meav !== undefined).pop(); if (lastM) out.mav = { date: to, value: lastM.meav };
    // Tage auswerten
    for (const d of days) {
      const work = d.segs.filter((s) => s.von && s.bis);
      const abs = d.segs.map((s) => nachweisArt(s.desc)).find((a) => a);
      d.abs = work.length ? null : abs || null;
      d.half = !!(work.length && abs && abs.type === 'tarif');
      if (work.length && d.ist !== null) {
        const start = work[0].von, end = work[work.length - 1].bis;
        let span = toMin(end) - toMin(start); if (span < 0) span += 1440;
        d.work = { start, end, pause: Math.max(0, Math.round(span - d.ist * 60)), hours: d.ist };
      } else d.work = null;
      d.desc = d.segs.map((s) => s.desc).filter(Boolean)[0] || '';
    }
    return out;
  };

  /** Zeitkonto/FZA, wie Toki sie am Ende eines Tages sieht (null, wenn der Startstand später liegt) */
  const kontenAm = (st, date) => {
    const S = st.settings;
    const entries = {}; for (const [d, e] of Object.entries(st.entries || {})) if (d <= date) entries[d] = e;
    const absences = (st.absences || []).filter((a) => a.from <= date).map((a) => ({ ...a, to: (a.to || a.from) > date ? date : a.to || a.from }));
    const c = compute({ ...st, entries, absences }, date);
    return { zk: S.zk.datum && S.zk.datum > date ? null : c.zkPlanned, fza: S.urlaub.fzaDatum && S.urlaub.fzaDatum > date ? null : c.fzaPlanned, mehr: (c.months.get(ym(date)) || {}).mehr || 0 };
  };

  /** Vergleich Toki ↔ Zeitnachweis: Tagesabweichungen, Konten, Kontingent */
  const importPlan = (st, pdf) => {
    const absMap = absenceDays(st);
    const diffs = [];
    const fmtW = (w) => `${w.start}–${w.end} (${w.hours.toFixed(2).replace('.', ',')} h)`;
    const tokiTxt = (d) => {
      const e = st.entries[d], a = absMap.get(d);
      const parts = [];
      if (a && !a.fromEntry) parts.push(TYPES[a.type] ? TYPES[a.type].label + (a.note ? ` (${a.note})` : '') : a.type);
      if (e) parts.push(fmtW(e) + (e.half ? ' + ½ Urlaub' : ''));
      return parts.join(' + ') || '–';
    };
    const pdfTxt = (p) => p.work ? fmtW(p.work) + (p.half ? ' + ½ Urlaub' : '') : p.abs ? (p.abs.type === '?' ? `„${p.abs.note}“ (nicht erkannt)` : TYPES[p.abs.type].label + (p.abs.note ? ` (${p.abs.note})` : '')) : '–';
    let cnt = { work: 0, abs: {}, unbekannt: 0 };
    for (const p of pdf.days) {
      if (p.work) cnt.work++;
      else if (p.abs) { if (p.abs.type === '?') cnt.unbekannt++; else cnt.abs[p.abs.type] = (cnt.abs[p.abs.type] || 0) + 1; }
      const e = st.entries[p.date], a = absMap.get(p.date);
      const tA = a && !a.fromEntry ? a.type : null;
      let same;
      if (p.work) same = !!e && e.start === p.work.start && e.end === p.work.end && Math.abs(e.hours - Math.min(MAX_DAY, p.work.hours)) < 0.01 && !!e.half === p.half && !tA;
      else if (p.abs) same = !e && tA === p.abs.type;
      else same = !e && !tA;
      if (!same && !(p.abs && p.abs.type === '?' && !e && !tA)) diffs.push({ date: p.date, toki: tokiTxt(p.date), pdf: pdfTxt(p) });
    }
    const k = kontenAm(st, pdf.to);
    const konten = [];
    if (pdf.zk) konten.push({ k: 'Zeitkonto', toki: k.zk, pdf: pdf.zk.value, uebernehmen: !st.settings.zk.datum || pdf.to >= st.settings.zk.datum });
    if (pdf.fza) konten.push({ k: 'FZA-Konto', toki: k.fza, pdf: pdf.fza.value, uebernehmen: !st.settings.urlaub.fzaDatum || pdf.to >= st.settings.urlaub.fzaDatum });
    if (pdf.mav) konten.push({ k: 'Mehrarbeit zur Verrechnung (MEAV)', toki: kurzPlan(st).rest, pdf: pdf.mav.value, uebernehmen: !(st.settings.mav || {}).datum || pdf.to >= st.settings.mav.datum });
    if (pdf.kontingent !== null) konten.push({ k: 'MEA-Kontingent', toki: st.kontingent && st.kontingent[pdf.month] !== undefined ? Number(st.kontingent[pdf.month]) : null, pdf: pdf.kontingent, uebernehmen: true });
    if (pdf.verbraucht !== null) konten.push({ k: 'Mehrarbeit (verbraucht)', toki: k.mehr, pdf: pdf.verbraucht, info: true });
    return { pdf, diffs, konten, cnt };
  };

  /** Zeitnachweis übernehmen: der Nachweis gilt für seinen Zeitraum (Zeiten, Abwesenheiten, Konten). Verändert st. */
  const applyImport = (st, plan, now = Date.now(), newId = () => Math.random().toString(36).slice(2, 10)) => {
    const { pdf } = plan; const S = st.settings;
    for (const p of pdf.days) {
      if (p.work) { const c = capDay(p.work.hours); st.entries[p.date] = { start: p.work.start, end: p.work.end, pause: p.work.pause, hours: c.hours, raw: p.work.hours, capped: c.capped, half: p.half, src: 'pdf' }; }
      else if (!(p.abs && p.abs.type === '?')) delete st.entries[p.date];
    }
    // Abwesenheiten im Zeitraum durch die aus dem Nachweis ersetzen (nicht erkannte Tage bleiben unangetastet)
    const keep = new Set(pdf.days.filter((p) => p.abs && p.abs.type === '?').map((p) => p.date));
    const list = [];
    for (const a of st.absences || []) {
      const aTo = a.to || a.from;
      if (aTo < pdf.from || a.from > pdf.to) { list.push(a); continue; }
      if (a.from < pdf.from) list.push({ ...a, id: newId(), to: addDays(pdf.from, -1) });
      if (aTo > pdf.to) list.push({ ...a, id: newId(), from: addDays(pdf.to, 1) });
      for (const d of keep) if (d >= a.from && d <= aTo) list.push({ ...a, id: newId(), from: d, to: d });
    }
    let run = null;
    const flush = () => { if (run) list.push({ id: newId(), created: 0, from: run.from, to: run.to, type: run.type, half: false, note: run.note, src: 'pdf' }); run = null; };
    for (const p of pdf.days) {
      const a = p.abs && p.abs.type !== '?' ? p.abs : null;
      if (a && run && run.type === a.type && run.note === a.note) run.to = p.date;
      else if (a) { flush(); run = { from: p.date, to: p.date, type: a.type, note: a.note }; }
      else if (p.work || p.desc) flush(); // freie Tage (Wochenende/Feiertag) unterbrechen einen Block nicht
    }
    flush();
    st.absences = list;
    for (const k of plan.konten) {
      if (!k.uebernehmen || k.info) continue;
      if (k.k === 'Zeitkonto') Object.assign(S.zk, { stand: k.pdf, datum: pdf.to, setAt: now });
      if (k.k === 'FZA-Konto') Object.assign(S.urlaub, { fzaStand: k.pdf, fzaDatum: pdf.to, fzaSetAt: now });
      if (k.k === 'MEA-Kontingent') st.kontingent[pdf.month] = k.pdf;
      if (/^Mehrarbeit zur Verrechnung/.test(k.k)) Object.assign(S.mav, { stunden: k.pdf, datum: pdf.to });
    }
    st.nachweise = { ...(st.nachweise || {}), [pdf.month]: { importiert: now, tage: pdf.days.filter((p) => p.work).length } };
    return st;
  };

  return {
    toMin, fmtClock, leaveAt, workedRaw, capDay, MAX_DAY, D, iso, addDays, dow, monday, isoWeek, ym, todayIso, range,
    LAENDER, easter, holidays, holidayName, isWorkday, workdaysBetween, defaults, merge, tagessoll, stundenlohn, holOpt,
    TYPES, specialPause, presence, absenceDays, halfDay, dayNeed, yearCfg, dayTarget, zuschlag, compute, vacation, est, steuerJahr, netto, monthPay, monatsentgelt, sonderGruppe, prevMonth, KASSEN, P, parseZeitnachweis, parseAbrechnung, abrechnungVergleich, lernKorrektur, gehaltJahr, steuerKlaerung, yearStats, importPlan, applyImport, kontenAm, kurzPlan, mavRollover, demoState,
  };
})();
if (typeof module !== 'undefined') module.exports = Core;
