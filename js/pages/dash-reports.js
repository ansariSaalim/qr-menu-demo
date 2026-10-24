import { html, useState, useEffect, sb, Icon, Link, inr0, toast, errText, can, startOfDay } from '../lib.js';
import { useApp } from '../ctx.js';

const RANGES = [['today', 'Today', 0], ['7d', 'Last 7 days', 6], ['30d', 'Last 30 days', 29]];

export function Reports() {
  const app = useApp();
  const r = app.restaurant;
  const [range, setRange] = useState('today');
  const [data, setData] = useState(null);
  const full = can(r.plan, 'reports');

  useEffect(() => {
    if (r.plan === 'freemium') return;
    let alive = true;
    setData(null);
    const days = RANGES.find((x) => x[0] === range)[2];
    const since = startOfDay(new Date(Date.now() - days * 86400000)).toISOString();
    sb.from('orders').select('id, created_at, status, total, payment_status, payment_method, table_no, order_items(name, qty, line_total)')
      .eq('restaurant_id', r.id).gte('created_at', since).order('created_at').limit(5000)
      .then(({ data: rows, error }) => { if (!alive) return; if (error) { toast(errText(error), 'error'); setData([]); return; } setData(rows); });
    return () => { alive = false; };
  }, [r.id, range]);

  if (r.plan === 'freemium') {
    return html`<div class="page-h"><h1 class="h2">Reports</h1></div><div class="lock"><span class="lock-ic"><${Icon} name="chart" size=${22} /></span><h2 class="h3">Sales reports start on Basic</h2><p class="muted">Reports come from orders placed by diners, which needs table ordering.</p><${Link} class="btn btn-primary" href="/dashboard/settings">Change plan<//></div>`;
  }

  const rows = (data || []).filter((o) => o.status !== 'cancelled');
  const sales = rows.reduce((s, o) => s + Number(o.total), 0);
  const paid = rows.filter((o) => o.payment_status === 'paid').reduce((s, o) => s + Number(o.total), 0);
  const avg = rows.length ? sales / rows.length : 0;
  const cancelled = (data || []).length - rows.length;

  // Top dishes
  const dishMap = {};
  rows.forEach((o) => o.order_items.forEach((i) => { const d = dishMap[i.name] || (dishMap[i.name] = { qty: 0, sales: 0 }); d.qty += i.qty; d.sales += Number(i.line_total); }));
  const top = Object.entries(dishMap).sort((a, b) => b[1].qty - a[1].qty).slice(0, 8);

  // Time series: by hour for today, by day otherwise
  let series = [];
  if (range === 'today') {
    for (let hr = 8; hr <= 23; hr++) series.push({ label: (hr % 12 || 12) + (hr < 12 ? 'a' : 'p'), v: 0, key: hr });
    rows.forEach((o) => { const hr = new Date(o.created_at).getHours(); const s = series.find((x) => x.key === hr); if (s) s.v += Number(o.total); });
  } else {
    const days = RANGES.find((x) => x[0] === range)[2];
    for (let i = days; i >= 0; i--) { const d = startOfDay(new Date(Date.now() - i * 86400000)); series.push({ label: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }), v: 0, key: d.toDateString() }); }
    rows.forEach((o) => { const k = startOfDay(new Date(o.created_at)).toDateString(); const s = series.find((x) => x.key === k); if (s) s.v += Number(o.total); });
  }
  const methods = ['upi', 'cash', 'card', 'counter'].map((m) => [m, rows.filter((o) => o.payment_status === 'paid' && o.payment_method === m).reduce((s, o) => s + Number(o.total), 0)]).filter(([, v]) => v > 0);

  return html`
    <div class="page-h"><div><h1 class="h2">Reports</h1><p class="muted">Sales from orders placed through MenuMitra. Rejected orders are left out.</p></div>
      <div class="seg" role="group" aria-label="Period">${RANGES.map(([k, l]) => html`<button aria-pressed=${range === k} onClick=${() => setRange(k)}>${l}</button>`)}</div></div>
    ${!data ? html`<div class="loading"><span class="spin"></span>Loading…</div>` : html`
      <div class="tiles">
        <div class="tile"><span>Sales</span><b>${inr0(sales)}</b><small>${inr0(paid)} paid</small></div>
        <div class="tile"><span>Orders</span><b>${rows.length}</b><small>${cancelled ? cancelled + ' rejected' : 'none rejected'}</small></div>
        <div class="tile"><span>Average bill</span><b>${inr0(avg)}</b><small>per order</small></div>
        <div class="tile"><span>Still unpaid</span><b>${inr0(sales - paid)}</b><small>${rows.filter((o) => o.payment_status !== 'paid').length} orders</small></div>
      </div>
      ${!full ? html`<div class="lock"><span class="lock-ic"><${Icon} name="chart" size=${22} /></span><h2 class="h3">Top dishes and busy hours are on Advanced</h2><p class="muted">See which dishes sell, which to drop, and when you need more staff.</p><${Link} class="btn btn-primary" href="/dashboard/settings">Change plan<//></div>` : rows.length === 0 ? html`<div class="empty card"><p class="muted">No orders in this period yet. Charts appear after your first orders.</p></div>` : html`
        <div class="two">
          <section class="card"><h2 class="h3">${range === 'today' ? 'Sales by hour' : 'Sales by day'}</h2><${BarChart} series=${series} /></section>
          <section class="card"><h2 class="h3">Top dishes</h2><div class="bars">${top.map(([n, d]) => html`<div class="bar-row"><span title=${n}>${n}</span><div class="bar-track"><i style=${'width:' + (d.qty / top[0][1].qty * 100).toFixed(1) + '%'}></i></div><span class="num">${d.qty}</span></div>`)}</div></section>
        </div>
        ${methods.length ? html`<section class="card"><h2 class="h3">How diners paid</h2><div class="chips">${methods.map(([m, v]) => html`<span class="chip-static"><b>${m === 'upi' ? 'UPI' : m[0].toUpperCase() + m.slice(1)}</b> ${inr0(v)}</span>`)}</div></section>` : ''}
      `}
    `}`;
}

function BarChart({ series }) {
  const W = 600, H = 220, l = 46, b = 30, t = 14, max = Math.max(1, ...series.map((s) => s.v));
  const nice = niceMax(max), bw = (W - l - 8) / series.length;
  const y = (v) => t + (H - t - b) * (1 - v / nice);
  const every = Math.ceil(series.length / 10);
  const peak = series.reduce((a, s, i) => (s.v > series[a].v ? i : a), 0);
  return html`<div class="chart"><svg viewBox=${'0 0 ' + W + ' ' + H} role="img" aria-label="Sales chart">
    ${[0, 0.5, 1].map((f) => html`<line x1=${l} x2=${W - 4} y1=${y(nice * f)} y2=${y(nice * f)} class="grid" /><text x=${l - 6} y=${y(nice * f) + 4} text-anchor="end" class="axis">${short(nice * f)}</text>`)}
    ${series.map((s, i) => { const x = l + i * bw + bw * 0.15, w = bw * 0.7; return html`<g><rect x=${x} y=${y(s.v)} width=${w} height=${Math.max(0, y(0) - y(s.v))} rx="3" class=${i === peak && s.v > 0 ? 'bar peak' : 'bar'}><title>${s.label}: ₹${Math.round(s.v).toLocaleString('en-IN')}</title></rect>${i % every === 0 ? html`<text x=${x + w / 2} y=${H - 10} text-anchor="middle" class="axis">${s.label}</text>` : ''}</g>`; })}
  </svg></div>`;
}
const niceMax = (v) => { const p = Math.pow(10, Math.floor(Math.log10(v))); return Math.ceil(v / p) * p; };
const short = (v) => (v >= 100000 ? '₹' + (v / 100000).toFixed(1) + 'L' : v >= 1000 ? '₹' + (v / 1000).toFixed(v >= 10000 ? 0 : 1) + 'k' : '₹' + Math.round(v));
