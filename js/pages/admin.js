import { html, useState, useEffect, sb, Link, Brand, PLANS, PLAN_KEYS, inr0, toast, errText } from '../lib.js';
import { useApp } from '../ctx.js';

export function Admin() {
  const app = useApp();
  const [rows, setRows] = useState(null);
  const [q, setQ] = useState('');
  const load = async () => {
    const { data, error } = await sb.rpc('admin_overview');
    if (error) { toast(errText(error), 'error'); setRows([]); return; }
    setRows(data);
  };
  useEffect(() => { if (app.isAdmin) load(); }, [app.isAdmin]);

  if (!app.isAdmin) {
    return html`<div class="page-center"><div class="card narrow center"><h1 class="h2">Admins only</h1><p class="muted">This page is for the MenuMitra team.</p><${Link} class="btn" href="/dashboard">Back to dashboard<//></div></div>`;
  }
  const setPlan = async (row, plan) => {
    const { error } = await sb.rpc('admin_set_plan', { p_restaurant: row.id, p_plan: plan });
    if (error) { toast(errText(error), 'error'); return; }
    toast(row.name + ' moved to ' + PLANS[plan].name); load();
  };
  const list = (rows || []).filter((r) => !q.trim() || (r.name + ' ' + r.area + ' ' + r.owner_email + ' ' + r.slug).toLowerCase().includes(q.trim().toLowerCase()));
  const paying = (rows || []).filter((r) => r.plan !== 'freemium');
  const mrr = paying.reduce((s, r) => s + PLANS[r.plan].price, 0);
  const today = (rows || []).reduce((s, r) => s + r.orders_today, 0);
  const mix = PLAN_KEYS.map((k) => [k, (rows || []).filter((r) => r.plan === k).length]);

  return html`<div class="admin">
    <header class="site-top"><div class="wrap site-top-in"><${Link} href="/" class="brand-link"><${Brand} /><//><span class="plan-pill">Platform admin</span><div class="site-cta">${app.restaurant ? html`<${Link} class="btn" href="/dashboard">My restaurant<//>` : ''}</div></div></header>
    <main class="wrap admin-main">
      <div class="page-h"><div><h1 class="h2">All restaurants</h1><p class="muted">Sign-ups, plans and usage across MenuMitra.</p></div><button class="btn" onClick=${load}>Refresh</button></div>
      ${!rows ? html`<div class="loading"><span class="spin"></span>Loading…</div>` : html`
        <div class="tiles">
          <div class="tile"><span>Restaurants</span><b>${rows.length}</b><small>${rows.filter((r) => Date.now() - new Date(r.created_at) < 7 * 86400000).length} joined this week</small></div>
          <div class="tile"><span>On a paid plan</span><b>${paying.length}</b><small>billing not on yet</small></div>
          <div class="tile"><span>Monthly value</span><b>${inr0(mrr)}</b><small>at list price, before GST</small></div>
          <div class="tile"><span>Orders today</span><b>${today}</b><small>all restaurants</small></div>
        </div>
        <div class="card"><h2 class="h3">Restaurants by plan</h2><div class="mix">${mix.filter(([, c]) => c).map(([k, c]) => html`<i class=${'mix-' + k} style=${'flex:' + c} title=${PLANS[k].name + ': ' + c}></i>`)}</div>
          <div class="mix-key">${mix.map(([k, c]) => html`<span><i class=${'mix-' + k}></i>${PLANS[k].name} · ${c}</span>`)}</div></div>
        <label class="search"><input id="admin-q" placeholder="Search name, area, email" value=${q} onInput=${(e) => setQ(e.target.value)} /></label>
        <div class="table-wrap"><table class="tbl">
          <thead><tr><th>Restaurant</th><th>Owner</th><th>Plan</th><th class="r">Tables</th><th class="r">Dishes</th><th class="r">Orders today</th><th class="r">All orders</th><th>Joined</th></tr></thead>
          <tbody>${list.map((r) => html`<tr>
            <td><b>${r.name}</b><br /><a class="small" href=${'/r/' + r.slug} target="_blank" rel="noopener">/r/${r.slug}</a>${r.area ? html`<br /><span class="muted small">${r.area}</span>` : ''}</td>
            <td class="small">${r.owner_email}</td>
            <td><select aria-label=${'Plan for ' + r.name} value=${r.plan} onChange=${(e) => setPlan(r, e.target.value)}>${PLAN_KEYS.map((k) => html`<option value=${k}>${PLANS[k].name}</option>`)}</select></td>
            <td class="r">${r.tables}</td><td class="r">${r.dishes}</td><td class="r">${r.orders_today}</td><td class="r">${r.orders_total}</td>
            <td class="small">${new Date(r.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
          </tr>`)}</tbody>
        </table></div>`}
    </main>
  </div>`;
}
