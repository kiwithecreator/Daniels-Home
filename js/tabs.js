const features = [];
let activeId = null;
let initialized = false;

export function register(feature) {
  if (features.some(f => f.id === feature.id)) return;
  features.push(feature);
}

export function init() {
  if (initialized) return;
  initialized = true;
  const bar = document.getElementById('tab-bar');
  bar.innerHTML = features.map(f => `
    <button class="tab" data-tab="${f.id}">
      <span class="tab-icon">${f.icon}</span>
      <span>${f.label}</span>
    </button>
  `).join('');

  bar.querySelectorAll('.tab').forEach(btn => {
    btn.addEventListener('click', () => activate(btn.dataset.tab));
  });

  // Build the panels container — each feature's mount(rootEl) renders into its own panel.
  const host = document.getElementById('feature-host');
  features.forEach(f => {
    const panel = document.createElement('div');
    panel.className = 'feature-panel';
    panel.id = `panel-${f.id}`;
    host.appendChild(panel);
    f.mount(panel);
  });

  activate(features[0].id);
}

export function show() {
  document.getElementById('tab-bar').classList.remove('hidden');
}

export function hide() {
  document.getElementById('tab-bar').classList.add('hidden');
}

function activate(id) {
  if (activeId === id) return;
  activeId = id;
  document.querySelectorAll('#tab-bar .tab').forEach(b => {
    b.classList.toggle('active', b.dataset.tab === id);
  });
  document.querySelectorAll('.feature-panel').forEach(p => {
    p.classList.toggle('active', p.id === `panel-${id}`);
  });
  const f = features.find(x => x.id === id);
  if (f && f.onShow) f.onShow();
}
