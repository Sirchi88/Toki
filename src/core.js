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
    theme: 'standard',
    arbeit: { wochenstunden: 35, brotzeit: 15, mittag: 30, land: 'BY', mariae: true, halb24: false, halb31: false },
    lohn: {
      grundlohn: 0, stundenlohn: 0, zeigen: true, auszahlung: 'folgemonat', nettoAbzug: 0,
      sonder: [{ id: 'weihnachtsgeld', name: 'Weihnachtsgeld', art: 'einmalig', monat: 11, modus: 'betrag', wert: 0 }],
    },
    zk: { stand: 0, datum: '', samstagBonus: true, max: 35, min: -35 },
    urlaub: { tarifTage: 30, ugFaktor: 0.5, ugTeiler: 21.75, fzaStand: 0, fzaDatum: '', tzugTage: 8, jahre: {} },
    mail: { anrede: '', an: '', name: '' },
    steuer: { klasse: 1, kirche: true, kinderFB: 0, kinderPV: 0, geburtsjahr: 0, kvZusatz: 2.9, geprueft: false },
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
  const stundenlohn = (S) => {
    const h = Number(S.lohn.stundenlohn);
    if (h > 0) return h;
    const g = Number(S.lohn.grundlohn) || 0;
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
      let mehr = 0, mehrNach = 0, toZK = 0, bonus = 0, under = 0;
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
          // Samstag zuerst in Mehrarbeit, dann Wochentage
          const satEff = Math.min(sg.sat, share);
          const satToMehr = Math.min(satEff, avail);
          const wdToMehr = Math.min(share - satEff, avail - satToMehr);
          const m1 = satToMehr + wdToMehr;
          const nach1 = Math.max(0, m1 - Math.max(0, baseK - u));
          used[sg.month] = u + m1;
          const z1 = share - m1;
          const b1 = S.zk.samstagBonus ? (satEff - satToMehr) * 0.25 : 0;
          parts.push({ month: sg.month, mehr: m1, mehrNach: nach1, toZK: z1, bonus: b1 });
          mehr += m1; mehrNach += nach1; toZK += z1; bonus += b1;
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
      Object.assign(w, { parts, worked, wd, sat, satOnly, zkUnits, zkDebit, offset, mehr, mehrNach, toZK, bonus, under, zkChange: zkEff, zkAfter: zk, fzaAfter: fza, pay, capped });
    }
    // Nachträglich eingetragene ZK-/FZA-Tage, die vor dem Stichtag liegen, trotzdem abziehen
    let late = 0, lateF = 0;
    for (const a of st.absences || []) {
      if (!a.created) continue;
      if (a.type === 'zk' && a.created > (Number(S.zk.setAt) || 0) && zkStart) for (const [d, x] of absMap) if (x.id === a.id && d <= zkStart) late += x.units * soll;
      if (a.type === 'fza' && a.created > (Number(S.urlaub.fzaSetAt) || 0) && fzaStart) for (const [d, x] of absMap) if (x.id === a.id && d <= fzaStart) lateF += x.units * soll;
    }
    zk -= late; fza -= lateF;
    zkToday = (Number(S.zk.stand) || 0) + zkTodaySum - late;
    fzaToday = (Number(S.urlaub.fzaStand) || 0) - fzaTodaySum - lateF;

    // Monate
    const months = new Map();
    const mget = (m) => {
      if (!months.has(m)) months.set(m, { month: m, worked: 0, mehr: 0, mehrNach: 0, toZK: 0, bonus: 0, zkChange: 0, under: 0, weeks: [], pay: { h25: 0, h50: 0, base: 0, z25: 0, z50: 0, total: 0 }, days: 0 });
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
        for (const k of ['mehr', 'mehrNach', 'toZK', 'bonus']) pm[k] += pt[k];
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
    const yr = (y) => (byYear[y] ||= { tarif: [], tzug: [], sonder: 0, zk: 0, fza: 0, krank: 0 });
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
    let carryIn = 0;
    for (let y = startY; y <= endY; y++) {
      const c = yearCfg(S, y), o = yr(y);
      const hasStand = c.rest !== undefined && c.rest !== null && c.rest !== '';
      const anspruch = Number(c.tarif) || 0;
      let carry = hasStand ? 0 : carryIn;
      let pool = hasStand ? Number(c.rest) : anspruch;
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
        sonder: o.sonder, krank: o.krank, zkDays: o.zk, fzaDays: o.fza,
      };
      carryIn = Math.max(0, rest);
    }
    return res;
  };

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
  const netto = (laufend, einmal, S, mo = 12, extraAbzug = 0) => {
    const r = svRates(S.steuer, S.arbeit.land);
    const gross = laufend + einmal;
    // Einmalzahlungen: anteilige Jahres-BBG bis zum Auszahlungsmonat (bei gleichbleibendem laufendem Lohn)
    const capE = (bbg) => Math.min(einmal, Math.max(0, (bbg - Math.min(laufend, bbg)) * mo));
    const kvBase = Math.min(laufend, P.bbgKV) + capE(P.bbgKV), rvBase = Math.min(laufend, P.bbgRV) + capE(P.bbgRV);
    const sv = { kv: kvBase * r.kv, pv: kvBase * r.pv, rv: rvBase * r.rv, av: rvBase * r.av };
    const yL = steuerJahr(laufend * 12, S);
    let lst = yL.lst / 12, soli = yL.soli / 12, kist = yL.kist / 12;
    if (einmal > 0) {
      const yE = steuerJahr(laufend * 12 + einmal, S);
      lst += yE.lst - yL.lst; soli += yE.soli - yL.soli; kist += yE.kist - yL.kist;
    }
    const svSum = sv.kv + sv.pv + sv.rv + sv.av;
    const taxSum = lst + soli + kist;
    const abzug = Number(extraAbzug) || 0;
    return { gross, laufend, einmal, sv, svSum, lst, soli, kist, taxSum, abzug, net: gross - svSum - taxSum - abzug, zveJahr: yL.zve, rates: r, jahr: yL, kvBase, rvBase };
  };

  /** Brutto-Bestandteile eines Monats */
  const monthPay = (st, calc, m) => {
    const S = st.settings;
    const g = Number(S.lohn.grundlohn) || 0;
    const [y, mo] = m.split('-').map(Number);
    const lines = [{ k: 'Grundlohn', v: g, laufend: true }];
    for (const s of S.lohn.sonder || []) {
      const val = s.modus === 'faktor' ? g * (Number(s.wert) || 0) : Number(s.wert) || 0;
      if (!val) continue;
      if (s.art === 'monatlich') lines.push({ k: s.name || 'Sonderzahlung', v: val, laufend: true });
      else if (Number(s.monat) === mo) lines.push({ k: s.name || 'Sonderzahlung', v: val, laufend: false });
    }
    // Mehrarbeit
    // Netto-Rechner rechnet immer mit der Mehrarbeit des Monats selbst (auch wenn sie später ausgezahlt wird)
    const src = m;
    void y;
    const mm = calc.months.get(src);
    if (mm && mm.pay.total) lines.push({ k: 'Mehrarbeit', v: mm.pay.total, laufend: true, mehr: mm });
    // Urlaubsgeld
    let tu = 0;
    for (const [d, a] of calc.absMap) if (a.type === 'tarif' && ym(d) === m) tu += a.units;
    const ugTag = (g / (Number(S.urlaub.ugTeiler) || 21.75)) * (Number(S.urlaub.ugFaktor) || 0);
    if (tu && ugTag) lines.push({ k: `Urlaubsgeld (${String(tu).replace('.', ',')} Tage)`, v: tu * ugTag, laufend: false });
    const laufend = lines.filter((l) => l.laufend).reduce((a, b) => a + b.v, 0);
    const einmal = lines.filter((l) => !l.laufend).reduce((a, b) => a + b.v, 0);
    return { lines, laufend, einmal, src, tu, ugTag };
  };

  return {
    toMin, fmtClock, leaveAt, workedRaw, capDay, MAX_DAY, D, iso, addDays, dow, monday, isoWeek, ym, todayIso, range,
    LAENDER, easter, holidays, holidayName, isWorkday, workdaysBetween, defaults, merge, tagessoll, stundenlohn, holOpt,
    TYPES, specialPause, presence, absenceDays, halfDay, dayNeed, yearCfg, dayTarget, zuschlag, compute, vacation, est, steuerJahr, netto, monthPay, P,
  };
})();
if (typeof module !== 'undefined') module.exports = Core;
