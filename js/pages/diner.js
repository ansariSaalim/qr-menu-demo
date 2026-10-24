import { html, useState, useEffect, useRef, useMemo, sb, Icon, VegMark, DishImage, inr, clock, toast, errText, store, dinerSession, can, upiLink, qrDataUrl, initials, slugify } from '../lib.js';

const STATUS = { new: 'Sent to kitchen', preparing: 'Being prepared', ready: 'Ready, coming to you', served: 'Served', cancelled: 'Not accepted' };
const STEPS = [['new', 'Received'], ['preparing', 'Preparing'], ['ready', 'Ready'], ['served', 'Served']];

export function Diner({ slug, table }) {
  const [rest, setRest] = useState(undefined);
  const [cats, setCats] = useState([]);
  const [items, setItems] = useState([]);
  const cartKey = 'mm_cart_' + slug + '_' + (table || 0);
  const [cart, setCartRaw] = useState(() => store.get(cartKey, []));
  const setCart = (c) => { setCartRaw(c); store.set(cartKey, c); };
  const [screen, setScreen] = useState('menu');
  const [sheet, setSheet] = useState(null);
  const [q, setQ] = useState('');
  const [vegOnly, setVegOnly] = useState(false);
  const [activeCat, setActiveCat] = useState(null);
  const [orders, setOrders] = useState([]);
  const [me, setMe] = useState(() => store.get('mm_me', { name: '', phone: '' }));
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [pay, setPay] = useState(null);
  const [thanks, setThanks] = useState(null);
  const session = useMemo(() => dinerSession(slug), [slug]);
  const scroller = useRef(null);

  // Load the restaurant and menu
  useEffect(() => {
    (async () => {
      const { data: r, error } = await sb.from('restaurants').select('id, slug, name, area, phone, upi_id, gst_percent, table_count, logo_url, is_open, plan').eq('slug', slug).maybeSingle();
      if (error) { setRest(null); toast(errText(error), 'error'); return; }
      if (!r) { setRest(null); return; }
      const [c, m] = await Promise.all([
        sb.from('categories').select('id, name, sort').eq('restaurant_id', r.id).order('sort').order('created_at'),
        sb.from('menu_items').select('*').eq('restaurant_id', r.id).order('sort').order('created_at'),
      ]);
      setRest(r); setCats(c.data || []); setItems(m.data || []);
      document.title = r.name + (table ? ' · Table ' + table : '') + ' · Menu';
    })();
  }, [slug]);

  // Follow this phone's orders
  const loadOrders = async () => {
    const { data, error } = await sb.rpc('get_session_orders', { p_session: session });
    if (!error && Array.isArray(data)) setOrders(data);
  };
  useEffect(() => { loadOrders(); }, [session]);
  const open = orders.filter((o) => o.status !== 'cancelled' && o.payment_status !== 'paid');
  useEffect(() => {
    if (!open.length && screen !== 'track') return;
    const t = setInterval(loadOrders, 5000);
    return () => clearInterval(t);
  }, [open.length, screen]);

  // Highlight the category being read
  useEffect(() => {
    if (screen !== 'menu' || !scroller.current) return;
    const obs = new IntersectionObserver((entries) => {
      const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (vis) setActiveCat(vis.target.dataset.cat);
    }, { rootMargin: '-120px 0px -60% 0px' });
    document.querySelectorAll('.d-cat').forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, [screen, items.length, q, vegOnly]);

  if (rest === undefined) return html`<div class="diner"><div class="loading" style="padding-top:30vh"><span class="spin"></span>Opening the menu…</div></div>`;
  if (rest === null) return html`<div class="diner"><div class="empty" style="padding-top:20vh"><h1 class="h2">Menu not found</h1><p class="muted">This QR code may be old. Please ask the staff for the menu.</p></div></div>`;

  const canOrder = !!table && table <= rest.table_count && rest.is_open && can(rest.plan, 'order') && !(rest.plan === 'basic' && table > 10);
  const whyNot = !table ? 'This is the menu only. To order, scan the QR code on your table.' : !rest.is_open ? 'The kitchen is not taking orders from the phone right now. Please ask a waiter.' : !can(rest.plan, 'order') ? 'Please tell your waiter what you would like.' : 'This table is not set up for phone ordering. Please ask a waiter.';
  const upiOk = can(rest.plan, 'upi') && !!rest.upi_id;
  const gst = Number(rest.gst_percent) || 0;
  const sub = cart.reduce((s, l) => s + l.unit * l.qty, 0);
  const tax = Math.round(sub * gst) / 100;
  const count = cart.reduce((s, l) => s + l.qty, 0);
  const qtyOf = (id) => cart.filter((l) => l.item_id === id).reduce((s, l) => s + l.qty, 0);

  const addLine = (it, variant, addons, qty) => {
    const v = it.variants.find((x) => x.name === variant);
    const unit = (v ? Number(v.price) : Number(it.price)) + it.addons.filter((a) => addons.includes(a.name)).reduce((s, a) => s + Number(a.price), 0);
    const key = it.id + '|' + (variant || '') + '|' + addons.slice().sort().join('+');
    const ex = cart.find((l) => l.key === key);
    setCart(ex ? cart.map((l) => (l.key === key ? { ...l, qty: l.qty + qty } : l)) : [...cart, { key, item_id: it.id, name: it.name, variant: variant || null, addons, unit, qty, is_veg: it.is_veg }]);
  };
  const changeQty = (key, d) => setCart(cart.map((l) => (l.key === key ? { ...l, qty: l.qty + d } : l)).filter((l) => l.qty > 0));
  const tapAdd = (it) => {
    if (it.variants.length || it.addons.length) setSheet({ it, variant: it.variants.length ? it.variants[0].name : null, addons: [], qty: 1 });
    else { addLine(it, null, [], 1); }
  };
  const go = (s) => { setScreen(s); setErr(''); window.scrollTo(0, 0); };

  const placeOrder = async () => {
    setErr('');
    if (!me.name.trim()) { setErr('Add your name so staff know whose order it is.'); return; }
    setBusy(true);
    store.set('mm_me', me);
    const { data, error } = await sb.rpc('place_order', {
      p_slug: slug, p_table: table, p_name: me.name.trim(), p_phone: me.phone.trim(), p_note: note.trim(),
      p_items: cart.map((l) => ({ item_id: l.item_id, variant: l.variant, addons: l.addons, qty: l.qty })), p_session: session,
    });
    setBusy(false);
    if (error) { setErr(errText(error)); return; }
    setCart([]); setNote('');
    await loadOrders();
    toast('Order #' + data.order_no + ' sent to the kitchen');
    go('track');
  };
  const request = async (kind, msg) => {
    const { error } = await sb.rpc('diner_request', { p_slug: slug, p_table: table, p_kind: kind, p_session: session });
    if (error) { toast(errText(error), 'error'); return false; }
    if (msg) toast(msg);
    return true;
  };

  // ---------- Screens ----------
  const header = (title, back) => html`<header class="d-bar"><button class="icon-btn" onClick=${() => go(back)} aria-label="Back"><${Icon} name="back" /></button><b>${title}</b>${table ? html`<span class="pill-table">Table ${table}</span>` : ''}</header>`;

  if (screen === 'cart') {
    return html`<div class="diner">${header('Your order', 'menu')}
      <div class="d-sec">
        ${!cart.length ? html`<div class="empty"><p class="muted">Your cart is empty.</p><button class="btn btn-primary" onClick=${() => go('menu')}>Browse the menu</button></div>` : html`
        <div class="d-lines">${cart.map((l) => html`<div class="d-line" key=${l.key}><${VegMark} veg=${l.is_veg} /><div><b>${l.name}</b>${l.variant || l.addons.length ? html`<small>${[l.variant, ...l.addons].filter(Boolean).join(', ')}</small>` : ''}<small>${inr(l.unit)} each</small></div>
          <div class="d-line-r"><div class="stepper sm"><button onClick=${() => changeQty(l.key, -1)} aria-label=${'One less ' + l.name}>−</button><span>${l.qty}</span><button onClick=${() => changeQty(l.key, 1)} aria-label=${'One more ' + l.name}>+</button></div><span class="num">${inr(l.unit * l.qty)}</span></div></div>`)}</div>
        <button class="btn-link" onClick=${() => go('menu')}>+ Add more dishes</button>
        <label class="field">Note for the kitchen <span class="muted">(optional)</span><textarea id="d-note" rows="2" maxlength="300" value=${note} onInput=${(e) => setNote(e.target.value)} placeholder="Less spicy, no onion…"></textarea></label>
        <div class="field-row">
          <label class="field">Your name<input id="d-name" maxlength="60" autocomplete="given-name" value=${me.name} onInput=${(e) => setMe({ ...me, name: e.target.value })} placeholder="e.g. Riya" /></label>
          <label class="field">Mobile <span class="muted">(optional)</span><input id="d-phone" inputmode="tel" maxlength="20" autocomplete="tel" value=${me.phone} onInput=${(e) => setMe({ ...me, phone: e.target.value })} /></label>
        </div>
        <div class="bill"><div><span>Item total</span><span>${inr(sub)}</span></div>${gst ? html`<div><span>GST ${gst}%</span><span>${inr(tax)}</span></div>` : ''}<div class="tot"><span>To pay</span><span>${inr(sub + tax)}</span></div></div>
        ${err ? html`<p class="form-error" role="alert">${err}</p>` : ''}
        <button class="btn btn-primary btn-lg btn-block" disabled=${busy} onClick=${placeOrder}>${busy ? 'Sending…' : 'Place order · ' + inr(sub + tax)}</button>
        <p class="fine center">You pay after your meal.</p>`}
      </div></div>`;
  }

  if (screen === 'track') {
    const mine = orders.filter((o) => o.payment_status !== 'paid' || Date.now() - new Date(o.created_at) < 3600000);
    const due = open.reduce((s, o) => s + Number(o.total), 0);
    const claimed = orders.some((o) => o.payment_status === 'claimed');
    return html`<div class="diner">${header('Your orders', 'menu')}
      <div class="d-sec">
        ${!mine.length ? html`<div class="empty"><p class="muted">No orders from this phone yet.</p><button class="btn btn-primary" onClick=${() => go('menu')}>Browse the menu</button></div>` : mine.slice().reverse().map((o) => html`<div class="d-order" key=${o.id}>
          <div class="d-order-h"><b>Order #${o.order_no}</b><span class="muted small">${clock(o.created_at)}</span></div>
          <p class=${'d-status ' + o.status}>${STATUS[o.status]}${o.payment_status === 'paid' ? ' · Paid' : o.payment_status === 'claimed' ? ' · Payment being checked' : ''}</p>
          ${o.status !== 'cancelled' ? html`<div class="track">${STEPS.map(([s, label], i) => { const at = STEPS.findIndex((x) => x[0] === o.status); return html`<div class=${i < at || o.status === 'served' ? 'done' : i === at ? 'now' : ''}><i></i>${label}</div>`; })}</div>` : ''}
          <p class="muted small">${o.items.map((i) => i.qty + ' × ' + i.name + (i.variant ? ' (' + i.variant + ')' : '')).join(', ')}</p>
          <div class="d-order-f"><span class="muted small">Total</span><b>${inr(o.total)}</b></div>
        </div>`)}
        ${open.length ? html`
          <div class="act-grid"><button class="btn" onClick=${() => go('menu')}>Order more</button><button class="btn" onClick=${() => request('waiter', 'A waiter is on the way')}><${Icon} name="bell" size=${16} />Call waiter</button></div>
          ${due > 0 ? html`<button class="btn btn-primary btn-lg btn-block" onClick=${() => { setPay(upiOk ? 'upi' : 'counter'); go('pay'); }}>Pay bill · ${inr(due)}</button>` : claimed ? html`<p class="notice">Thanks. The restaurant is checking your UPI payment.</p>` : ''}` : mine.length ? html`<button class="btn btn-block" onClick=${() => go('menu')}>Back to menu</button>` : ''}
      </div></div>`;
  }

  if (screen === 'pay') {
    const unpaid = open.filter((o) => o.payment_status === 'unpaid');
    const due = unpaid.reduce((s, o) => s + Number(o.total), 0);
    if (!unpaid.length) { setTimeout(() => go('track'), 0); return ''; }
    const link = upiOk ? upiLink({ upi: rest.upi_id, name: rest.name, amount: due, note: rest.name + ' T' + table + ' #' + unpaid.map((o) => o.order_no).join(',') }) : '';
    return html`<div class="diner">${header('Pay bill', 'track')}
      <div class="d-sec">
        <div class="bill">${unpaid.map((o) => html`<div><span>Order #${o.order_no}</span><span>${inr(o.total)}</span></div>`)}<div class="tot"><span>Amount due</span><span>${inr(due)}</span></div></div>
        <span class="eyebrow">How would you like to pay?</span>
        ${upiOk ? html`<button class="pay-opt" aria-pressed=${pay === 'upi'} onClick=${() => setPay('upi')}><span class="rad"></span><span><b>UPI</b><small>Google Pay, PhonePe, Paytm, BHIM</small></span></button>` : ''}
        <button class="pay-opt" aria-pressed=${pay === 'counter'} onClick=${() => setPay('counter')}><span class="rad"></span><span><b>At the counter</b><small>Cash, card or UPI when you leave</small></span></button>
        ${pay === 'upi' ? html`<div class="upi-box">
          <a class="btn btn-primary btn-lg btn-block" href=${link}>Pay ${inr(due)} with a UPI app</a>
          <details><summary>Paying from another phone? Show QR</summary><img class="qr-img center-img" src=${qrDataUrl(link, 400)} width="200" height="200" alt="UPI payment QR code" /><p class="muted small center">Pays ${rest.upi_id}</p></details>
          <p class="muted small">After paying, come back here and tap below.</p>
          <button class="btn btn-block" onClick=${async () => { if (await request('paid_claim')) { setThanks('upi'); await loadOrders(); go('thanks'); } }}>I have paid ${inr(due)}</button>
        </div>` : html`<button class="btn btn-primary btn-lg btn-block" onClick=${async () => { if (await request('counter_pay')) { setThanks('counter'); go('thanks'); } }}>I will pay at the counter</button>`}
      </div></div>`;
  }

  if (screen === 'thanks') {
    return html`<div class="diner"><div class="d-sec center" style="padding-top:12vh">
      <div class="done-mark"><${Icon} name="check" size=${34} /></div>
      <h1 class="h2">${thanks === 'upi' ? 'Thank you!' : 'Staff will bring your bill'}</h1>
      <p class="muted">${thanks === 'upi' ? rest.name + ' will confirm your payment in a moment.' : 'Pay at the counter by cash, card or UPI when you leave.'}</p>
      <button class="btn btn-block" onClick=${() => go('track')}>See my orders</button>
      <button class="btn-link" onClick=${() => go('menu')}>Back to menu</button>
    </div></div>`;
  }

  // ---------- Menu ----------
  const needle = q.trim().toLowerCase();
  const visible = items.filter((i) => (!vegOnly || i.is_veg) && (!needle || (i.name + ' ' + i.description + ' ' + i.tags.join(' ')).toLowerCase().includes(needle)));
  const groups = [...cats.map((c) => [c.id, c.name]), [null, 'More']].map(([id, name]) => [id, name, visible.filter((i) => (id ? i.category_id === id : !i.category_id || !cats.some((c) => c.id === i.category_id)))]).filter((g) => g[2].length);
  const jump = (id) => { const el = document.getElementById('cat-' + (id || 'more')); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
  const last = open[open.length - 1];

  return html`<div class="diner" ref=${scroller}>
    <header class="d-head">
      <div class="d-rest">
        ${rest.logo_url ? html`<img class="d-logo" src=${rest.logo_url} alt="" />` : html`<span class="d-logo ph">${initials(rest.name)}</span>`}
        <div><h1>${rest.name}</h1>${rest.area ? html`<p class="muted small">${rest.area}</p>` : ''}</div>
        ${table ? html`<span class="pill-table">Table ${table}</span>` : ''}
      </div>
      <div class="d-tools">
        <label class="search"><${Icon} name="search" size=${16} /><input id="d-q" type="search" placeholder="Search dishes" value=${q} onInput=${(e) => setQ(e.target.value)} /></label>
        <label class="vegtoggle"><input type="checkbox" checked=${vegOnly} onChange=${(e) => setVegOnly(e.target.checked)} /> Veg only</label>
      </div>
    </header>
    <nav class="d-cats" aria-label="Menu sections">${groups.map(([id, name]) => html`<button aria-pressed=${(activeCat || (groups[0] && String(groups[0][0]))) === String(id)} onClick=${() => jump(id)}>${name}</button>`)}</nav>
    ${!canOrder ? html`<div class="notice d-notice">${whyNot}</div>` : ''}
    ${open.length && canOrder ? html`<div class="d-callbar"><button class="btn btn-sm" onClick=${() => request('waiter', 'A waiter is on the way')}><${Icon} name="bell" size=${16} />Call waiter</button></div>` : ''}
    <main class="d-menu">
      ${groups.map(([id, name, list]) => html`<section class="d-cat" id=${'cat-' + (id || 'more')} data-cat=${String(id)}>
        <h2>${name}</h2>
        ${list.map((it) => { const n = qrDish(it, qtyOf(it.id)); return html`<div class=${'dish' + (it.in_stock ? '' : ' out')} key=${it.id}>
          <div class="dish-txt">
            <div class="dish-top"><${VegMark} veg=${it.is_veg} />${it.tags.map((t) => html`<span class=${'tag' + (t === 'Spicy' ? ' spicy' : /Jain/.test(t) ? ' jain' : '')}>${t}</span>`)}</div>
            <b class="dish-name">${it.name}</b>
            <span class="dish-price">${it.variants.length ? inr(Math.min(...it.variants.map((v) => Number(v.price)))) + (it.variants.length > 1 ? ' onwards' : '') : inr(it.price)}</span>
            ${it.description ? html`<p class="dish-desc">${it.description}</p>` : ''}
          </div>
          <div class="dish-media"><${DishImage} item=${it} />
            ${!it.in_stock ? html`<span class="add sold">Sold out</span>` : canOrder ? (n.simple && n.qty ? html`<div class="add stepper"><button onClick=${() => changeQty(it.id + '||', -1)} aria-label=${'One less ' + it.name}>−</button><span>${n.qty}</span><button onClick=${() => changeQty(it.id + '||', 1)} aria-label=${'One more ' + it.name}>+</button></div>` : html`<button class="add" onClick=${() => tapAdd(it)} aria-label=${'Add ' + it.name}>${n.qty ? n.qty + ' added +' : 'ADD'}${n.simple ? '' : html`<small>customisable</small>`}</button>`) : ''}
          </div>
        </div>`; })}
      </section>`)}
      ${!groups.length ? html`<div class="empty"><p class="muted">${items.length ? 'No dishes match your search.' : 'The menu is being prepared. Please ask the staff.'}</p>${q ? html`<button class="btn btn-sm" onClick=${() => setQ('')}>Clear search</button>` : ''}</div>` : ''}
      ${!can(rest.plan, 'brand') ? html`<p class="powered">Menu by <b>MenuMitra</b></p>` : ''}
    </main>
    ${count && canOrder ? html`<div class="d-bottom"><button class="cartbar" onClick=${() => go('cart')}><span><small>${count} item${count > 1 ? 's' : ''}${gst ? ' · plus GST' : ''}</small>${inr(sub)}</span><span>View cart →</span></button></div>`
      : last ? html`<div class="d-bottom"><button class="cartbar dark" onClick=${() => go('track')}><span><small>Order #${last.order_no}</small>${STATUS[last.status]}</span><span>Track →</span></button></div>` : ''}
    ${sheet ? html`<${Sheet} sheet=${sheet} setSheet=${setSheet} onAdd=${() => { addLine(sheet.it, sheet.variant, sheet.addons, sheet.qty); setSheet(null); toast('Added to cart'); }} />` : ''}
  </div>`;
}
const qrDish = (it, qty) => ({ simple: !(it.variants.length || it.addons.length), qty });

function Sheet({ sheet, setSheet, onAdd }) {
  const { it } = sheet;
  const v = it.variants.find((x) => x.name === sheet.variant);
  const unit = (v ? Number(v.price) : Number(it.price)) + it.addons.filter((a) => sheet.addons.includes(a.name)).reduce((s, a) => s + Number(a.price), 0);
  const upd = (patch) => setSheet({ ...sheet, ...patch });
  return html`<div class="sheet-back" onClick=${(e) => e.target === e.currentTarget && setSheet(null)}>
    <div class="sheet" role="dialog" aria-label=${'Choose options for ' + it.name}>
      <div class="sheet-grab"></div>
      <h3 class="h3"><${VegMark} veg=${it.is_veg} /> ${it.name}</h3>
      ${it.description ? html`<p class="muted small">${it.description}</p>` : ''}
      ${it.variants.length ? html`<div class="opt-group"><b>Portion</b>${it.variants.map((x) => html`<button class="opt" aria-pressed=${sheet.variant === x.name} onClick=${() => upd({ variant: x.name })}><span class="box round">${sheet.variant === x.name ? html`<${Icon} name="check" size=${12} />` : ''}</span><span>${x.name}</span><span class="num">${inr(x.price)}</span></button>`)}</div>` : ''}
      ${it.addons.length ? html`<div class="opt-group"><b>Add-ons <span class="muted">(optional)</span></b>${it.addons.map((a) => { const on = sheet.addons.includes(a.name); return html`<button class="opt" aria-pressed=${on} onClick=${() => upd({ addons: on ? sheet.addons.filter((x) => x !== a.name) : [...sheet.addons, a.name] })}><span class="box">${on ? html`<${Icon} name="check" size=${12} />` : ''}</span><span>${a.name}</span><span class="num">+${inr(a.price)}</span></button>`; })}</div>` : ''}
      <div class="sheet-foot">
        <div class="stepper"><button onClick=${() => upd({ qty: Math.max(1, sheet.qty - 1) })} aria-label="One less">−</button><span>${sheet.qty}</span><button onClick=${() => upd({ qty: Math.min(50, sheet.qty + 1) })} aria-label="One more">+</button></div>
        <button class="btn btn-primary btn-lg grow" onClick=${onAdd}>Add · ${inr(unit * sheet.qty)}</button>
      </div>
    </div>
  </div>`;
}
