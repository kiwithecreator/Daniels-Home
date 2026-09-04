import { db } from '../firebase.js';

export const id = 'grocery';
export const label = 'Grocery';
export const icon = '🛒';

let stores = [];
let items = [];
let activeStoreId = null;
let rootEl = null;

// Inline-form state — one of: null, 'add-store', { mode: 'rename-store', id }
let formMode = null;

const PANEL_HTML = `
  <h1>Grocery List</h1>
  <div class="card" id="grocery-card">
    <div class="store-bar" id="store-bar"></div>
    <div id="store-form"></div>
    <div class="store-actions" id="store-actions" style="display:none;">
      <button id="rename-store-btn">Rename store</button>
      <button class="danger" id="delete-store-btn">Delete store</button>
    </div>
    <div id="grocery-body"></div>
  </div>
`;

export function mount(el) {
  rootEl = el;
  el.innerHTML = PANEL_HTML;

  // activeStoreId is local UI state — no Firebase round-trip needed
  const saved = localStorage.getItem('grocery_activeStoreId');
  activeStoreId = saved ? Number(saved) : null;

  // Load initial data once, then render. No persistent listeners — local arrays
  // are the source of truth; Firebase is persistence only.
  Promise.all([
    db.ref('grocery/stores').once('value'),
    db.ref('grocery/items').once('value'),
  ]).then(([storesSnap, itemsSnap]) => {
    stores = [];
    storesSnap.forEach(c => stores.push(c.val()));
    stores.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    items = [];
    itemsSnap.forEach(c => items.push(c.val()));

    // Validate saved activeStoreId still exists
    if (activeStoreId && !stores.find(s => s.id === activeStoreId)) {
      setActiveStore(stores[0]?.id ?? null);
    }

    render();
  });
}

function saveStores() {
  const data = {};
  stores.forEach(s => { data[s.id] = s; });
  db.ref('grocery/stores').set(stores.length ? data : null);
}

function saveItems() {
  const data = {};
  items.forEach(i => { data[i.id] = i; });
  db.ref('grocery/items').set(items.length ? data : null);
}

function setActiveStore(id) {
  activeStoreId = id;
  if (id != null) localStorage.setItem('grocery_activeStoreId', id);
  else localStorage.removeItem('grocery_activeStoreId');
}

function openAddStoreForm() {
  formMode = 'add-store';
  render();
  setTimeout(() => document.getElementById('store-form-input')?.focus(), 0);
}

function openRenameStoreForm() {
  if (!activeStoreId) return;
  formMode = { mode: 'rename-store', id: activeStoreId };
  render();
  setTimeout(() => {
    const inp = document.getElementById('store-form-input');
    if (inp) { inp.focus(); inp.select(); }
  }, 0);
}

function closeStoreForm() {
  formMode = null;
  render();
}

function submitStoreForm() {
  const inp = document.getElementById('store-form-input');
  const name = (inp?.value || '').trim();
  if (!name) return;
  if (formMode === 'add-store') {
    const newStore = { id: Date.now(), name, order: stores.length };
    stores.push(newStore);
    saveStores();
    formMode = null;
    setActiveStore(newStore.id);
    render();
  } else if (formMode && formMode.mode === 'rename-store') {
    const s = stores.find(x => x.id === formMode.id);
    if (s) { s.name = name; saveStores(); }
    formMode = null;
    render();
  }
}

function deleteActiveStore() {
  const s = stores.find(x => x.id === activeStoreId);
  if (!s) return;
  if (!confirm(`Delete "${s.name}" and all its items?`)) return;
  stores = stores.filter(x => x.id !== activeStoreId);
  items = items.filter(i => i.storeId !== activeStoreId);
  saveStores();
  saveItems();
  setActiveStore(stores[0]?.id ?? null);
  render();
}

function addItem() {
  const input = document.getElementById('grocery-input');
  if (!input) return;
  const name = input.value.trim();
  if (!name) return;
  if (!activeStoreId) return;
  items.push({ id: Date.now(), storeId: activeStoreId, name, checked: false, createdAt: Date.now() });
  saveItems();
  input.value = '';
  input.focus();
  render();
}

function toggleItem(id) {
  const it = items.find(x => x.id === id);
  if (!it) return;
  it.checked = !it.checked;
  saveItems();
  render();
}

function deleteItem(id) {
  items = items.filter(x => x.id !== id);
  saveItems();
  render();
}

function clearChecked() {
  items = items.filter(i => !(i.checked && i.storeId === activeStoreId));
  saveItems();
  render();
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

function renderStoreForm() {
  const wrap = document.getElementById('store-form');
  if (!formMode) { wrap.innerHTML = ''; return; }
  const isRename = formMode && formMode.mode === 'rename-store';
  const initial = isRename ? (stores.find(s => s.id === formMode.id)?.name || '') : '';
  const placeholder = isRename ? 'Rename store' : "Store name (e.g. Trader Joe's, Costco)";
  wrap.innerHTML = `
    <div class="grocery-add" style="margin-bottom:12px;">
      <input type="text" id="store-form-input" placeholder="${escapeHtml(placeholder)}" value="${escapeHtml(initial)}" autocomplete="off">
      <button id="store-form-submit">${isRename ? 'Save' : 'Add'}</button>
      <button id="store-form-cancel" style="background:#f1f5f9;color:#475569;">Cancel</button>
    </div>
  `;
  const input = document.getElementById('store-form-input');
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') submitStoreForm();
    if (e.key === 'Escape') closeStoreForm();
  });
  document.getElementById('store-form-submit').addEventListener('click', submitStoreForm);
  document.getElementById('store-form-cancel').addEventListener('click', closeStoreForm);
}

function render() {
  if (!rootEl) return;
  const bar = document.getElementById('store-bar');
  if (!bar) return;

  bar.innerHTML = stores.map(s => `
    <button class="store-pill ${s.id === activeStoreId ? 'active' : ''}" data-store="${s.id}">${escapeHtml(s.name)}</button>
  `).join('') + `<button class="store-pill add" id="add-store-btn" title="Add store">+</button>`;

  bar.querySelectorAll('.store-pill[data-store]').forEach(b => {
    b.addEventListener('click', () => {
      setActiveStore(Number(b.dataset.store));
      render();
    });
  });
  document.getElementById('add-store-btn').addEventListener('click', openAddStoreForm);

  renderStoreForm();

  const actions = document.getElementById('store-actions');
  actions.style.display = activeStoreId && !formMode ? 'flex' : 'none';
  if (activeStoreId) {
    document.getElementById('rename-store-btn').onclick = openRenameStoreForm;
    document.getElementById('delete-store-btn').onclick = deleteActiveStore;
  }

  const body = document.getElementById('grocery-body');
  if (!stores.length) {
    body.innerHTML = formMode === 'add-store'
      ? ''
      : `<p class="empty">Tap + to add your first store.</p>`;
    return;
  }
  if (!activeStoreId) {
    body.innerHTML = `<p class="empty">Pick a store above.</p>`;
    return;
  }

  const visible = items
    .filter(i => i.storeId === activeStoreId)
    .sort((a, b) => (a.checked - b.checked) || (a.createdAt - b.createdAt));

  const anyChecked = visible.some(i => i.checked);

  // Preserve the current input value so typing isn't lost on re-render
  const existingInput = document.getElementById('grocery-input');
  const savedInputVal = existingInput ? existingInput.value : '';

  body.innerHTML = `
    <div class="grocery-add">
      <input type="text" id="grocery-input" placeholder="Add item…" autocomplete="off">
      <button id="grocery-add-btn">Add</button>
    </div>
    ${visible.length === 0
      ? `<p class="empty">No items yet.</p>`
      : visible.map(it => `
        <div class="grocery-item ${it.checked ? 'checked' : ''}">
          <input type="checkbox" data-toggle="${it.id}" ${it.checked ? 'checked' : ''}>
          <span class="name">${escapeHtml(it.name)}</span>
          <button class="delete-btn" data-del="${it.id}" title="Delete">✕</button>
        </div>
      `).join('')
    }
    ${anyChecked ? `<button class="grocery-clear" id="grocery-clear-btn">Clear checked</button>` : ''}
  `;

  const addBtn = document.getElementById('grocery-add-btn');
  const input = document.getElementById('grocery-input');

  // Restore any partially typed text
  if (savedInputVal) input.value = savedInputVal;

  addBtn.addEventListener('click', addItem);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') addItem(); });
  body.querySelectorAll('[data-toggle]').forEach(c =>
    c.addEventListener('change', () => toggleItem(Number(c.dataset.toggle)))
  );
  body.querySelectorAll('[data-del]').forEach(b =>
    b.addEventListener('click', () => deleteItem(Number(b.dataset.del)))
  );
  const clearBtn = document.getElementById('grocery-clear-btn');
  if (clearBtn) clearBtn.addEventListener('click', clearChecked);
}
