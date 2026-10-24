import { html, useState, useEffect, useMemo, sb, Icon, Link, Brand, qrDataUrl, standeeCanvas, downloadCanvas, menuUrl, maxTables, toast, errText, can } from '../lib.js';
import { useApp } from '../ctx.js';

const QRImg = ({ text, size }) => {
  const src = useMemo(() => qrDataUrl(text, size * 2), [text, size]);
  return html`<img class="qr-img" src=${src} width=${size} height=${size} alt=${'QR code for ' + text} />`;
};
async function copy(text) {
  try { await navigator.clipboard.writeText(text); toast('Link copied'); } catch (e) { toast('Copy failed. Long-press the link to copy it.', 'error'); }
}

export function Tables() {
  const app = useApp();
  const r = app.restaurant;
  const [count, setCount] = useState(r.table_count);
  const [busy, setBusy] = useState(false);
  const n = maxTables(r);
  const branded = can(r.plan, 'brand');
  const download = (table) => downloadCanvas(standeeCanvas({ name: r.name, table, url: menuUrl(r.slug, table), branded }), slugName(r, table));

  const saveCount = async () => {
    const v = Math.max(1, Math.min(200, Math.round(Number(count) || 1)));
    setBusy(true);
    const { data, error } = await sb.from('restaurants').update({ table_count: v }).eq('id', r.id).select().single();
    setBusy(false);
    if (error) { toast(errText(error), 'error'); return; }
    app.setRestaurant(data); setCount(data.table_count);
    toast(v + ' tables saved');
  };

  if (r.plan === 'freemium') {
    const url = menuUrl(r.slug);
    return html`<div class="page-h"><div><h1 class="h2">Menu QR code</h1><p class="muted">On Freemium you get one QR for the whole restaurant. Diners can see the menu but not order.</p></div></div>
      <div class="qr-solo card"><${QRImg} text=${url} size=${200} /><div><b>${r.name}</b><p class="link-line"><a href=${url} target="_blank" rel="noopener">${url}</a></p>
      <div class="row-gap"><button class="btn btn-primary" onClick=${() => download(null)}><${Icon} name="download" />Download standee</button><button class="btn" onClick=${() => copy(url)}><${Icon} name="link" />Copy link</button></div></div></div>
      <div class="notice">Want one QR per table and ordering from the phone? <${Link} href="/dashboard/settings">Switch to Basic<//>.</div>`;
  }

  return html`
    <div class="page-h">
      <div><h1 class="h2">Tables & QR codes</h1><p class="muted">Each table has its own QR. Print it, put it on the table, and every order arrives with the table number.</p></div>
      <div class="row-gap"><${Link} class="btn btn-primary" href="/dashboard/tables/print" target="_blank"><${Icon} name="print" />Print all QR codes<//></div>
    </div>
    <div class="card table-count">
      <label class="field inline">Number of tables
        <div class="stepper"><button type="button" onClick=${() => setCount(Math.max(1, Number(count) - 1))} aria-label="One table less">−</button><input id="tbl-count" type="number" min="1" max="200" value=${count} onInput=${(e) => setCount(e.target.value)} /><button type="button" onClick=${() => setCount(Math.min(200, Number(count) + 1))} aria-label="One table more">+</button></div>
      </label>
      <button class="btn" disabled=${busy || Number(count) === r.table_count} onClick=${saveCount}>${busy ? 'Saving…' : 'Save'}</button>
      ${r.plan === 'basic' && r.table_count > 10 ? html`<p class="hint">Basic covers 10 tables. <${Link} href="/dashboard/settings">Upgrade<//> to use all ${r.table_count}.</p>` : ''}
    </div>
    <div class="qr-grid">${Array.from({ length: n }, (_, i) => i + 1).map((t) => html`<div class="qr-card" key=${t}>
      <b>Table ${t}</b>
      <${QRImg} text=${menuUrl(r.slug, t)} size=${120} />
      <div class="qr-actions">
        <button class="btn btn-sm" onClick=${() => download(t)} aria-label=${'Download Table ' + t + ' standee'}><${Icon} name="download" size=${16} />PNG</button>
        <a class="btn btn-sm" href=${menuUrl(r.slug, t)} target="_blank" rel="noopener" aria-label=${'Open Table ' + t + ' menu'}><${Icon} name="eye" size=${16} />Open</a>
      </div>
    </div>`)}</div>
    <p class="muted small center">Tip: test a table by opening its menu on your phone and placing an order.</p>
  `;
}
const slugName = (r, t) => r.slug + (t ? '-table-' + t : '-menu') + '-qr.png';

export function PrintStandees() {
  const app = useApp();
  const r = app.restaurant;
  const n = r.plan === 'freemium' ? 0 : maxTables(r);
  const tables = n ? Array.from({ length: n }, (_, i) => i + 1) : [null];
  const [urls, setUrls] = useState([]);
  useEffect(() => {
    const branded = can(r.plan, 'brand');
    setUrls(tables.map((t) => standeeCanvas({ name: r.name, table: t, url: menuUrl(r.slug, t), branded }).toDataURL('image/png')));
  }, [r.id, n]);
  return html`<div class="print-page">
    <div class="print-bar no-print"><${Brand} /><span class="muted">${tables.length} QR standee${tables.length > 1 ? 's' : ''}, 4 per A4 page</span><button class="btn btn-primary" onClick=${() => window.print()}><${Icon} name="print" />Print</button><${Link} class="btn" href="/dashboard/tables">Back<//></div>
    <div class="print-grid">${urls.map((u, i) => html`<img src=${u} alt=${tables[i] ? 'Table ' + tables[i] + ' QR standee' : 'Menu QR standee'} />`)}</div>
  </div>`;
}
