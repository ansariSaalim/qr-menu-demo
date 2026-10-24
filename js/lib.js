// Shared library: UI runtime, Supabase client and small helpers used across MenuMitra.
export { h, html, render, useState, useEffect, useRef, useMemo, useCallback, useContext, createContext } from 'https://cdn.jsdelivr.net/npm/htm@3.1.1/preact/standalone.module.js';
import { html as _html } from 'https://cdn.jsdelivr.net/npm/htm@3.1.1/preact/standalone.module.js';
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm';

export const SUPABASE_URL = 'https://tnffprnunuaukqzpbufy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRuZmZwcm51bnVhdWtxenBidWZ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI4MjA1NjUsImV4cCI6MjEwODM5NjU2NX0.xeAcys_mk41WecoAHvqHhosliosEOqDLj2B_rx0VQK4';
export const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

// ---------- Plans ----------
export const PLANS = {
  freemium: { name: 'Freemium', price: 0, annual: 0, for: 'Tea stalls, juice shops, trying it out', perks: ['Digital menu with photos', 'Veg / non-veg marks and search', 'Sold-out in one tap', 'One menu QR code'] },
  basic: { name: 'Basic', price: 199, annual: 1990, for: 'Small cafes, dhabas, quick service', perks: ['Diners order from the table', 'Up to 10 table QR codes', 'Live orders with sound alert', 'Kitchen ticket printing', 'Today\'s sales summary'] },
  advanced: { name: 'Advanced', price: 449, annual: 4490, for: 'Family restaurants, busy cafes', perks: ['Everything in Basic', 'Unlimited tables', 'UPI payment from the table', 'Full reports: top dishes, busy hours'] },
  premium: { name: 'Premium', price: 899, annual: 8990, for: 'Fine dine, restobars, small chains', perks: ['Everything in Advanced', 'No MenuMitra branding on your menu', 'Priority WhatsApp support', 'Setup done for you'] },
};
export const PLAN_KEYS = ['freemium', 'basic', 'advanced', 'premium'];
const RANK = { freemium: 0, basic: 1, advanced: 2, premium: 3 };
const NEED = { order: 'basic', upi: 'advanced', reports: 'advanced', unlimitedTables: 'advanced', brand: 'premium' };
export const can = (plan, feature) => RANK[plan || 'freemium'] >= RANK[NEED[feature]];
export const maxTables = (r) => (r.plan === 'freemium' ? 0 : r.plan === 'basic' ? Math.min(10, r.table_count) : r.table_count);

// ---------- Formatting ----------
export const inr = (n) => '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
export const inr0 = (n) => '₹' + Math.round(Number(n || 0)).toLocaleString('en-IN');
export const clock = (t) => new Date(t).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
export const ago = (t) => {
  const m = Math.max(0, Math.round((Date.now() - new Date(t).getTime()) / 60000));
  if (m < 1) return 'just now';
  if (m < 60) return m + ' min ago';
  const hrs = Math.floor(m / 60);
  return hrs + ' h ' + (m % 60) + ' min ago';
};
export const slugify = (s) => String(s || '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
export const initials = (s) => String(s || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
export const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => { const r = (Math.random() * 16) | 0; return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16); }));
export const errText = (e) => {
  const m = (e && (e.message || e.error_description || e.msg)) || String(e || 'Something went wrong');
  if (/Failed to fetch|NetworkError/i.test(m)) return 'No internet connection. Check your network and try again.';
  if (/Invalid login credentials/i.test(m)) return 'That email and password do not match.';
  if (/User already registered/i.test(m)) return 'An account with this email already exists. Log in instead.';
  if (/Email not confirmed/i.test(m)) return 'Confirm your email first: open the link we sent you, then log in.';
  return m.replace(/^.*?ERROR:\s*/, '');
};
export const startOfDay = (d = new Date()) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
export const menuUrl = (slug, table) => location.origin + '/r/' + slug + (table ? '/t/' + table : '');

// ---------- Local storage (never required for the app to work) ----------
export const store = {
  get(k, fallback) { try { const v = localStorage.getItem(k); return v === null ? fallback : JSON.parse(v); } catch (e) { return fallback; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage blocked */ } },
  del(k) { try { localStorage.removeItem(k); } catch (e) { /* storage blocked */ } },
};
// One anonymous session per restaurant on this phone, so a diner only ever sees their own orders
const memSessions = {};
export const dinerSession = (slug) => {
  const key = 'mm_session_' + slug;
  let s = store.get(key, null) || memSessions[key];
  if (!s) { s = uuid(); store.set(key, s); }
  memSessions[key] = s;
  return s;
};

// ---------- Toasts ----------
export function toast(msg, kind) {
  let box = document.getElementById('toasts');
  if (!box) { box = document.createElement('div'); box.id = 'toasts'; box.className = 'toasts'; box.setAttribute('aria-live', 'polite'); document.body.appendChild(box); }
  const el = document.createElement('div');
  el.className = 'toast' + (kind ? ' toast-' + kind : '');
  el.textContent = msg;
  box.appendChild(el);
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 300); }, kind === 'error' ? 5200 : 3200);
}

// ---------- Sound ----------
let audioCtx = null;
export function unlockAudio() {
  try { audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)(); if (audioCtx.state === 'suspended') audioCtx.resume(); return true; } catch (e) { return false; }
}
export function chime() {
  if (!audioCtx) return;
  try {
    const t0 = audioCtx.currentTime;
    [880, 1175, 1568].forEach((f, i) => {
      const o = audioCtx.createOscillator(), g = audioCtx.createGain(), t = t0 + i * 0.16;
      o.type = 'sine'; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.3, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
      o.connect(g).connect(audioCtx.destination); o.start(t); o.stop(t + 0.25);
    });
  } catch (e) { /* no audio */ }
}

// ---------- QR codes (qrcode-generator, loaded as a global script) ----------
export function qrMatrix(text) {
  if (typeof window.qrcode !== 'function') return null;
  const q = window.qrcode(0, 'M'); q.addData(text); q.make();
  const n = q.getModuleCount(), rows = [];
  for (let r = 0; r < n; r++) { const row = []; for (let c = 0; c < n; c++) row.push(q.isDark(r, c)); rows.push(row); }
  return rows;
}
export function drawQR(ctx, text, x, y, size, dark = '#15201a', light = '#ffffff') {
  const m = qrMatrix(text);
  ctx.fillStyle = light; ctx.fillRect(x, y, size, size);
  if (!m) return;
  const n = m.length, quiet = 2, cell = size / (n + quiet * 2);
  ctx.fillStyle = dark;
  m.forEach((row, r) => row.forEach((on, c) => { if (on) ctx.fillRect(Math.floor(x + (c + quiet) * cell), Math.floor(y + (r + quiet) * cell), Math.ceil(cell), Math.ceil(cell)); }));
}
export function qrDataUrl(text, size = 240) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  drawQR(c.getContext('2d'), text, 0, 0, size);
  return c.toDataURL('image/png');
}
// A printable table standee: brand band, restaurant name, QR, table number
export function standeeCanvas({ name, table, url, branded }) {
  const W = 900, H = 1300, c = document.createElement('canvas'); c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#1d5a39'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center';
  ctx.font = '700 64px "Bricolage Grotesque", system-ui, sans-serif';
  wrapText(ctx, name, W / 2, 140, W - 140, 72);
  ctx.font = '500 40px Figtree, system-ui, sans-serif';
  ctx.fillText(table ? 'Scan to order from your table' : 'Scan to see our menu', W / 2, 290);
  ctx.fillStyle = '#ffffff'; roundRect(ctx, 150, 340, 600, 600, 36); ctx.fill();
  drawQR(ctx, url, 180, 370, 540);
  ctx.fillStyle = '#e3a114'; roundRect(ctx, W / 2 - 170, 990, 340, 100, 50); ctx.fill();
  ctx.fillStyle = '#3a2800'; ctx.font = '700 52px "JetBrains Mono", ui-monospace, monospace';
  ctx.fillText(table ? 'TABLE ' + table : 'MENU', W / 2, 1058);
  ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.font = '500 32px Figtree, system-ui, sans-serif';
  ctx.fillText(branded ? 'No app needed · pay by UPI' : 'No app needed · Powered by MenuMitra', W / 2, 1180);
  return c;
}
function roundRect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
function wrapText(ctx, text, x, y, maxW, lh) {
  const words = String(text).split(' '); let line = '', lines = [];
  words.forEach((w) => { const t = line ? line + ' ' + w : w; if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t; });
  lines.push(line); lines = lines.slice(0, 2);
  lines.forEach((l, i) => ctx.fillText(l, x, y + i * lh - (lines.length - 1) * lh / 2));
}
export function downloadCanvas(canvas, filename) {
  const a = document.createElement('a'); a.href = canvas.toDataURL('image/png'); a.download = filename; document.body.appendChild(a); a.click(); a.remove();
}
export const upiLink = ({ upi, name, amount, note }) => 'upi://pay?pa=' + encodeURIComponent(upi) + '&pn=' + encodeURIComponent(name) + '&am=' + Number(amount).toFixed(2) + '&cu=INR&tn=' + encodeURIComponent(note);

// ---------- Images: shrink before upload so menus load fast on mobile data ----------
export async function uploadImage(file, restaurantId) {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) throw new Error('Use a JPG, PNG or WebP photo');
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, 900 / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas'); c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale);
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  const blob = await new Promise((res) => c.toBlob(res, 'image/webp', 0.82));
  const path = restaurantId + '/' + uuid() + '.webp';
  const { error } = await sb.storage.from('menu-images').upload(path, blob, { contentType: 'image/webp', upsert: false });
  if (error) throw error;
  return sb.storage.from('menu-images').getPublicUrl(path).data.publicUrl;
}

// ---------- Router ----------
const listeners = new Set();
export function navigate(to, replace) {
  if (to === location.pathname + location.search) return;
  history[replace ? 'replaceState' : 'pushState']({}, '', to);
  window.scrollTo(0, 0);
  listeners.forEach((fn) => fn());
}
export function onRoute(fn) { listeners.add(fn); return () => listeners.delete(fn); }
window.addEventListener('popstate', () => listeners.forEach((fn) => fn()));
export function Link({ href, children, ...rest }) {
  const click = (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || rest.target) return;
    e.preventDefault(); navigate(href);
  };
  return _html`<a href=${href} onClick=${click} ...${rest}>${children}</a>`;
}

// ---------- Small shared bits ----------
export const VegMark = ({ veg }) => _html`<span class=${'vm ' + (veg ? 'veg' : 'nv')} role="img" aria-label=${veg ? 'Veg' : 'Non-veg'}></span>`;
const PLATE = [['#d9722e', '#f4c98d'], ['#4f8a3b', '#a9cf74'], ['#b8361f', '#e8784a'], ['#e8b62c', '#f6dc7c'], ['#6b3a22', '#c98b57'], ['#c9782c', '#f0d39a'], ['#e9cf96', '#c8923f'], ['#7a2f14', '#c26a32']];
export const plateColors = (name) => { let hsh = 0; for (const ch of String(name)) hsh = (hsh * 31 + ch.charCodeAt(0)) >>> 0; return PLATE[hsh % PLATE.length]; };
export const DishImage = ({ item, size }) => item.image_url
  ? _html`<img class=${'dish-photo ' + (size || '')} src=${item.image_url} alt="" loading="lazy" />`
  : _html`<div class=${'plate ' + (size || '')} style=${'--c1:' + plateColors(item.name)[0] + ';--c2:' + plateColors(item.name)[1]} aria-hidden="true"></div>`;
export const Spinner = ({ label }) => _html`<div class="loading" role="status"><span class="spin"></span>${label || 'Loading…'}</div>`;
export const Logo = () => _html`<span class="logo-mark" aria-hidden="true"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.6"/><rect x="5.6" y="5.6" width="1.8" height="1.8" fill="currentColor" stroke="none"/><circle cx="15.5" cy="15.5" r="5.5"/><circle cx="15.5" cy="15.5" r="2.2"/><path d="M3 14v7M6.5 14v3.5M14 3h7M14 6.5h3.5"/></svg></span>`;
export const Brand = () => _html`<span class="brand">${_html`<${Logo} />`}<b>Menu<span>Mitra</span></b></span>`;

export const ICONS = {
  orders: 'M6 3.5h12a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-13a2 2 0 0 1 2-2zM8 8h8M8 12h8M8 16h5',
  menu: 'M7 3v8a2 2 0 0 0 2 2v8M11 3v6M5 3v6M17 21V3c-2 1-3 4-3 7s1 4 3 4',
  qr: 'M3.5 3.5h7v7h-7zM13.5 3.5h7v7h-7zM3.5 13.5h7v7h-7zM14 14h3v3h-3zM18 18h2.5v2.5H18z',
  chart: 'M4 20h16M7 16v-5M12 16V7M17 16v-8',
  gear: 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM12 2.5V5M12 19v2.5M4.6 4.6l1.8 1.8M17.6 17.6l1.8 1.8M2.5 12H5M19 12h2.5M4.6 19.4l1.8-1.8M17.6 6.4l1.8-1.8',
  bell: 'M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15zM10 20a2 2 0 0 0 4 0',
  back: 'M15 18l-6-6 6-6',
  search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-3.5-3.5',
  plus: 'M12 5v14M5 12h14',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  x: 'M6 6l12 12M18 6L6 18',
  edit: 'M4 20h4L19 9l-4-4L4 16zM14 6l4 4',
  trash: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13',
  print: 'M7 8V3h10v5M6 17H4v-7h16v7h-2M7 14h10v7H7z',
  download: 'M12 4v11M7 10l5 5 5-5M5 20h14',
  link: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',
  eye: 'M2.5 12s3.5-6.5 9.5-6.5S21.5 12 21.5 12s-3.5 6.5-9.5 6.5S2.5 12 2.5 12zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
  logout: 'M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10',
  sound: 'M4 9v6h4l5 4V5L8 9zM16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12',
  mute: 'M4 9v6h4l5 4V5L8 9zM17 9l5 6M22 9l-5 6',
  up: 'M6 15l6-6 6 6',
  down: 'M6 9l6 6 6-6',
  camera: 'M4 8h3l2-3h6l2 3h3v11H4zM12 10.5a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
  people: 'M9 4.8a3.2 3.2 0 1 0 0 6.4 3.2 3.2 0 0 0 0-6.4zM3 20c.6-3.4 3-5.2 6-5.2s5.4 1.8 6 5.2M17 6.4a2.6 2.6 0 1 0 0 5.2M16.5 14.6c2.5.2 4 1.8 4.5 4.6',
  shield: 'M12 3l7.5 3v5.6c0 4.4-3.1 8.2-7.5 9.4-4.4-1.2-7.5-5-7.5-9.4V6z',
};
export const Icon = ({ name, size }) => _html`<svg class="ic" width=${size || 18} height=${size || 18} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d=${ICONS[name]} /></svg>`;
