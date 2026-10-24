import { html, useState, sb, Icon, PLANS, PLAN_KEYS, inr0, toast, errText, uploadImage, menuUrl, slugify, navigate, initials } from '../lib.js';
import { useApp } from '../ctx.js';

export function Settings() {
  const app = useApp();
  const r = app.restaurant;
  const [f, setF] = useState({ name: r.name, slug: r.slug, area: r.area, phone: r.phone, upi_id: r.upi_id, gst_percent: String(r.gst_percent), logo_url: r.logo_url });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [planBusy, setPlanBusy] = useState(false);
  const [pw, setPw] = useState('');
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  const dirty = Object.keys(f).some((k) => String(f[k] ?? '') !== String(r[k] ?? ''));

  const save = async (e) => {
    e.preventDefault(); setErr('');
    const upi = f.upi_id.trim();
    if (upi && !/^[\w.\-]{2,}@[a-zA-Z][\w.\-]{1,}$/.test(upi)) { setErr('That UPI ID does not look right. It should look like name@bank, for example spicegarden@okhdfcbank.'); return; }
    const gst = Number(f.gst_percent);
    if (!(gst >= 0 && gst <= 28)) { setErr('GST must be between 0 and 28%.'); return; }
    setBusy(true);
    const { data, error } = await sb.from('restaurants').update({ name: f.name.trim(), slug: slugify(f.slug), area: f.area.trim(), phone: f.phone.trim(), upi_id: upi, gst_percent: gst, logo_url: f.logo_url }).eq('id', r.id).select().single();
    setBusy(false);
    if (error) { setErr(/duplicate|unique/i.test(error.message) ? 'That menu link is taken. Try another.' : errText(error)); return; }
    app.setRestaurant(data);
    toast('Settings saved');
  };
  const onLogo = async (e) => {
    const file = e.target.files && e.target.files[0]; e.target.value = '';
    if (!file) return;
    try { set('logo_url', await uploadImage(file, r.id)); toast('Logo ready. Save to apply.'); } catch (ex) { toast(errText(ex), 'error'); }
  };
  const choosePlan = async (k) => {
    if (k === r.plan) return;
    setPlanBusy(true);
    const { data, error } = await sb.from('restaurants').update({ plan: k }).eq('id', r.id).select().single();
    setPlanBusy(false);
    if (error) { toast(errText(error), 'error'); return; }
    app.setRestaurant(data);
    toast('You are on ' + PLANS[k].name + ' now');
  };
  const changePw = async (e) => {
    e.preventDefault();
    if (pw.length < 8) { toast('Use at least 8 characters', 'error'); return; }
    const { error } = await sb.auth.updateUser({ password: pw });
    if (error) { toast(errText(error), 'error'); return; }
    setPw(''); toast('Password changed');
  };
  const link = menuUrl(slugify(f.slug) || r.slug);

  return html`
    <div class="page-h"><div><h1 class="h2">Settings</h1><p class="muted">What diners see on your menu, and how they pay you.</p></div></div>
    <form class="card form-card" onSubmit=${save}>
      <h2 class="h3">Restaurant</h2>
      <div class="logo-row">
        ${f.logo_url ? html`<img class="logo-img" src=${f.logo_url} alt="Logo" />` : html`<span class="logo-ph">${initials(f.name)}</span>`}
        <div class="row-gap"><label class="btn btn-sm"><${Icon} name="camera" size=${16} />${f.logo_url ? 'Change logo' : 'Add logo'}<input type="file" accept="image/jpeg,image/png,image/webp" hidden onChange=${onLogo} /></label>
        ${f.logo_url ? html`<button type="button" class="btn-link small" onClick=${() => set('logo_url', null)}>Remove</button>` : ''}</div>
      </div>
      <label class="field">Name<input id="st-name" required minlength="2" maxlength="80" value=${f.name} onInput=${(e) => set('name', e.target.value)} /></label>
      <label class="field">Menu link<div class="prefix-input"><span>${location.host}/r/</span><input id="st-slug" required value=${f.slug} onInput=${(e) => set('slug', slugify(e.target.value))} /></div>
        <small class="hint">Changing this breaks QR codes you already printed.</small></label>
      <div class="field-row">
        <label class="field">Area and city<input id="st-area" maxlength="120" value=${f.area} onInput=${(e) => set('area', e.target.value)} /></label>
        <label class="field">Phone<input id="st-phone" inputmode="tel" maxlength="20" value=${f.phone} onInput=${(e) => set('phone', e.target.value)} /></label>
      </div>
      <h2 class="h3 mt">Payments</h2>
      <label class="field">Your UPI ID<input id="st-upi" maxlength="80" placeholder="e.g. spicegarden@okhdfcbank" value=${f.upi_id} onInput=${(e) => set('upi_id', e.target.value)} autocomplete="off" />
        <small class="hint">Diners pay this UPI ID from their phone. Money goes straight to you; MenuMitra never touches it. ${PLANS[r.plan] && r.plan !== 'advanced' && r.plan !== 'premium' ? 'Paying from the table is on Advanced and Premium.' : ''}</small></label>
      <label class="field narrow-field">GST on food (%)<input id="st-gst" type="number" min="0" max="28" step="0.5" value=${f.gst_percent} onInput=${(e) => set('gst_percent', e.target.value)} />
        <small class="hint">Most standalone restaurants charge 5%. Ask your accountant if unsure.</small></label>
      ${err ? html`<p class="form-error" role="alert">${err}</p>` : ''}
      <div class="form-foot"><span class="muted small">${dirty ? 'You have unsaved changes' : 'All changes saved'}</span><button class="btn btn-primary" disabled=${busy || !dirty}>${busy ? 'Saving…' : 'Save changes'}</button></div>
    </form>

    <section class="card">
      <h2 class="h3">Your menu link</h2>
      <p class="link-line"><a href=${link} target="_blank" rel="noopener">${link}</a></p>
      <div class="row-gap"><button class="btn btn-sm" onClick=${async () => { try { await navigator.clipboard.writeText(link); toast('Link copied'); } catch (e) { toast('Copy failed. Long-press the link to copy it.', 'error'); } }}><${Icon} name="link" size=${16} />Copy</button>
      <a class="btn btn-sm" href=${'https://wa.me/?text=' + encodeURIComponent('See our menu: ' + link)} target="_blank" rel="noopener">Share on WhatsApp</a></div>
    </section>

    <section class="card">
      <h2 class="h3">Plan</h2>
      <p class="muted small">Billing is not switched on yet. Every plan is free while MenuMitra is in pilot.</p>
      <div class="plan-pick">${PLAN_KEYS.map((k) => html`<button type="button" aria-pressed=${r.plan === k} disabled=${planBusy} onClick=${() => choosePlan(k)}><b>${PLANS[k].name}</b><strong>${PLANS[k].price ? inr0(PLANS[k].price) + ' / mo' : 'Free'}</strong><span>${PLANS[k].perks.slice(0, 2).join(' · ')}</span></button>`)}</div>
    </section>

    <section class="card">
      <h2 class="h3">Account</h2>
      <p class="muted small">Signed in as <b>${app.session.user.email}</b></p>
      <form class="rows-line" onSubmit=${changePw}><input type="password" id="st-pw" autocomplete="new-password" placeholder="New password, 8+ characters" value=${pw} onInput=${(e) => setPw(e.target.value)} /><button class="btn" disabled=${!pw}>Change password</button></form>
      <button class="btn btn-ghost" onClick=${async () => { await sb.auth.signOut(); navigate('/'); }}><${Icon} name="logout" size=${16} />Sign out</button>
    </section>`;
}
