/* Toki – minimaler PDF-Textleser (ohne Fremd-Bibliotheken).
   Liest Text-PDFs mit Standardschriften (z. B. Zeitnachweise) und liefert Textstücke mit Position.
   Läuft komplett lokal im Browser: das PDF verlässt das Gerät nicht. */
(function (root) {
  'use strict';

  const latin1 = (u8) => { let s = ''; for (let i = 0; i < u8.length; i += 8192) s += String.fromCharCode.apply(null, u8.subarray(i, i + 8192)); return s; };
  // WinAnsi-Sonderzeichen 0x80–0x9F
  const WIN = { 128: '€', 130: '‚', 132: '„', 133: '…', 145: '‘', 146: '’', 147: '“', 148: '”', 150: '–', 151: '—', 153: '™' };
  const decodeChars = (s) => s.replace(/[\x80-\x9f]/g, (c) => WIN[c.charCodeAt(0)] || '');

  /** Entpackt einen Flate-Stream; Datenmüll am Ende wird ignoriert */
  async function inflate(u8) {
    if (typeof DecompressionStream === 'undefined') throw new Error('Dein Browser kann keine PDFs entpacken.');
    const ds = new DecompressionStream('deflate');
    const w = ds.writable.getWriter();
    w.write(u8).catch(() => {}); w.close().catch(() => {});
    const r = ds.readable.getReader(); const parts = []; let n = 0;
    try { for (;;) { const { done, value } = await r.read(); if (done) break; parts.push(value); n += value.length; } } catch (e) { if (!n) throw e; }
    const out = new Uint8Array(n); let o = 0; for (const p of parts) { out.set(p, o); o += p.length; }
    return out;
  }

  /** Alle Inhalts-Streams mit Textbefehlen */
  async function contentStreams(bytes) {
    const txt = latin1(bytes); const res = [];
    const re = /stream\r?\n/g; let m;
    while ((m = re.exec(txt))) {
      if (txt.slice(m.index - 3, m.index) === 'end') continue;
      const dictStart = txt.lastIndexOf('<<', m.index);
      const dict = dictStart >= 0 ? txt.slice(dictStart, m.index) : '';
      const start = m.index + m[0].length;
      let end = txt.indexOf('endstream', start); if (end < 0) break;
      const lm = /\/Length\s+(\d+)(?!\s+\d+\s+R)/.exec(dict);
      if (lm && start + Number(lm[1]) <= end) end = start + Number(lm[1]);
      re.lastIndex = Math.max(end, txt.indexOf('endstream', start) + 9);
      if (/\/Type\s*\/(ObjStm|XRef|Metadata)/.test(dict) || /\/Subtype\s*\/(Image|XML)/.test(dict)) continue;
      let data = bytes.subarray(start, end);
      if (/FlateDecode/.test(dict)) { try { data = await inflate(data); } catch (e) { continue; } } else if (/\/Filter/.test(dict)) continue;
      const s = latin1(data);
      if (/\bBT\b/.test(s) && /(Tj|TJ|')/.test(s)) res.push(s);
    }
    return res;
  }

  const mul = (a, b) => [a[0] * b[0] + a[1] * b[2], a[0] * b[1] + a[1] * b[3], a[2] * b[0] + a[3] * b[2], a[2] * b[1] + a[3] * b[3], a[4] * b[0] + a[5] * b[2] + b[4], a[4] * b[1] + a[5] * b[3] + b[5]];

  /** Content-Stream ausführen (nur Text- und Matrix-Befehle) → Textstücke {x, y, s, size} */
  function runContent(src) {
    const items = []; const stack = []; let ctm = [1, 0, 0, 1, 0, 0];
    let tm = [1, 0, 0, 1, 0, 0], tlm = tm, lead = 0, size = 1;
    const ops = []; let i = 0; const n = src.length;
    const isWs = (c) => c === ' ' || c === '\n' || c === '\r' || c === '\t' || c === '\f' || c === '\0';
    const readStr = () => { // nach '('
      let depth = 1, out = ''; i++;
      while (i < n && depth) {
        const c = src[i];
        if (c === '\\') {
          const d = src[i + 1]; i += 2;
          if (/[0-7]/.test(d)) { let o = d; while (o.length < 3 && /[0-7]/.test(src[i])) o += src[i++]; out += String.fromCharCode(parseInt(o, 8) & 255); }
          else if (d === 'n') out += '\n'; else if (d === 'r') out += '\r'; else if (d === 't') out += '\t'; else if (d === 'b' || d === 'f') { /* ignorieren */ }
          else if (d === '\r') { if (src[i] === '\n') i++; } else if (d === '\n') { /* Zeilenfortsetzung */ } else out += d;
          continue;
        }
        if (c === '(') depth++; else if (c === ')') { depth--; if (!depth) { i++; break; } }
        out += c; i++;
      }
      return { str: out };
    };
    const readHex = () => { const e = src.indexOf('>', i); const h = src.slice(i + 1, e).replace(/\s/g, ''); i = e + 1; let out = ''; for (let k = 0; k < h.length; k += 2) out += String.fromCharCode(parseInt((h[k] + (h[k + 1] || '0')), 16)); return { str: out }; };
    let operands = [];
    const show = (s) => {
      const m = mul(tm, ctm);
      const sz = Math.hypot(m[2], m[3]) * size || size;
      const t = decodeChars(s);
      if (t.trim()) items.push({ x: m[4], y: m[5], s: t, size: sz });
      // grobe Breite (Helvetica ~0,5 em je Zeichen) – reicht, damit Folgeteile weiter rechts liegen
      tm = mul([1, 0, 0, 1, t.length * 0.5 * size, 0], tm);
    };
    const nextLine = (tx, ty) => { tlm = mul([1, 0, 0, 1, tx, ty], tlm); tm = tlm; };
    while (i < n) {
      const c = src[i];
      if (isWs(c)) { i++; continue; }
      if (c === '%') { while (i < n && src[i] !== '\n' && src[i] !== '\r') i++; continue; }
      if (c === '(') { operands.push(readStr()); continue; }
      if (c === '<') {
        if (src[i + 1] === '<') { // Dictionary überspringen
          let d = 0; while (i < n) { if (src[i] === '<' && src[i + 1] === '<') { d++; i += 2; } else if (src[i] === '>' && src[i + 1] === '>') { d--; i += 2; if (!d) break; } else if (src[i] === '(') readStr(); else i++; }
          operands.push({ dict: true }); continue;
        }
        operands.push(readHex()); continue;
      }
      if (c === '[') { operands.push('['); i++; continue; }
      if (c === ']') { const k = operands.lastIndexOf('['); const arr = operands.slice(k + 1); operands = operands.slice(0, k); operands.push({ arr }); i++; continue; }
      if (c === '/') { let j = i + 1; while (j < n && !isWs(src[j]) && !'/[]()<>{}%'.includes(src[j])) j++; operands.push({ name: src.slice(i + 1, j) }); i = j; continue; }
      let j = i; while (j < n && !isWs(src[j]) && !'/[]()<>{}%'.includes(src[j])) j++;
      if (j === i) { i++; continue; }
      const tok = src.slice(i, j); i = j;
      if (/^[+-]?(\d+\.?\d*|\.\d+)$/.test(tok)) { operands.push(Number(tok)); continue; }
      if (tok === 'BI') { const e = src.indexOf('EI', i); i = e < 0 ? n : e + 2; operands = []; continue; }
      const a = operands; operands = [];
      switch (tok) {
        case 'q': stack.push(ctm); break;
        case 'Q': ctm = stack.pop() || [1, 0, 0, 1, 0, 0]; break;
        case 'cm': ctm = mul(a.slice(-6), ctm); break;
        case 'BT': tm = tlm = [1, 0, 0, 1, 0, 0]; break;
        case 'Tf': size = Number(a[a.length - 1]) || size; break;
        case 'TL': lead = Number(a[0]) || 0; break;
        case 'Tm': tm = tlm = a.slice(-6).map(Number); break;
        case 'Td': nextLine(a[0], a[1]); break;
        case 'TD': lead = -a[1]; nextLine(a[0], a[1]); break;
        case 'T*': nextLine(0, -lead); break;
        case 'Tj': if (a[0] && a[0].str !== undefined) show(a[0].str); break;
        case "'": nextLine(0, -lead); if (a[0] && a[0].str !== undefined) show(a[0].str); break;
        case '"': nextLine(0, -lead); if (a[2] && a[2].str !== undefined) show(a[2].str); break;
        case 'TJ': { const arr = (a[0] && a[0].arr) || []; let s = ''; for (const p of arr) { if (p && p.str !== undefined) s += p.str; else if (typeof p === 'number' && p < -200) s += ' '; } show(s); break; }
        default: break;
      }
    }
    return items;
  }

  /** Text-PDF → Zeilen (oben nach unten), jede Zeile = Textstücke links nach rechts */
  async function lines(buf) {
    const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
    if (latin1(bytes.subarray(0, 5)) !== '%PDF-') throw new Error('Das ist keine PDF-Datei.');
    const items = [];
    for (const s of await contentStreams(bytes)) items.push(...runContent(s));
    if (!items.length) throw new Error('In dieser PDF steht kein lesbarer Text (eingescannt?).');
    items.sort((a, b) => b.y - a.y || a.x - b.x);
    const rows = [];
    for (const it of items) {
      const r = rows.find((x) => Math.abs(x.y - it.y) < 1.6);
      if (r) r.items.push(it); else rows.push({ y: it.y, items: [it] });
    }
    rows.sort((a, b) => b.y - a.y);
    for (const r of rows) r.items.sort((a, b) => a.x - b.x);
    return rows;
  }

  const api = { lines, runContent };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.PdfText = api;
})(typeof window !== 'undefined' ? window : globalThis);
