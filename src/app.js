/* Toki – Oberfläche */
(() => {
  'use strict';
  const C = Core;
  const KEY = 'takt-v1';
  const LOGO = '__LOGO__';
  let storageOk = true;

  // ---------- Speicher ----------
  const norm = (d) => {
    const settings = C.merge(C.defaults(), d.settings || {});
    if (!THEME_IDS.includes(settings.theme)) settings.theme = 'standard';
    const absences = (d.absences || []).map((a) => (a.created ? a : { ...a, created: Date.now() }));
    return { meta: d.meta || {}, settings, entries: d.entries || {}, absences, kontingent: d.kontingent || {}, nach: d.nach || [], pref: d.pref || {} };
  };
  const THEMES = [
    ['dark', 'Dark', 'linear-gradient(135deg,#2a2c31 0 50%,#1b1c20 50%)'],
    ['standard', 'Standard', 'linear-gradient(135deg,oklch(55% .15 45) 0 50%,oklch(97% .015 80) 50%)'],
    ['sw', 'Schwarz/Weiß', 'linear-gradient(135deg,#111 0 50%,#fff 50%)'],
    ['blau', 'Blau', 'linear-gradient(135deg,oklch(50% .18 255) 0 50%,oklch(98% .01 250) 50%)'],
    ['gruen', 'Grün', 'linear-gradient(135deg,oklch(52% .14 150) 0 50%,oklch(98% .015 150) 50%)'],
    ['arena', 'Rot-Weiß Arena', 'radial-gradient(120% 90% at 50% 120%,#e2233a 0 45%,transparent 46%),linear-gradient(#2a3a72,#0a0f24)'],
    ['neon', 'Neon City', 'radial-gradient(circle at 50% 75%,#ffcf5a 0 14%,transparent 15%),linear-gradient(#1a0b3a,#7a1d7a 60%,#ff6a3d)'],
    ['dorf', 'Auswechselspieler', 'linear-gradient(#8fd0ff 0 55%,#3f9b4b 55%)'],
    ['werk', 'Werkhalle', 'linear-gradient(#1b222c,#39434f 70%,#20252c 70%)'],
    ['schrank', 'Schaltschrank', 'linear-gradient(#d6d9d5,#cfd2cf)'],
    ['xmas', 'Weihnachten', 'linear-gradient(#0e1a3d,#3c5a8f)'],
    ['fryer', 'Airfryer', 'repeating-linear-gradient(0deg,#f8e2b5 0 14px,#f1d49c 14px 16px)'],
  ];
  const THEME_IDS = THEMES.map((t) => t[0]);
  function load() {
    try { const raw = localStorage.getItem(KEY); return norm(raw ? JSON.parse(raw) : {}); }
    catch { storageOk = false; return norm({}); }
  }
  let st = load();
  const S = () => st.settings;
  function persist() {
    try { localStorage.setItem(KEY, JSON.stringify(st)); storageOk = true; } catch { storageOk = false; }
  }
  function save() {
    st.pref = { ...st.pref, start: ui.start, bz: ui.bz, mi: ui.mi };
    st.meta = { ...(st.meta || {}), updated: Date.now() };
    persist();
    schedulePush();
  }

  // ---------- Cloud-Sync (Sync-Code) ----------
  const sync = { status: Sync.code ? 'idle' : 'off', msg: '', busy: false };
  let pushT = null;
  function setSync(status, msg = '') {
    sync.status = status; sync.msg = msg;
    const el = document.getElementById('syncdot'); if (el) { el.className = `syncdot ${status}`; el.parentElement.title = syncLabel(); }
    const box = document.getElementById('syncinfo'); if (box) box.innerHTML = syncInfoHtml();
  }
  function syncLabel() {
    return { off: 'Sync aus', idle: 'Sync aktiv', busy: 'Synchronisiere …', ok: 'In der Cloud gespeichert', err: `Sync-Fehler: ${sync.msg}` }[sync.status] || '';
  }
  function schedulePush() {
    if (!Sync.code || !Sync.available()) return;
    clearTimeout(pushT);
    pushT = setTimeout(() => pushNow(), 1200);
  }
  async function pushNow() {
    if (!Sync.code) return;
    try { setSync('busy'); await Sync.push(st, st.meta.updated); st.meta.syncedAt = Date.now(); persist(); setSync('ok'); }
    catch (e) { setSync('err', e.message); }
  }
  async function syncNow(manual = false) {
    if (!Sync.code || !Sync.available() || sync.busy) return;
    sync.busy = true; setSync('busy');
    try {
      const remote = await Sync.pull();
      const localUp = Number(st.meta && st.meta.updated) || 0;
      const remoteUp = remote ? Date.parse(remote.aktualisiert) || 0 : 0;
      const localHasData = Object.keys(st.entries).length > 0 || st.absences.length > 0;
      if (!remote || !remote.daten || !remote.daten.settings) {
        if (!st.meta.updated) st.meta.updated = Date.now();
        await Sync.push(st, st.meta.updated);
        st.meta.syncedAt = Date.now(); persist(); setSync('ok');
      } else if (!st.meta.syncedAt && localHasData && Math.abs(remoteUp - localUp) > 1000) {
        sync.busy = false; setSync('idle');
        sheet(`<h3>Welche Daten behalten?</h3><p class="small">In der Cloud liegen schon Daten (Stand ${new Date(remoteUp).toLocaleString('de-DE')}), und auf diesem Gerät auch (Stand ${localUp ? new Date(localUp).toLocaleString('de-DE') : 'unbekannt'}).</p>
          <div class="grid2 mt"><button class="btn soft" id="useLocal">Dieses Gerät</button><button class="btn" id="useCloud">Cloud</button></div><p class="hint">Die andere Version wird überschrieben.</p>`, (el) => {
          el.querySelector('#useCloud').addEventListener('click', () => { closeSheet(); applyRemote(remote, remoteUp); toast('✓ Daten aus der Cloud übernommen', 2600, 'ok'); });
          el.querySelector('#useLocal').addEventListener('click', async () => { closeSheet(); st.meta.updated = Date.now(); persist(); await pushNow(); toast('✓ Daten dieses Geräts übernommen', 2600, 'ok'); });
        });
        return;
      } else if (remoteUp > localUp) {
        applyRemote(remote, remoteUp);
        if (manual) toast('✓ Neueste Daten geladen', 2200, 'ok');
      } else if (localUp > remoteUp) {
        await Sync.push(st, localUp); st.meta.syncedAt = Date.now(); persist(); setSync('ok');
        if (manual) toast('✓ In die Cloud gespeichert', 2200, 'ok');
      } else { st.meta.syncedAt = Date.now(); persist(); setSync('ok'); if (manual) toast('✓ Alles aktuell', 2000, 'ok'); }
    } catch (e) { setSync('err', e.message); if (manual) toast(`⚠ ${e.message}`, 4500); }
    finally { sync.busy = false; }
  }
  async function connectCode(c, created) {
    if (!Sync.available()) { toast('Sync geht nur unter sirchi88.github.io/Toki', 3500); return; }
    try {
      if (!created) {
        setSync('busy');
        const remote = await Sync.pull(c);
        if (!remote) { setSync('off'); toast('⚠ Zu diesem Code gibt es keine Daten – bitte Code prüfen', 4500); return; }
      }
      Sync.set(c); st.meta.syncedAt = 0; persist();
      if (created) { if (!st.meta.updated) st.meta.updated = Date.now(); await Sync.push(st, st.meta.updated); st.meta.syncedAt = Date.now(); persist(); setSync('ok'); ui.showCode = true; ui.showQR = true; toast('✓ Sync ist an – QR-Code mit dem anderen Gerät abscannen', 3500, 'ok'); }
      else { await syncNow(false); toast('✓ Verbunden', 2500, 'ok'); }
    } catch (e) { if (created) Sync.set(''); setSync(Sync.code ? 'err' : 'off', e.message); toast(`⚠ ${e.message}`, 6000); }
    render();
  }
  function applyRemote(remote, remoteUp) {
    const keepPref = st.pref;
    st = norm(remote.daten);
    st.pref = { ...keepPref, ...(remote.daten.pref || {}) };
    st.meta = { ...(st.meta || {}), updated: remoteUp, syncedAt: Date.now() };
    persist(); loadDate(ui.date); setSync('ok'); render();
  }
  function syncInfoHtml() {
    if (!Sync.available()) return '<div class="notice warn"><div>Der Sync funktioniert nur, wenn Toki unter seiner eigenen Adresse läuft: <b>sirchi88.github.io/Toki</b> – nicht in der Claude-Vorschau.</div></div>';
    if (!Sync.code) return `<p class="small">Mit einem <b>persönlichen Sync-Code</b> hast du am Handy und am Laptop dieselben Daten – ohne Anmeldung, ohne Passwort, ohne E-Mail.</p>
      <div class="steps"><div><span class="sn">1</span><div class="grow">Auf dem <b>ersten Gerät</b> (dort, wo deine Daten schon sind):<button class="btn mt-s" data-act="syncCreate">Sync-Code erstellen</button></div></div>
      <div><span class="sn">2</span><div class="grow">Auf dem <b>anderen Gerät</b> den Code eingeben oder den Sync-Link öffnen:<div class="grid2 mt-s"><input class="field" id="syncCode" placeholder="TOKI-XXXX-…" autocapitalize="characters" autocomplete="off" spellcheck="false"><button class="btn soft" data-act="syncJoin">Verbinden</button></div></div></div></div>`;
    const last = st.meta && st.meta.syncedAt ? new Date(st.meta.syncedAt).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '–';
    const shown = ui.showCode ? Sync.pretty(Sync.code) : Sync.pretty(Sync.code).replace(/(TOKI-\w{4})-.*/, '$1-••••-••••-••••');
    return `<div class="between"><div><b>☁ Sync aktiv</b><div class="xs muted">${esc(syncLabel())} · zuletzt ${last}</div></div><span class="syncdot ${sync.status}"></span></div>
      <div class="codebox mt"><span class="num">${shown}</span><button class="btn sm soft" data-act="syncShow">${ui.showCode ? 'Verbergen' : 'Anzeigen'}</button></div>
      <div class="qrbox ${ui.showQR ? 'on' : ''}">${ui.showQR ? `<div class="qr">${QR.svg(Sync.link(), { px: 200 })}</div><p class="small" style="margin:8px 0 0"><b>Mit dem anderen Handy abscannen</b> (Kamera-App) – der Link verbindet Toki sofort.</p>` : ''}<button class="btn ${ui.showQR ? 'ghost' : ''} sm" style="width:100%;margin-top:8px" data-act="syncQR">${ui.showQR ? 'QR-Code ausblenden' : '▦ QR-Code zum Abscannen'}</button></div>
      <div class="grid2 mt-s"><button class="btn soft sm" style="width:100%" data-act="syncCopy">Code kopieren</button><button class="btn soft sm" style="width:100%" data-act="syncMail">Sync-Link per Mail</button></div>
      <p class="hint">Auf dem anderen Gerät: Code bei „Verbinden“ eingeben oder den Link aus der Mail öffnen. <b>Code nicht weitergeben</b> – wer ihn kennt, sieht deine Daten.</p>
      <div class="grid2 mt"><button class="btn soft" data-act="syncNow">Jetzt synchronisieren</button><button class="btn ghost" data-act="syncOff">Sync ausschalten</button></div>`;
  }
  const today = C.todayIso();
  const curY = Number(today.slice(0, 4));
  const ui = {
    tab: 'feierabend', date: today, start: st.pref.start || '07:00', end: '', bz: st.pref.bz !== false, mi: st.pref.mi !== false, half: false,
    view: 'woche', kmonth: C.ym(today), cal: C.ym(today), sel: null, vyear: curY,
    nmonth: C.ym(today), year: curY, open: {}, setYear: curY, nmode: 'ist',
  };

  // ---------- Format ----------
  const nf = (n, d = 2) => (Number(n) || 0).toLocaleString('de-DE', { minimumFractionDigits: d, maximumFractionDigits: d });
  const H = (n, d = 2) => `${nf(n, d)} h`;
  const sH = (n) => `${n > 0.0001 ? '+' : n < -0.0001 ? '−' : '±'}${nf(Math.abs(n))} h`;
  const D1 = (n) => nf(n, Number.isInteger(Math.round(Number(n) * 1000) / 1000) ? 0 : 1);
  const EUR = (n) => (S().lohn.zeigen ? `${nf(n)} €` : '•••,•• €');
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const WD = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
  const MON = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
  const dShort = (d) => `${d.slice(8, 10)}.${d.slice(5, 7)}.`;
  const dLong = (d) => `${WD[C.dow(d)]}. ${dShort(d)}${d.slice(0, 4)}`;
  const monthName = (m) => `${MON[Number(m.slice(5, 7)) - 1]} ${m.slice(0, 4)}`;
  const shiftMonth = (m, n) => { let [y, mo] = m.split('-').map(Number); mo += n; while (mo > 12) { mo -= 12; y++; } while (mo < 1) { mo += 12; y--; } return `${y}-${String(mo).padStart(2, '0')}`; };
  const uid = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2));
  const num = (v) => {
    let t = String(v ?? '').trim().replace(/\s|€/g, '');
    if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(t)) t = t.replace(/\./g, '');
    const n = parseFloat(t.replace(',', '.'));
    return Number.isFinite(n) ? n : 0;
  };
  const deNum = (v) => (v === '' || v === null || v === undefined ? '' : String(v).replace('.', ','));
  const minToClock = (m) => C.fmtClock(m);

  const I = {
    clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 17l5-5 4 4 8-8"/><path d="M14 8h6v6"/></svg>',
    cal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18M8 15h3"/></svg>',
    euro: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6.5A7 7 0 1 0 18 17.5"/><path d="M4 10h10M4 14h10"/></svg>',
    gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
    eye: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>',
    eyeoff: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4M6.1 6.1C3.5 7.9 2 12 2 12s3.5 7 10 7c1.6 0 3-.4 4.3-1"/></svg>',
    left: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M15 6l-6 6 6 6"/></svg>',
    right: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M9 6l6 6-6 6"/></svg>',
    chev: '<svg class="chev" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 9l6 6 6-6"/></svg>',
  };
  const TABS = [['feierabend', 'Feierabend', I.clock], ['mehrarbeit', 'Mehrarbeit', I.plus], ['urlaub', 'Urlaub', I.cal], ['netto', 'Gehalt', I.euro], ['einstellungen', 'Einstellungen', I.gear]];
  const NAV = TABS.slice(0, 4);
  const info = (k) => `<button class="ibtn" data-act="info" data-k="${k}" aria-label="Info">i</button>`;
  const INFO = {
    kv: ['KV-Zusatzbeitrag', `<p><b>Was bedeutet das?</b> Deine Krankenversicherung kostet 14,6 % vom Brutto (Hälfte zahlst du, Hälfte die Firma) <b>plus</b> einen Zusatzbeitrag, den jede Kasse selbst festlegt. Auch der wird halbiert.</p><p><b>Was auswählen?</b> Einfach deine Krankenkasse aus der Liste – der Zusatzbeitrag 2026 ist hinterlegt (z. B. TK 2,69 %, AOK Bayern 2,69 %). Fehlt deine Kasse oder hat sie den Beitrag geändert, wähle „Andere“ und trag den Wert selbst ein.</p><p>Jede gesetzliche Krankenkasse verlangt zusätzlich zum allgemeinen Satz von 14,6 % einen eigenen <b>Zusatzbeitrag</b>. 2026 liegt er im Schnitt bei 2,9 %.</p>
      <p><b>So findest du ihn:</b></p><ul><li><b>Lohnabrechnung:</b> Steht bei der Krankenversicherung ein Gesamtsatz (z. B. 17,29 %), ist der Zusatzbeitrag dieser Satz minus 14,6 (hier: 2,69 %). Steht dort dein Arbeitnehmeranteil (z. B. 8,65 %), rechne: Anteil × 2 − 14,6.</li><li><b>Webseite deiner Krankenkasse:</b> Suche nach „Beitragssatz“ oder „Zusatzbeitrag 2026“.</li><li><b>Mitgliedschreiben:</b> Die Kasse informiert dich bei jeder Änderung per Brief.</li></ul><p class="small muted">Eintragen bitte den vollen Satz (z. B. 2,69), die App rechnet die Hälfte für dich.</p>`],
    stkl: ['Welche Steuerklasse habe ich?', `<ul><li><b>I</b> – ledig, geschieden oder dauernd getrennt lebend.</li><li><b>II</b> – alleinerziehend mit mindestens einem Kind im Haushalt (Entlastungsbetrag).</li><li><b>III</b> – verheiratet, du verdienst deutlich mehr als dein Partner (der hat dann V).</li><li><b>IV</b> – verheiratet, beide verdienen ähnlich viel (auch IV mit Faktor möglich).</li><li><b>V</b> – verheiratet, Partner von jemandem in III.</li><li><b>VI</b> – für einen Zweit- oder Nebenjob.</li></ul><p class="small muted">Deine Steuerklasse steht oben auf jeder Lohnabrechnung (meist als „StKl“) und in deinem ELStAM-Ausdruck vom Finanzamt.</p>`],
    zk: ['Zeitkonto-Stand', '<p>Trag einmal den Stand von deiner Abrechnung oder dem Zeiterfassungs-Terminal ein. Ab dem Tag danach rechnet Toki jede gespeicherte Arbeitszeit und jeden Zeitkonto-Urlaub selbst dazu. Den Stand musst du nur ändern, wenn du ihn mit der Firma abgleichen willst.</p>'],
    alter: ['Warum das Alter?', '<p>Wer <b>kinderlos und mindestens 23</b> ist, zahlt in der Pflegeversicherung 0,6 % mehr. Dafür braucht der Rechner dein Geburtsjahr. Leer lassen = über 23.</p>'],
    urlaubsjahr: ['Urlaub pro Jahr', '<p>Für jedes Jahr kannst du Anspruch und T-Zug-Tage festlegen. Für das <b>aktuelle Jahr</b> trägst du am besten deinen <b>Stand heute</b> ein (z. B. 11 Tage frei, inkl. Rest aus dem Vorjahr). Alles, was du danach im Urlaubskalender planst, wird davon abgezogen.</p><p>Was am Jahresende übrig bleibt, nimmt Toki automatisch ins nächste Jahr mit – nutzbar <b>bis 31. März</b>, danach verfällt es.</p>'],
  };

  // ---------- Berechnung ----------
  let calc, vac;
  const recompute = () => { calc = C.compute(st, today); vac = C.vacation(st, today); };
  const opt = () => C.holOpt(S());
  const absAt = (d) => { const a = calc.absMap.get(d); return a && !a.fromEntry ? a : null; };

  // ---------- Toast, Dialog ----------
  function toast(msg, ms = 2200, cls = '') {
    document.querySelectorAll('.toast').forEach((t) => t.remove());
    const t = document.createElement('div'); t.className = `toast ${cls}`; t.textContent = msg; document.body.appendChild(t);
    setTimeout(() => t.remove(), ms);
  }
  let pillT;
  function savedPill() {
    let p = document.getElementById('pill');
    if (!p) { p = document.createElement('div'); p.id = 'pill'; p.className = 'pill'; document.body.appendChild(p); }
    p.textContent = '✓ Gespeichert'; p.classList.add('on');
    clearTimeout(pillT); pillT = setTimeout(() => p.classList.remove('on'), 1400);
  }
  let sheetOnClose = null;
  function sheet(html, onMount) {
    const old = document.getElementById('scrim'); if (old) old.remove();
    const s = document.createElement('div'); s.className = 'scrim'; s.id = 'scrim';
    s.innerHTML = `<div class="sheet" role="dialog" aria-modal="true">${html}</div>`;
    s.addEventListener('click', (e) => { if (e.target === s) closeSheet(); });
    document.body.appendChild(s);
    onMount && onMount(s.firstElementChild);
  }
  function closeSheet() { const s = document.getElementById('scrim'); if (s) s.remove(); if (sheetOnClose) { const f = sheetOnClose; sheetOnClose = null; f(); } }
  function confirmBox(title, text, okLabel, onOk, danger = true) {
    sheet(`<h3>${esc(title)}</h3><p class="muted">${text}</p><div class="grid2 mt"><button class="btn ghost" data-act="close">Abbrechen</button><button class="btn ${danger ? 'danger' : ''}" id="okb">${esc(okLabel)}</button></div>`,
      (el) => el.querySelector('#okb').addEventListener('click', () => { closeSheet(); onOk(); }));
  }

  // ---------- Hilfen ----------
  function kontInfo(m = C.ym(today)) {
    const mm = calc.months.get(m);
    const nach = st.nach.filter((n) => n.month === m).reduce((a, b) => a + num(b.hours), 0);
    const k = (Number(st.kontingent[m]) || 0) + nach;
    const used = mm ? mm.used : 0;
    return { k, used, open: k - used, has: k > 0 };
  }
  function tarifFrei(y, at = today) {
    const v = vac[y];
    if (!v) return { frei: Number(C.yearCfg(S(), y).tarif) || 0, carry: 0 };
    const carry = at <= `${y}-03-31` ? v.carryLeft : 0;
    return { frei: v.rest + carry, carry, rest: v.rest };
  }

  // ---------- Konto-Ampel ----------
  function ampel() {
    const z = calc.zk, Z = S().zk;
    const zd = z > Z.max || z < Z.min ? 'r' : z > Z.max - 5 || z < Z.min + 5 ? 'y' : '';
    const k = kontInfo();
    const kd = !k.has ? 'n' : k.open <= 0 ? 'r' : k.open < 3 ? 'y' : '';
    const ut = tarifFrei(curY).frei;
    const ud = ut <= 0 ? 'r' : ut <= 3 ? 'y' : '';
    return `<div class="ampel">
      <button class="amp" data-act="tab" data-tab="urlaub"><div class="k"><span class="dot ${zd}"></span>Zeitkonto</div><div class="v num">${z < -0.004 ? '-' : ''}${H(Math.abs(z))}</div></button>
      <button class="amp" data-act="tab" data-tab="mehrarbeit"><div class="k"><span class="dot ${kd}"></span>offene MEA</div><div class="v num">${k.has ? H(Math.max(0, k.open)) : '–'}</div></button>
      <button class="amp" data-act="tab" data-tab="urlaub"><div class="k"><span class="dot ${ud}"></span>Resturlaub</div><div class="v num">${D1(ut)} T</div></button>
    </div>`;
  }

  // ---------- Seite: Feierabend ----------
  function dayPause(d) {
    const s = S(), w = C.dow(d);
    const special = w === 0 || w === 6 || !!C.holidayName(d, opt());
    if (special) { const pr = C.presence(ui.start, ui.end); return { pause: pr === null ? 0 : C.specialPause(pr), special }; }
    if (ui.half || C.halfDay(d, s)) return { pause: s.arbeit.brotzeit, special };
    return { pause: (ui.bz ? s.arbeit.brotzeit : 0) + (ui.mi ? s.arbeit.mittag : 0), special };
  }
  /** Teile des Feierabend-Reiters, die sich beim Tippen ändern (werden ohne Neuaufbau der Eingabefelder aktualisiert) */
  function faParts() {
    const s = S();
    const d = ui.date, w = C.dow(d);
    const hol = C.holidayName(d, opt());
    const ab = absAt(d);
    const halfD = C.halfDay(d, s);
    const { pause, special } = dayPause(d);
    const raw = C.workedRaw(ui.start, ui.end, pause);
    const res = raw === null ? null : C.capDay(raw);
    const soll = C.tagessoll(s);
    const half = ui.half || halfD || (ab && !ab.full);
    const targets = special ? [4, 6, 8, 10] : half ? [soll / 2] : [...new Set([soll, 8, 9, 10].filter((x) => x >= soll && x <= 10))];
    const pauseFor = (t) => (special ? (t > 6 ? 30 : 0) : pause);
    const entry = st.entries[d];
    const blocked = !!(ab && ab.full);
    let notes = '';
    if (blocked) notes += `<div class="notice warn">🌴 <div>Hier ist <b>${C.TYPES[ab.type].label}</b> eingetragen – Arbeitszeit für diesen Tag ist gesperrt.<br><button class="btn sm soft mt-s" data-act="tab" data-tab="urlaub">Im Urlaubskalender ansehen</button></div></div>`;
    else if (hol) notes += `<div class="notice info">🎉 <div><b>${esc(hol)}</b> – Feiertag. Arbeit zählt komplett als Mehrarbeit, ohne Pausenabzug.</div></div>`;
    else if (w === 6) notes += `<div class="notice info">Samstag: keine Brotzeit – erst ab 6 Std. werden 30 min Mittag abgezogen. Alles zählt als Mehrarbeit${s.zk.samstagBonus ? ' (läuft es ins Zeitkonto: +25 % Zeitzuschlag)' : ''}.</div>`;
    else if (w === 0) notes += '<div class="notice info">Sonntag: keine Brotzeit, ab 6 Std. 30 min Mittag. Alles zählt als Mehrarbeit.</div>';
    else if (halfD) notes += `<div class="notice info">${d.slice(5) === '12-24' ? 'Heiligabend' : 'Silvester'}: halber Arbeitstag (${D1(soll / 2)} Std.).</div>`;
    else if (ab && !ab.full) notes += `<div class="notice info">½ Tag ${C.TYPES[ab.type].label} eingetragen – Soll heute ${D1(soll / 2)} Std.</div>`;
    if (res && res.capped) notes += `<div class="notice danger">⚠ <div><b>Zeitverstoß:</b> mehr als 10 Std. gearbeitet (${nf(raw)} h). Gezählt werden nur 10 Std.</div></div>`;
    const pauseLbl = special ? `Wochenende: ${pause ? '30 min Mittag' : 'keine Pause'}` : `Pausen ${pause} min`;
    const modeLbl = ui.half ? '½ Urlaubstag' : 'normaler Tag';
    const live = `<div class="worked"><span class="k">Gearbeitet (Industriestunden)</span><span class="v num">${res ? H(res.hours) : '– h'}</span></div>
      ${notes}
      <button class="btn mt" data-act="saveEntry" ${!res || blocked ? 'disabled' : ''}>${entry ? 'Eintrag aktualisieren' : 'Zeit speichern'}</button>`;
    const tiles = targets.map((t) => { const at = C.leaveAt(ui.start, pauseFor(t), t); return `<button type="button" class="tile ${targets.length === 1 ? 'single' : ''} ${at && at === ui.end ? 'on' : ''}" data-act="setEnd" data-t="${at || ''}" ${at ? '' : 'disabled'}><div class="k">${D1(t)} Std.</div><div class="v num">${at ?? '–'}</div></button>`; }).join('');
    return { s, d, w, special, soll, live, tiles, summary: `${pauseLbl} · ${modeLbl}` };
  }
  function updateFA() {
    if (ui.tab !== 'feierabend') return;
    recompute();
    const f = faParts();
    const a = document.getElementById('fa-live'), b = document.getElementById('fa-tiles'), c = document.getElementById('fa-sum');
    if (a) a.innerHTML = f.live; if (b) b.innerHTML = f.tiles; if (c) c.textContent = f.summary;
  }
  function pageFeierabend() {
    const { s, d, w, special, soll, live, tiles, summary } = faParts();
    return `${ampel()}
    <div class="fa-grid"><div class="fa-l">
    <section class="card">
      <label class="label" for="work-date">Arbeitstag</label>
      <button class="datebtn" id="work-date" data-act="pickDate"><span>${d === today ? `Heute · ${WD[w]}. ${dShort(d)}` : dLong(d)}</span>${I.cal.replace('<svg', '<svg width="20" height="20"')}</button>
      <div class="grid2 mt">
        <div><label class="label" for="work-start">Beginn</label><input id="work-start" class="field big" type="time" value="${esc(ui.start)}" data-bind="start"></div>
        <div><label class="label" for="work-end">Ende (Wunsch)</label><input id="work-end" class="field big" type="time" value="${esc(ui.end)}" data-bind="end"></div>
      </div>
      <div id="fa-live">${live}</div>
    </section>
    </div><div class="fa-r">
    <section class="card">
      <h2>Gehen um … <span class="xs muted" style="text-transform:none;letter-spacing:0;font-weight:500">· antippen übernimmt die Zeit</span></h2>
      <div class="tiles" id="fa-tiles">${tiles}</div>
    </section>
    <details class="fold" ${ui.foldOpen ? 'open' : ''} data-fold="foldOpen">
      <summary><span id="fa-sum">${summary}</span>${I.chev}</summary>
      <div class="body">
        <div class="minirow">
          <button class="chip" aria-pressed="${ui.bz && !ui.half}" data-act="toggle" data-k="bz" ${special || ui.half ? 'disabled' : ''}>Brotzeit ${s.arbeit.brotzeit}</button>
          <button class="chip" aria-pressed="${ui.mi && !ui.half}" data-act="toggle" data-k="mi" ${special || ui.half ? 'disabled' : ''}>Mittag ${s.arbeit.mittag}</button>
        </div>
        <label class="switch mt-s"><span><b>Halbtags Urlaub</b><br><span class="xs muted">${D1(soll / 2)} Std. arbeiten + Brotzeit, ½ Tag Tarifurlaub wird abgezogen</span></span><input type="checkbox" data-act="half" ${ui.half ? 'checked' : ''} ${special ? 'disabled' : ''}></label>
      </div>
    </details>
    </div></div>`;
  }

  // ---------- Seite: Mehrarbeit ----------
  /** Schlichte Aufstellung: wie sich die Mehrarbeit zusammensetzt (Stunden + €) */
  function zusTable(p, mehr, nach = 0) {
    if (!(mehr > 0)) return '';
    const show = S().lohn.zeigen;
    return `<div class="zus">
      <div class="zr"><span>Mehrarbeit${nach > 0 ? ` <span class="badge nach">${H(nach)} nachbeantragt</span>` : ''}</span><b class="num">${H(mehr)}</b>${show ? `<span class="num">${EUR(p.base)}</span>` : ''}</div>
      <div class="zr sub"><span>Zuschlag 25 %</span><b class="num">${H(p.h25)}</b>${show ? `<span class="num">${EUR(p.z25)}</span>` : ''}</div>
      ${p.h50 > 0 ? `<div class="zr sub"><span>Zuschlag 50 %</span><b class="num">${H(p.h50)}</b>${show ? `<span class="num">${EUR(p.z50)}</span>` : ''}</div>` : ''}
      ${show ? `<div class="zr tot"><span>Gesamt brutto</span><b></b><span class="num">${EUR(p.total)}</span></div>` : ''}
    </div>`;
  }
  function weekStats(w) {
    const es = w.days.filter((x) => x.entry && !(x.absence && x.absence.full));
    if (!es.length) return null;
    const st0 = es.map((x) => C.toMin(x.entry.start)), en = es.map((x) => { let e = C.toMin(x.entry.end); const s0 = C.toMin(x.entry.start); if (e < s0) e += 1440; return e; });
    const avg = (a) => a.reduce((p, c) => p + c, 0) / a.length;
    const longest = es.reduce((a, b) => (b.entry.hours > a.entry.hours ? b : a));
    return { es, st0, en, avgStart: avg(st0), avgEnd: avg(en), avgDur: avg(es.map((x) => x.entry.hours)), longest };
  }
  function weekChart(w, ws) {
    const s = S();
    const lo = Math.floor(Math.min(...ws.st0) / 60) * 60 - 30, hi = Math.ceil(Math.max(...ws.en) / 60) * 60 + 30;
    const W = 320, rowH = 22, top = 18, left = 34;
    const x = (m) => left + ((m - lo) / (hi - lo)) * (W - left - 6);
    const h = top + ws.es.length * rowH + 6;
    let grid = '';
    for (let m = Math.ceil(lo / 60) * 60; m <= hi; m += 60) grid += `<line x1="${x(m)}" x2="${x(m)}" y1="${top - 4}" y2="${h - 4}" stroke="currentColor" stroke-opacity=".12"/><text x="${x(m)}" y="11" font-size="9" text-anchor="middle" fill="currentColor" fill-opacity=".55">${String((m / 60) % 24).padStart(2, '0')}</text>`;
    const soll = C.tagessoll(s);
    const rows = ws.es.map((d, i) => {
      const y = top + i * rowH;
      const a = ws.st0[i], b = ws.en[i];
      const sollEnd = d.target > 0 ? a + d.target * 60 + (d.entry.pause || 0) : null;
      return `<text x="2" y="${y + 13}" font-size="10" font-weight="700" fill="currentColor">${WD[C.dow(d.date)]}</text>
        <rect x="${x(a)}" y="${y + 3}" width="${Math.max(2, x(Math.min(b, sollEnd ?? a)) - x(a))}" height="14" rx="4" fill="var(--primary)" opacity=".3"/>
        ${sollEnd !== null && b > sollEnd ? `<rect x="${x(sollEnd)}" y="${y + 3}" width="${x(b) - x(sollEnd)}" height="14" rx="4" fill="var(--primary)"/>` : ''}
        ${sollEnd === null ? `<rect x="${x(a)}" y="${y + 3}" width="${x(b) - x(a)}" height="14" rx="4" fill="var(--primary)"/>` : ''}
        <circle cx="${x(a)}" cy="${y + 10}" r="3" fill="var(--card)" stroke="var(--fg)" stroke-width="1.5"/><circle cx="${x(b)}" cy="${y + 10}" r="3" fill="var(--fg)"/>`;
    }).join('');
    const avgLine = `<line x1="${x(ws.avgStart)}" x2="${x(ws.avgStart)}" y1="${top}" y2="${h - 6}" stroke="currentColor" stroke-opacity=".35" stroke-dasharray="3 3"/><line x1="${x(ws.avgEnd)}" x2="${x(ws.avgEnd)}" y1="${top}" y2="${h - 6}" stroke="currentColor" stroke-opacity=".35" stroke-dasharray="3 3"/>`;
    // Dauer-Balken
    const maxD = Math.max(10, ...ws.es.map((d) => d.entry.hours));
    const bw = 300, bh = 90;
    const colW = bw / Math.max(5, ws.es.length);
    const by = (v) => bh - 14 - (v / maxD) * (bh - 24);
    const bars = ws.es.map((d, i) => { const v = d.entry.hours; const cx = i * colW + colW / 2; return `<rect x="${cx - colW * 0.3}" y="${by(v)}" width="${colW * 0.6}" height="${bh - 14 - by(v)}" rx="4" fill="var(--primary)" opacity="${v > (d.target || 0) ? 1 : 0.35}"/><text x="${cx}" y="${by(v) - 3}" font-size="9.5" text-anchor="middle" font-weight="700" fill="currentColor">${nf(v, 1)}</text><text x="${cx}" y="${bh - 2}" font-size="9.5" text-anchor="middle" fill="currentColor" fill-opacity=".6">${WD[C.dow(d.date)]}</text>`; }).join('');
    return `<div class="anal">
      <div class="label">Kommen &amp; Gehen</div>
      <svg viewBox="0 0 ${W} ${h}" width="100%" style="color:var(--fg)">${grid}${avgLine}${rows}</svg>
      <div class="legend"><span><i style="background:var(--card);border:1.5px solid var(--fg);border-radius:50%"></i>Kommen</span><span><i style="background:var(--fg);border-radius:50%"></i>Gehen</span><span><i style="background:var(--primary)"></i>über Soll</span><span>– – Durchschnitt</span></div>
      <div class="label mt">Stunden pro Tag</div>
      <svg viewBox="0 0 ${bw} ${bh}" width="100%" style="color:var(--fg)"><line x1="0" x2="${bw}" y1="${by(soll)}" y2="${by(soll)}" stroke="currentColor" stroke-opacity=".35" stroke-dasharray="4 3"/><text x="${bw}" y="${by(soll) - 3}" font-size="9" text-anchor="end" fill="currentColor" fill-opacity=".55">Soll ${D1(soll)} h</text>${bars}</svg>
      <div class="grid2 stats">
        <div><span>Ø Kommen</span><b>${minToClock(ws.avgStart)}</b></div><div><span>Ø Gehen</span><b>${minToClock(ws.avgEnd)}</b></div>
        <div><span>Ø Dauer</span><b>${nf(ws.avgDur, 1)} h</b></div><div><span>Längster</span><b>${WD[C.dow(ws.longest.date)]} ${nf(ws.longest.entry.hours, 1)}</b></div>
      </div>
    </div>`;
  }
  function weekCard(w, prev) {
    const s = S(), show = s.lohn.zeigen;
    const open = !!ui.open[w.monday];
    const maxH = 11;
    const pct = (h) => `${Math.max(0, Math.min(100, (h / maxH) * 100))}%`;
    if (!w.days.some((x) => x.entry)) {
      const ab = w.days.filter((x) => x.absence && !x.absence.fromEntry);
      const types = [...new Set(ab.map((x) => x.absence.type))];
      return `<section class="card" style="padding:12px 16px"><div class="between"><div><h3 style="font-size:24px">KW ${w.kw} <span class="kwr">${dShort(w.monday)}–${dShort(w.sunday)}</span></h3></div><div class="row" style="gap:6px;flex-wrap:wrap;justify-content:flex-end">${types.map((t) => `<span class="badge"><span class="tdot ${t}"></span>${C.TYPES[t].label} · ${D1(ab.filter((x) => x.absence.type === t).reduce((a, x) => a + x.absence.units, 0))} T</span>`).join('')}${w.zkChange ? `<span class="badge">${sH(w.zkChange)} ZK</span>` : ''}</div></div></section>`;
    }
    const days = w.days.map((day) => {
      const d = day.date, wd = C.dow(d), e = day.entry, ab = day.absence;
      if ((wd === 0 || wd === 6) && !e) return '';
      let bar, dv = '<span class="dv"></span>';
      if (ab && ab.full && !ab.fromEntry) bar = `<div class="bar abs" style="background:var(--c-${ab.type})">${C.TYPES[ab.type].label}${ab.type === 'zk' ? ` · −${H(ab.units * C.tagessoll(s))}` : ''}</div>`;
      else if (e) {
        const t = day.target, over = e.hours - t;
        bar = `<div class="bar"><div class="f" style="width:${pct(Math.min(e.hours, t || e.hours))}"></div>${t > 0 && over > 0 ? `<div class="o" style="left:${pct(t)};width:${pct(over)}"></div>` : ''}${t === 0 ? `<div class="o" style="left:0;width:${pct(e.hours)};border-radius:7px"></div>` : ''}${t > 0 && over < 0 ? `<div class="u" style="left:${pct(e.hours)};width:${pct(-over)}"></div>` : ''}${t > 0 ? `<div class="s" style="left:${pct(t)}"></div>` : ''}<div class="t">${esc(e.start)}–${esc(e.end)}${e.half ? ' · ½U' : ''}${e.capped ? ' · ⚠' : ''}</div></div>`;
        dv = `<span class="dv ${day.delta > 0 ? 'pos' : day.delta < 0 ? 'neg' : ''}">${sH(day.delta)}</span>`;
      } else if (day.holiday) bar = `<div class="bar hol">🎉 ${esc(day.holiday)}</div>`;
      else if (ab && !ab.full) bar = `<div class="bar abs" style="background:var(--c-${ab.type});opacity:.7">½ ${C.TYPES[ab.type].label}</div>`;
      else bar = '<div class="bar empty"></div>';
      return `<div class="day" ${e ? `data-act="dayMenu" data-date="${d}"` : ''}><div class="wd">${WD[wd]}<small>${dShort(d)}</small></div>${bar}${dv}</div>`;
    }).join('');
    const p = w.pay;
    const right = w.mehr > 0 ? (show ? EUR(p.total) : sH(w.mehr)) : w.zkChange ? `<span style="color:var(--c-zk)">${sH(w.zkChange)} ZK</span>` : '';
    const ws = open ? weekStats(w) : null;
    const diff = prev ? w.mehr - prev.mehr : null;
    return `<section class="card">
      <div class="wk-head" data-act="openWeek" data-w="${w.monday}">
        <div><h3>KW ${w.kw} <span class="kwr">${dShort(w.monday)}–${dShort(w.sunday)}</span></h3></div>
        <span class="big-r num">${right}</span>
      </div>
      <div class="kpis">
        <div class="kpi"><div class="k">Gearbeitet</div><div class="v num">${H(w.worked)}</div></div>
        <div class="kpi"><div class="k">Mehrarbeit</div><div class="v num acc">${H(w.mehr)}</div></div>
        <div class="kpi"><div class="k">Zeitkonto</div><div class="v num">${sH(w.zkChange)}</div></div>
      </div>
      ${zusTable(w.pay, w.mehr, w.mehrNach)}
      <div class="days">${days}</div>
      <button class="morebtn" data-act="openWeek" data-w="${w.monday}">${open ? 'Diagramme ausblenden ▲' : 'Diagramme ▼'}</button>
      ${open && ws ? `${weekChart(w, ws)}
        ${diff !== null ? `<p class="xs muted mt-s">Mehrarbeit ggü. Vorwoche (KW ${prev.kw}): <b class="${diff > 0 ? 'pos' : diff < 0 ? 'neg' : ''}">${sH(diff)}</b></p>` : ''}
        ${w.offset > 0 ? `<p class="xs muted mt-s">${H(w.offset)} Plus dieser Woche wurden mit dem Zeitkonto-Tag verrechnet (zählen nicht als Mehrarbeit).</p>` : ''}
        ${w.bonus > 0 ? `<p class="xs muted mt-s">Samstag ins Zeitkonto: +${H(w.bonus)} Zeitzuschlag (25 %).</p>` : ''}
` : ''}
    </section>`;
  }
  function monthCard(m) {
    const show = S().lohn.zeigen, p = m.pay;
    const K = m.kontingent + m.nach;
    const usedPct = K ? Math.min(100, (m.used / K) * 100) : 0;
    return `<section class="card">
      <div class="between"><h3>${monthName(m.month)}</h3><span class="big-r num">${show ? EUR(p.total) : H(m.mehr)}</span></div>
      <div class="kpis">
        <div class="kpi"><div class="k">Gearbeitet</div><div class="v num">${H(m.worked)}</div></div>
        <div class="kpi"><div class="k">Mehrarbeit</div><div class="v num acc">${H(m.mehr)}</div></div>
        <div class="kpi"><div class="k">Zeitkonto</div><div class="v num">${sH(m.zkChange)}</div></div>
      </div>
      ${zusTable(p, m.mehr, m.mehrNach)}
      ${K ? `<div class="mt"><div class="xs muted">MEA-Kontingent ${H(m.used)} von ${H(K)}${m.nach ? ` · inkl. <span class="badge nach">${H(m.nach)} nachbeantragt</span>` : ''}</div><div class="progress mt-s"><i style="width:${usedPct}%"></i></div></div>` : ''}
      <p class="xs muted mt-s">${m.days} Tage erfasst · Zuschläge werden je Woche berechnet</p>
    </section>`;
  }
  function yearView() {
    const y = ui.year;
    const ms = Array.from({ length: 12 }, (_, i) => calc.months.get(`${y}-${String(i + 1).padStart(2, '0')}`) || null);
    const tot = ms.reduce((a, m) => { if (m) { a.worked += m.worked; a.mehr += m.mehr; a.zk += m.zkChange; a.pay += m.pay.total; a.h25 += m.pay.h25; a.h50 += m.pay.h50; a.z25 += m.pay.z25; a.z50 += m.pay.z50; a.days += m.days; a.nach += m.nach; } return a; }, { worked: 0, mehr: 0, zk: 0, pay: 0, h25: 0, h50: 0, z25: 0, z50: 0, days: 0, nach: 0 });
    const max = Math.max(1, ...ms.map((m) => (m ? Math.max(m.mehr, Math.max(0, m.zkChange)) : 0)));
    return `<section class="card">
      <div class="between"><button class="iconbtn" data-act="year" data-d="-1">${I.left}</button><h3>Jahr ${y}</h3><button class="iconbtn" data-act="year" data-d="1">${I.right}</button></div>
      <div class="kpis">
        <div class="kpi"><div class="k">Gearbeitet</div><div class="v num">${H(tot.worked)}</div></div>
        <div class="kpi"><div class="k">Mehrarbeit</div><div class="v num acc">${H(tot.mehr)}</div></div>
        <div class="kpi"><div class="k">Ins Zeitkonto</div><div class="v num">${sH(tot.zk)}</div></div>
      </div>
      <div class="chart">${ms.map((m, i) => `<div class="c" title="${MON[i]}"><b style="height:${m ? (m.mehr / max) * 100 : 0}%"></b><b class="zk" style="height:${m && m.zkChange > 0 ? (m.zkChange / max) * 100 : 0}%;opacity:.7"></b><span>${MON[i].slice(0, 1)}</span></div>`).join('')}</div>
      <div class="legend"><span><i style="background:var(--primary)"></i>Mehrarbeit</span><span><i style="background:var(--c-zk)"></i>ins Zeitkonto</span></div>
      ${zusTable({ h25: tot.h25, h50: tot.h50, base: tot.pay - tot.z25 - tot.z50, z25: tot.z25, z50: tot.z50, total: tot.pay }, tot.mehr, tot.nach)}
      <p class="xs muted mt-s">${tot.days} Arbeitstage erfasst</p>
    </section>`;
  }
  function pageMehrarbeit() {
    const s = S();
    const m = ui.kmonth;
    const k = kontInfo(m);
    const mm = calc.months.get(m);
    const isCur = m === C.ym(today);
    let avg = '';
    if (isCur && k.has) {
      const end = `${m}-${String(new Date(Number(m.slice(0, 4)), Number(m.slice(5, 7)), 0).getDate()).padStart(2, '0')}`;
      const rest = C.workdaysBetween(today, end, opt(), (d) => !!absAt(d)).length;
      avg = k.open <= 0 ? '<p class="small mt-s pos"><b>Kontingent erreicht.</b></p>' : rest ? `<p class="small mt-s"><b class="pos">Noch Ø ${nf(k.open / rest)} Std. Mehrarbeit pro Arbeitstag</b><br><span class="xs muted">${rest} verbleibende Arbeitstage im ${MON[Number(m.slice(5, 7)) - 1]} (ohne Feiertage & Urlaub, inkl. heute)</span></p>` : '<p class="small mt-s muted">Keine Arbeitstage mehr in diesem Monat.</p>';
    }
    const z = calc.zk;
    const curK = kontInfo();
    const showNach = z > s.zk.max && curK.open <= 0;
    const nachList = st.nach.slice().sort((a, b) => (a.month < b.month ? 1 : -1));
    let body = '';
    if (ui.view === 'woche') {
      // Wochen mit erfassten Zeiten immer (auch im Voraus eingetragene); reine Urlaubswochen erst, wenn ihre KW begonnen hat
      const all = calc.weeks.filter((w) => w.days.some((d) => d.entry) || (w.monday <= today && w.days.some((d) => d.absence && !d.absence.fromEntry)));
      body = all.length ? all.map((w, i) => weekCard(w, all[i - 1] && all[i - 1].days.some((x) => x.entry) ? all[i - 1] : null)).reverse().join('') : '<p class="empty">Noch keine Tage gespeichert.</p>';
    } else if (ui.view === 'monat') {
      const ms = [...calc.months.values()].filter((x) => x.days || x.weeks.some((w) => w.mehr || w.zkChange)).sort((a, b) => (a.month < b.month ? 1 : -1));
      body = ms.length ? ms.map(monthCard).join('') : '<p class="empty">Noch keine Monate mit Einträgen.</p>';
    } else body = yearView();
    const fehlt = [];
    if (!k.has && !st.nach.some((n) => n.month === m)) fehlt.push(`MEA-Kontingent für ${MON[Number(m.slice(5, 7)) - 1]} (Feld hier drunter)`);
    if (!Number(s.lohn.grundlohn) && !Number(s.lohn.stundenlohn)) fehlt.push('Grundlohn bzw. Stundenlohn (für die €-Beträge)');
    if (!s.zk.datum) fehlt.push('Zeitkonto-Stand');
    const fehltNote = fehlt.length ? `<div class="notice warn" style="margin:0 0 14px"><div><b>Damit alles stimmt, fehlen noch:</b><ul style="margin:4px 0 0;padding-left:18px">${fehlt.map((x) => `<li>${x}</li>`).join('')}</ul>${fehlt.some((x) => !x.startsWith('MEA')) ? `<button class="btn sm soft mt-s" data-act="goSet" data-sec="${!s.zk.datum && Number(s.lohn.grundlohn) ? 'mehrarbeit' : 'verdienst'}">Zu den Einstellungen</button>` : ''}</div></div>` : '';
    return `<div class="between"><h1>Mehrarbeit</h1><button class="iconbtn" data-act="eye" title="Lohn ein-/ausblenden">${s.lohn.zeigen ? I.eye : I.eyeoff}</button></div>
    ${fehltNote}
    <section class="card kcard">
      <div class="krow"><button class="iconbtn sm" data-act="kmonth" data-d="-1">${I.left}</button><b>${monthName(m)}</b><button class="iconbtn sm" data-act="kmonth" data-d="1">${I.right}</button></div>
      ${st.kontingent[m] !== undefined && !ui.kEdit
        ? `<div class="kline"><span>MEA-Kontingent</span><b class="num">${H(Number(st.kontingent[m]) || 0)}</b><button class="kedit" data-act="kEdit" title="Korrigieren" aria-label="Kontingent korrigieren">✎</button></div>`
        : `<div class="kline"><label for="kont">MEA-Kontingent (h)</label><input id="kont" class="field sm" inputmode="decimal" placeholder="z. B. 20" value="${deNum(st.kontingent[m] ?? '')}" data-kont="${m}"><button class="btn sm" data-act="kDone">OK</button></div>`}
      <div class="kmini"><span>Geleistet <b class="num">${H(mm ? mm.mehr : 0)}</b></span><span>Offen <b class="num acc">${k.has ? H(Math.max(0, k.open)) : '–'}</b></span></div>
      ${k.has ? `<div class="progress thin"><i style="width:${Math.min(100, (k.used / k.k) * 100)}%"></i></div>` : '<p class="hint" style="margin:6px 0 0">Ohne Kontingent laufen alle Überstunden ins Zeitkonto.</p>'}
      ${avg}
      ${z > s.zk.max ? `<div class="notice danger">⚠ <div><b>Vorsicht, Stundenkonto voll!</b> Zeitkonto ${sH(z)} – es wird weiter mitgezählt.</div></div>` : ''}
    </section>
    ${showNach ? `<section class="card" style="border:2px solid var(--warn)">
      <h2>Mehrarbeit nachbeantragen</h2>
      <p class="small">MEA-Kontingent für ${monthName(C.ym(today))} ist ${curK.has ? 'erschöpft' : 'nicht vorhanden'} und das Zeitkonto ist über ${s.zk.max} h. Trag die genehmigten Stunden ein – sie fließen ins Kontingent und zählen als Mehrarbeit (hervorgehoben).</p>
      <div class="grid2 mt"><input class="field" id="nachH" inputmode="decimal" placeholder="Stunden"><button class="btn" data-act="addNach">Eintragen</button></div>
    </section>` : ''}
    ${nachList.length ? `<section class="card"><h2>Nachbeantragt</h2><div class="list">${nachList.map((n) => `<div class="li"><span class="badge nach">${H(num(n.hours))}</span><span class="grow">${monthName(n.month)}<br><span class="xs muted">eingetragen ${dShort(n.date)}${n.date.slice(0, 4)}</span></span><button class="btn sm danger" data-act="delNach" data-id="${n.id}">Löschen</button></div>`).join('')}</div></section>` : ''}
    <div class="seg" style="margin-bottom:14px">${[['woche', 'Wochen'], ['monat', 'Monate'], ['jahr', 'Jahr']].map(([kk, l]) => `<button aria-pressed="${ui.view === kk}" data-act="view" data-v="${kk}">${l}</button>`).join('')}</div>
    ${body}
    <p class="xs muted onbg" style="text-align:center">Mehrarbeit ab ${D1(C.tagessoll(s))} Std./Tag · Samstag komplett · Zuschläge je Woche: erste 6 h +25 %, danach +50 % · Tag antippen zum Löschen</p>`;
  }

  // ---------- Seite: Urlaub ----------
  function typeAvail(type, y) {
    const v = vac[y] || {};
    if (type === 'tarif') return `${D1(tarifFrei(y).frei)} Tage frei`;
    if (type === 'zk') return `${sH(calc.zkPlanned)} ≈ ${Math.floor(calc.zkPlanned / calc.soll)} Tage`;
    if (type === 'fza') return `${H(calc.fzaPlanned, 1)} ≈ ${Math.floor(calc.fzaPlanned / calc.soll)} Tage`;
    if (type === 'tzug') return `${D1(v.tzugRest ?? C.yearCfg(S(), y).tzug)} Tage frei`;
    if (type === 'krank') return `${D1(v.krank || 0)} Tage in ${y}`;
    return `${D1(v.sonder || 0)} Tage genommen`;
  }
  /** Monatskalender (mit KW-Spalte) – für Urlaub und Datumsauswahl */
  function monthGrid(m, cellFn) {
    const start = C.monday(`${m}-01`);
    let html = `<div class="cal kwcal"><div class="wh">KW</div>${['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map((x) => `<div class="wh">${x}</div>`).join('')}`;
    for (let r = 0; r < 6; r++) {
      const mon = C.addDays(start, r * 7);
      if (r > 3 && mon.slice(0, 7) !== m) break;
      html += `<div class="kwc">${C.isoWeek(mon)}</div>`;
      for (let i = 0; i < 7; i++) html += cellFn(C.addDays(mon, i));
    }
    return html + '</div>';
  }
  function dayCell(d, m, act) {
    const s = S();
    const a = calc.absMap.get(d);
    const hol = C.holidayName(d, opt());
    const wd = C.dow(d);
    const cls = ['cd'];
    if (d.slice(0, 7) !== m) cls.push('out');
    if (wd === 0 || wd === 6) cls.push('we');
    if (hol) cls.push('hol');
    if (a) { cls.push(`t-${a.type}`); if (!a.full) cls.push('half'); }
    else if (C.halfDay(d, s) && wd > 0 && wd < 6) cls.push('hd');
    if (d === today) cls.push('today');
    if (act === 'day') {
      const sel = ui.sel;
      if (sel && (d === sel.from || d === sel.to)) cls.push('sel');
      if (sel && sel.to && d > sel.from && d < sel.to) cls.push('inr');
    } else if (d === ui.date) cls.push('sel');
    const mark = a ? C.TYPES[a.type].short : hol ? 'FT' : '';
    return `<button class="${cls.join(' ')}" data-act="${act}" data-d="${d}" title="${esc(hol || (a ? C.TYPES[a.type].label : ''))}">${Number(d.slice(8))}${mark ? `<span class="m">${mark}</span>` : ''}${st.entries[d] && !(a && a.full) ? '<span class="w"></span>' : ''}</button>`;
  }
  function pageUrlaub() {
    const s = S(), y = ui.vyear, v = vac[y] || {};
    const cfg = C.yearCfg(s, y);
    const tf = tarifFrei(y, y === curY ? today : `${y}-01-01`);
    const tarifBasis = v.hasStand ? v.stand : (v.anspruch ?? cfg.tarif) + (v.carryIn || 0);
    const tarifGen = v.hasStand ? (v.taken || 0) - (v.vorStand || 0) : v.taken || 0;
    const zkDays = v.zkDays || 0, fzaDays = v.fzaDays || 0;
    const tile = (cls, name, val, sub, side = '') => `<div class="b ${cls}"><div class="tn"><span class="tdot ${cls}"></span>${name}</div><div class="v num">${val}</div><div class="s">${sub}</div>${side ? `<div class="side">${side}</div>` : ''}</div>`;
    const m = ui.cal;
    // Einträge des Jahres
    const items = [];
    for (const a of st.absences) {
      if (a.to.slice(0, 4) < String(y) || a.from.slice(0, 4) > String(y)) continue;
      const days = C.workdaysBetween(a.from, a.to, opt());
      const n = days.reduce((acc, d) => acc + (calc.absMap.get(d) && calc.absMap.get(d).id === a.id ? calc.absMap.get(d).units : 0), 0);
      items.push({ ...a, n });
    }
    for (const [d, e] of Object.entries(st.entries)) if (e.half && d.slice(0, 4) === String(y) && !absAt(d)) items.push({ id: null, from: d, to: d, type: 'tarif', n: 0.5, note: '½ Tag (aus Arbeitszeit)' });
    items.sort((a, b) => (a.from < b.from ? -1 : 1));
    const sums = {};
    for (const it of items) sums[it.type] = (sums[it.type] || 0) + it.n;
    const ugTag = (C.monatsentgelt(s) / (Number(s.urlaub.ugTeiler) || 21.75)) * (Number(s.urlaub.ugFaktor) || 0);
    // Jahresüberblick als Mini-Kalender je Monat (Wochentage in Spalten, Tage mit Zahl)
    const nextQ = st.absences.some((a) => a.to >= `${y + 1}-01-01` && a.from <= `${y + 1}-03-31`);
    const rows = Array.from({ length: 12 }, (_, i) => [y, i + 1]).concat(nextQ ? [[y + 1, 1], [y + 1, 2], [y + 1, 3]] : []);
    let grid = '<div class="ymonths">';
    for (const [yy, mo] of rows) {
      const mm = `${yy}-${String(mo).padStart(2, '0')}`;
      if (yy !== y && mo === 1) grid += `<div class="ysep">${yy} · Resturlaub nutzbar bis 31.03.</div>`;
      const first = `${mm}-01`, dim = new Date(yy, mo, 0).getDate();
      let cnt = 0, cells = '';
      for (let i = 0; i < (C.dow(first) + 6) % 7; i++) cells += '<i></i>';
      for (let d = 1; d <= dim; d++) {
        const iso = `${mm}-${String(d).padStart(2, '0')}`;
        const a = calc.absMap.get(iso), wd = C.dow(iso), hol = C.holidayName(iso, opt());
        if (a) cnt += a.units;
        const c = a ? `t-${a.type}${a.full ? '' : ' half'}` : hol ? 'hol' : wd === 0 || wd === 6 ? 'we' : '';
        cells += `<i class="${c} ${iso === today ? 'td' : ''}" title="${dShort(iso)}${a ? ' · ' + C.TYPES[a.type].label : hol ? ' · ' + esc(hol) : ''}">${d}</i>`;
      }
      grid += `<button class="ymon ${cnt ? 'has' : ''}" data-act="calTo" data-m="${mm}"><div class="ymh"><b>${MON[mo - 1].slice(0, 3)}${yy !== y ? ` ${String(yy).slice(2)}` : ''}</b>${cnt ? `<span>${D1(cnt)} T</span>` : ''}</div><div class="ydays">${cells}</div></button>`;
    }
    grid += '</div>';
    // Liste nach Typ gruppiert
    const groups = Object.keys(C.TYPES).filter((t) => items.some((it) => it.type === t)).map((t) => {
      const list = items.filter((it) => it.type === t);
      const open = ui.vopen && t in ui.vopen ? ui.vopen[t] : list.length <= 4;
      return `<details class="tgroup" style="--tc:var(--c-${t})" ${open ? 'open' : ''} data-vt="${t}"><summary><span class="tdot ${t}"></span><b>${C.TYPES[t].label}</b><span class="grow"></span><span class="tsum">${D1(sums[t])} T</span><span class="xs muted">${list.length}×</span>${I.chev}</summary>
        ${list.map((it) => {
          const past = it.to < today, now = it.from <= today && it.to >= today;
          const extra = [];
          if (it.type === 'zk' || it.type === 'fza') extra.push(`−${H(it.n * calc.soll, 1)}`);
          if (it.type === 'tarif' && s.lohn.zeigen && ugTag) extra.push(`UG ${EUR(it.n * ugTag)}`);
          if (it.note) extra.push(esc(it.note));
          return `<div class="tl ${past ? 'past' : ''}"><span class="tlr">${it.from === it.to ? `${WD[C.dow(it.from)]} ${dShort(it.from)}` : `${WD[C.dow(it.from)]} ${dShort(it.from)} – ${WD[C.dow(it.to)]} ${dShort(it.to)}`}${now ? ' <span class="badge" style="background:var(--success);color:#fff">läuft</span>' : ''}${extra.length ? `<small>${extra.join(' · ')}</small>` : ''}</span><b class="tln">${D1(it.n)} T</b>${it.id ? `<button class="del" data-act="delAbs" data-id="${it.id}" aria-label="Löschen">✕</button>` : '<span style="width:30px"></span>'}</div>`;
        }).join('')}</details>`;
    }).join('');
    const verpl = calc.zkVerplant > 0 ? `<b class="neg">${H(calc.zkVerplant, 0)} verplant</b>` : '';
    return `<div class="between"><h1>Urlaub</h1><div class="row yearnav"><button class="iconbtn" data-act="vyear" data-d="-1">${I.left}</button><b>${y}</b><button class="iconbtn" data-act="vyear" data-d="1">${I.right}</button></div></div>
    <div class="bal">
      ${tile('tarif', 'Tarifurlaub', `${D1(tf.frei)} <small>T frei</small>`, `${D1(tarifGen)} von ${D1(tarifBasis)} genommen`, tf.carry > 0 ? `inkl. ${D1(tf.carry)} T Vorjahr bis 31.03.` : v.verfallen > 0 && y <= curY ? `${D1(v.verfallen)} T verfallen` : '')}
      ${tile('zk', 'Zeitkonto', sH(calc.zk), `${D1(zkDays)} ${zkDays === 1 ? 'Tag' : 'Tage'} genommen${calc.zkVerplant > 0 ? `<br>${verpl} (${D1(calc.zkVerplantTage)} T) → ${sH(calc.zkPlanned)}` : ''}`, `≈ ${Math.max(0, Math.floor(calc.zkPlanned / calc.soll))} T frei`)}
      ${tile('fza', 'FZA-Konto', H(calc.fza, 1), `${D1(fzaDays)} ${fzaDays === 1 ? 'Tag' : 'Tage'} genommen`, `≈ ${Math.max(0, Math.floor(calc.fzaPlanned / calc.soll))} T frei`)}
      ${tile('tzug', 'T-Zug', `${D1(v.tzugRest ?? cfg.tzug)} <small>T frei</small>`, `${D1(v.tzug || 0)} von ${D1(v.tzugMax ?? cfg.tzug)} genommen`, `nur ${y}`)}
      ${tile('sonder', 'Sonderurlaub', `${D1(v.sonder || 0)} <small>T</small>`, 'genommen')}
      ${tile('krank', 'Krank', `${D1(v.krank || 0)} <small>T</small>`, `in ${y} · bezahlt mit ${D1(calc.soll)} h/Tag`)}
    </div>
    <section class="card">
      <div class="cal-head"><button class="iconbtn" data-act="cal" data-d="-1">${I.left}</button><h3>${monthName(m)}</h3><button class="iconbtn" data-act="cal" data-d="1">${I.right}</button></div>
      ${monthGrid(m, (d) => dayCell(d, m, 'day'))}
      <p class="hint" style="text-align:center">${ui.sel ? `Start: <b>${dShort(ui.sel.from)}</b> – jetzt Endtag tippen (gleicher Tag = 1 Tag) · <a href="#" data-act="selClear">abbrechen</a>` : 'Tippe Start- und Endtag, um Urlaub zu planen. Tippe auf einen Urlaubstag zum Bearbeiten.'}</p>
      <div class="legend" style="justify-content:center">${Object.entries(C.TYPES).map(([kk, t]) => `<span><i class="tdot ${kk}"></i>${t.label}</span>`).join('')}<span><i style="background:repeating-linear-gradient(135deg,var(--secondary) 0 3px,var(--accent) 3px 6px)"></i>Feiertag</span></div>
    </section>
    <section class="card"><div class="between"><h2 style="margin:0">Jahresüberblick ${y}</h2><span class="xs muted">${D1(Object.values(sums).reduce((a2, b2) => a2 + b2, 0))} Tage frei</span></div>
      ${grid}
      <p class="xs muted" style="margin:6px 0 0">Monat antippen = Kalender springt dorthin</p>
      ${groups || '<p class="empty" style="color:var(--muted)">Für dieses Jahr ist noch nichts eingetragen.</p>'}
    </section>
    <section class="card"><h2>Urlaubsplanung an den Chef</h2>
      <p class="small muted">Alle geplanten freien Tage ab heute (ohne Krankheitstage) als fertige Mail – mit Kategorie und Anzahl Tage.</p>
      <button class="btn" data-act="vacMail">📧 Urlaubsplanung als Mail</button>
      ${!S().mail.an ? '<p class="hint">Tipp: Anrede, Mail-Adresse und deinen Namen unter Mehr → Urlaub & Konten hinterlegen.</p>' : ''}
    </section>`;
  }
  function openAbsenceSheet(from, to) {
    const s = S();
    const days = C.workdaysBetween(from, to, opt());
    const y = Number(from.slice(0, 4));
    const clash = days.filter((d) => absAt(d));
    const worked = days.filter((d) => st.entries[d]);
    const f = { type: 'tarif', half: false, note: '' };
    const ugTag = (C.monatsentgelt(s) / (Number(s.urlaub.ugTeiler) || 21.75)) * (Number(s.urlaub.ugFaktor) || 0);
    const cost = () => days.reduce((a, d) => a + (f.half && days.length === 1 ? Math.min(0.5, C.dayNeed(d, s)) : C.dayNeed(d, s)), 0);
    const draw = (el) => {
      const n = cost();
      const warn = [];
      if (f.type === 'tarif') { const free = tarifFrei(y, from).frei; if (n > free + 1e-9) warn.push(`Nur noch ${D1(free)} Tage Tarifurlaub frei.`); }
      if (f.type === 'tzug') { const free = (vac[y] || {}).tzugRest ?? C.yearCfg(s, y).tzug; if (from.slice(0, 4) !== to.slice(0, 4)) warn.push('T-Zug-Tage gelten nur innerhalb eines Kalenderjahres.'); if (n > free) warn.push(`Nur noch ${D1(free)} T-Zug-Tage in ${y}.`); }
      if (f.type === 'zk' && calc.zkPlanned - n * calc.soll < s.zk.min) warn.push(`Zeitkonto ginge unter ${s.zk.min} h (${sH(calc.zkPlanned - n * calc.soll)}).`);
      if (f.type === 'fza' && calc.fzaPlanned - n * calc.soll < 0) warn.push(`FZA-Konto reicht nicht (${H(calc.fzaPlanned - n * calc.soll, 1)}).`);
      const hard = clash.length > 0 || !days.length || (f.type === 'tzug' && from.slice(0, 4) !== to.slice(0, 4));
      el.innerHTML = `<h3>Urlaub eintragen</h3>
        <p class="small"><b>${from === to ? dLong(from) : `${dLong(from)} – ${dLong(to)}`}</b><br><span class="muted">${D1(n)} Urlaubstag${n === 1 ? '' : 'e'} (ohne Wochenende & Feiertage${days.some((d) => C.halfDay(d, s)) ? ', Heiligabend/Silvester als ½ Tag' : ''})</span></p>
        <div class="typepick mt">${Object.entries(C.TYPES).map(([k, t]) => `<button aria-pressed="${f.type === k}" data-t="${k}"><span class="tdot ${k}"></span><span>${t.label}<small>${typeAvail(k, y)}</small></span></button>`).join('')}</div>
        ${days.length === 1 ? `<label class="switch mt-s"><span>Nur halber Tag</span><input type="checkbox" id="halfc" ${f.half ? 'checked' : ''}></label>` : ''}
        <div id="halfErr"></div>
        <input class="field mt-s" id="note" placeholder="Notiz (optional)" value="${esc(f.note)}">
        ${f.type === 'tarif' && s.lohn.zeigen && ugTag ? `<p class="small mt-s">Urlaubsgeld: <b>${EUR(n * ugTag)}</b> (${D1(n)} × ${EUR(ugTag)})</p>` : ''}
        ${f.type !== 'tarif' ? '<p class="xs muted mt-s">Bezahlt werden je Tag die Sollstunden ohne Zuschläge, kein Urlaubsgeld.</p>' : ''}
        ${f.type === 'zk' ? `<p class="xs muted">${days[0] && days[0] < today ? 'Liegt in der Vergangenheit: wird direkt vom Zeitkonto abgezogen.' : `Die Wochen-Sollzeit sinkt um ${H(calc.soll, 0)} je Tag: Plus dieser Woche wird zuerst mit dem Zeitkonto verrechnet, erst über ${D1(s.arbeit.wochenstunden)} h zählt Mehrarbeit.`}</p>` : ''}
        ${clash.length ? `<div class="notice danger">An ${clash.length} Tag(en) ist schon Urlaub eingetragen.</div>` : ''}
        ${!days.length ? '<div class="notice danger">Im Zeitraum liegt kein Arbeitstag.</div>' : ''}
        ${worked.length ? `<div class="notice warn">An ${worked.length} Tag(en) ist schon Arbeitszeit gespeichert – die wird für diese Tage nicht mehr gezählt.</div>` : ''}
        ${warn.map((w) => `<div class="notice warn">${esc(w)}</div>`).join('')}
        <div class="grid2 mt"><button class="btn ghost" data-act="close">Abbrechen</button><button class="btn" id="saveAbs" ${hard ? 'disabled' : ''}>Eintragen</button></div>`;
      el.querySelectorAll('[data-t]').forEach((b) => b.addEventListener('click', () => { f.type = b.dataset.t; f.note = el.querySelector('#note').value; draw(el); }));
      const hc = el.querySelector('#halfc'); if (hc) hc.addEventListener('change', () => { f.half = hc.checked; f.note = el.querySelector('#note').value; draw(el); });
      el.querySelector('#saveAbs').addEventListener('click', () => {
        if (f.half && days.length === 1 && !['tarif', 'zk'].includes(f.type)) {
          el.querySelector('#halfErr').innerHTML = '<div class="notice danger">Ein halber Tag geht nur bei <b>Tarifurlaub</b> oder <b>Zeitkonto</b>.</div>';
          return;
        }
        st.absences.push({ id: uid(), created: Date.now(), from, to, type: f.type, half: f.half && days.length === 1, note: el.querySelector('#note').value.trim() });
        ui.sel = null; save(); sheetOnClose = null; closeSheet(); toast(`✓ ${C.TYPES[f.type].label} eingetragen`); render();
      });
    };
    sheetOnClose = () => { ui.sel = null; render(); };
    sheet('', draw);
  }
  function openAbsenceInfo(d) {
    const a = calc.absMap.get(d);
    const ab = st.absences.find((x) => x.id === a.id);
    if (!ab) return;
    const n = C.workdaysBetween(ab.from, ab.to, opt()).reduce((acc, x) => acc + ((calc.absMap.get(x) || {}).id === ab.id ? calc.absMap.get(x).units : 0), 0);
    sheet(`<h3><span class="tdot ${ab.type}" style="width:16px;height:16px"></span> ${C.TYPES[ab.type].label}</h3>
      <p>${ab.from === ab.to ? dLong(ab.from) : `${dLong(ab.from)} – ${dLong(ab.to)}`}<br><span class="muted">${D1(n)} Urlaubstag(e)${ab.note ? ` · ${esc(ab.note)}` : ''}</span></p>
      <div class="grid2 mt"><button class="btn ghost" data-act="close">Schließen</button><button class="btn danger" data-act="delAbs" data-id="${ab.id}">Löschen</button></div>`);
  }

  // ---------- Seite: Netto Rechner ----------
  function godDefaults() {
    const s = S();
    return { grundlohn: C.monatsentgelt(s) || 3800, mea: 40, h25: 24, zulage: 0, einmal: 0, utage: 0, klasse: Number(s.steuer.klasse) || 1, kirche: !!s.steuer.kirche, kasse: s.steuer.kasse || '', kvZusatz: Number(s.steuer.kvZusatz) || 2.9, kinderPV: Number(s.steuer.kinderPV) || 0, kinderFB: Number(s.steuer.kinderFB) || 0, land: s.arbeit.land || 'BY', alter: Number(s.steuer.geburtsjahr) ? new Date().getFullYear() - Number(s.steuer.geburtsjahr) : '' };
  }
  function nettoResult(lines, laufend, einmal, S2, mo, abzug, rate, cls, note = '', mehrG = 0) {
    const basis = typeof mehrG === 'object' && mehrG.basis !== undefined ? mehrG.basis : laufend;
    const n = C.netto(laufend, einmal, S2, mo, abzug, basis);
    // Block „Mehrarbeit“ = Mehrarbeit + Urlaubsgeld + Sonderzahlungen (außer Zahlungen mit dem Grundlohn, z. B. Weihnachtsgeld)
    const xl = typeof mehrG === 'object' ? mehrG.l : mehrG, xe = typeof mehrG === 'object' ? mehrG.e : 0;
    const inkl = typeof mehrG === 'object' && mehrG.inkl;
    mehrG = xl + xe;
    const nOhne = mehrG > 0 ? C.netto(laufend - xl, einmal - xe, S2, mo, abzug, Math.min(basis, laufend - xl)) : n;
    const netMehr = n.net - nOhne.net;
    const n25 = C.netto(laufend + rate * 1.25, einmal, S2, mo, abzug, basis), n50 = C.netto(laufend + rate * 1.5, einmal, S2, mo, abzug, basis);
    const net25 = n25.net - n.net, net50 = n50.net - n.net;
    const grenz = rate ? 1 - net25 / (rate * 1.25) : 0;
    const spitze = n.zveJahr >= 69879;
    let tipp;
    if (spitze) tipp = `Du liegst im <b>Spitzensteuersatz (42 %)</b>. Von jeder bezahlten Überstunde bleibt gut die Hälfte – Stunden ins <b>Zeitkonto oder FZA</b> zu schieben und später frei zu nehmen, ist oft attraktiver.`;
    else if (grenz > 0.5) tipp = `Deine Grenzbelastung liegt bei <b>${nf(grenz * 100, 0)} %</b>: von 1 € Mehrarbeit bleiben nur ${nf((1 - grenz) * 100, 0)} Cent. Freizeitausgleich lohnt sich hier oft mehr als Auszahlung.`;
    else if (grenz > 0.42) tipp = `Grenzbelastung <b>${nf(grenz * 100, 0)} %</b> – von 1 € Mehrarbeit bleiben ca. ${nf((1 - grenz) * 100, 0)} Cent. Die +50 %-Stunden (ab der 7. Überstunde der Woche) bringen netto am meisten.`;
    else tipp = `Grenzbelastung <b>${nf(grenz * 100, 0)} %</b> – von 1 € Mehrarbeit bleiben ca. ${nf((1 - grenz) * 100, 0)} Cent. Bezahlte Mehrarbeit lohnt sich bei dir noch gut.`;
    const parts = [[n.net, 'var(--success)', 'Netto'], [n.taxSum, 'var(--danger)', 'Steuern'], [n.svSum, 'var(--c-zk)', 'Sozialvers.']];
    if (n.abzug) parts.push([n.abzug, 'var(--muted)', 'Sonstiges']);
    return `<section class="card">
      <div class="hero"><div class="s">${n.abzug ? 'Aufs Konto (ca.)' : 'Netto (ca.)'}</div><div class="v num ${cls}">${nf(n.net)} €</div><div class="s ${cls}">Brutto ${nf(n.gross)} €${n.abzug ? ` · Netto ${nf(n.net + n.abzug)} € − VL-Sparrate ${nf(n.abzug)} €` : ''}</div></div>
      <div class="nsplit ${cls}"><div><span>Netto (Grundgehalt)</span><b class="num">${nf(nOhne.net)} €</b><small>aus ${nf(n.gross - mehrG)} € brutto</small></div><div class="m"><span>Netto (Mehrarbeit)</span><b class="num">${mehrG > 0 ? nf(netMehr) + ' €' : '–'}</b><small>${mehrG > 0 ? `aus ${nf(mehrG)} € brutto · ${nf((netMehr / mehrG) * 100, 0)} % bleiben${inkl ? '<br>inkl. Urlaubsgeld & Sonderzahlungen' : ''}` : 'keine Mehrarbeit'}</small></div></div>
      <div class="split ${cls}">${parts.map(([v, c]) => `<i style="width:${n.gross ? (v / n.gross) * 100 : 0}%;background:${c}"></i>`).join('')}</div>
      <div class="legend">${parts.map(([v, c, l]) => `<span><i style="background:${c}"></i>${l} ${nf(n.gross ? (v / n.gross) * 100 : 0, 0)} %</span>`).join('')}</div>
      ${note}
    </section>
    <section class="card"><h2>Brutto</h2>
      <dl class="money ${cls}" style="margin-top:0">${lines.map((l) => `<div class="${l.cls || ''}"><dt>${l.k}</dt><dd>${nf(l.v)} €</dd></div>`).join('')}<div class="sum"><dt>Brutto gesamt</dt><dd>${nf(n.gross)} €</dd></div></dl>
      <h2 class="mt">Abzüge</h2>
      <dl class="money ${cls}" style="margin-top:0">
        <div class="grp"><dt>Steuern</dt><dd>−${nf(n.taxSum)} €</dd></div>
        <div><dt>Lohnsteuer <small>StKl ${['I', 'II', 'III', 'IV', 'V', 'VI'][S2.steuer.klasse - 1]}</small></dt><dd>−${nf(n.lst)} €</dd></div>
        <div><dt>Solidaritätszuschlag <small>${n.soli > 0.005 ? '5,5 % (Milderungszone)' : `0 € – unter Freigrenze ${nf(n.jahr.soliFrei, 0)} €/Jahr`}</small></dt><dd>−${nf(n.soli)} €</dd></div>
        <div><dt>Kirchensteuer <small>${S2.steuer.kirche ? `${nf(n.jahr.kistSatz * 100, 0)} % der Lohnsteuer` : 'keine'}</small></dt><dd>−${nf(n.kist)} €</dd></div>
        <div class="grp"><dt>Sozialversicherung</dt><dd>−${nf(n.svSum)} €</dd></div>
        <div><dt>Krankenvers. <small>${S2.steuer.freiwillig ? `freiwillig: Beitrag ${nf(n.sv.kv * 2)} € − AG-Zuschuss ${nf(n.sv.kv)} €` : `${nf(n.rates.kv * 100)} % von ${nf(n.kvBase, 0)} €`}</small></dt><dd>−${nf(n.sv.kv)} €</dd></div>
        <div><dt>Pflegevers. <small>${S2.steuer.freiwillig ? `freiwillig: Beitrag ${nf(n.sv.pv + n.kvBase * (S2.arbeit.land === 'SN' ? 0.013 : 0.018))} € − AG-Zuschuss ${nf(n.kvBase * (S2.arbeit.land === 'SN' ? 0.013 : 0.018))} €` : `${nf(n.rates.pv * 100)} %${Number(S2.steuer.kinderPV) === 0 ? ' inkl. Kinderlosen-Zuschlag' : ''}`}</small></dt><dd>−${nf(n.sv.pv)} €</dd></div>
        <div><dt>Rentenvers. <small>${nf(n.rates.rv * 100, 1)} % von ${nf(n.rvBase, 0)} €</small></dt><dd>−${nf(n.sv.rv)} €</dd></div>
        <div><dt>Arbeitslosenvers. <small>${nf(n.rates.av * 100, 1)} %</small></dt><dd>−${nf(n.sv.av)} €</dd></div>
        ${n.abzug ? `<div class="sum"><dt>Netto</dt><dd>${nf(n.net + n.abzug)} €</dd></div><div><dt>VL-Sparrate <small>Überweisung an deinen Sparvertrag</small></dt><dd>−${nf(n.abzug)} €</dd></div>` : ''}
        <div class="sum"><dt>${n.abzug ? 'Aufs Konto' : 'Netto'}</dt><dd>${nf(n.net)} €</dd></div>
      </dl>
      <details class="mini mt"><summary>So wird gerechnet</summary>
        <dl class="money ${cls}">
          <div><dt>Laufender Lohn × 12 (Jahresbasis)</dt><dd>${nf(n.laufend * 12)} €</dd></div>
          ${n.einmal ? `<div><dt>Einmalzahlung (Jahreslohn-Methode)</dt><dd>${nf(n.einmal)} €</dd></div>` : ''}
          <div><dt>− Vorsorgepauschale</dt><dd>${nf(n.jahr.vors)} €</dd></div>
          <div><dt>− Arbeitnehmer- & Sonderausgaben-Pauschbetrag</dt><dd>${nf(n.jahr.pausch)} €</dd></div>
          ${n.jahr.entl ? `<div><dt>− Entlastungsbetrag Alleinerziehende</dt><dd>${nf(n.jahr.entl)} €</dd></div>` : ''}
          <div class="sum"><dt>Zu versteuerndes Einkommen (Jahr)</dt><dd>${nf(n.jahr.zve, 0)} €</dd></div>
          <div><dt>Lohnsteuer Jahr</dt><dd>${nf(n.jahr.lst, 0)} €</dd></div>
          <div><dt>Durchschnittssteuersatz</dt><dd>${nf(n.jahr.zve ? (n.jahr.lst / (n.laufend * 12)) * 100 : 0, 1)} %</dd></div>
          <div><dt>Grenzsteuersatz (nächster Euro)</dt><dd>${nf(n.jahr.grenz * 100, 1)} %</dd></div>
          <div><dt>Bundesland</dt><dd>${C.LAENDER[S2.arbeit.land]}</dd></div>
          <div><dt>Kinderfreibeträge / Kinder (PV)</dt><dd>${D1(Number(S2.steuer.kinderFB) || 0)} / ${Number(S2.steuer.kinderPV) || 0}</dd></div>
          <div><dt>Krankenkasse · Zusatzbeitrag</dt><dd>${S2.steuer.kasse && S2.steuer.kasse !== '__andere' ? `${esc(S2.steuer.kasse)} · ` : ''}${nf(S2.steuer.kvZusatz)} %</dd></div>
          <div><dt>Beitragsbemessungsgrenze KV/PV · RV/AV</dt><dd>${nf(C.P.bbgKV)} € · ${nf(C.P.bbgRV, 0)} €</dd></div>
        </dl>
        <p class="xs muted">Lohnsteuer nach § 32a EStG 2026 und Programmablaufplan (Vorsorgepauschale), SV-Werte 2026. Arbeitgeberanteile sind nicht abgezogen.</p>
      </details>
    </section>
    <section class="card"><h2>Lohnt sich Mehrarbeit?</h2>
      <div class="grid2 ${cls}">
        <div class="kpi hl"><div class="k">1 Std. +25 %</div><div class="v num">${nf(net25)} €</div><div class="xs muted">netto von ${nf(rate * 1.25)} € brutto</div></div>
        <div class="kpi hl"><div class="k">1 Std. +50 %</div><div class="v num">${nf(net50)} €</div><div class="xs muted">netto von ${nf(rate * 1.5)} € brutto</div></div>
      </div>
      <div class="notice ${spitze || grenz > 0.5 ? 'warn' : 'info'}"><div>${tipp}</div></div>
    </section>`;
  }
  function pageNetto() {
    const s = S(), show = s.lohn.zeigen;
    const cls = show ? '' : 'blur';
    const head = `<div class="between"><h1>Gehalt</h1><button class="iconbtn" data-act="eye" title="Lohn ein-/ausblenden">${show ? I.eye : I.eyeoff}</button></div>
      <div class="seg" style="margin-bottom:14px"><button aria-pressed="${ui.nmode === 'ist'}" data-act="nmode" data-v="ist">Mein Monat</button><button aria-pressed="${ui.nmode === 'god'}" data-act="nmode" data-v="god">⚡ God Mode</button></div>`;
    const foot = (S2) => `<p class="xs muted onbg" style="text-align:center;padding:0 10px">Näherung nach Lohnsteuer-Tarif und SV-Werten 2026 (StKl ${['I', 'II', 'III', 'IV', 'V', 'VI'][S2.steuer.klasse - 1]}, ${C.LAENDER[S2.arbeit.land]}${S2.steuer.kirche ? ', mit KiSt' : ''}). Keine Gewähr – maßgeblich ist deine Lohnabrechnung.${S2.steuer.klasse >= 5 ? ' StKl V/VI nur grob angenähert.' : ''}</p>`;
    if (ui.nmode === 'god') {
      const g = { ...godDefaults(), ...(st.pref.god || {}) };
      const S2 = JSON.parse(JSON.stringify(s));
      Object.assign(S2.steuer, { klasse: Number(g.klasse), kirche: !!g.kirche, kvZusatz: Number(g.kvZusatz), kinderPV: Number(g.kinderPV), kinderFB: Number(g.kinderFB), geburtsjahr: g.alter ? new Date().getFullYear() - Number(g.alter) : 0 });
      S2.arbeit.land = g.land || 'BY';
      const rate = (Number(g.grundlohn) || 0) / ((Number(s.arbeit.wochenstunden) || 35) * 4.35);
      const tot = Math.max(0, Number(g.mea) || 0);
      const h25 = Math.min(tot, Math.max(0, Number(g.h25) || 0));
      const h50 = tot - h25;
      const mea = h25 * rate * 1.25 + h50 * rate * 1.5;
      const ug = Number(g.utage) * (Number(g.grundlohn) / (Number(s.urlaub.ugTeiler) || 21.75)) * (Number(s.urlaub.ugFaktor) || 0);
      const lines = [{ k: 'Grundlohn', v: Number(g.grundlohn) }];
      if (mea) lines.push({ k: `Mehrarbeit ${nf(h25, 1)} h à 125 % + ${nf(h50, 1)} h à 150 %`, v: mea, cls: 'hl25' });
      if (Number(g.zulage)) lines.push({ k: 'Zulagen (monatlich)', v: Number(g.zulage) });
      if (ug) lines.push({ k: `Urlaubsgeld (${D1(g.utage)} Tage)`, v: ug });
      if (Number(g.einmal)) lines.push({ k: 'Einmalzahlung', v: Number(g.einmal) });
      const manual = g.manuell !== undefined && g.manuell !== '' && g.manuell !== null && Number(g.manuell) > 0;
      if (manual) { lines.length = 0; lines.push({ k: 'Grundlohn + Mehrarbeit (manuell)', v: Number(g.manuell) }); if (Number(g.zulage)) lines.push({ k: 'Zulagen (monatlich)', v: Number(g.zulage) }); if (ug) lines.push({ k: `Urlaubsgeld (${D1(g.utage)} Tage)`, v: ug }); if (Number(g.einmal)) lines.push({ k: 'Einmalzahlung', v: Number(g.einmal) }); }
      const laufend = (manual ? Number(g.manuell) : Number(g.grundlohn) + mea) + Number(g.zulage), einmal = ug + Number(g.einmal);
      const gf = (k, l, attrs = 'inputmode="decimal"', hint = '') => `<div class="${manual && ['grundlohn', 'mea', 'h25'].includes(k) ? 'dim' : ''}"><label class="label">${l}</label><input class="field" data-god="${k}" value="${esc(deNum(g[k]))}" ${attrs}>${hint ? `<div class="hint">${hint}</div>` : ''}</div>`;
      return `${head}<section class="card"><h2>Spielwiese – alles frei eingeben</h2>
        <div class="grid2">${gf('grundlohn', 'Grundlohn (€ brutto)')}<div><span class="label">Stundenlohn</span><div class="field num" style="display:flex;align-items:center;background:var(--secondary)">${nf(rate)} €</div></div></div>
        <div class="hint">Stundenlohn = Grundlohn ÷ (${D1(s.arbeit.wochenstunden)} h × 4,35)</div>
        <div class="label mt ${manual ? 'dim' : ''}">Mehrarbeit im Monat&nbsp;<b class="mea-eur">(${nf(mea)} €)</b></div>
        <div class="grid3">${gf('mea', 'Gesamt (h)')}${gf('h25', 'davon 25 % (h)')}<div><span class="label">Rest 50 % (h)</span><div class="field num" style="display:flex;align-items:center;background:var(--secondary)">${nf(h50, 1)}</div></div></div>
        ${Number(g.h25) > tot ? '<div class="hint neg">25 %-Stunden können nicht mehr sein als die Gesamtstunden – auf Gesamt begrenzt.</div>' : ''}
        <div class="sumbox ${manual ? 'man' : ''}"><label class="label">Grundlohn + Mehrarbeit (€ brutto)</label>
          <input class="field big2" data-god="manuell" inputmode="decimal" value="${manual ? esc(deNum(g.manuell)) : ''}" placeholder="${nf(Number(g.grundlohn) + mea)}">
          ${manual ? `<div class="notice warn"><div>✋ <b>Manueller Wert aktiv:</b> Grundlohn und Mehrarbeit oben werden ignoriert, gerechnet wird mit ${nf(Number(g.manuell))} €.<br><button class="btn sm soft mt-s" data-act="godManualOff">Wieder automatisch rechnen</button></div></div>` : '<div class="hint">Automatisch = Grundlohn + Mehrarbeit. Eigenen Wert eintippen, um ihn direkt zu verwenden.</div>'}</div>
        <div class="grid2 mt"><div><label class="label">Steuerklasse ${info('stkl')}</label><select class="field" data-god="klasse">${[1, 2, 3, 4, 5, 6].map((k) => `<option value="${k}" ${Number(g.klasse) === k ? 'selected' : ''}>${['I', 'II', 'III', 'IV', 'V', 'VI'][k - 1]}</option>`).join('')}</select></div>
        <div style="grid-column:1/-1"><label class="label">Krankenkasse ${info('kv')}</label>${kasseSelect('data-kasse="g"', g.kasse || '')}<div class="hint">${kasseHint(g.kasse || '', g.kvZusatz)}</div></div>
        ${g.kasse === '__andere' ? gf('kvZusatz', 'KV-Zusatz (%)') : ''}
        <div><label class="label">Bundesland</label><select class="field" data-god="land" data-str="1">${Object.entries(C.LAENDER).map(([k, l]) => `<option value="${k}" ${(g.land || 'BY') === k ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
        ${gf('alter', `Alter ${info('alter')}`, 'inputmode="numeric" placeholder="z. B. 35"')}
        ${gf('kinderPV', 'Kinder (PV)', 'inputmode="numeric"')}${gf('kinderFB', 'Kinderfreibeträge')}</div>
        <label class="switch"><span>Kirchensteuer</span><input type="checkbox" data-god="kirche" ${g.kirche ? 'checked' : ''}></label>
        <details class="fold" style="margin:6px 0 0;box-shadow:none" ${ui.godSZ ? 'open' : ''} data-fold="godSZ"><summary><span>Sonderzulagen ${Number(g.zulage) || Number(g.einmal) || Number(g.utage) ? '· aktiv' : ''}</span>${I.chev}</summary><div class="body"><div class="grid2 even">${gf('zulage', 'Zulagen / Monat (€)')}${gf('einmal', 'Einmalzahlung (€)', 'inputmode="decimal" placeholder="z. B. Weihnachtsgeld"')}${gf('utage', 'Urlaubstage (für Urlaubsgeld)')}<div></div></div></div></details>
        <div class="grid2 mt"><button class="btn soft" data-act="godReset">Aus meinen Daten</button><button class="btn" data-act="godCalc">Berechnen</button></div>
      </section>
      ${nettoResult(lines, laufend, einmal, S2, 6, 0, rate, '', '', manual ? 0 : mea)}
      ${foot(S2)}`;
    }
    const m = ui.nmonth;
    const gl = Number(s.lohn.grundlohn) || 0;
    if (!gl) return `${head}<section class="card"><p>Trag zuerst deinen <b>Grundlohn</b> und deine Steuerdaten ein – dann rechne ich dir jeden Monat dein Netto aus. Oder spiel im <b>God Mode</b> mit freien Werten.</p><button class="btn" data-act="goSet" data-sec="verdienst">Zu den Einstellungen</button></section>`;
    const modus = ui.gmode || 'aktuell';
    const mp = C.monthPay(st, calc, m, modus);
    const mo = Number(m.slice(5, 7));
    const lines = mp.lines.map((l) => ({ k: `${esc(l.k)}${l.mehr ? ` <span class="xs">(${H(l.mehr.mehr)}: ${H(l.mehr.pay.h25)} à 25 %, ${H(l.mehr.pay.h50)} à 50 %)</span>` : ''}`, v: l.v, cls: l.extra ? 'hl25' : '' }));
    // fehlende Angaben
    const miss = [];
    if (!s.steuer.geprueft) miss.push(`Steuerdaten noch nicht geprüft – gerechnet wird mit StKl ${['I', 'II', 'III', 'IV', 'V', 'VI'][s.steuer.klasse - 1]}, KV-Zusatz ${nf(s.steuer.kvZusatz, 2)} %, ${s.steuer.kirche ? 'mit' : 'ohne'} Kirchensteuer.`);
    else if (!s.steuer.kasse) miss.push('Krankenkasse noch nicht gewählt – gerechnet wird mit dem Durchschnitt 2,9 %.');
    const src = mp.src;
    const srcMo = Number(src.slice(5, 7));
    let missSec = s.steuer.geprueft && s.steuer.kasse ? '' : 'steuer';
    for (const x of s.lohn.sonder) if (x.art === 'einmalig' && Number(x.monat) === srcMo && !Number(x.wert)) { miss.push(`${esc(x.name || 'Sonderzahlung')} ist für ${MON[srcMo - 1]} angelegt, aber ohne Betrag.`); missSec = missSec || 'verdienst'; }
    const srcHas = Object.keys(st.entries).some((d) => d.startsWith(src));
    if (!srcHas) miss.push(`Für ${monthName(src)} sind keine Arbeitszeiten erfasst – Mehrarbeit ist deshalb nicht enthalten.`);
    const note = miss.length ? `<div class="notice warn"><div><b>Dafür fehlen mir noch Infos:</b><ul style="margin:4px 0 0;padding-left:18px">${miss.map((x) => `<li>${x}</li>`).join('')}</ul>${missSec ? `<button class="btn sm soft mt-s" data-act="goSet" data-sec="${missSec}">Zu den Einstellungen</button>` : ''}</div></div>` : '';
    // Jahr
    const y = Number(m.slice(0, 4));
    let yG = 0, yN = 0;
    for (let i = 1; i <= 12; i++) {
      const mm = `${y}-${String(i).padStart(2, '0')}`;
      const p = C.monthPay(st, calc, mm, modus);
      const ml = p.lines.find((l) => l.mehr);
      if (!ml) continue;
      yG += ml.v; yN += C.netto(p.laufend, p.einmal, s, i).net - C.netto(p.laufend - ml.v, p.einmal, s, i).net;
    }
    return `${head}
    <div class="between" style="margin-bottom:10px"><button class="iconbtn" data-act="nmonth" data-d="-1">${I.left}</button><b class="onbg" style="font-family:var(--font-d);font-size:26px">${monthName(m)}</b><button class="iconbtn" data-act="nmonth" data-d="1">${I.right}</button></div>
    <div class="gmode"><span class="xs onbg">${modus === 'aktuell' ? `Grundlohn + alles, was im ${MON[mo - 1]} anfällt` : `Grundlohn ${MON[mo - 1]} + Mehrarbeit, Urlaubsgeld & Sonderzahlungen aus ${MON[Number(C.prevMonth(m).slice(5, 7)) - 1]}`}</span><div class="seg mini"><button aria-pressed="${modus === 'aktuell'}" data-act="gmode" data-v="aktuell">Aktuell</button><button aria-pressed="${modus === 'auszahlung'}" data-act="gmode" data-v="auszahlung">Auszahlung</button></div></div>
    ${nettoResult(lines, mp.laufend, mp.einmal, s, mo, mp.vlSpar, calc.rate, cls, note, { l: mp.extraL, e: mp.extraE, inkl: mp.lines.some((l) => l.extra && !l.mehr), basis: mp.basis })}
    <section class="card"><h2>Bericht exportieren</h2><p class="small muted">Alle Werte von ${monthName(m)} (${modus === 'aktuell' ? 'Aktuell' : 'Auszahlung'}) mit Statistiken zu Mehrarbeit und Arbeitszeit.</p>
      <div class="grid2"><button class="btn" data-act="exportPdf">📄 PDF</button><button class="btn soft" data-act="exportXlsx">📊 Excel</button></div></section>
    ${yG > 0 ? `<section class="card"><h2>Mehrarbeit ${y}</h2><dl class="money ${cls}" style="margin-top:0"><div><dt>Mehrarbeit brutto</dt><dd>${nf(yG)} €</dd></div><div class="sum"><dt>davon netto ca.</dt><dd>${nf(yN)} €</dd></div></dl></section>` : ''}
    ${foot(s)}`;
  }

  /** Alle Werte eines Monats für PDF/Excel */
  function reportData() {
    const s = S(), m = ui.nmonth, modus = ui.gmode || 'aktuell', mo = Number(m.slice(5, 7));
    const mp = C.monthPay(st, calc, m, modus);
    const n = C.netto(mp.laufend, mp.einmal, s, mo, mp.vlSpar, mp.basis);
    const mehrG = mp.extra;
    const nOhne = mehrG ? C.netto(mp.laufend - mp.extraL, mp.einmal - mp.extraE, s, mo, mp.vlSpar, Math.min(mp.basis, mp.laufend - mp.extraL)) : n;
    const mm = calc.months.get(m);
    const keys = Object.keys(st.entries).filter((d) => d.startsWith(m)).sort();
    const days = keys.map((d) => {
      const e = st.entries[d], ab = calc.absMap.get(d);
      const t = C.dayTarget(d, e, s, calc.absMap);
      return { date: `${WD[C.dow(d)]} ${dShort(d)}`, start: e.start, end: e.end, pause: e.pause, time: `${e.start}–${e.end} · ${e.pause} min Pause`, hours: e.hours, delta: e.hours - t, note: [e.capped ? 'Zeitverstoß > 10 h' : '', e.half ? '½ Urlaubstag' : '', ab && !ab.full && !e.half ? `½ ${C.TYPES[ab.type].label}` : '', C.holidayName(d, opt()) || ''].filter(Boolean).join(' · ') };
    });
    const ent = keys.map((k) => st.entries[k]);
    const mins = ent.map((e) => C.toMin(e.start)), ends = ent.map((e) => { let b = C.toMin(e.end); if (b < C.toMin(e.start)) b += 1440; return b; });
    const avg = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
    const longest = days.reduce((a, b) => (!a || b.hours > a.hours ? b : a), null);
    const weeks = calc.weeks.filter((w) => w.days.some((d) => d.date.startsWith(m) && d.entry)).map((w) => ({ kw: w.kw, range: `${dShort(w.monday)}–${dShort(w.sunday)}`, worked: w.worked, mehr: w.mehr, h50: w.pay.h50, zk: w.zkChange, pay: w.pay.total }));
    const abw = st.absences.filter((a) => a.to >= `${m}-01` && a.from <= `${m}-31`).map((a) => ({ range: a.from === a.to ? `${WD[C.dow(a.from)]} ${dShort(a.from)}` : `${dShort(a.from)}–${dShort(a.to)}`, typ: C.TYPES[a.type].label, tage: C.workdaysBetween(a.from, a.to, opt()).filter((d) => d.startsWith(m)).reduce((acc, d) => acc + ((calc.absMap.get(d) || {}).id === a.id ? calc.absMap.get(d).units : 0), 0) }));
    const r = n.rates, stk = ['I', 'II', 'III', 'IV', 'V', 'VI'][s.steuer.klasse - 1];
    return {
      logo: LOGO, monat: monthName(m), monatKurz: monthName(m), modus: modus === 'aktuell' ? 'Ansicht „Aktuell“' : `Ansicht „Auszahlung“ (Mehrarbeit, Urlaubsgeld & Sonderzahlungen aus ${MON[Number(C.prevMonth(m).slice(5, 7)) - 1]})`,
      erstellt: new Date().toLocaleDateString('de-DE'), zeigen: true,
      brutto: n.gross, netto: n.net, nettoGrund: nOhne.net, nettoMehr: n.net - nOhne.net, mehrBrutto: mehrG,
      bruttoZeilen: mp.lines.map((l) => ({ k: l.k, n: l.v, v: `${nf(l.v)} €`, note: l.mehr ? `${nf(l.mehr.mehr)} h: ${nf(l.mehr.pay.h25)} h à 25 %, ${nf(l.mehr.pay.h50)} h à 50 %` : '' })),
      abzugZeilen: [
        { k: 'Steuern', n: n.taxSum, v: `−${nf(n.taxSum)} €`, cls: 'grp' },
        { k: 'Lohnsteuer', note: `Steuerklasse ${stk}`, n: n.lst, v: `−${nf(n.lst)} €` },
        { k: 'Solidaritätszuschlag', n: n.soli, v: `−${nf(n.soli)} €` },
        { k: 'Kirchensteuer', note: s.steuer.kirche ? `${nf(n.jahr.kistSatz * 100, 0)} %` : 'keine', n: n.kist, v: `−${nf(n.kist)} €` },
        { k: 'Sozialversicherung', n: n.svSum, v: `−${nf(n.svSum)} €`, cls: 'grp' },
        { k: 'Krankenversicherung', note: `${nf(r.kv * 100)} %`, n: n.sv.kv, v: `−${nf(n.sv.kv)} €` },
        { k: 'Pflegeversicherung', note: `${nf(r.pv * 100)} %`, n: n.sv.pv, v: `−${nf(n.sv.pv)} €` },
        { k: 'Rentenversicherung', note: `${nf(r.rv * 100, 1)} %`, n: n.sv.rv, v: `−${nf(n.sv.rv)} €` },
        { k: 'Arbeitslosenversicherung', note: `${nf(r.av * 100, 1)} %`, n: n.sv.av, v: `−${nf(n.sv.av)} €` },
        ...(n.abzug ? [{ k: 'VL-Sparrate', note: 'an Sparvertrag', n: n.abzug, v: `−${nf(n.abzug)} €` }] : []),
      ],
      stats: { gearbeitet: mm ? mm.worked : 0, tage: days.length, mehr: mm ? mm.mehr : 0, h25: mm ? mm.pay.h25 : 0, h50: mm ? mm.pay.h50 : 0, zk: mm ? mm.zkChange : 0, zkStand: calc.zk, kont: (Number(st.kontingent[m]) || 0) + (mm ? mm.nach : 0), used: mm ? mm.used : 0, avgStart: mins.length ? C.fmtClock(avg(mins)) : '–', avgEnd: ends.length ? C.fmtClock(avg(ends)) : '–', avgDur: avg(days.map((x) => x.hours)), longest: longest ? `${longest.date} · ${nf(longest.hours)} h` : '–' },
      weeks, days, abwesend: abw,
      grundlagen: `StKl ${stk}, ${C.LAENDER[s.arbeit.land]}, ${s.steuer.kirche ? 'mit' : 'ohne'} Kirchensteuer, ${s.steuer.kasse && s.steuer.kasse !== '__andere' ? `${s.steuer.kasse} ` : 'KV-Zusatz '}${nf(s.steuer.kvZusatz)} %, Kinder ${Number(s.steuer.kinderPV) || 0}, Grundlohn ${nf(s.lohn.grundlohn)} €, Stundenlohn ${nf(calc.rate)} €, ${D1(s.arbeit.wochenstunden)}-h-Woche`,
    };
  }
  async function saveFile(blob, filename) {
    try { if (window.claude && window.claude.use) { const dl = await window.claude.use('downloads'); if (dl) { await dl.save({ filename, data: blob }); return; } } } catch { /* Fallback */ }
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }

  /** Auswahlliste aller gesetzlichen Krankenkassen mit Zusatzbeitrag 2026 */
  function kasseSelect(attr, cur) {
    return `<select class="field" ${attr}><option value="" ${!cur ? 'selected' : ''}>– Krankenkasse wählen –</option>${C.KASSEN.map(([n, v]) => `<option value="${esc(n)}" ${cur === n ? 'selected' : ''}>${esc(n)} · ${nf(v)} %</option>`).join('')}<option value="__andere" ${cur === '__andere' ? 'selected' : ''}>Andere / Wert selbst eingeben</option></select>`;
  }
  const kasseHint = (name, kv) => (name && name !== '__andere' ? `Zusatzbeitrag ${nf(kv)} % · Gesamtbeitrag ${nf(14.6 + Number(kv))} % (du zahlst die Hälfte)` : !name ? 'Ohne Auswahl wird mit dem Durchschnitt 2,9 % gerechnet.' : '');

  // ---------- Seite: Einstellungen ----------
  const fld = (label, path, val, attrs = '', hint = '') => `<div><label class="label">${label}</label><input class="field" data-set="${path}" value="${esc(val)}" ${attrs}>${hint ? `<div class="hint">${hint}</div>` : ''}</div>`;
  const sw = (label, path, val, sub = '') => `<label class="switch"><span>${label}${sub ? `<br><span class="xs muted">${sub}</span>` : ''}</span><input type="checkbox" data-set="${path}" data-type="bool" ${val ? 'checked' : ''}></label>`;
  const sec = (id, title, body) => `<details class="fold set-sec" ${ui.setOpen === id ? 'open' : ''} data-sec="${id}"><summary><h2>${title}</h2>${I.chev}</summary><div class="body">${body}<div class="secfoot"><button class="secclose" data-act="secClose" data-sec="${id}" aria-label="Bereich schließen" title="Schließen"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 15l6-6 6 6"/></svg></button></div></div></details>`;
  function pageSettings() {
    const s = S();
    const auto = !Number(s.lohn.stundenlohn) && Number(s.lohn.grundlohn) > 0;
    const sonder = s.lohn.sonder.map((x, i) => `<div class="sonderbox">
      <div class="between"><input class="field" style="height:40px" data-sonder="${i}.name" value="${esc(x.name)}" placeholder="Bezeichnung"><button class="btn sm danger" data-act="delSonder" data-i="${i}">✕</button></div>
      <div class="grid2"><select class="field sm" data-sonder="${i}.art" data-struct="1"><option value="einmalig" ${x.art === 'einmalig' ? 'selected' : ''}>Einmalig</option><option value="monatlich" ${x.art === 'monatlich' ? 'selected' : ''}>Monatlich</option></select>
      ${x.art === 'einmalig' ? `<select class="field sm" data-sonder="${i}.monat">${MON.map((mm, j) => `<option value="${j + 1}" ${Number(x.monat) === j + 1 ? 'selected' : ''}>im ${mm}</option>`).join('')}</select>` : '<span></span>'}</div>
      <div class="grid2"><select class="field sm" data-sonder="${i}.modus" data-struct="1"><option value="betrag" ${x.modus === 'betrag' ? 'selected' : ''}>Betrag in € (brutto)</option><option value="faktor" ${x.modus === 'faktor' ? 'selected' : ''}>Faktor × Grundlohn</option></select>
      <input class="field sm" inputmode="decimal" data-sonder="${i}.wert" value="${esc(deNum(x.wert))}" placeholder="${x.modus === 'faktor' ? 'z. B. 0,55' : 'z. B. 2.300'}"></div>
      <div><label class="label">Gezahlt mit</label><select class="field sm" data-sonder="${i}.gruppe" data-struct="1"><option value="mehr" ${C.sonderGruppe(x) === 'mehr' ? 'selected' : ''}>der Mehrarbeit (Netto Mehrarbeit)</option><option value="grund" ${C.sonderGruppe(x) === 'grund' ? 'selected' : ''}>dem Grundlohn (Netto Grundgehalt)</option></select></div>
      <div class="hint">${x.modus === 'faktor' ? `Faktor × Grundgehalt${C.monatsentgelt(s) ? ` = ${EUR(num(x.wert) * C.monatsentgelt(s))} brutto` : ''}` : 'Bruttobetrag in Euro'}</div>
    </div>`).join('');
    const Y = ui.setYear;
    const jc = (s.urlaub.jahre || {})[Y] || {};
    const yv = vac[Y] || {};
    const zkInfo = s.zk.datum ? `Stand am ${dShort(s.zk.datum)}${s.zk.datum.slice(0, 4)}: <b>${sH(Number(s.zk.stand) || 0)}</b> → heute: <b>${sH(calc.zk)}</b>` : 'Stand eintragen – das Datum wird automatisch auf heute gesetzt.';
    return `<h1>Einstellungen</h1>
    ${!storageOk ? '<div class="notice danger" style="margin-bottom:14px">Dein Browser erlaubt hier kein dauerhaftes Speichern. Sichere deine Daten unter „Datentransport“.</div>' : ''}
    ${sec('design', 'Design', `<div class="themes">${THEMES.map(([id, l, bg]) => `<button class="th" aria-pressed="${s.theme === id}" data-act="theme" data-id="${id}"><div class="pv" style="background:${bg}">${FX.preview(id)}</div><div class="nm">${l}</div></button>`).join('')}</div>`)}
    ${sec('arbeit', 'Arbeitszeit & Feiertage', `<div class="grid2"><div><label class="label">Wochenstunden</label><input class="field" data-set="arbeit.wochenstunden" value="${esc(deNum(s.arbeit.wochenstunden))}" inputmode="decimal"><div class="hint" id="tsoll">= ${D1(C.tagessoll(s))} Std./Tag</div></div><div></div>${fld('Brotzeit (min)', 'arbeit.brotzeit', s.arbeit.brotzeit, 'inputmode="numeric"')}${fld('Mittag (min)', 'arbeit.mittag', s.arbeit.mittag, 'inputmode="numeric"')}</div>
      <div class="mt"><label class="label">Bundesland (Feiertage)</label><select class="field" data-set="arbeit.land" data-struct="1">${Object.entries(C.LAENDER).map(([k, l]) => `<option value="${k}" ${s.arbeit.land === k ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
      ${s.arbeit.land === 'BY' ? sw('Mariä Himmelfahrt (15.08.) frei', 'arbeit.mariae', s.arbeit.mariae, 'gilt in überwiegend katholischen Gemeinden') : ''}
      ${sw('Heiligabend = halber Arbeitstag', 'arbeit.halb24', s.arbeit.halb24, 'für den freien Tag ist nur ½ Urlaubstag nötig')}${sw('Silvester = halber Arbeitstag', 'arbeit.halb31', s.arbeit.halb31, 'für den freien Tag ist nur ½ Urlaubstag nötig')}`)}
    ${sec('verdienst', 'Verdienst', `
      <div class="subh">💶 Lohn</div>
      <div class="grid2">${fld('Grundgehalt / Monat (€ brutto)', 'lohn.grundlohn', deNum(s.lohn.grundlohn || ''), 'inputmode="decimal" placeholder="z. B. 4.200"', 'inkl. fester Zulagen')}
        <div><span class="label">Stundenlohn</span><div class="field calc num" id="slAuto">${nf(C.stundenlohn(s))} €</div><div class="hint" id="slHint">${Number(s.lohn.stundenlohn) ? 'eigener Wert' : `= Grundgehalt ÷ (${D1(s.arbeit.wochenstunden)} h × 4,35)`}</div></div></div>
      <details class="mini"><summary>Anderen Stundenlohn verwenden</summary>${fld('Eigener Stundenlohn (€) – leer = automatisch', 'lohn.stundenlohn', deNum(s.lohn.stundenlohn || ''), 'inputmode="decimal" placeholder="automatisch"')}</details>
      ${sw('€-Beträge in der App anzeigen', 'lohn.zeigen', s.lohn.zeigen, 'aus = alle Beträge versteckt, z. B. wenn du Kollegen die App zeigst')}
      <div class="subh">🎁 Sonderzahlungen</div>${sonder}<button class="btn soft sm" data-act="addSonder">+ Sonderzahlung</button>
      <div class="subh">🌴 Urlaubsgeld je Tarifurlaubstag</div>
      <div class="grid3">${fld('Faktor', 'urlaub.ugFaktor', deNum(s.urlaub.ugFaktor), 'inputmode="decimal"')}${fld('Teiler', 'urlaub.ugTeiler', deNum(s.urlaub.ugTeiler), 'inputmode="decimal"')}<div><span class="label">pro Tag</span><div class="field calc num" id="ugTag">${nf((C.monatsentgelt(s) / (Number(s.urlaub.ugTeiler) || 21.75)) * (Number(s.urlaub.ugFaktor) || 0))} €</div></div></div>
      <div class="hint">Grundlohn ÷ Teiler × Faktor</div>`)}
    ${sec('mehrarbeit', 'Mehrarbeit & Zeitkonto', `<div class="grid2">${fld(`Zeitkonto-Stand (h) ${info('zk')}`, 'zk.stand', deNum(s.zk.stand), 'inputmode="decimal"')}<div><label class="label">Stand vom</label><input class="field" type="date" data-set="zk.datum" value="${esc(s.zk.datum)}"></div></div>
      <div class="notice info">${zkInfo}</div>
      <div class="grid2 mt">${fld('Maximum (h)', 'zk.max', deNum(s.zk.max), 'inputmode="decimal"')}${fld('Minimum (h)', 'zk.min', deNum(s.zk.min), 'inputmode="decimal"')}</div>
      ${sw('Samstag-Zuschlag 25 % fürs Zeitkonto', 'zk.samstagBonus', s.zk.samstagBonus, 'Samstagsstunden, die ins Zeitkonto laufen, zählen ×1,25')}
      <div class="grid2">${fld('FZA-Konto (h)', 'urlaub.fzaStand', deNum(s.urlaub.fzaStand), 'inputmode="decimal"')}<div><label class="label">FZA Stand vom</label><input class="field" type="date" data-set="urlaub.fzaDatum" value="${esc(s.urlaub.fzaDatum)}"></div></div>`)}
    ${sec('urlaub', 'Urlaub & Konten', `<div class="between"><span class="label" style="margin:0">Jahr wählen ${info('urlaubsjahr')}</span></div>
      <div class="minirow mt-s">${[curY - 1, curY, curY + 1, curY + 2].map((yy) => `<button class="chip" aria-pressed="${yy === Y}" data-act="setYear" data-y="${yy}">${yy}</button>`).join('')}</div>
      <div class="ybox mt">
        <div class="grid2">${fld(`Tarifurlaub ${Y} (Tage)`, `urlaub.jahre.${Y}.tarif`, deNum(jc.tarif ?? ''), `inputmode="decimal" placeholder="z. B. ${s.urlaub.tarifTage}"`)}${fld(`T-Zug ${Y} (Tage)`, `urlaub.jahre.${Y}.tzug`, deNum(jc.tzug ?? ''), `inputmode="decimal" placeholder="z. B. ${s.urlaub.tzugTage}"`)}</div>
        <div class="label mt">Stand (optional – z. B. heute)</div>
        <div class="grid2">${fld('Tarifurlaub noch frei', `urlaub.jahre.${Y}.rest`, deNum(jc.rest ?? ''), 'inputmode="decimal" placeholder="z. B. 11"')}${fld('T-Zug noch frei', `urlaub.jahre.${Y}.tzugRest`, deNum(jc.tzugRest ?? ''), 'inputmode="decimal" placeholder="z. B. 2"')}
        <div><label class="label">Stand vom</label><input class="field" type="date" data-set="urlaub.jahre.${Y}.restDatum" value="${esc(jc.restDatum || '')}"></div></div>
        <div class="hint">${jc.rest !== undefined && jc.rest !== '' ? `Ab ${jc.restDatum ? dShort(jc.restDatum) : 'heute'} wird jeder geplante Tarifurlaub von ${D1(jc.rest)} Tagen abgezogen → aktuell <b>${D1(yv.rest ?? 0)} T</b> frei. Rest wird bis 31.03.${Y + 1} mitgenommen.` : yv.carryIn ? `${D1(yv.carryIn)} T aus ${Y - 1} kommen dazu (nutzbar bis 31.03.${Y}).` : 'Ohne Stand: Anspruch minus geplanter Urlaub.'}</div>
      </div>
      <div class="label mt">Standard für alle Jahre</div>
      <div class="grid2">${fld('Tarifurlaub (Tage/Jahr)', 'urlaub.tarifTage', deNum(s.urlaub.tarifTage), 'inputmode="decimal"')}${fld('T-Zug (Tage/Jahr)', 'urlaub.tzugTage', deNum(s.urlaub.tzugTage), 'inputmode="decimal"')}</div>
      <div class="subh">📧 Urlaubsplanung per Mail</div>
      <div class="grid2">${fld('Chef (Name)', 'mail.anrede', s.mail.anrede, 'placeholder="z. B. Herr Maier"')}${fld('E-Mail Chef', 'mail.an', s.mail.an, 'type="email" inputmode="email" placeholder="chef@firma.de"')}</div>
      <div class="grid2 mt-s">${fld('Dein Name (Gruß)', 'mail.name', s.mail.name, 'placeholder="z. B. Daniel"')}<div></div></div>`)}
    ${sec('steuer', 'Steuer (für Gehalt)', `<div class="grid2"><div><label class="label">Steuerklasse ${info('stkl')}</label><select class="field" data-set="steuer.klasse" data-type="num">${[1, 2, 3, 4, 5, 6].map((k) => `<option value="${k}" ${Number(s.steuer.klasse) === k ? 'selected' : ''}>${['I', 'II', 'III', 'IV', 'V', 'VI'][k - 1]}</option>`).join('')}</select></div>
      <div style="grid-column:1/-1"><label class="label">Krankenkasse ${info('kv')}</label>${kasseSelect('data-kasse="s"', s.steuer.kasse)}<div class="hint">${kasseHint(s.steuer.kasse, s.steuer.kvZusatz)}</div></div>
      ${s.steuer.kasse === '__andere' ? fld('KV-Zusatzbeitrag (%)', 'steuer.kvZusatz', deNum(s.steuer.kvZusatz), 'inputmode="decimal" placeholder="z. B. 2,9"') : ''}
      ${fld('Kinderfreibeträge', 'steuer.kinderFB', deNum(s.steuer.kinderFB), 'inputmode="decimal"', 'laut Abrechnung, z. B. 0,5 / 1')}${fld('Kinder (Pflegevers.)', 'steuer.kinderPV', s.steuer.kinderPV, 'inputmode="numeric"', Number(s.steuer.kinderFB) > 0 && !Number(s.steuer.kinderPV) ? '⚠️ Kinder hier eintragen – sonst rechnet Toki den Kinderlosen-Zuschlag' : 'Anzahl Kinder – senkt den Pflegebeitrag')}</div>
      <div class="grid2">${fld(`Geburtsjahr ${info('alter')}`, 'steuer.geburtsjahr', s.steuer.geburtsjahr || '', 'inputmode="numeric" placeholder="z. B. 1990"')}<div></div></div>
      ${sw('Kirchensteuer', 'steuer.kirche', s.steuer.kirche)}${sw('Freiwillig gesetzlich versichert', 'steuer.freiwillig', s.steuer.freiwillig, 'Einkommen über der Versicherungspflichtgrenze: Beitrag wird abgeführt, Arbeitgeber zahlt Zuschuss – unterm Strich gleich, Anzeige wie auf deiner Abrechnung')}
      ${!s.steuer.geprueft ? '<button class="btn soft sm" data-act="steuerOk">✓ Angaben stimmen so</button>' : '<p class="xs muted">✓ Steuerdaten geprüft</p>'}`)}
    ${sec('konto', `${Sync.code ? '☁ ' : ''}Handy ↔ Laptop (Sync)${Sync.code ? ` <span class="syncdot ${sync.status}"></span>` : ''}`, '<div id="syncinfo">' + syncInfoHtml() + '</div>')}
    ${sec('daten', 'Datentransport', `<p class="small muted">Deine Daten liegen nur in diesem Browser auf diesem Gerät. Für Handy ↔ PC: hier exportieren und am anderen Gerät importieren.</p>
      <div class="grid2"><button class="btn" data-act="export">Exportieren</button><label class="btn soft" style="position:relative">Importieren<input type="file" accept=".json,application/json" data-act="importFile" style="position:absolute;inset:0;opacity:0"></label></div>
      <button class="btn ghost mt-s" data-act="importPaste">Aus Text einfügen</button>
      <button class="btn danger mt" data-act="reset">Alle Daten löschen</button>`)}
    <p class="xs muted onbg" style="text-align:center">Toki · Feierabend, Mehrarbeit & Urlaub · v1.7</p>`;
  }

  // ---------- Render ----------
  const root = document.getElementById('app');
  function render(keepScroll = true) {
    recompute();
    const y = window.scrollY;
    const s = S();
    document.body.dataset.theme = s.theme;
    const page = { feierabend: pageFeierabend, mehrarbeit: pageMehrarbeit, urlaub: pageUrlaub, netto: pageNetto, einstellungen: pageSettings }[ui.tab] || pageFeierabend;
    const onSet = ui.tab === 'einstellungen';
    root.innerHTML = `<div class="top"><div class="brand"><img src="${LOGO}" alt=""><span>TOKI</span></div><button class="iconbtn gearbtn ${onSet ? 'on' : ''}" data-act="tab" data-tab="${onSet ? ui.lastTab || 'feierabend' : 'einstellungen'}" title="${onSet ? 'Einstellungen schließen' : 'Einstellungen'}" aria-label="Einstellungen">${onSet ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>' : I.gear}</button></div><div class="page page-${ui.tab}">${page()}</div>`;
    document.getElementById('nav').innerHTML = `<div class="in">${NAV.map(([id, l, ic]) => `<button data-act="tab" data-tab="${id}" ${ui.tab === id ? 'aria-current="page"' : ''}>${ic}<span>${l}</span></button>`).join('')}</div>`;
    if (keepScroll) window.scrollTo(0, y);
    applyTheme();
  }
  let lastTheme = null;
  function applyTheme() {
    if (lastTheme === S().theme) return;
    lastTheme = S().theme;
    const meta = document.querySelector('meta[name=theme-color]');
    if (meta) meta.content = getComputedStyle(document.body).getPropertyValue('--bg').trim() || '#b4521f';
    requestAnimationFrame(() => FX.set(lastTheme));
  }

  // ---------- Aktionen ----------
  const setTab = (t) => { if (t === 'einstellungen' && ui.tab !== 'einstellungen') ui.lastTab = ui.tab; ui.tab = t; try { if (location.hash !== `#${t}`) history.replaceState(null, '', `#${t}`); } catch { /* */ } render(false); window.scrollTo({ top: 0 }); };
  function loadDate(d) {
    ui.date = d;
    const e = st.entries[d];
    if (e) { ui.start = e.start; ui.end = e.end; ui.half = !!e.half; }
    else { ui.start = st.pref.start || ui.start; ui.end = ''; ui.half = false; }
  }
  function delEntry(d) { confirmBox('Eintrag löschen?', `Arbeitszeit vom ${dLong(d)} (${esc(st.entries[d].start)}–${esc(st.entries[d].end)}) wird gelöscht.`, 'Löschen', () => { delete st.entries[d]; save(); if (ui.date === d) loadDate(d); render(); toast('Eintrag gelöscht'); }); }
  const A = {
    tab: (t) => setTab(t.dataset.tab),
    syncCreate: () => connectCode(Sync.generate(), true),
    syncJoin: () => {
      const c = Sync.clean((document.getElementById('syncCode') || {}).value);
      if (!Sync.valid(c)) return toast('Bitte den kompletten Code eingeben (TOKI- und 16 Zeichen)', 3500);
      connectCode(c, false);
    },
    syncShow: () => { ui.showCode = !ui.showCode; setSync(sync.status, sync.msg); },
    syncQR: () => { ui.showQR = !ui.showQR; setSync(sync.status, sync.msg); },
    syncCopy: async () => { try { await navigator.clipboard.writeText(Sync.pretty(Sync.code)); toast('✓ Code kopiert', 1800, 'ok'); } catch { ui.showCode = true; setSync(sync.status, sync.msg); toast('Code angezeigt – bitte abschreiben', 2500); } },
    syncMail: () => { location.href = `mailto:?subject=${encodeURIComponent('Toki Sync-Link')}&body=${encodeURIComponent(`Diesen Link auf dem anderen Gerät öffnen, dann sind die Toki-Daten verbunden:\n\n${Sync.link()}\n\nSync-Code: ${Sync.pretty(Sync.code)}`)}`; },
    syncNow: () => syncNow(true),
    kEdit: () => { ui.kEdit = true; render(); const i = document.getElementById('kont'); if (i) { i.focus(); i.select(); } },
    kDone: () => { ui.kEdit = false; render(); },
    vacMail: () => {
      const s = S();
      const list = st.absences.filter((a) => a.to >= today && a.type !== 'krank').sort((a, b) => (a.from < b.from ? -1 : 1));
      const half = Object.entries(st.entries).filter(([d, e]) => e.half && d >= today).map(([d]) => ({ from: d, to: d, type: 'tarif', half: true, fromEntry: true }));
      const all = list.concat(half).sort((a, b) => (a.from < b.from ? -1 : 1));
      if (!all.length) return toast('Ab heute ist kein Urlaub geplant', 2500);
      const fmtD = (d) => `${WD[C.dow(d)]} ${dShort(d)}${d.slice(0, 4)}`;
      const sums = {};
      const lines = all.map((a) => {
        const n = a.fromEntry ? 0.5 : C.workdaysBetween(a.from < today ? today : a.from, a.to, opt()).reduce((acc, d) => acc + ((calc.absMap.get(d) || {}).id === a.id ? calc.absMap.get(d).units : 0), 0);
        sums[a.type] = (sums[a.type] || 0) + n;
        return `• ${a.from === a.to ? fmtD(a.from) : `${fmtD(a.from)} – ${fmtD(a.to)}`} · ${C.TYPES[a.type].label}${a.half || n === 0.5 ? ' (halber Tag)' : ''} · ${D1(n)} ${n === 1 ? 'Tag' : 'Tage'}${a.note ? ` (${a.note})` : ''}`;
      });
      const total = Object.values(sums).reduce((x, y2) => x + y2, 0);
      const an = (s.mail.anrede || '').trim();
      const gruss = !an ? 'Hallo' : /^(hallo|hi|hey|servus|moin|guten|sehr geehrte|liebe|grüß|griaß)/i.test(an) ? an : `Hallo ${an}`;
      const body = `${gruss},\n\nhier meine geplanten Urlaubstage ab ${dShort(today)}${today.slice(0, 4)}:\n\n${lines.join('\n')}\n\nGesamt: ${D1(total)} Tage (${Object.entries(sums).map(([k, v]) => `${C.TYPES[k].label} ${D1(v)}`).join(', ')})\n\nViele Grüße\n${s.mail.name || ''}`.trim();
      const subject = `Urlaubsplanung${s.mail.name ? ` ${s.mail.name}` : ''}`;
      const href = `mailto:${encodeURIComponent(s.mail.an || '')}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      sheet(`<h3>Urlaubsplanung</h3><p class="small muted">An: ${esc(s.mail.an || '– (in den Einstellungen hinterlegen)')} · Betreff: ${esc(subject)}</p><textarea class="field" style="height:220px;font-size:13px;padding:10px;line-height:1.45" readonly id="vm">${esc(body)}</textarea>
        <div class="grid2 mt"><button class="btn soft" id="vmc">Text kopieren</button><a class="btn" href="${href}" id="vmo">Mail öffnen</a></div>`, (el) => {
        el.querySelector('#vmc').addEventListener('click', async () => { try { await navigator.clipboard.writeText(body); toast('✓ Kopiert', 1800, 'ok'); } catch { el.querySelector('#vm').select(); toast('Text markiert – bitte kopieren'); } });
      });
    },
    syncOff: () => confirmBox('Sync ausschalten?', 'Die Daten bleiben auf diesem Gerät und in der Cloud. Mit dem Code kannst du dich jederzeit wieder verbinden – notier ihn dir vorher.', 'Ausschalten', () => { Sync.set(''); st.meta.syncedAt = 0; persist(); setSync('off'); render(); toast('Sync aus'); }, false),
    pickDate: () => { ui.pickM = ui.date.slice(0, 7); openPicker(); },
    pickDay: (t) => { loadDate(t.dataset.d); closeSheet(); render(); },
    pickNav: (t) => { ui.pickM = shiftMonth(ui.pickM, Number(t.dataset.d)); openPicker(); },
    pickToday: () => { loadDate(today); closeSheet(); render(); },
    calTo: (t) => { ui.cal = t.dataset.m; render(); const c = document.querySelector('.kwcal'); if (c) c.scrollIntoView({ behavior: 'smooth', block: 'center' }); },
    close: () => closeSheet(),
    info: (t) => { const [h, b] = INFO[t.dataset.k]; sheet(`<h3>${h}</h3><div class="infotext">${b}</div><button class="btn mt" data-act="close">Alles klar</button>`); },
    toggle: (t) => { ui[t.dataset.k] = !ui[t.dataset.k]; save(); render(); },
    setEnd: (t) => { if (!t.dataset.t) return; ui.end = t.dataset.t; const inp = document.getElementById('work-end'); if (inp) inp.value = ui.end; updateFA(); },
    saveEntry: () => {
      const d = ui.date;
      const { pause, special } = dayPause(d);
      const raw = C.workedRaw(ui.start, ui.end, pause);
      if (raw === null) return;
      const r = C.capDay(raw);
      st.entries[d] = { start: ui.start, end: ui.end, pause, hours: r.hours, raw, capped: r.capped, half: ui.half && !special };
      st.pref.start = ui.start;
      save(); render();
      toast(`✓ Gespeichert · ${WD[C.dow(d)]}. ${dShort(d)} · ${ui.start}–${ui.end} Uhr`, 3000, 'ok');
    },
    dayMenu: (t) => delEntry(t.dataset.date),
    openWeek: (t) => { const k = t.dataset.w; ui.open[k] = !ui.open[k]; render(); },
    view: (t) => { ui.view = t.dataset.v; render(); },
    kmonth: (t) => { ui.kmonth = shiftMonth(ui.kmonth, Number(t.dataset.d)); render(); },
    year: (t) => { ui.year += Number(t.dataset.d); render(); },
    eye: () => { S().lohn.zeigen = !S().lohn.zeigen; save(); render(); },
    addNach: () => {
      const v = num(document.getElementById('nachH').value);
      if (v <= 0) return toast('Bitte Stunden eintragen');
      st.nach.push({ id: uid(), month: C.ym(today), hours: v, date: today }); save(); toast('✓ Nachbeantragte Stunden eingetragen'); render();
    },
    delNach: (t) => confirmBox('Nachbeantragung löschen?', 'Die Stunden fallen wieder aus dem Kontingent.', 'Löschen', () => { st.nach = st.nach.filter((n) => n.id !== t.dataset.id); save(); render(); }),
    vyear: (t) => { ui.vyear += Number(t.dataset.d); render(); },
    cal: (t) => { ui.cal = shiftMonth(ui.cal, Number(t.dataset.d)); render(); },
    selClear: (t, e) => { e.preventDefault(); ui.sel = null; render(); },
    day: (t) => {
      const d = t.dataset.d;
      if (!ui.sel && absAt(d)) return openAbsenceInfo(d);
      if (!ui.sel) { ui.sel = { from: d }; render(); return; }
      let { from } = ui.sel; let to = d;
      if (to < from) [from, to] = [to, from];
      ui.sel = { from, to }; render(); openAbsenceSheet(from, to);
    },
    delAbs: (t) => {
      const a = st.absences.find((x) => x.id === t.dataset.id);
      if (!a) return;
      confirmBox('Urlaub löschen?', `${C.TYPES[a.type].label}: ${a.from === a.to ? dLong(a.from) : `${dLong(a.from)} – ${dLong(a.to)}`}`, 'Löschen', () => { st.absences = st.absences.filter((x) => x.id !== a.id); save(); render(); });
    },
    nmonth: (t) => { ui.nmonth = shiftMonth(ui.nmonth, Number(t.dataset.d)); render(); },
    nmode: (t) => { ui.nmode = t.dataset.v; render(); },
    gmode: (t) => { ui.gmode = t.dataset.v; render(); },
    exportPdf: () => { if (!Report.pdf(reportData())) toast('Bitte Pop-ups für Toki erlauben – dann öffnet sich der Bericht zum Speichern als PDF', 4500); },
    exportXlsx: async () => { const d = reportData(); await saveFile(Report.xlsx(d), `Toki-Gehalt-${ui.nmonth}.xlsx`); toast('✓ Excel-Datei erstellt', 2000, 'ok'); },
    godManualOff: () => { const g = { ...godDefaults(), ...(st.pref.god || {}) }; g.manuell = ''; st.pref.god = g; save(); render(); },
    godReset: () => { st.pref.god = godDefaults(); save(); render(); },
    godCalc: () => { render(); toast('✓ Berechnet'); },
    goSet: (t) => { ui.setOpen = t.dataset.sec; setTab('einstellungen'); },
    theme: (t) => { S().theme = t.dataset.id; ui.setOpen = null; save(); render(); window.scrollTo({ top: 0, behavior: 'smooth' }); },
    secClose: (t) => { ui.setOpen = null; render(); const el = document.querySelector(`details[data-sec="${t.dataset.sec}"]`); if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' }); },
    setYear: (t) => { ui.setYear = Number(t.dataset.y); render(); },
    steuerOk: () => { S().steuer.geprueft = true; save(); render(); },
    saveAll: () => { save(); render(); toast(storageOk ? '✓ Alle Einstellungen gespeichert' : '⚠ Speichern im Browser nicht möglich – bitte exportieren', 2600, storageOk ? 'ok' : ''); },
    addSonder: () => { S().lohn.sonder.push({ id: uid(), name: '', art: 'einmalig', monat: 12, modus: 'betrag', wert: 0 }); save(); render(); },
    delSonder: (t) => { S().lohn.sonder.splice(Number(t.dataset.i), 1); save(); render(); },
    export: async () => {
      const data = JSON.stringify({ app: 'Toki', v: 1, exported: new Date().toISOString(), ...st }, null, 1);
      const filename = `toki-daten-${today}.json`;
      try {
        if (window.claude && window.claude.use) {
          const dl = await window.claude.use('downloads');
          if (dl) { await dl.save({ filename, data: new Blob([data], { type: 'application/json' }) }); return; }
        }
      } catch { /* Fallback */ }
      try { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([data], { type: 'application/json' })); a.download = filename; document.body.appendChild(a); a.click(); a.remove(); } catch { /* */ }
      sheet(`<h3>Export</h3><p class="small muted">Falls kein Download startet: Text kopieren und am anderen Gerät unter „Aus Text einfügen“ einfügen.</p><textarea class="field" style="height:160px;font-size:12px;padding:10px" readonly id="exp">${esc(data)}</textarea><div class="grid2 mt"><button class="btn ghost" data-act="close">Schließen</button><button class="btn" id="cp">Kopieren</button></div>`,
        (el) => el.querySelector('#cp').addEventListener('click', async () => { try { await navigator.clipboard.writeText(data); toast('✓ Kopiert'); } catch { el.querySelector('#exp').select(); toast('Text markiert – bitte kopieren'); } }));
    },
    importPaste: () => sheet(`<h3>Daten einfügen</h3><textarea class="field" style="height:160px;font-size:12px;padding:10px" id="imp" placeholder="Exportierten Text hier einfügen"></textarea><div class="grid2 mt"><button class="btn ghost" data-act="close">Abbrechen</button><button class="btn" id="go">Importieren</button></div>`,
      (el) => el.querySelector('#go').addEventListener('click', () => doImport(el.querySelector('#imp').value))),
    reset: () => confirmBox('Alles löschen?', 'Alle Arbeitszeiten, Urlaube und Einstellungen werden auf diesem Gerät gelöscht. Das lässt sich nicht rückgängig machen.', 'Endgültig löschen', () => { st = norm({}); save(); loadDate(today); render(); toast('Alles gelöscht'); }),
  };
  let pvT;
  function showPreview() {
    closePreview();
    const name = (THEMES.find((x) => x[0] === S().theme) || [])[1] || '';
    const pv = document.createElement('div'); pv.id = 'pv'; pv.className = 'pvwrap';
    pv.innerHTML = `<div class="pvbar"><span>👁 Vorschau · <b>${esc(name)}</b></span><span class="xs">tippen zum Schließen</span></div><div class="pvframe"><div class="pvapp"><div class="top"><div class="brand"><img src="${LOGO}" alt=""><span>TOKI</span></div></div>${pageFeierabend()}</div></div>`;
    const fr = pv.querySelector('.pvframe');
    const fx = document.getElementById('fx');
    if (fx) { const c = fx.cloneNode(true); c.removeAttribute('id'); c.className = 'pvfx'; fr.prepend(c); }
    const ff = document.getElementById('fxf');
    if (ff) { const c2 = ff.cloneNode(true); c2.removeAttribute('id'); c2.removeAttribute('style'); c2.className = 'pvfx pvfront'; c2.querySelectorAll('canvas').forEach((x) => x.remove()); fr.append(c2); }
    pv.addEventListener('click', closePreview);
    document.body.appendChild(pv);
    requestAnimationFrame(() => pv.classList.add('on'));
    pvT = setTimeout(closePreview, 3500);
  }
  function closePreview() { clearTimeout(pvT); const pv = document.getElementById('pv'); if (pv) pv.remove(); }
  function openPicker() {
    const m = ui.pickM;
    sheet(`<div class="cal-head"><button class="iconbtn" data-act="pickNav" data-d="-1">${I.left}</button><h3 style="margin:0">${monthName(m)}</h3><button class="iconbtn" data-act="pickNav" data-d="1">${I.right}</button></div>
      ${monthGrid(m, (d) => dayCell(d, m, 'pickDay'))}
      <div class="legend" style="justify-content:center"><span><i style="background:var(--primary);border-radius:50%"></i>Zeit gespeichert</span><span><i class="tdot tarif"></i>Urlaub</span></div>
      <div class="grid2 mt"><button class="btn ghost" data-act="close">Schließen</button><button class="btn soft" data-act="pickToday">Heute</button></div>`);
  }
  function doImport(text) {
    try {
      const d = JSON.parse(text);
      if (!d || typeof d !== 'object' || !d.settings) throw new Error('x');
      confirmBox('Daten ersetzen?', 'Die Daten auf diesem Gerät werden durch den Import ersetzt.', 'Importieren', () => { st = norm(d); save(); loadDate(ui.date); render(); toast('✓ Import erfolgreich'); }, false);
    } catch { closeSheet(); toast('Das ist keine gültige Toki-Datei'); }
  }

  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-act]');
    if (!t || t.tagName === 'INPUT') return;
    const f = A[t.dataset.act];
    if (f) { e.preventDefault(); f(t, e); }
  });
  document.addEventListener('toggle', (e) => {
    const t = e.target;
    if (t.dataset && t.dataset.fold) ui[t.dataset.fold] = t.open;
    if (t.dataset && t.dataset.vt) { ui.vopen = ui.vopen || {}; ui.vopen[t.dataset.vt] = t.open; }
    if (t.dataset && t.dataset.sec) { if (t.open) ui.setOpen = t.dataset.sec; else if (ui.setOpen === t.dataset.sec) ui.setOpen = null; }
  }, true);
  function setPath(obj, path, val) {
    const ks = path.split('.'); let o = obj;
    for (let i = 0; i < ks.length - 1; i++) { if (o[ks[i]] === undefined || o[ks[i]] === null || typeof o[ks[i]] !== 'object') o[ks[i]] = {}; o = o[ks[i]]; }
    if (val === undefined) delete o[ks[ks.length - 1]]; else o[ks[ks.length - 1]] = val;
  }
  function getPath(obj, path) { return path.split('.').reduce((o, k) => (o ? o[k] : undefined), obj); }
  document.addEventListener('input', (e) => {
    const t = e.target;
    if (t.dataset.bind === 'start' || t.dataset.bind === 'end') {
      ui[t.dataset.bind] = t.value;
      if (t.dataset.bind === 'start') { st.pref.start = t.value; save(); }
      // nur abhängige Teile neu zeichnen – Eingabefelder bleiben stehen (Zeit-Auswahl am Handy schließt sich nicht)
      updateFA();
    }
  });
  /** Wert eines Eingabefelds übernehmen und speichern (ohne Neuzeichnen) */
  function applyField(t) {
    if (t.dataset.kont) { const v = t.value.trim(); if (v === '') delete st.kontingent[t.dataset.kont]; else st.kontingent[t.dataset.kont] = num(v); save(); return true; }
    if (t.dataset.god !== undefined && t.dataset.god !== '') {
      const g = { ...godDefaults(), ...(st.pref.god || {}) };
      g[t.dataset.god] = t.type === 'checkbox' ? t.checked : t.dataset.str ? t.value : t.tagName === 'SELECT' ? Number(t.value) : t.dataset.god === 'manuell' && t.value.trim() === '' ? '' : num(t.value);
      // Gesamt-Mehrarbeit gesenkt (z. B. auf 0) → 25 %-Stunden gleich mitziehen, 50 % ergibt sich daraus
      if (t.dataset.god === 'mea' && Number(g.h25) > Math.max(0, Number(g.mea) || 0)) g.h25 = Math.max(0, Number(g.mea) || 0);
      st.pref.god = g; save(); return true;
    }
    if (t.dataset.sonder) {
      const [i, k] = t.dataset.sonder.split('.'); const o = S().lohn.sonder[Number(i)];
      o[k] = k === 'wert' || k === 'monat' ? num(t.value) : t.value; save(); return true;
    }
    if (t.dataset.set) {
      const path = t.dataset.set;
      const cur = getPath(C.defaults(), path);
      let v;
      if (t.dataset.type === 'bool' || t.type === 'checkbox') v = t.checked;
      else if (t.type === 'date') v = t.value;
      else if (path.startsWith('urlaub.jahre.')) v = t.value.trim() === '' ? undefined : num(t.value);
      else if (typeof cur === 'number' || t.dataset.type === 'num') v = t.value.trim() === '' ? 0 : num(t.value);
      else v = t.value;
      setPath(S(), path, v);
      if (path.startsWith('steuer.')) S().steuer.geprueft = true;
      if (path === 'zk.stand' || path === 'zk.datum') { if (!S().zk.datum) S().zk.datum = today; S().zk.setAt = Date.now(); }
      if (path === 'urlaub.fzaStand' || path === 'urlaub.fzaDatum') { if (!S().urlaub.fzaDatum) S().urlaub.fzaDatum = today; S().urlaub.fzaSetAt = Date.now(); }
      if (/^urlaub\.jahre\.\d+\.(rest|tzugRest)$/.test(path) && v !== undefined) { const yy = path.split('.')[2]; if (!S().urlaub.jahre[yy].restDatum) S().urlaub.jahre[yy].restDatum = today; }
      save(); return true;
    }
    return false;
  }
  /** Kleine Live-Anzeigen in den Einstellungen nachziehen */
  function liveHints() {
    const s = S();
    const sl = document.getElementById('slAuto'); if (sl) sl.textContent = `${nf(C.stundenlohn(s))} €`;
    const slh = document.getElementById('slHint'); if (slh) slh.textContent = Number(s.lohn.stundenlohn) ? 'eigener Wert' : `= Grundgehalt ÷ (${D1(s.arbeit.wochenstunden)} h × 4,35)`;
    const ug = document.getElementById('ugTag'); if (ug) ug.textContent = `${nf((C.monatsentgelt(s) / (Number(s.urlaub.ugTeiler) || 21.75)) * (Number(s.urlaub.ugFaktor) || 0))} €`;
    const ts = document.getElementById('tsoll'); if (ts) ts.textContent = `= ${D1(C.tagessoll(s))} Std./Tag`;
  }
  const isText = (t) => t.tagName === 'INPUT' && !['checkbox', 'date', 'file', 'time'].includes(t.type);
  document.addEventListener('input', (e) => { const t = e.target; if (isText(t) && applyField(t)) liveHints(); });
  document.addEventListener('change', (e) => {
    const t = e.target;
    if (t.dataset.bind === 'date') { if (t.value) { loadDate(t.value); render(); } return; }
    if (t.dataset.act === 'half') { ui.half = t.checked; render(); return; }
    if (t.dataset.kasse) {
      const name = t.value, k = C.KASSEN.find(([n]) => n === name);
      if (t.dataset.kasse === 's') { S().steuer.kasse = name; if (k) S().steuer.kvZusatz = k[1]; else if (!name) S().steuer.kvZusatz = 2.9; S().steuer.geprueft = true; }
      else { const g = { ...godDefaults(), ...(st.pref.god || {}) }; g.kasse = name; if (k) g.kvZusatz = k[1]; else if (!name) g.kvZusatz = 2.9; st.pref.god = g; }
      save(); render(); return;
    }
    if (t.dataset.act === 'importFile') { const f = t.files && t.files[0]; if (f) f.text().then(doImport); t.value = ''; return; }
    if (!applyField(t)) return;
    if (t.dataset.kont) ui.kEdit = false;
    liveHints();
    if (t.dataset.god === 'manuell' && t.value.trim() !== '') toast('✋ Manueller Wert – Grundlohn & Mehrarbeit werden ignoriert', 2800);
    // Neu zeichnen nur, wo sich sichtbar etwas ändert; das als Nächstes angetippte Feld behält den Fokus
    const path = t.dataset.set || '';
    const needs = t.dataset.kont || t.dataset.god !== undefined || t.dataset.struct || t.type === 'checkbox' || t.tagName === 'SELECT' || t.type === 'date' || path.startsWith('urlaub.jahre.') || path === 'zk.stand' || path === 'urlaub.fzaStand';
    if (!needs) return;
    const ae = document.activeElement;
    const key = ae && ae !== t && ae.dataset ? Object.entries(ae.dataset).find(([k]) => ['set', 'god', 'kont', 'sonder'].includes(k)) : null;
    render();
    if (key) { const n = document.querySelector(`[data-${key[0]}="${key[1]}"]`); if (n) n.focus({ preventScroll: true }); }
  });
  window.addEventListener('hashchange', () => {
    const lg = Sync.fromHash();
    if (lg) { if (typeof lg === 'string') connectCode(lg, false); else toast(`⚠ ${lg.error}`, 4000); return; }
    const h = location.hash.slice(1); if (TABS.some((x) => x[0] === h) && h !== ui.tab) { ui.tab = h; render(false); } });

  // Start
  const login = Sync.fromHash();
  if (login) ui.setOpen = 'konto';
  const h0 = location.hash.slice(1);
  if (TABS.some((x) => x[0] === h0)) ui.tab = h0;
  loadDate(today);
  render(false);
  if (login && typeof login === 'string') { if (login !== Sync.code) connectCode(login, false); else syncNow(false); }
  else { if (login && login.error) toast(`⚠ ${login.error}`, 4000); if (Sync.code) syncNow(false); }
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') syncNow(false); });
})();
