/* Toki – Cloud-Sync per persönlichem Sync-Code (ohne Login). Supabase-RPC, keine Bibliothek nötig.
   Der Code ist das Geheimnis: Wer ihn kennt, sieht die Daten. In der Datenbank liegt nur sein SHA-256-Hash. */
const Sync = (() => {
  'use strict';
  const BASE = 'https://niqkdhjzcpmyjuopgrnu.supabase.co';
  // Publishable Key: darf öffentlich im Code stehen. Zugriff nur über die Funktionen toki_laden / toki_speichern.
  const KEY = 'sb_publishable_6yXuxHgXlb12TCTrcKYkUg_Z7l6HXxA';
  const CKEY = 'toki-sync-code';
  const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // ohne 0/O, 1/I

  const read = () => { try { return localStorage.getItem(CKEY) || ''; } catch { return ''; } };
  let code = read();
  const store = (c) => { code = c || ''; try { if (c) localStorage.setItem(CKEY, c); else localStorage.removeItem(CKEY); } catch { /* */ } };

  /** Eingabe säubern: Groß, ohne Leerzeichen/Striche/Präfix */
  const clean = (s) => String(s || '').toUpperCase().replace(/^TOKI/, '').replace(/[^A-Z0-9]/g, '');
  const valid = (c) => c.length === 16 && [...c].every((ch) => ALPHA.includes(ch));
  const pretty = (c) => (c ? `TOKI-${c.match(/.{1,4}/g).join('-')}` : '');
  function generate() {
    const r = new Uint8Array(16);
    crypto.getRandomValues(r);
    return [...r].map((b) => ALPHA[b % ALPHA.length]).join('');
  }

  const available = () => /^https?:$/.test(location.protocol) && !/(^|\.)claude\.ai$|claudeusercontent|anthropic/.test(location.hostname);

  async function rpc(fn, body) {
    let r;
    try {
      r = await fetch(`${BASE}/rest/v1/rpc/${fn}`, { method: 'POST', headers: { apikey: KEY, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    } catch { throw new Error('Keine Verbindung zum Server'); }
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      const msg = j.message || j.msg || j.error || `Fehler ${r.status}`;
      if (/Could not find the function|does not exist|PGRST202/i.test(msg + (j.code || ''))) throw new Error('Die Datenbank ist noch nicht eingerichtet (SQL aus supabase/schema.sql ausführen).');
      throw new Error(msg);
    }
    const t = await r.text();
    return t ? JSON.parse(t) : null;
  }

  /** Daten zu einem Code holen: { daten, aktualisiert } oder null */
  async function pull(c = code) {
    const rows = await rpc('toki_laden', { p_code: c });
    return (rows && rows[0]) || null;
  }
  async function push(daten, updatedMs, c = code) {
    await rpc('toki_speichern', { p_code: c, p_daten: daten, p_aktualisiert: new Date(updatedMs || Date.now()).toISOString() });
  }

  /** Link wie …/Toki/#sync=CODE verbindet ein neues Gerät mit einem Tipp */
  function fromHash() {
    const m = /[#&]sync=([A-Za-z0-9-]+)/.exec(location.hash || '');
    if (!m) return null;
    try { history.replaceState(null, '', location.pathname + location.search); } catch { /* */ }
    const c = clean(m[1]);
    return valid(c) ? c : { error: 'Ungültiger Sync-Link' };
  }

  return {
    get code() { return code; }, set: store, clean, valid, pretty, generate, available, pull, push, fromHash,
    link: (c = code) => `${location.origin}${location.pathname}#sync=${c}`,
  };
})();
