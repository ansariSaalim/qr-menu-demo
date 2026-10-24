import { html, useState, useEffect, sb, Link, Brand, navigate, errText, toast, Icon } from '../lib.js';
import { useApp } from '../ctx.js';

export function AuthPage({ mode }) {
  const app = useApp();
  const params = new URLSearchParams(location.search);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [sent, setSent] = useState(''); // 'confirm' | 'reset'
  const [forgot, setForgot] = useState(false);
  const isSignup = mode === 'signup';
  const plan = params.get('plan');

  // Already signed in: go where they were heading
  useEffect(() => {
    if (app.ready && app.session) navigate(app.restaurant ? (params.get('next') || '/dashboard') : '/setup' + (plan ? '?plan=' + plan : ''), true);
  }, [app.ready, app.session, app.restaurant]);

  const submit = async (e) => {
    e.preventDefault(); setErr(''); setBusy(true);
    try {
      if (forgot) {
        const { error } = await sb.auth.resetPasswordForEmail(email.trim(), { redirectTo: location.origin + '/login' });
        if (error) throw error;
        setSent('reset');
      } else if (isSignup) {
        if (password.length < 8) throw new Error('Use at least 8 characters for your password.');
        const { data, error } = await sb.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: location.origin + '/setup' } });
        if (error) throw error;
        if (!data.session) setSent('confirm');
      } else {
        const { error } = await sb.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
      }
    } catch (ex) { setErr(errText(ex)); }
    setBusy(false);
  };

  if (sent) {
    return html`<div class="auth-page"><div class="auth-card">
      <${Link} href="/" class="brand-link"><${Brand} /><//>
      <div class="done-mark"><${Icon} name="check" size=${32} /></div>
      <h1 class="h2 center">Check your inbox</h1>
      <p class="center muted">${sent === 'confirm' ? html`We sent a confirmation link to <b>${email}</b>. Open it to finish creating your account.` : html`If <b>${email}</b> has an account, a link to set a new password is on its way.`}</p>
      <button class="btn" onClick=${() => { setSent(''); setForgot(false); }}>Back</button>
    </div></div>`;
  }

  return html`<div class="auth-page"><form class="auth-card" onSubmit=${submit}>
    <${Link} href="/" class="brand-link"><${Brand} /><//>
    <div>
      <h1 class="h2">${forgot ? 'Reset your password' : isSignup ? 'Register your restaurant' : 'Welcome back'}</h1>
      <p class="muted">${forgot ? 'We will email you a link to set a new password.' : isSignup ? 'Create your owner account. Next you will add your restaurant details.' : 'Log in to see your orders and menu.'}</p>
    </div>
    <label class="field">Email
      <input type="email" id="auth-email" autocomplete="email" required value=${email} onInput=${(e) => setEmail(e.target.value)} placeholder="you@restaurant.com" />
    </label>
    ${!forgot ? html`<label class="field">Password
      <div class="pw"><input type=${show ? 'text' : 'password'} id="auth-pw" autocomplete=${isSignup ? 'new-password' : 'current-password'} required minlength=${isSignup ? 8 : 1} value=${password} onInput=${(e) => setPassword(e.target.value)} placeholder=${isSignup ? 'At least 8 characters' : ''} />
      <button type="button" class="pw-toggle" onClick=${() => setShow(!show)} aria-label=${show ? 'Hide password' : 'Show password'}><${Icon} name="eye" /></button></div>
    </label>` : ''}
    ${err ? html`<p class="form-error" role="alert">${err}</p>` : ''}
    <button class="btn btn-primary btn-lg btn-block" disabled=${busy}>${busy ? 'Please wait…' : forgot ? 'Send reset link' : isSignup ? 'Create account' : 'Log in'}</button>
    ${!isSignup ? html`<button type="button" class="btn-link" onClick=${() => { setForgot(!forgot); setErr(''); }}>${forgot ? 'Back to log in' : 'Forgot password?'}</button>` : ''}
    <p class="center muted small">${isSignup ? html`Already registered? <${Link} href="/login">Log in<//>` : html`New to MenuMitra? <${Link} href=${'/signup' + (plan ? '?plan=' + plan : '')}>Register your restaurant<//>`}</p>
  </form></div>`;
}

export function ResetPassword() {
  const app = useApp();
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const submit = async (e) => {
    e.preventDefault(); setErr('');
    if (pw.length < 8) { setErr('Use at least 8 characters.'); return; }
    setBusy(true);
    const { error } = await sb.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) { setErr(errText(error)); return; }
    toast('Password updated');
    app.endRecovery();
    navigate('/dashboard', true);
  };
  return html`<div class="auth-page"><form class="auth-card" onSubmit=${submit}>
    <${Brand} />
    <h1 class="h2">Set a new password</h1>
    <label class="field">New password<input type="password" id="new-pw" autocomplete="new-password" required minlength="8" value=${pw} onInput=${(e) => setPw(e.target.value)} /></label>
    ${err ? html`<p class="form-error" role="alert">${err}</p>` : ''}
    <button class="btn btn-primary btn-lg btn-block" disabled=${busy}>${busy ? 'Saving…' : 'Save password'}</button>
  </form></div>`;
}
