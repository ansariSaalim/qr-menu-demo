import { html, useState, useEffect, sb, Brand, navigate, errText, slugify, PLANS, PLAN_KEYS, inr0, toast } from '../lib.js';
import { useApp } from '../ctx.js';

export function Setup() {
  const app = useApp();
  const params = new URLSearchParams(location.search);
  const [f, setF] = useState({ name: '', slug: '', slugTouched: false, area: '', phone: '', tables: 10, plan: PLANS[params.get('plan')] ? params.get('plan') : 'basic', sample: true });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  useEffect(() => { if (app.restaurant) navigate('/dashboard', true); }, [app.restaurant]);
  const set = (k, v) => setF((s) => ({ ...s, [k]: v, ...(k === 'name' && !s.slugTouched ? { slug: slugify(v) } : {}) }));

  const submit = async (e) => {
    e.preventDefault(); setErr('');
    if (f.slug.length < 3) { setErr('Your menu link needs at least 3 letters or numbers.'); return; }
    setBusy(true);
    const { error } = await sb.rpc('create_restaurant', { p_name: f.name.trim(), p_slug: f.slug, p_area: f.area.trim(), p_phone: f.phone.trim(), p_tables: Number(f.tables) || 1, p_plan: f.plan, p_sample: f.sample });
    if (error) { setBusy(false); setErr(errText(error)); return; }
    await app.refresh();
    toast(f.name.trim() + ' is ready');
    navigate('/dashboard', true);
  };

  return html`<div class="auth-page"><form class="auth-card wide" onSubmit=${submit}>
    <${Brand} />
    <div><span class="eyebrow">Step 2 of 2</span><h1 class="h2">Tell us about your restaurant</h1><p class="muted">You can change all of this later in Settings.</p></div>
    <label class="field">Restaurant name<input id="su-name" required minlength="2" maxlength="80" value=${f.name} onInput=${(e) => set('name', e.target.value)} placeholder="e.g. Spice Garden" /></label>
    <label class="field">Menu link
      <div class="prefix-input"><span>${location.host}/r/</span><input id="su-slug" required value=${f.slug} onInput=${(e) => setF((s) => ({ ...s, slug: slugify(e.target.value), slugTouched: true }))} placeholder="spice-garden" /></div>
      <small class="hint">Diners see this link when they scan. Letters, numbers and dashes.</small>
    </label>
    <div class="field-row">
      <label class="field">Area and city<input id="su-area" maxlength="120" value=${f.area} onInput=${(e) => set('area', e.target.value)} placeholder="e.g. Satellite, Ahmedabad" /></label>
      <label class="field">Phone<input id="su-phone" inputmode="tel" maxlength="20" value=${f.phone} onInput=${(e) => set('phone', e.target.value)} placeholder="98xxx xxxxx" /></label>
    </div>
    <label class="field">Number of tables
      <div class="stepper big"><button type="button" onClick=${() => set('tables', Math.max(1, Number(f.tables) - 1))} aria-label="One table less">−</button><input id="su-tables" type="number" min="1" max="200" value=${f.tables} onInput=${(e) => set('tables', e.target.value)} /><button type="button" onClick=${() => set('tables', Math.min(200, Number(f.tables) + 1))} aria-label="One table more">+</button></div>
    </label>
    <fieldset class="field"><legend>Plan</legend>
      <div class="plan-pick">${PLAN_KEYS.map((k) => html`<button type="button" aria-pressed=${f.plan === k} onClick=${() => set('plan', k)}><b>${PLANS[k].name}</b><strong>${PLANS[k].price ? inr0(PLANS[k].price) + ' / mo' : 'Free'}</strong><span>${PLANS[k].for}</span></button>`)}</div>
      <small class="hint">Billing is not switched on yet, so every plan is free during the pilot.</small>
    </fieldset>
    <label class="check"><input type="checkbox" id="su-sample" checked=${f.sample} onChange=${(e) => set('sample', e.target.checked)} /><span><b>Start with 10 sample dishes</b><br /><span class="muted small">Edit or delete them later. Unticked, you start with empty categories.</span></span></label>
    ${err ? html`<p class="form-error" role="alert">${err}</p>` : ''}
    <button class="btn btn-primary btn-lg btn-block" disabled=${busy}>${busy ? 'Creating…' : 'Create my restaurant'}</button>
    <button type="button" class="btn-link" onClick=${() => sb.auth.signOut().then(() => navigate('/'))}>Sign out</button>
  </form></div>`;
}
