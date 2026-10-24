import { html, useState, Link, Brand, Icon, PLANS, PLAN_KEYS, inr0, VegMark } from '../lib.js';
import { useApp } from '../ctx.js';

const STEPS = [
  ['Add your menu', 'Type dishes and prices, add photos, mark veg or non-veg. Start from our sample menu and edit it in minutes.'],
  ['Print your table QR codes', 'One QR per table, ready to print on a standee. The table number comes with every order.'],
  ['Take orders live', 'Diners order from their phone. Orders pop up on your screen with a sound and print in the kitchen.'],
];
const BENEFITS = [
  ['No reprinting', 'Change a price or mark a dish sold out and every table sees it at once.'],
  ['Fewer wrong orders', 'The diner\'s own choice goes to the kitchen. No mishearing, no handwriting.'],
  ['Faster tables', 'No waiting for the menu, the waiter or the bill means more covers at peak hours.'],
  ['Know what sells', 'Top dishes and busy hours tell you what to promote and when to add staff.'],
];
const FAQ = [
  ['Do diners need to install an app?', 'No. They scan the QR with their phone camera and the menu opens in the browser.'],
  ['What do I need in the restaurant?', 'Any phone, tablet or laptop with internet for the order screen. A thermal printer is optional for kitchen tickets.'],
  ['Do you take a commission on orders?', 'No. You pay a flat monthly plan. Every order and every rupee is yours.'],
  ['How do diners pay?', 'By UPI straight to your UPI ID, or at the counter as usual. You confirm the payment on your screen.'],
];

export function Landing() {
  const app = useApp();
  const [annual, setAnnual] = useState(false);
  const signedIn = app && app.session;
  return html`
  <div class="site">
    <header class="site-top"><div class="wrap site-top-in">
      <${Link} href="/" class="brand-link"><${Brand} /><//>
      <nav class="site-nav" aria-label="Main">
        <a href="#how">How it works</a><a href="#pricing">Pricing</a><a href="/r/demo/t/1">Try as a diner</a>
      </nav>
      <div class="site-cta">
        ${signedIn ? html`<${Link} class="btn btn-primary" href="/dashboard">Open dashboard<//>` : html`<${Link} class="btn btn-ghost" href="/login">Log in<//><${Link} class="btn btn-primary" href="/signup">Get started<//>`}
      </div>
    </div></header>

    <section class="hero"><div class="wrap hero-in">
      <div class="hero-copy">
        <span class="eyebrow">QR menu and table ordering for Indian restaurants</span>
        <h1>Your menu on every table. Orders straight to your kitchen.</h1>
        <p class="lead">Diners scan, order and pay from their phone. You see every order live, with the table number. Set up in 30 minutes, free to start.</p>
        <div class="hero-btns">
          <${Link} class="btn btn-primary btn-lg" href=${signedIn ? '/dashboard' : '/signup'}>${signedIn ? 'Open your dashboard' : 'Register your restaurant'}<//>
          <a class="btn btn-lg" href="/r/demo/t/1">Try it as a diner</a>
        </div>
        <p class="fine">No commission on orders · No app for diners · Works on any phone</p>
      </div>
      <div class="hero-art" aria-hidden="true">
        <div class="mini-phone">
          <div class="mini-head"><b>Spice Garden</b><span class="pill-table">Table 5</span></div>
          ${[['Paneer Tikka', 260, true, 'Bestseller'], ['Chicken 65', 290, false, 'Spicy'], ['Dal Makhani', 240, true, ''], ['Butter Naan', 60, true, '']].map(([n, p, v, t]) => html`
            <div class="mini-dish"><div><${VegMark} veg=${v} /> ${t ? html`<span class="tag">${t}</span>` : ''}<b>${n}</b><span>${inr0(p)}</span></div><span class="mini-add">ADD</span></div>`)}
          <div class="mini-cart">3 items · ₹590 <span>View cart →</span></div>
        </div>
        <div class="mini-order">
          <div class="mini-order-h"><span class="tno">T5</span><b>#118</b><small>just now</small></div>
          <p>1× Paneer Tikka<br />2× Butter Naan<br />1× Dal Makhani</p>
          <span class="mini-accept">Accept</span>
        </div>
      </div>
    </div></section>

    <section class="band" id="how"><div class="wrap">
      <h2 class="h2 center">Live in three steps</h2>
      <ol class="steps3">${STEPS.map(([t, d]) => html`<li><b>${t}</b><p>${d}</p></li>`)}</ol>
    </div></section>

    <section class="band alt"><div class="wrap">
      <h2 class="h2 center">What changes in your restaurant</h2>
      <div class="benefits">${BENEFITS.map(([t, d]) => html`<div class="benefit"><span class="benefit-ic"><${Icon} name="check" /></span><b>${t}</b><p>${d}</p></div>`)}</div>
    </div></section>

    <section class="band" id="pricing"><div class="wrap">
      <h2 class="h2 center">Simple plans, no commission</h2>
      <p class="center muted">Unlimited orders on every plan. Prices exclude 18% GST.</p>
      <div class="center" style="margin:16px 0 24px">
        <div class="seg" role="group" aria-label="Billing period"><button aria-pressed=${!annual} onClick=${() => setAnnual(false)}>Monthly</button><button aria-pressed=${annual} onClick=${() => setAnnual(true)}>Yearly · 2 months free</button></div>
      </div>
      <div class="plans">${PLAN_KEYS.map((k) => { const p = PLANS[k]; return html`
        <div class=${'plan' + (k === 'advanced' ? ' rec' : '')}>
          ${k === 'advanced' ? html`<span class="rec-tag">Recommended</span>` : ''}
          <h3>${p.name}</h3><p class="muted small">${p.for}</p>
          <div class="price"><b>${p.price ? inr0(annual ? p.annual : p.price) : '₹0'}</b><span>${p.price ? (annual ? '/ year' : '/ month') : 'forever'}</span></div>
          <ul>${p.perks.map((x) => html`<li><${Icon} name="check" size=${16} />${x}</li>`)}</ul>
          <${Link} class=${'btn ' + (k === 'advanced' ? 'btn-primary' : '')} href=${signedIn ? '/dashboard/settings' : '/signup?plan=' + k}>${k === 'freemium' ? 'Start free' : 'Choose ' + p.name}<//>
        </div>`; })}</div>
    </div></section>

    <section class="band alt"><div class="wrap narrow-wrap">
      <h2 class="h2 center">Questions owners ask</h2>
      <div class="faq">${FAQ.map(([q, a]) => html`<details><summary>${q}</summary><p>${a}</p></details>`)}</div>
      <div class="center" style="margin-top:28px"><${Link} class="btn btn-primary btn-lg" href=${signedIn ? '/dashboard' : '/signup'}>${signedIn ? 'Open your dashboard' : 'Register your restaurant'}<//></div>
    </div></section>

    <footer class="site-foot"><div class="wrap site-foot-in"><${Brand} /><span class="muted small">© ${new Date().getFullYear()} MenuMitra</span></div></footer>
  </div>`;
}
