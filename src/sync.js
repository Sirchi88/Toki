/* Toki – Cloud-Sync mit Supabase (Login per E-Mail-Link, eine Zeile pro Person). Keine Bibliothek nötig. */
const Sync = (() => {
  'use strict';
  const BASE = 'https://niqkdhjzcpmyjuopgrnu.supabase.co';
  // Publishable Key: darf öffentlich im Code stehen, Zugriff regeln die RLS-Policies der Tabelle.
  const KEY = 'sb_publishable_6yXuxHgXlb12TCTrcKYkUg_Z7l6HXxA';
  const SKEY = 'toki-session';
  const TABLE = 'toki_daten';

  const read = () => { try { return JSON.parse(localStorage.getItem(SKEY)); } catch { return null; } };
  let session = read();
  const store = (s) => { session = s; try { if (s) localStorage.setItem(SKEY, JSON.stringify(s)); else localStorage.removeItem(SKEY); } catch { /* */ } };
  const jwt = (t) => { try { return JSON.parse(decodeURIComponent(escape(atob(t.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))))); } catch { return {}; } };
  const headers = (extra = {}) => ({ apikey: KEY, 'Content-Type': 'application/json', ...extra });
  const errText = async (r) => { const j = await r.json().catch(() => ({})); return j.msg || j.error_description || j.message || j.error || `Fehler ${r.status}`; };

  /** Läuft die Seite an einem Ort, von dem aus Supabase erreichbar ist? (nicht in der Claude-Vorschau / als Datei) */
  const available = () => /^https?:$/.test(location.protocol) && !/(^|\.)claude\.ai$|claudeusercontent|anthropic/.test(location.hostname);

  /** Nach dem Klick auf den Login-Link stehen die Tokens im #-Teil der Adresse. */
  function fromHash() {
    const h = location.hash || '';
    if (!/access_token=|error=|error_description=/.test(h)) return null;
    const p = new URLSearchParams(h.slice(1));
    try { history.replaceState(null, '', location.pathname + location.search); } catch { /* */ }
    if (p.get('error') || p.get('error_description')) return { error: (p.get('error_description') || p.get('error')).replace(/\+/g, ' ') };
    const at = p.get('access_token');
    const pl = jwt(at);
    store({ access_token: at, refresh_token: p.get('refresh_token'), expires_at: Number(p.get('expires_at')) || Math.floor(Date.now() / 1000) + Number(p.get('expires_in') || 3600), user: { id: pl.sub, email: pl.email } });
    return { ok: true };
  }

  async function token() {
    if (!session) throw new Error('Nicht angemeldet');
    if (session.expires_at - 60 > Date.now() / 1000) return session.access_token;
    const r = await fetch(`${BASE}/auth/v1/token?grant_type=refresh_token`, { method: 'POST', headers: headers(), body: JSON.stringify({ refresh_token: session.refresh_token }) });
    if (!r.ok) { if (r.status === 400 || r.status === 401) store(null); throw new Error('Anmeldung abgelaufen – bitte neu anmelden'); }
    const j = await r.json();
    store({ access_token: j.access_token, refresh_token: j.refresh_token, expires_at: j.expires_at || Math.floor(Date.now() / 1000) + (j.expires_in || 3600), user: { id: (j.user && j.user.id) || session.user.id, email: (j.user && j.user.email) || session.user.email } });
    return session.access_token;
  }

  async function sendLink(email, redirectTo) {
    const r = await fetch(`${BASE}/auth/v1/otp?redirect_to=${encodeURIComponent(redirectTo)}`, { method: 'POST', headers: headers(), body: JSON.stringify({ email, create_user: true }) });
    if (!r.ok) throw new Error(await errText(r));
  }

  /** Eigenen Datensatz holen: { daten, aktualisiert } oder null */
  async function pull() {
    const t = await token();
    const r = await fetch(`${BASE}/rest/v1/${TABLE}?select=daten,aktualisiert`, { headers: headers({ Authorization: `Bearer ${t}` }) });
    if (!r.ok) throw new Error(await errText(r));
    const rows = await r.json();
    return rows[0] || null;
  }

  async function push(daten, updatedMs) {
    const t = await token();
    const r = await fetch(`${BASE}/rest/v1/${TABLE}?on_conflict=user_id`, {
      method: 'POST',
      headers: headers({ Authorization: `Bearer ${t}`, Prefer: 'resolution=merge-duplicates,return=minimal' }),
      body: JSON.stringify({ user_id: session.user.id, daten, aktualisiert: new Date(updatedMs || Date.now()).toISOString() }),
    });
    if (!r.ok) throw new Error(await errText(r));
  }

  async function logout() {
    try { if (session) await fetch(`${BASE}/auth/v1/logout`, { method: 'POST', headers: headers({ Authorization: `Bearer ${session.access_token}` }) }); } catch { /* egal */ }
    store(null);
  }

  return { get session() { return session; }, available, fromHash, sendLink, pull, push, logout };
})();
