/* Toki – Export des Gehalts-Monats als PDF-Bericht (Druckansicht) und als Excel-Datei (.xlsx, ohne Bibliothek) */
const Report = (() => {
  'use strict';
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const nf = (n, d = 2) => (Number(n) || 0).toLocaleString('de-DE', { minimumFractionDigits: d, maximumFractionDigits: d });
  const eur = (n) => `${nf(n)} €`;

  // ---------- PDF (über die Druckfunktion des Browsers → „Als PDF sichern“) ----------
  function html(d) {
    const rows = (list) => list.map((l) => `<tr class="${l.cls || ''}"><td>${esc(l.k)}${l.note ? `<small>${esc(l.note)}</small>` : ''}</td><td class="r">${esc(l.v)}</td></tr>`).join('');
    const bar = (v, max) => `<span class="bar"><i style="width:${max ? Math.min(100, (v / max) * 100) : 0}%"></i></span>`;
    const maxH = Math.max(10, ...d.days.map((x) => x.hours));
    return `<!DOCTYPE html><html lang="de"><head><meta charset="utf-8"><title>Toki – Gehalt ${esc(d.monat)}</title>
<style>
  @page{size:A4;margin:14mm 14mm 16mm}
  *{box-sizing:border-box}body{margin:0;font:10.5pt/1.45 -apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1d2025}
  .wrap{max-width:780px;margin:0 auto;padding:24px}
  header{display:flex;align-items:center;justify-content:space-between;border-bottom:3px solid #2a9c6b;padding-bottom:12px;margin-bottom:18px}
  .brand{display:flex;align-items:center;gap:10px}.brand img{width:40px;height:40px;border-radius:9px}.brand b{font-size:20pt;letter-spacing:.18em;color:#2a9c6b}
  header .meta{text-align:right;color:#5d6670;font-size:9.5pt}header .meta strong{display:block;font-size:15pt;color:#1d2025}
  .hero{display:grid;grid-template-columns:1.3fr 1fr 1fr;gap:10px;margin-bottom:16px}
  .box{border:1px solid #dfe3e6;border-radius:10px;padding:10px 12px}
  .box span{display:block;font-size:8pt;text-transform:uppercase;letter-spacing:.06em;color:#6b747c;font-weight:700}
  .box b{font-size:17pt;font-weight:700}.box.main{background:#2a9c6b;color:#fff;border-color:#2a9c6b}.box.main span{color:#d6f2e4}
  .box small{display:block;color:#6b747c;font-size:8.5pt}.box.main small{color:#d6f2e4}
  h2{font-size:10pt;text-transform:uppercase;letter-spacing:.08em;color:#2a9c6b;margin:18px 0 6px;border-bottom:1px solid #e3e7ea;padding-bottom:4px}
  .cols{display:grid;grid-template-columns:1fr 1fr;gap:18px}
  table{width:100%;border-collapse:collapse}td,th{padding:4px 6px;vertical-align:top}th{font-size:8pt;text-transform:uppercase;letter-spacing:.05em;color:#6b747c;text-align:left;border-bottom:1px solid #dfe3e6}
  tr+tr td{border-top:1px solid #f0f2f4}.r{text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums}
  td small{display:block;color:#7b848c;font-size:8pt}
  tr.sum td{font-weight:700;border-top:2px solid #1d2025}tr.grp td{font-weight:700;background:#f5f7f8}
  .stats{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}
  .stats .box b{font-size:13pt}
  .bar{display:inline-block;width:90px;height:8px;border-radius:4px;background:#e8ecee;vertical-align:middle;margin-left:6px;overflow:hidden}.bar i{display:block;height:100%;background:#2a9c6b}
  .pos{color:#2a9c6b}.neg{color:#c0392b}
  footer{margin-top:20px;color:#8a929a;font-size:8pt;border-top:1px solid #e3e7ea;padding-top:8px}
  .noprint{position:sticky;top:0;background:#fff;padding:10px 0;text-align:center}
  .noprint button{font:inherit;padding:8px 16px;border-radius:8px;border:0;background:#2a9c6b;color:#fff;font-weight:700;cursor:pointer}
  @media print{.noprint{display:none}.wrap{padding:0}.avoid{break-inside:avoid}}
</style></head><body><div class="wrap">
<div class="noprint"><button onclick="window.print()">Als PDF speichern / drucken</button></div>
<header><div class="brand"><img src="${d.logo}" alt=""><b>TOKI</b></div><div class="meta"><strong>Gehalt ${esc(d.monat)}</strong>${esc(d.modus)} · erstellt am ${esc(d.erstellt)}</div></header>
<div class="hero">
  <div class="box main"><span>Netto (ca.)</span><b>${eur(d.netto)}</b><small>aus ${eur(d.brutto)} brutto</small></div>
  <div class="box"><span>Netto Grundgehalt</span><b>${eur(d.nettoGrund)}</b></div>
  <div class="box"><span>Netto Mehrarbeit</span><b>${d.mehrBrutto > 0 ? eur(d.nettoMehr) : '–'}</b>${d.mehrBrutto > 0 ? `<small>${nf((d.nettoMehr / d.mehrBrutto) * 100, 0)} % von ${eur(d.mehrBrutto)} bleiben</small>` : ''}</div>
</div>
<div class="cols avoid">
  <div><h2>Brutto</h2><table>${rows(d.bruttoZeilen)}<tr class="sum"><td>Brutto gesamt</td><td class="r">${eur(d.brutto)}</td></tr></table></div>
  <div><h2>Abzüge</h2><table>${rows(d.abzugZeilen)}<tr class="sum"><td>Netto</td><td class="r">${eur(d.netto)}</td></tr></table></div>
</div>
<h2>Mehrarbeit & Arbeitszeit ${esc(d.monatKurz)}</h2>
<div class="stats avoid">
  <div class="box"><span>Gearbeitet</span><b>${nf(d.stats.gearbeitet)} h</b><small>${d.stats.tage} Arbeitstage</small></div>
  <div class="box"><span>Mehrarbeit</span><b>${nf(d.stats.mehr)} h</b><small>${nf(d.stats.h25)} h à 25 % · ${nf(d.stats.h50)} h à 50 %</small></div>
  <div class="box"><span>Zeitkonto</span><b class="${d.stats.zk < 0 ? 'neg' : 'pos'}">${d.stats.zk > 0 ? '+' : ''}${nf(d.stats.zk)} h</b><small>Stand heute ${nf(d.stats.zkStand)} h</small></div>
  <div class="box"><span>Kontingent</span><b>${d.stats.kont ? `${nf(d.stats.used, 1)} / ${nf(d.stats.kont, 1)} h` : '–'}</b><small>MEA genutzt</small></div>
  <div class="box"><span>Ø Beginn</span><b>${esc(d.stats.avgStart)}</b></div>
  <div class="box"><span>Ø Ende</span><b>${esc(d.stats.avgEnd)}</b></div>
  <div class="box"><span>Ø Dauer</span><b>${nf(d.stats.avgDur)} h</b></div>
  <div class="box"><span>Längster Tag</span><b>${esc(d.stats.longest)}</b></div>
</div>
${d.weeks.length ? `<h2>Wochen</h2><table class="avoid"><tr><th>KW</th><th>Zeitraum</th><th class="r">Gearbeitet</th><th class="r">Mehrarbeit</th><th class="r">davon 50 %</th><th class="r">Zeitkonto</th>${d.zeigen ? '<th class="r">Mehrarbeit €</th>' : ''}</tr>
${d.weeks.map((w) => `<tr><td><b>${w.kw}</b></td><td>${esc(w.range)}</td><td class="r">${nf(w.worked)} h</td><td class="r">${nf(w.mehr)} h</td><td class="r">${nf(w.h50)} h</td><td class="r ${w.zk < 0 ? 'neg' : ''}">${w.zk > 0 ? '+' : ''}${nf(w.zk)} h</td>${d.zeigen ? `<td class="r">${eur(w.pay)}</td>` : ''}</tr>`).join('')}</table>` : ''}
${d.days.length ? `<h2>Tage</h2><table><tr><th>Tag</th><th>Zeit</th><th class="r">Stunden</th><th class="r">± Soll</th></tr>
${d.days.map((x) => `<tr><td>${esc(x.date)}</td><td>${esc(x.time)}${x.note ? `<small>${esc(x.note)}</small>` : ''}</td><td class="r">${nf(x.hours)} h ${bar(x.hours, maxH)}</td><td class="r ${x.delta > 0 ? 'pos' : x.delta < 0 ? 'neg' : ''}">${x.delta > 0 ? '+' : ''}${nf(x.delta)} h</td></tr>`).join('')}</table>` : ''}
${d.abwesend.length ? `<h2>Urlaub & Abwesenheit</h2><table>${d.abwesend.map((a) => `<tr><td>${esc(a.range)}</td><td>${esc(a.typ)}</td><td class="r">${nf(a.tage, 1)} T</td></tr>`).join('')}</table>` : ''}
<footer>Grundlagen: ${esc(d.grundlagen)}<br>Näherung nach Lohnsteuer-Tarif 2026 (§ 32a EStG, PAP) und SV-Werten 2026 – maßgeblich ist die Lohnabrechnung.</footer>
</div><script>setTimeout(function(){try{window.print()}catch(e){}},400)</script></body></html>`;
  }
  function pdf(d) {
    const w = window.open('', '_blank');
    if (!w) return false;
    w.document.open(); w.document.write(html(d)); w.document.close();
    return true;
  }

  // ---------- Excel (.xlsx = ZIP mit XML-Dateien, hier ohne Kompression) ----------
  const crcTable = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  const crc32 = (b) => { let c = 0xffffffff; for (let i = 0; i < b.length; i++) c = crcTable[(c ^ b[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  function zip(files) {
    const enc = new TextEncoder();
    const parts = [], central = [];
    let offset = 0;
    for (const [name, text] of files) {
      const data = enc.encode(text), nm = enc.encode(name), crc = crc32(data);
      const h = new DataView(new ArrayBuffer(30));
      h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, 0, true);
      h.setUint32(14, crc, true); h.setUint32(18, data.length, true); h.setUint32(22, data.length, true); h.setUint16(26, nm.length, true);
      parts.push(new Uint8Array(h.buffer), nm, data);
      const c = new DataView(new ArrayBuffer(46));
      c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true);
      c.setUint32(16, crc, true); c.setUint32(20, data.length, true); c.setUint32(24, data.length, true); c.setUint16(28, nm.length, true); c.setUint32(42, offset, true);
      central.push(new Uint8Array(c.buffer), nm);
      offset += 30 + nm.length + data.length;
    }
    const csize = central.reduce((a, b) => a + b.length, 0);
    const e = new DataView(new ArrayBuffer(22));
    e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true); e.setUint32(12, csize, true); e.setUint32(16, offset, true);
    return new Blob([...parts, ...central, new Uint8Array(e.buffer)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  }
  const xesc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const col = (i) => { let s = ''; i++; while (i) { const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; };
  /** Zelle: Zahl, Text oder {v, s} mit Stil (1 fett, 2 €, 3 € fett, 4 Stunden, 5 Kopf, 6 Titel) */
  function sheet(rows, widths) {
    const xml = rows.map((r, ri) => `<row r="${ri + 1}">${r.map((c, ci) => {
      if (c === null || c === undefined || c === '') return '';
      const o = typeof c === 'object' ? c : { v: c };
      const ref = `${col(ci)}${ri + 1}`, st = o.s ? ` s="${o.s}"` : '';
      return typeof o.v === 'number' ? `<c r="${ref}"${st}><v>${Math.round(o.v * 10000) / 10000}</v></c>` : `<c r="${ref}"${st} t="inlineStr"><is><t xml:space="preserve">${xesc(o.v)}</t></is></c>`;
    }).join('')}</row>`).join('');
    const cols = widths ? `<cols>${widths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('')}</cols>` : '';
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0" showGridLines="0"/></sheetViews>${cols}<sheetData>${xml}</sheetData></worksheet>`;
  }
  function xlsx(d) {
    const E = (v, bold) => ({ v: Number(v) || 0, s: bold ? 3 : 2 });
    const Hh = (v) => ({ v: Number(v) || 0, s: 4 });
    const head = (...a) => a.map((v) => ({ v, s: 5 }));
    const s1 = [
      [{ v: `Toki – Gehalt ${d.monat}`, s: 6 }], [`${d.modus} · erstellt am ${d.erstellt}`], [],
      head('Brutto', 'Betrag'), ...d.bruttoZeilen.map((l) => [l.k + (l.note ? ` (${l.note})` : ''), E(l.n)]), [{ v: 'Brutto gesamt', s: 1 }, E(d.brutto, true)], [],
      head('Abzüge', 'Betrag'), ...d.abzugZeilen.map((l) => [{ v: l.k + (l.note ? ` (${l.note})` : ''), s: l.cls === 'grp' ? 1 : 0 }, E(-Math.abs(l.n), l.cls === 'grp')]), [{ v: 'Netto', s: 1 }, E(d.netto, true)], [],
      head('Netto aufgeteilt', ''), ['Netto Grundgehalt', E(d.nettoGrund)], ['Netto Mehrarbeit', E(d.nettoMehr)], ['Mehrarbeit brutto', E(d.mehrBrutto)], [],
      [{ v: 'Grundlagen', s: 1 }], [d.grundlagen],
    ];
    const st = d.stats;
    const s2 = [
      [{ v: `Mehrarbeit & Arbeitszeit ${d.monatKurz}`, s: 6 }], [],
      head('Kennzahl', 'Wert'), ['Gearbeitet', Hh(st.gearbeitet)], ['Arbeitstage', st.tage], ['Mehrarbeit', Hh(st.mehr)], ['davon 25 %', Hh(st.h25)], ['davon 50 %', Hh(st.h50)],
      ['Zeitkonto im Monat', Hh(st.zk)], ['Zeitkonto Stand heute', Hh(st.zkStand)], ['MEA-Kontingent', Hh(st.kont)], ['davon genutzt', Hh(st.used)],
      ['Ø Beginn', st.avgStart], ['Ø Ende', st.avgEnd], ['Ø Dauer', Hh(st.avgDur)], ['Längster Tag', st.longest], [],
      head('KW', 'Zeitraum', 'Gearbeitet', 'Mehrarbeit', 'davon 50 %', 'Zeitkonto', ...(d.zeigen ? ['Mehrarbeit €'] : [])),
      ...d.weeks.map((w) => [w.kw, w.range, Hh(w.worked), Hh(w.mehr), Hh(w.h50), Hh(w.zk), ...(d.zeigen ? [E(w.pay)] : [])]),
    ];
    const s3 = [[{ v: `Tage ${d.monatKurz}`, s: 6 }], [], head('Datum', 'Beginn', 'Ende', 'Pause (min)', 'Stunden', '± Soll', 'Hinweis'),
      ...d.days.map((x) => [x.date, x.start, x.end, x.pause, Hh(x.hours), Hh(x.delta), x.note || '']),
      [], head('Abwesenheit', 'Art', 'Tage'), ...d.abwesend.map((a) => [a.range, a.typ, a.tage])];
    const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="2"><numFmt numFmtId="164" formatCode="#,##0.00 &quot;€&quot;"/><numFmt numFmtId="165" formatCode="0.00 &quot;h&quot;"/></numFmts>
<fonts count="4"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font><font><b/><sz val="16"/><color rgb="FF2A9C6B"/><name val="Calibri"/></font></fonts>
<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF2A9C6B"/><bgColor indexed="64"/></patternFill></fill></fills>
<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="7"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/><xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="164" fontId="1" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1"/><xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="0" fontId="2" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/><xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs>
<cellStyles count="1"><cellStyle name="Standard" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
    const names = ['Gehalt', 'Mehrarbeit', 'Tage'];
    return zip([
      ['[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${names.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>`],
      ['_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'],
      ['xl/workbook.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${names.map((n, i) => `<sheet name="${n}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets></workbook>`],
      ['xl/_rels/workbook.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${names.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}<Relationship Id="rId${names.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`],
      ['xl/styles.xml', styles],
      ['xl/worksheets/sheet1.xml', sheet(s1, [46, 16])],
      ['xl/worksheets/sheet2.xml', sheet(s2, [24, 18, 13, 13, 13, 13, 15])],
      ['xl/worksheets/sheet3.xml', sheet(s3, [18, 14, 10, 12, 12, 12, 30])],
    ]);
  }
  return { html, pdf, xlsx };
})();
