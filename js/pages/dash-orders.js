import { html, useState, useEffect, useRef, sb, Icon, VegMark, Link, inr, ago, clock, toast, errText, chime, unlockAudio, store, can, menuUrl, startOfDay } from '../lib.js';
import { useApp } from '../ctx.js';

const COLS = [['new', 'New', 'turmeric'], ['preparing', 'Preparing', 'info'], ['ready', 'Ready to serve', 'good']];
const NEXT = { new: ['preparing', 'Accept'], preparing: ['ready', 'Mark ready'], ready: ['served', 'Served'] };
const REQ = { waiter: 'is calling a waiter', bill: 'asked for the bill', counter_pay: 'will pay at the counter', paid_claim: 'says they paid by UPI' };
const PAY = { unpaid: ['Unpaid', ''], claimed: ['UPI: check payment', 'warn'], paid: ['Paid', 'good'] };

export function Orders() {
  const app = useApp();
  const r = app.restaurant;
  const [orders, setOrders] = useState(null);
  const [reqs, setReqs] = useState([]);
  const [col, setCol] = useState('new');
  const [sound, setSound] = useState(store.get('mm_sound', false));
  const [kot, setKot] = useState(null);
  const [confirmCancel, setConfirmCancel] = useState(null);
  const [, tick] = useState(0);
  const known = useRef(null);
  const reqCount = useRef(null);
  const soundRef = useRef(sound);
  soundRef.current = sound;

  const load = async () => {
    const since = new Date(Date.now() - 20 * 3600 * 1000).toISOString();
    const [o, q] = await Promise.all([
      sb.from('orders').select('*, order_items(*)').eq('restaurant_id', r.id).gte('created_at', since).order('created_at', { ascending: false }),
      sb.from('service_requests').select('*').eq('restaurant_id', r.id).eq('status', 'open').order('created_at', { ascending: false }),
    ]);
    if (o.error) { toast(errText(o.error), 'error'); return; }
    const list = o.data;
    const ids = new Set(list.map((x) => x.id));
    if (known.current) {
      const fresh = list.filter((x) => !known.current.has(x.id) && x.status === 'new');
      if (fresh.length) { if (soundRef.current) chime(); toast('New order #' + fresh[0].order_no + ' from Table ' + fresh[0].table_no); }
    }
    known.current = ids;
    setOrders(list);
    if (!q.error) {
      if (reqCount.current !== null && q.data.length > reqCount.current) { if (soundRef.current) chime(); toast('Table ' + q.data[0].table_no + ' ' + REQ[q.data[0].kind]); }
      reqCount.current = q.data.length;
      setReqs(q.data);
    }
  };

  useEffect(() => {
    if (sound) unlockAudio();
    load();
    const ch = sb.channel('orders-' + r.id)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: 'restaurant_id=eq.' + r.id }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'service_requests', filter: 'restaurant_id=eq.' + r.id }, () => load())
      .subscribe();
    const t = setInterval(() => tick((n) => n + 1), 30000);
    const poll = setInterval(load, 20000); // safety net if the live connection drops
    return () => { sb.removeChannel(ch); clearInterval(t); clearInterval(poll); };
  }, [r.id]);

  const toggleSound = () => {
    const on = !sound;
    if (on) { unlockAudio(); chime(); }
    setSound(on); store.set('mm_sound', on);
    toast(on ? 'Sound alerts on' : 'Sound alerts off');
  };
  const update = async (o, patch, msg) => {
    setOrders((list) => list.map((x) => (x.id === o.id ? { ...x, ...patch } : x)));
    const { error } = await sb.from('orders').update(patch).eq('id', o.id);
    if (error) { toast(errText(error), 'error'); load(); return; }
    if (msg) toast(msg);
  };
  const advance = (o) => {
    const [next] = NEXT[o.status];
    update(o, { status: next }, next === 'preparing' ? 'Order #' + o.order_no + ' accepted' : next === 'ready' ? 'Order #' + o.order_no + ' is ready' : 'Order #' + o.order_no + ' served');
    if (next === 'preparing' && store.get('mm_autokot', false)) printKot(o);
  };
  const markPaid = (o, method) => update(o, { payment_status: 'paid', payment_method: method || o.payment_method || 'cash' }, 'Order #' + o.order_no + ' marked paid');
  const doneReq = async (q) => {
    setReqs((l) => l.filter((x) => x.id !== q.id));
    if (reqCount.current) reqCount.current -= 1;
    const { error } = await sb.from('service_requests').update({ status: 'done' }).eq('id', q.id);
    if (error) { toast(errText(error), 'error'); load(); }
  };
  const printKot = (o) => { setKot(o); setTimeout(() => window.print(), 80); };

  if (!can(r.plan, 'order')) {
    return html`<div class="page-h"><h1 class="h2">Orders</h1></div>
      <div class="lock"><span class="lock-ic"><${Icon} name="orders" size=${22} /></span><h2 class="h3">Table ordering starts on Basic</h2>
      <p class="muted">On Freemium diners can view your menu. Switch to Basic in Settings to let them order from the table, with live orders here.</p>
      <${Link} class="btn btn-primary" href="/dashboard/settings">Change plan<//></div>`;
  }
  if (!orders) return html`<div class="loading"><span class="spin"></span>Loading orders…</div>`;

  const active = (s) => orders.filter((o) => o.status === s).sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  const today = orders.filter((o) => new Date(o.created_at) >= startOfDay());
  const done = today.filter((o) => o.status === 'served' || o.status === 'cancelled');
  const unpaidServed = done.filter((o) => o.status === 'served' && o.payment_status !== 'paid');
  const counts = Object.fromEntries(COLS.map(([s]) => [s, active(s).length]));

  const card = (o) => html`<article class=${'oc' + (o.status === 'new' ? ' is-new' : '')} key=${o.id}>
    <div class="oc-h"><span class="tno">T${o.table_no}</span><b>#${o.order_no}</b><small title=${new Date(o.created_at).toLocaleString('en-IN')}>${ago(o.created_at)}</small></div>
    <div class="oc-who">${o.customer_name}${o.customer_phone ? html` · <a href=${'tel:' + o.customer_phone}>${o.customer_phone}</a>` : ''}</div>
    <ul class="oc-items">${o.order_items.sort((a, b) => new Date(a.created_at) - new Date(b.created_at)).map((i) => html`<li><b>${i.qty}×</b><span><${VegMark} veg=${i.is_veg} /> ${i.name}${i.variant || i.addons ? html`<small>${[i.variant, i.addons].filter(Boolean).join(' · ')}</small>` : ''}</span></li>`)}</ul>
    ${o.note ? html`<div class="oc-note">Note: ${o.note}</div>` : ''}
    <div class="oc-f">
      <div><strong>${inr(o.total)}</strong>${o.payment_status !== 'unpaid' ? html`<span class=${'pay-pill ' + PAY[o.payment_status][1]}>${PAY[o.payment_status][0]}</span>` : ''}</div>
      <div class="oc-btns">
        <button class="btn btn-sm icon-only" onClick=${() => printKot(o)} title="Print kitchen ticket" aria-label="Print kitchen ticket"><${Icon} name="print" size=${16} /></button>
        <button class=${'btn btn-sm ' + (o.status === 'new' ? 'btn-primary' : '')} onClick=${() => advance(o)}>${NEXT[o.status][1]}</button>
      </div>
    </div>
    ${o.status === 'new' ? html`<button class="btn-link small danger" onClick=${() => setConfirmCancel(o)}>Reject order</button>` : ''}
  </article>`;

  return html`
    <div class="page-h">
      <div><h1 class="h2">Orders</h1><p class="muted">Live from your tables. New orders appear here on their own.</p></div>
      <div class="row-gap">
        <button class=${'btn ' + (sound ? 'btn-on' : '')} onClick=${toggleSound} aria-pressed=${sound}><${Icon} name=${sound ? 'sound' : 'mute'} />${sound ? 'Sound on' : 'Turn on sound'}</button>
      </div>
    </div>
    ${!sound ? html`<div class="notice">Turn on sound so you hear new orders. Keep this page open on the counter phone or tablet.</div>` : ''}

    ${reqs.length ? html`<div class="reqs">${reqs.map((q) => html`<div class=${'req' + (q.kind === 'paid_claim' ? ' req-pay' : '')}><${Icon} name="bell" /><span><b>Table ${q.table_no}</b> ${REQ[q.kind]}</span><small>${ago(q.created_at)}</small><button class="btn btn-sm" onClick=${() => doneReq(q)}>Done</button></div>`)}</div>` : ''}

    ${orders.length === 0 ? html`<${GettingStarted} r=${r} />` : html`
      <div class="seg col-switch" role="group" aria-label="Order stage">${COLS.map(([s, label]) => html`<button aria-pressed=${col === s} onClick=${() => setCol(s)}>${label.split(' ')[0]}${counts[s] ? html`<span class="badge">${counts[s]}</span>` : ''}</button>`)}</div>
      <div class="kanban" data-col=${col}>${COLS.map(([s, label, tone]) => html`
        <section class="col" data-stage=${s}>
          <div class="col-h"><i class=${'dot ' + tone}></i>${label}<span>${counts[s]}</span></div>
          ${counts[s] ? active(s).map(card) : html`<div class="col-empty">${s === 'new' ? 'No new orders right now.' : 'Nothing here.'}</div>`}
        </section>`)}
      </div>`}

    ${unpaidServed.length ? html`<section class="card">
      <h2 class="h3">Waiting for payment</h2>
      <div class="pay-list">${unpaidServed.map((o) => html`<div class="pay-row">
        <span class="tno">T${o.table_no}</span><span><b>#${o.order_no}</b> · ${o.customer_name}<br /><small class="muted">${o.payment_status === 'claimed' ? 'Says paid by UPI. Check your UPI app.' : o.payment_method === 'counter' ? 'Paying at counter' : 'Not paid yet'}</small></span>
        <strong>${inr(o.total)}</strong>
        <div class="row-gap">${o.payment_status === 'claimed' ? html`<button class="btn btn-sm btn-primary" onClick=${() => markPaid(o, 'upi')}>UPI received</button>` : html`<button class="btn btn-sm" onClick=${() => markPaid(o, 'cash')}>Cash</button><button class="btn btn-sm" onClick=${() => markPaid(o, 'upi')}>UPI</button><button class="btn btn-sm" onClick=${() => markPaid(o, 'card')}>Card</button>`}</div>
      </div>`)}</div>
    </section>` : ''}

    ${done.length ? html`<section class="card">
      <h2 class="h3">Done today <span class="muted small">${done.length} orders</span></h2>
      <div class="chips">${done.map((o) => html`<span class="chip-static"><b>#${o.order_no}</b> T${o.table_no} · ${inr(o.total)} ${o.status === 'cancelled' ? html`<span class="pay-pill bad">Rejected</span>` : o.payment_status === 'paid' ? html`<span class="pay-pill good">Paid</span>` : ''}</span>`)}</div>
    </section>` : ''}

    ${confirmCancel ? html`<div class="modal-back" onClick=${(e) => e.target === e.currentTarget && setConfirmCancel(null)}><div class="modal" role="dialog" aria-label="Reject order">
      <h2 class="h3">Reject order #${confirmCancel.order_no}?</h2>
      <p class="muted">Table ${confirmCancel.table_no} will see that the order was not accepted. Tell them why in person.</p>
      <div class="modal-btns"><button class="btn" onClick=${() => setConfirmCancel(null)}>Keep order</button><button class="btn btn-danger" onClick=${() => { update(confirmCancel, { status: 'cancelled' }, 'Order #' + confirmCancel.order_no + ' rejected'); setConfirmCancel(null); }}>Reject</button></div>
    </div></div>` : ''}

    ${kot ? html`<div class="print-only"><div class="kot">
      <div class="c big">KOT #${kot.order_no}</div><div class="c">${r.name.toUpperCase()}</div><hr />
      <div class="r"><span>TABLE ${kot.table_no}</span><span>${clock(kot.created_at)}</span></div>
      <div class="r"><span>DINE-IN</span><span>${(kot.customer_name || '').toUpperCase()}</span></div><hr />
      ${kot.order_items.map((i) => html`<div class="kot-line"><b>${i.qty} x ${i.name.toUpperCase()}</b>${i.variant || i.addons ? html`<div class="kot-sub">${[i.variant, i.addons].filter(Boolean).join(', ')}</div>` : ''}</div>`)}
      ${kot.note ? html`<hr /><div>NOTE: ${kot.note.toUpperCase()}</div>` : ''}<hr />
      <div class="c">ITEMS: ${kot.order_items.reduce((s, i) => s + i.qty, 0)}</div>
    </div></div>` : ''}
  `;
}

function GettingStarted({ r }) {
  const steps = [
    ['Check your menu', 'Edit prices, add photos, mark what is sold out.', '/dashboard/menu', false],
    ['Add your UPI ID', 'So diners can pay you from the table.', '/dashboard/settings', !!r.upi_id],
    ['Print your table QR codes', 'One per table, ready to print.', '/dashboard/tables', false],
  ];
  return html`<section class="card getting-started">
    <h2 class="h3">No orders yet today. Here is how to get your first one.</h2>
    <ol class="gs-list">
      ${steps.map(([t, d, href, ok]) => html`<li class=${ok ? 'ok' : ''}><span class="gs-dot">${ok ? html`<${Icon} name="check" size=${14} />` : ''}</span><div><b>${t}</b><p class="muted small">${d}</p></div><${Link} class="btn btn-sm" href=${href}>${ok ? 'Edit' : 'Open'}<//></li>`)}
      <li><span class="gs-dot"></span><div><b>Place a test order</b><p class="muted small">Open Table 1 on your phone, order something, and watch it appear here.</p></div><a class="btn btn-sm btn-primary" href=${menuUrl(r.slug, 1)} target="_blank" rel="noopener">Open Table 1</a></li>
    </ol>
  </section>`;
}
