import { html, render, useState, useEffect, sb, navigate, onRoute, Spinner } from './lib.js';
import { AppCtx, useApp } from './ctx.js';
import { Landing } from './pages/landing.js';
import { AuthPage, ResetPassword } from './pages/auth.js';
import { Setup } from './pages/setup.js';
import { Diner } from './pages/diner.js';
import { DashLayout } from './pages/dash-layout.js';
import { Orders } from './pages/dash-orders.js';
import { MenuEditor } from './pages/dash-menu.js';
import { Tables, PrintStandees } from './pages/dash-tables.js';
import { Reports } from './pages/dash-reports.js';
import { Settings } from './pages/dash-settings.js';
import { Admin } from './pages/admin.js';

function useOwner() {
  const [state, setState] = useState({ ready: false, session: null, restaurant: null, isAdmin: false, recovery: false });
  const load = async (session) => {
    if (!session) { setState((s) => ({ ...s, ready: true, session: null, restaurant: null, isAdmin: false })); return; }
    const [{ data: rest }, { data: admin }] = await Promise.all([
      sb.from('restaurants').select('*').eq('owner_id', session.user.id).maybeSingle(),
      sb.from('platform_admins').select('user_id').eq('user_id', session.user.id).maybeSingle(),
    ]);
    setState((s) => ({ ...s, ready: true, session, restaurant: rest || null, isAdmin: !!admin }));
  };
  useEffect(() => {
    sb.auth.getSession().then(({ data }) => load(data.session));
    const { data: sub } = sb.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') setState((s) => ({ ...s, recovery: true }));
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') setTimeout(() => load(session), 0);
    });
    return () => sub.subscription.unsubscribe();
  }, []);
  const refresh = async () => { const { data } = await sb.auth.getSession(); await load(data.session); };
  const setRestaurant = (r) => setState((s) => ({ ...s, restaurant: r }));
  const endRecovery = () => setState((s) => ({ ...s, recovery: false }));
  return { ...state, refresh, setRestaurant, endRecovery };
}

// ---------- Routes ----------
const ROUTES = [
  [/^\/$/, () => html`<${Landing} />`],
  [/^\/login\/?$/, () => html`<${AuthPage} mode="login" />`],
  [/^\/signup\/?$/, () => html`<${AuthPage} mode="signup" />`],
  [/^\/setup\/?$/, () => html`<${Guard} needRestaurant=${false}><${Setup} /><//>`],
  [/^\/dashboard\/?$/, () => html`<${Guard}><${DashLayout} tab="orders"><${Orders} /><//><//>`],
  [/^\/dashboard\/menu\/?$/, () => html`<${Guard}><${DashLayout} tab="menu"><${MenuEditor} /><//><//>`],
  [/^\/dashboard\/tables\/?$/, () => html`<${Guard}><${DashLayout} tab="tables"><${Tables} /><//><//>`],
  [/^\/dashboard\/tables\/print\/?$/, () => html`<${Guard}><${PrintStandees} /><//>`],
  [/^\/dashboard\/reports\/?$/, () => html`<${Guard}><${DashLayout} tab="reports"><${Reports} /><//><//>`],
  [/^\/dashboard\/settings\/?$/, () => html`<${Guard}><${DashLayout} tab="settings"><${Settings} /><//><//>`],
  [/^\/admin\/?$/, () => html`<${Guard} needRestaurant=${false}><${Admin} /><//>`],
  [/^\/r\/([a-z0-9-]+)\/t\/(\d{1,3})\/?$/, (m) => html`<${Diner} slug=${m[1]} table=${Number(m[2])} />`],
  [/^\/r\/([a-z0-9-]+)\/?$/, (m) => html`<${Diner} slug=${m[1]} table=${null} />`],
];

function Guard({ children, needRestaurant = true }) {
  const app = useApp();
  useEffect(() => {
    if (!app.ready) return;
    if (!app.session) navigate('/login?next=' + encodeURIComponent(location.pathname), true);
    else if (needRestaurant && !app.restaurant) navigate('/setup', true);
  }, [app.ready, app.session, app.restaurant]);
  if (!app.ready || !app.session || (needRestaurant && !app.restaurant)) return html`<div class="page-center"><${Spinner} /></div>`;
  return children;
}

function NotFound() {
  return html`<div class="page-center"><div class="card narrow center"><h1 class="h2">Page not found</h1><p class="muted">The link may be wrong or out of date.</p><a class="btn btn-primary" href="/">Go to MenuMitra</a></div></div>`;
}

function App() {
  const owner = useOwner();
  const [path, setPath] = useState(location.pathname);
  useEffect(() => onRoute(() => setPath(location.pathname)), []);
  if (owner.recovery) return html`<${AppCtx.Provider} value=${owner}><${ResetPassword} /><//>`;
  let view = null;
  for (const [re, fn] of ROUTES) { const m = path.match(re); if (m) { view = fn(m); break; } }
  return html`<${AppCtx.Provider} value=${owner}>${view || html`<${NotFound} />`}<//>`;
}

render(html`<${App} />`, document.getElementById('app'));
