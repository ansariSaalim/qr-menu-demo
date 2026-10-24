import { html, useState, useEffect, sb, Link, Brand, Icon, PLANS, navigate, toast, errText, menuUrl } from '../lib.js';
import { useApp } from '../ctx.js';

const TABS = [
  ['orders', 'Orders', 'orders', '/dashboard'],
  ['menu', 'Menu', 'menu', '/dashboard/menu'],
  ['tables', 'Tables & QR', 'qr', '/dashboard/tables'],
  ['reports', 'Reports', 'chart', '/dashboard/reports'],
  ['settings', 'Settings', 'gear', '/dashboard/settings'],
];

// Count of new orders, kept live so the badge shows on every dashboard page
function useNewCount(rid) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let alive = true;
    const load = async () => {
      const { count } = await sb.from('orders').select('id', { count: 'exact', head: true }).eq('restaurant_id', rid).eq('status', 'new');
      if (alive) setN(count || 0);
    };
    load();
    const ch = sb.channel('badge-' + rid).on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: 'restaurant_id=eq.' + rid }, load).subscribe();
    return () => { alive = false; sb.removeChannel(ch); };
  }, [rid]);
  return n;
}

export function DashLayout({ tab, children }) {
  const app = useApp();
  const r = app.restaurant;
  const newCount = useNewCount(r.id);
  const [busy, setBusy] = useState(false);
  useEffect(() => { document.title = (newCount ? '(' + newCount + ') ' : '') + r.name + ' · MenuMitra'; }, [newCount, r.name]);

  const toggleOpen = async () => {
    setBusy(true);
    const { data, error } = await sb.from('restaurants').update({ is_open: !r.is_open }).eq('id', r.id).select().single();
    setBusy(false);
    if (error) { toast(errText(error), 'error'); return; }
    app.setRestaurant(data);
    toast(data.is_open ? 'You are taking orders again' : 'Ordering paused. Diners can still see the menu.');
  };
  const signOut = async () => { await sb.auth.signOut(); navigate('/'); };

  return html`<div class="dash">
    <aside class="dash-side">
      <${Link} href="/" class="brand-link"><${Brand} /><//>
      <div class="dash-rest"><b>${r.name}</b><span class="muted small">${r.area || 'Add your area in Settings'}</span><span class="plan-pill">${PLANS[r.plan].name}</span></div>
      <nav class="dash-nav" aria-label="Dashboard">${TABS.map(([id, label, ic, href]) => html`
        <${Link} href=${href} aria-current=${tab === id ? 'page' : undefined}><${Icon} name=${ic} />${label}${id === 'orders' && newCount ? html`<span class="badge">${newCount}</span>` : ''}<//>`)}
      </nav>
      <div class="dash-side-foot">
        <a class="btn btn-block" href=${menuUrl(r.slug, r.plan === 'freemium' ? null : 1)} target="_blank" rel="noopener"><${Icon} name="eye" />View my menu</a>
        ${app.isAdmin ? html`<${Link} class="btn btn-block" href="/admin"><${Icon} name="shield" />Platform admin<//>` : ''}
        <button class="btn-link muted" onClick=${signOut}><${Icon} name="logout" size=${16} /> Sign out</button>
      </div>
    </aside>
    <div class="dash-main">
      <header class="dash-top">
        <div class="dash-top-name"><b>${r.name}</b><span class="plan-pill">${PLANS[r.plan].name}</span></div>
        <button class=${'open-toggle' + (r.is_open ? ' on' : '')} onClick=${toggleOpen} disabled=${busy} role="switch" aria-checked=${r.is_open} title="Turn ordering on or off">
          <i></i>${r.is_open ? 'Taking orders' : 'Orders paused'}
        </button>
      </header>
      <main class="dash-body">${children}</main>
    </div>
    <nav class="tabbar" aria-label="Dashboard">${TABS.map(([id, label, ic, href]) => html`
      <${Link} href=${href} aria-current=${tab === id ? 'page' : undefined}><span class="tab-ic"><${Icon} name=${ic} size=${22} />${id === 'orders' && newCount ? html`<span class="badge">${newCount}</span>` : ''}</span>${label.split(' ')[0]}<//>`)}
    </nav>
  </div>`;
}
