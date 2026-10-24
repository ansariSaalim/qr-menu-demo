import { html, useState, useEffect, sb, Icon, VegMark, DishImage, inr, toast, errText, uploadImage } from '../lib.js';
import { useApp } from '../ctx.js';

const TAGS = ['Bestseller', "Chef's special", 'Spicy', 'Jain on request', 'New'];
const blankDish = (catId) => ({ id: null, name: '', description: '', price: '', is_veg: true, in_stock: true, image_url: null, tags: [], variants: [], addons: [], category_id: catId || null });

export function MenuEditor() {
  const app = useApp();
  const r = app.restaurant;
  const [cats, setCats] = useState(null);
  const [items, setItems] = useState([]);
  const [q, setQ] = useState('');
  const [catFilter, setCatFilter] = useState('all');
  const [edit, setEdit] = useState(null);
  const [catsOpen, setCatsOpen] = useState(false);

  const load = async () => {
    const [c, m] = await Promise.all([
      sb.from('categories').select('*').eq('restaurant_id', r.id).order('sort').order('created_at'),
      sb.from('menu_items').select('*').eq('restaurant_id', r.id).order('sort').order('created_at'),
    ]);
    if (c.error || m.error) { toast(errText(c.error || m.error), 'error'); return; }
    setCats(c.data); setItems(m.data);
  };
  useEffect(() => { load(); }, [r.id]);

  const toggleStock = async (it) => {
    setItems((l) => l.map((x) => (x.id === it.id ? { ...x, in_stock: !x.in_stock } : x)));
    const { error } = await sb.from('menu_items').update({ in_stock: !it.in_stock }).eq('id', it.id);
    if (error) { toast(errText(error), 'error'); load(); return; }
    toast(it.name + (it.in_stock ? ' marked sold out' : ' is back on the menu'));
  };

  if (!cats) return html`<div class="loading"><span class="spin"></span>Loading menu…</div>`;
  const limit = r.plan === 'freemium' ? 30 : null;
  const needle = q.trim().toLowerCase();
  const shown = items.filter((i) => (catFilter === 'all' || i.category_id === catFilter || (catFilter === 'none' && !i.category_id)) && (!needle || (i.name + ' ' + i.description).toLowerCase().includes(needle)));
  const groups = [...cats.map((c) => [c.id, c.name]), ['none', 'Other']];
  const soldOut = items.filter((i) => !i.in_stock).length;

  return html`
    <div class="page-h">
      <div><h1 class="h2">Menu</h1><p class="muted">${items.length} dishes${limit ? ' of 30 on Freemium' : ''}${soldOut ? ' · ' + soldOut + ' sold out' : ''}. Changes show on every table instantly.</p></div>
      <div class="row-gap">
        <button class="btn" onClick=${() => setCatsOpen(true)}>Categories</button>
        <button class="btn btn-primary" disabled=${limit && items.length >= limit} onClick=${() => setEdit(blankDish(catFilter !== 'all' && catFilter !== 'none' ? catFilter : cats[0] && cats[0].id))}><${Icon} name="plus" />Add dish</button>
      </div>
    </div>
    <div class="toolbar">
      <label class="search"><${Icon} name="search" size=${16} /><input id="menu-q" placeholder="Search your dishes" value=${q} onInput=${(e) => setQ(e.target.value)} /></label>
      <div class="chips scroll-x" role="group" aria-label="Filter by category">
        <button class="chip" aria-pressed=${catFilter === 'all'} onClick=${() => setCatFilter('all')}>All</button>
        ${cats.map((c) => html`<button class="chip" aria-pressed=${catFilter === c.id} onClick=${() => setCatFilter(c.id)}>${c.name}</button>`)}
      </div>
    </div>
    ${items.length === 0 ? html`<div class="empty card"><h2 class="h3">Your menu is empty</h2><p class="muted">Add your first dish. It takes under a minute.</p><button class="btn btn-primary" onClick=${() => setEdit(blankDish(cats[0] && cats[0].id))}><${Icon} name="plus" />Add dish</button></div>` : ''}
    ${groups.map(([gid, gname]) => {
      const list = shown.filter((i) => (gid === 'none' ? !i.category_id || !cats.some((c) => c.id === i.category_id) : i.category_id === gid));
      if (!list.length) return '';
      return html`<section class="menu-group"><h2 class="group-h">${gname}<span>${list.length}</span></h2>
        <div class="card flush">${list.map((it) => html`<div class=${'menu-row' + (it.in_stock ? '' : ' out')} key=${it.id}>
          <button class="menu-row-main" onClick=${() => setEdit({ ...it, price: String(it.price) })} aria-label=${'Edit ' + it.name}>
            <${DishImage} item=${it} size="sm" />
            <span class="menu-row-txt"><span class="menu-row-name"><${VegMark} veg=${it.is_veg} /> ${it.name}</span>
            <small class="muted">${it.variants.length ? it.variants.map((v) => v.name + ' ' + inr(v.price)).join(' · ') : inr(it.price)}${it.addons.length ? ' · ' + it.addons.length + ' add-on' + (it.addons.length > 1 ? 's' : '') : ''}</small></span>
          </button>
          <button class="switch" role="switch" aria-checked=${it.in_stock} onClick=${() => toggleStock(it)} aria-label=${it.name + ' available'}><i></i><span>${it.in_stock ? 'Available' : 'Sold out'}</span></button>
        </div>`)}</div></section>`;
    })}
    ${items.length && !shown.length ? html`<p class="muted center">No dishes match.</p>` : ''}
    ${edit ? html`<${DishEditor} dish=${edit} cats=${cats} r=${r} onClose=${() => setEdit(null)} onSaved=${() => { setEdit(null); load(); }} />` : ''}
    ${catsOpen ? html`<${CategoryManager} cats=${cats} items=${items} r=${r} onClose=${() => { setCatsOpen(false); load(); }} />` : ''}
  `;
}

function RowsEditor({ label, hint, rows, onChange, placeholder }) {
  const set = (i, k, v) => onChange(rows.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
  return html`<fieldset class="field rows-edit"><legend>${label}</legend>${hint ? html`<small class="hint">${hint}</small>` : ''}
    ${rows.map((row, i) => html`<div class="rows-line">
      <input aria-label=${label + ' name'} placeholder=${placeholder} value=${row.name} onInput=${(e) => set(i, 'name', e.target.value)} />
      <div class="money"><span>₹</span><input aria-label=${label + ' price'} type="number" min="0" step="1" inputmode="numeric" value=${row.price} onInput=${(e) => set(i, 'price', e.target.value)} /></div>
      <button type="button" class="btn btn-sm icon-only" onClick=${() => onChange(rows.filter((_, j) => j !== i))} aria-label="Remove"><${Icon} name="x" size=${16} /></button>
    </div>`)}
    <button type="button" class="btn-link" onClick=${() => onChange([...rows, { name: '', price: '' }])}>+ Add ${label.toLowerCase().replace(/s$/, '').replace(/ \(.*/, '')}</button>
  </fieldset>`;
}

function DishEditor({ dish, cats, r, onClose, onSaved }) {
  const [d, setD] = useState({ ...dish, variants: dish.variants.map((v) => ({ ...v, price: String(v.price) })), addons: dish.addons.map((v) => ({ ...v, price: String(v.price) })) });
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState('');
  const [confirmDel, setConfirmDel] = useState(false);
  const set = (k, v) => setD((s) => ({ ...s, [k]: v }));
  const hasPortions = d.variants.length > 0;

  const onPhoto = async (e) => {
    const file = e.target.files && e.target.files[0]; e.target.value = '';
    if (!file) return;
    setUploading(true);
    try { set('image_url', await uploadImage(file, r.id)); } catch (ex) { toast(errText(ex), 'error'); }
    setUploading(false);
  };
  const clean = (rows) => rows.filter((x) => x.name.trim()).map((x) => ({ name: x.name.trim().slice(0, 40), price: Math.max(0, Number(x.price) || 0) }));

  const save = async (e) => {
    e.preventDefault(); setErr('');
    const variants = clean(d.variants), addons = clean(d.addons);
    if (!d.name.trim()) { setErr('Give the dish a name.'); return; }
    if (new Set(variants.map((v) => v.name.toLowerCase())).size !== variants.length) { setErr('Two portions have the same name.'); return; }
    const price = variants.length ? Math.min(...variants.map((v) => v.price)) : Number(d.price);
    if (!(price >= 0) || d.price === '' && !variants.length) { setErr('Add a price.'); return; }
    const row = { restaurant_id: r.id, name: d.name.trim(), description: d.description.trim(), price, is_veg: d.is_veg, in_stock: d.in_stock, image_url: d.image_url, tags: d.tags, variants, addons, category_id: d.category_id || null };
    setBusy(true);
    const res = d.id ? await sb.from('menu_items').update(row).eq('id', d.id) : await sb.from('menu_items').insert(row);
    setBusy(false);
    if (res.error) { setErr(errText(res.error)); return; }
    toast(d.id ? 'Saved ' + row.name : row.name + ' added to your menu');
    onSaved();
  };
  const del = async () => {
    setBusy(true);
    const { error } = await sb.from('menu_items').delete().eq('id', d.id);
    setBusy(false);
    if (error) { setErr(errText(error)); return; }
    toast(d.name + ' deleted');
    onSaved();
  };

  return html`<div class="modal-back" onClick=${(e) => e.target === e.currentTarget && onClose()}>
    <form class="modal sheet-modal" onSubmit=${save} role="dialog" aria-label=${d.id ? 'Edit dish' : 'Add dish'}>
      <div class="modal-h"><h2 class="h3">${d.id ? 'Edit dish' : 'Add a dish'}</h2><button type="button" class="btn btn-sm icon-only" onClick=${onClose} aria-label="Close"><${Icon} name="x" /></button></div>
      <div class="photo-row">
        <${DishImage} item=${d} size="lg" />
        <div class="photo-btns">
          <label class="btn btn-sm"><${Icon} name="camera" size=${16} />${uploading ? 'Uploading…' : d.image_url ? 'Change photo' : 'Add photo'}<input type="file" accept="image/jpeg,image/png,image/webp" hidden onChange=${onPhoto} /></label>
          ${d.image_url ? html`<button type="button" class="btn-link small" onClick=${() => set('image_url', null)}>Remove photo</button>` : html`<small class="hint">A good photo sells more. Square works best.</small>`}
        </div>
      </div>
      <label class="field">Dish name<input id="dish-name" required maxlength="80" value=${d.name} onInput=${(e) => set('name', e.target.value)} placeholder="e.g. Paneer Butter Masala" /></label>
      <div class="field-row">
        <label class="field">Category<select id="dish-cat" value=${d.category_id || ''} onChange=${(e) => set('category_id', e.target.value || null)}>${cats.map((c) => html`<option value=${c.id}>${c.name}</option>`)}<option value="">Other</option></select></label>
        <div class="field"><span>Type</span><div class="seg full" role="group" aria-label="Veg or non-veg"><button type="button" aria-pressed=${d.is_veg} onClick=${() => set('is_veg', true)}><${VegMark} veg=${true} /> Veg</button><button type="button" aria-pressed=${!d.is_veg} onClick=${() => set('is_veg', false)}><${VegMark} veg=${false} /> Non-veg</button></div></div>
      </div>
      ${!hasPortions ? html`<label class="field">Price<div class="money"><span>₹</span><input id="dish-price" type="number" min="0" step="1" inputmode="numeric" required value=${d.price} onInput=${(e) => set('price', e.target.value)} /></div></label>` : ''}
      <${RowsEditor} label="Portions (optional)" hint="Use for Half / Full or Small / Large. Each portion has its own price." rows=${d.variants} placeholder="e.g. Half" onChange=${(v) => set('variants', v)} />
      <label class="field">Description<textarea id="dish-desc" maxlength="300" rows="2" value=${d.description} onInput=${(e) => set('description', e.target.value)} placeholder="What is in it, how it is cooked"></textarea></label>
      <fieldset class="field"><legend>Labels</legend><div class="chips">${TAGS.map((t) => html`<button type="button" class="chip" aria-pressed=${d.tags.includes(t)} onClick=${() => set('tags', d.tags.includes(t) ? d.tags.filter((x) => x !== t) : [...d.tags, t])}>${t}</button>`)}</div></fieldset>
      <${RowsEditor} label="Add-ons (optional)" hint="Extras diners can tick, like extra butter or cheese." rows=${d.addons} placeholder="e.g. Extra cheese" onChange=${(v) => set('addons', v)} />
      <label class="check"><input type="checkbox" checked=${d.in_stock} onChange=${(e) => set('in_stock', e.target.checked)} /><span>Available to order now</span></label>
      ${err ? html`<p class="form-error" role="alert">${err}</p>` : ''}
      <div class="modal-foot">
        ${d.id ? (confirmDel ? html`<span class="row-gap"><span class="small">Delete for good?</span><button type="button" class="btn btn-sm btn-danger" onClick=${del} disabled=${busy}>Delete</button><button type="button" class="btn btn-sm" onClick=${() => setConfirmDel(false)}>Keep</button></span>` : html`<button type="button" class="btn-link danger" onClick=${() => setConfirmDel(true)}><${Icon} name="trash" size=${16} /> Delete dish</button>`) : html`<span></span>`}
        <button class="btn btn-primary" disabled=${busy || uploading}>${busy ? 'Saving…' : d.id ? 'Save changes' : 'Add dish'}</button>
      </div>
    </form>
  </div>`;
}

function CategoryManager({ cats, items, r, onClose }) {
  const [list, setList] = useState(cats.map((c) => ({ ...c })));
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const run = async (p) => { setBusy(true); const { error } = await p; setBusy(false); if (error) { toast(errText(error), 'error'); return false; } return true; };
  const add = async (e) => {
    e.preventDefault(); if (!name.trim()) return;
    const sort = list.length ? Math.max(...list.map((c) => c.sort)) + 1 : 1;
    setBusy(true);
    const { data, error } = await sb.from('categories').insert({ restaurant_id: r.id, name: name.trim(), sort }).select().single();
    setBusy(false);
    if (error) { toast(errText(error), 'error'); return; }
    setList([...list, data]); setName('');
  };
  const rename = async (c, v) => { if (!v.trim() || v.trim() === c.name) return; if (await run(sb.from('categories').update({ name: v.trim() }).eq('id', c.id))) { setList(list.map((x) => (x.id === c.id ? { ...x, name: v.trim() } : x))); toast('Renamed to ' + v.trim()); } };
  const move = async (i, dir) => {
    const j = i + dir; if (j < 0 || j >= list.length) return;
    const next = list.slice(); [next[i], next[j]] = [next[j], next[i]];
    const withSort = next.map((c, k) => ({ ...c, sort: k + 1 }));
    setList(withSort);
    await run(Promise.all(withSort.map((c) => sb.from('categories').update({ sort: c.sort }).eq('id', c.id))).then((rs) => rs.find((x) => x.error) || {}));
  };
  const remove = async (c) => { if (await run(sb.from('categories').delete().eq('id', c.id))) { setList(list.filter((x) => x.id !== c.id)); toast(c.name + ' removed. Its dishes moved to Other.'); } };
  return html`<div class="modal-back" onClick=${(e) => e.target === e.currentTarget && onClose()}><div class="modal sheet-modal" role="dialog" aria-label="Categories">
    <div class="modal-h"><h2 class="h3">Categories</h2><button class="btn btn-sm icon-only" onClick=${onClose} aria-label="Close"><${Icon} name="x" /></button></div>
    <p class="muted small">Diners see categories in this order. Rename by editing the text.</p>
    <div class="cat-list">${list.map((c, i) => html`<div class="cat-line" key=${c.id}>
      <input aria-label="Category name" value=${c.name} onBlur=${(e) => rename(c, e.target.value)} onKeyDown=${(e) => e.key === 'Enter' && e.target.blur()} />
      <span class="muted small">${items.filter((x) => x.category_id === c.id).length}</span>
      <button class="btn btn-sm icon-only" disabled=${i === 0 || busy} onClick=${() => move(i, -1)} aria-label="Move up"><${Icon} name="up" size=${16} /></button>
      <button class="btn btn-sm icon-only" disabled=${i === list.length - 1 || busy} onClick=${() => move(i, 1)} aria-label="Move down"><${Icon} name="down" size=${16} /></button>
      <button class="btn btn-sm icon-only" disabled=${busy} onClick=${() => remove(c)} aria-label=${'Delete ' + c.name}><${Icon} name="trash" size=${16} /></button>
    </div>`)}</div>
    <form class="rows-line" onSubmit=${add}><input id="new-cat" placeholder="New category, e.g. Chinese" value=${name} onInput=${(e) => setName(e.target.value)} maxlength="60" /><button class="btn btn-primary" disabled=${busy || !name.trim()}>Add</button></form>
    <div class="modal-foot"><span></span><button class="btn" onClick=${onClose}>Done</button></div>
  </div></div>`;
}
