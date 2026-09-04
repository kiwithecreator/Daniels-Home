import { db } from '../firebase.js';

export const id = 'expenses';
export const label = 'Expenses';
export const icon = '💰';

let expenses = [];
let budget = 0;
let recurring = [];
let editingRecurringId = null;
let editingExpenseId = null;
let pendingRecurring = [];
let visibleExpenseCount = 10;

const COLORS = {
  Food: '#FF7043', Transport: '#42A5F5', Housing: '#AB47BC',
  Shopping: '#EC407A', Health: '#26A69A', Entertainment: '#FFA726',
  Subscriptions: '#66BB6A', Other: '#78909C'
};

const PANEL_HTML = `
  <h1>Monthly Expenses</h1>

  <div class="budget-card" id="budget-card" style="display:none">
    <div class="budget-content">
      <div class="budget-info">
        <div class="budget-row"><span class="budget-label">Monthly Budget</span><span class="budget-value" id="budget-amount">—</span></div>
        <div class="budget-row"><span class="budget-label">Spent This Month</span><span class="budget-value" id="budget-spent">$0.00</span></div>
        <div class="budget-row"><span class="budget-label">Remaining</span><span class="budget-value" id="budget-remaining">—</span></div>
        <div class="budget-row"><span class="budget-label">Daily Limit</span><span class="budget-value" id="budget-daily">—</span></div>
        <div class="budget-progress-bar"><div class="budget-progress-fill" id="budget-fill"></div></div>
      </div>
    </div>
  </div>

  <div class="card" id="set-budget-card">
    <h2 id="set-budget-toggle" onclick="toggleSetBudget()" style="cursor:pointer; display:flex; justify-content:space-between; align-items:center; margin-bottom:0;">
      <span>Monthly Budget</span>
      <span id="set-budget-chevron" style="font-size:0.85rem; transition:transform 0.2s;">▼</span>
    </h2>
    <div id="set-budget-body" style="display:none; margin-top:16px;">
      <div class="budget-form">
        <input type="number" id="budget-input" placeholder="Enter monthly budget..." min="0" step="0.01">
        <button onclick="setBudget()">Set Budget</button>
      </div>
      <p id="budget-status" style="margin-top: 12px; font-size: 0.9rem; color: #666; text-align: center;"></p>
    </div>
  </div>

  <div class="card">
    <h2 id="recurring-toggle" onclick="toggleRecurring()" style="cursor:pointer; display:flex; justify-content:space-between; align-items:center; margin-bottom:0;">
      <span>Recurring Transactions</span>
      <span id="recurring-chevron" style="font-size:0.85rem; transition:transform 0.2s;">▼</span>
    </h2>
    <div id="recurring-body" style="display:none; margin-top:16px;">
      <div id="recurring-list"></div>
      <div id="review-due-wrap" style="display:none; margin-top:12px;">
        <button onclick="reviewDueRecurring()" style="margin-top:0; background:#eff6ff; color:#2563EB; border:1.5px solid #bfdbfe; font-size:0.85rem; padding:9px 14px;">Review this month's bills</button>
      </div>
      <div style="margin-top:16px; border-top:1px solid #f1f5f9; padding-top:16px;">
        <p style="font-size:0.78rem; font-weight:600; color:#94a3b8; text-transform:uppercase; letter-spacing:0.08em; margin-bottom:4px;">Add New</p>
        <label>Description</label>
        <input type="text" id="rec-desc" placeholder="e.g. Rent, BC Hydro…">
        <label>Amount ($)</label>
        <input type="number" id="rec-amount" placeholder="0.00" step="0.01" min="0">
        <label>Category</label>
        <select id="rec-category">
          <option>Food</option><option>Transport</option><option selected>Housing</option><option>Shopping</option>
          <option>Health</option><option>Entertainment</option><option>Subscriptions</option><option>Other</option>
        </select>
        <label>Frequency</label>
        <select id="rec-frequency">
          <option value="monthly">Monthly</option>
          <option value="every2months">Every 2 months</option>
        </select>
        <button onclick="addRecurring()">Add Recurring Transaction</button>
      </div>
    </div>
  </div>

  <div class="card">
    <h2 id="add-expense-toggle" onclick="toggleAddExpense()" style="cursor:pointer; display:flex; justify-content:space-between; align-items:center; margin-bottom:0;">
      <span>Add Expense</span>
      <span id="add-expense-chevron" style="font-size:0.85rem; transition:transform 0.2s; transform:rotate(180deg);">▼</span>
    </h2>
    <div id="add-expense-body" style="margin-top:16px;">
      <label>Description</label>
      <input type="text" id="desc" placeholder="e.g. Coffee, Rent, Netflix…">
      <label>Amount ($) — use negative for refunds</label>
      <input type="number" id="amount" placeholder="0.00" step="0.01">
      <label>Category</label>
      <select id="category">
        <option>Food</option><option>Transport</option><option>Housing</option><option>Shopping</option>
        <option>Health</option><option>Entertainment</option><option>Subscriptions</option><option>Other</option>
      </select>
      <label>Date</label>
      <input type="date" id="date">
      <button onclick="addExpense()">Add Expense</button>
      <div class="toast" id="toast">Expense added!</div>
    </div>
  </div>

  <div class="card">
    <div class="dropdown-header" onclick="toggleExpensesDropdown()">
      <h2>All Expenses</h2>
      <span class="dropdown-icon open" id="expenses-icon">▼</span>
    </div>
    <div class="dropdown-content open" id="expenses-dropdown">
      <div id="history"><p class="empty">No expenses this month.</p></div>
    </div>
  </div>

  <div class="card">
    <h2>Spending by Category</h2>
    <div id="summary"><p class="empty">No expenses yet.</p></div>
  </div>

  <div class="card" id="previous-months-card" style="display:none">
    <h2>Previous Months</h2>
    <div class="month-selector">
      <select id="month-select" onchange="showPreviousMonth()">
        <option value="">Select a month...</option>
      </select>
    </div>
    <div id="previous-summary"><p class="empty">Select a month to view expenses.</p></div>
    <div id="previous-history"></div>
  </div>

  <div id="recurring-modal" class="recurring-modal-overlay" style="display:none;">
    <div class="recurring-modal-box">
      <h3>Recurring Bills Due</h3>
      <p style="font-size:0.82rem; color:#64748b; margin-bottom:16px; margin-top:4px;">Select which to add for this month:</p>
      <div id="recurring-modal-list"></div>
      <div class="rec-btn-row">
        <button class="rec-btn-skip" onclick="skipRecurring()">Skip All</button>
        <button class="rec-btn-confirm" onclick="confirmRecurring()">Add Selected</button>
      </div>
    </div>
  </div>
`;

export function mount(rootEl) {
  rootEl.innerHTML = PANEL_HTML;
  visibleExpenseCount = 10;
  document.getElementById('date').value = today();

  db.ref('expenses').on('value', snapshot => {
    expenses = [];
    snapshot.forEach(child => { expenses.push(child.val()); });
    render();
  });
  db.ref('budget').on('value', snapshot => {
    budget = parseFloat(snapshot.val() || '0');
    render();
  });
  db.ref('recurring').on('value', snapshot => {
    recurring = [];
    snapshot.forEach(child => { recurring.push(child.val()); });
    renderRecurring();
  });

  render();
}

export function checkDueRecurring() {
  pendingRecurring = recurring.filter(isRecurringDue);
  if (pendingRecurring.length === 0) return;
  const listEl = document.getElementById('recurring-modal-list');
  if (!listEl) return;
  const freqLabel = { monthly: 'Monthly', every2months: 'Every 2 months' };
  listEl.innerHTML = pendingRecurring.map((r, i) => {
    const color = COLORS[r.category] || '#78909C';
    return `<label class="recurring-check-row">
      <input type="checkbox" id="rec-check-${i}" checked>
      <div style="flex:1">
        <div style="font-weight:600;font-size:0.9rem;color:#0f172a;">${r.description}</div>
        <div style="font-size:0.78rem;color:#94a3b8;margin-top:2px;"><span class="category-dot" style="background:${color}"></span>${r.category} &middot; ${freqLabel[r.frequency] || r.frequency} &middot; $${r.amount.toFixed(2)}</div>
      </div>
    </label>`;
  }).join('');
  document.getElementById('recurring-modal').style.display = 'flex';
}

function getExpenses() { return expenses; }

function saveExpenses(newExpenses) {
  const data = {};
  newExpenses.forEach(e => { data[e.id] = e; });
  db.ref('expenses').set(data);
}

function today() {
  return new Date().toLocaleDateString('en-CA');
}

function formatDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function addExpense() {
  const desc = document.getElementById('desc').value.trim();
  const amount = parseFloat(document.getElementById('amount').value);
  const category = document.getElementById('category').value;
  const date = document.getElementById('date').value;

  if (!desc) { alert('Please enter a description.'); return; }
  if (!amount || amount === 0) { alert('Please enter a valid amount.'); return; }
  if (!date) { alert('Please select a date.'); return; }

  const list = getExpenses();
  list.push({ id: Date.now(), date, description: desc, amount: Math.round(amount * 100) / 100, category });
  saveExpenses(list);

  document.getElementById('desc').value = '';
  document.getElementById('amount').value = '';
  document.getElementById('date').value = today();

  const toast = document.getElementById('toast');
  toast.style.display = 'block';
  setTimeout(() => toast.style.display = 'none', 2000);

  render();
}

function deleteExpense(id) {
  saveExpenses(getExpenses().filter(e => e.id !== id));
  render();
}

function toggleExpensesDropdown() {
  document.getElementById('expenses-dropdown').classList.toggle('open');
  document.getElementById('expenses-icon').classList.toggle('open');
}

function getBudget() { return budget; }

function toggleAddExpense() {
  const body = document.getElementById('add-expense-body');
  const chevron = document.getElementById('add-expense-chevron');
  const open = body.style.display !== 'none';
  body.style.display = open ? 'none' : 'block';
  chevron.style.transform = open ? '' : 'rotate(180deg)';
}

function toggleSetBudget() {
  const body = document.getElementById('set-budget-body');
  const chevron = document.getElementById('set-budget-chevron');
  const open = body.style.display !== 'none';
  body.style.display = open ? 'none' : 'block';
  chevron.style.transform = open ? '' : 'rotate(180deg)';
}

function setBudget() {
  const input = document.getElementById('budget-input');
  const amount = parseFloat(input.value);
  if (!input.value.trim()) { alert('Please enter a budget amount.'); return; }
  if (isNaN(amount) || amount < 0) { alert('Please enter a valid amount.'); return; }
  db.ref('budget').set(amount);
  input.value = '';
  const status = document.getElementById('budget-status');
  status.textContent = `Budget set to $${amount.toFixed(2)}`;
  status.style.color = '#4CAF50';
  setTimeout(() => { status.textContent = ''; }, 2000);
}

function getMonthKey(dateStr) {
  const [year, month] = dateStr.split('-');
  return `${year}-${month}`;
}

function getMonthLabel(monthKey) {
  const [year, month] = monthKey.split('-');
  return new Date(year, parseInt(month) - 1).toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
}

function getCurrentMonthExpenses() {
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  return getExpenses().filter(e => getMonthKey(e.date) === currentMonth);
}

function updateBudgetDisplay() {
  const b = getBudget();
  const spent = getCurrentMonthExpenses().reduce((sum, e) => sum + e.amount, 0);
  const remaining = b - spent;
  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysRemaining = daysInMonth - now.getDate();
  const dailyLimit = daysRemaining > 0 ? remaining / daysRemaining : 0;
  const card = document.getElementById('budget-card');

  if (b > 0) {
    card.style.display = 'block';
    const pct = (spent / b) * 100;
    const isOver = spent > b;
    const isWarning = pct > 75 && !isOver;
    const state = isOver ? 'danger' : isWarning ? 'warning' : '';

    document.getElementById('budget-amount').textContent = `$${b.toFixed(2)}`;
    document.getElementById('budget-spent').textContent = `$${spent.toFixed(2)}`;
    document.getElementById('budget-remaining').textContent = `$${Math.max(0, remaining).toFixed(2)}`;
    document.getElementById('budget-remaining').className = `budget-value ${state}`;
    document.getElementById('budget-daily').textContent = `$${Math.max(0, dailyLimit).toFixed(2)}`;

    const fill = document.getElementById('budget-fill');
    fill.style.width = Math.min(pct, 100) + '%';
    fill.className = `budget-progress-fill ${state}`;
    card.className = `budget-card ${state}`;
  } else {
    card.style.display = 'none';
  }
}

function populateMonthSelector() {
  const list = getExpenses();
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const months = [...new Set(list.map(e => getMonthKey(e.date)).filter(m => m !== currentMonth))].sort().reverse();
  const card = document.getElementById('previous-months-card');

  if (months.length === 0) { card.style.display = 'none'; return; }
  card.style.display = 'block';
  document.getElementById('month-select').innerHTML =
    '<option value="">Select a month...</option>' +
    months.map(m => `<option value="${m}">${getMonthLabel(m)}</option>`).join('');
}

function showPreviousMonth() {
  const monthKey = document.getElementById('month-select').value;
  if (!monthKey) {
    document.getElementById('previous-summary').innerHTML = '<p class="empty">Select a month to view expenses.</p>';
    document.getElementById('previous-history').innerHTML = '';
    return;
  }

  const monthExpenses = getExpenses().filter(e => getMonthKey(e.date) === monthKey);
  const totals = {}, counts = {};
  let grand = 0, grandCount = 0;
  for (const e of monthExpenses) {
    totals[e.category] = (totals[e.category] || 0) + e.amount;
    counts[e.category] = (counts[e.category] || 0) + 1;
    grand += e.amount; grandCount++;
  }

  if (Object.keys(totals).length === 0) {
    document.getElementById('previous-summary').innerHTML = '<p class="empty">No expenses in this month.</p>';
    document.getElementById('previous-history').innerHTML = '';
    return;
  }

  const rows = Object.entries(totals).sort((a, b) => b[1] - a[1]).map(([cat, total]) => {
    const color = COLORS[cat] || '#78909C';
    return `<tr><td><span class="category-dot" style="background:${color}"></span>${cat}</td><td>${counts[cat]} item${counts[cat] === 1 ? '' : 's'}</td><td>$${total.toFixed(2)}</td></tr>`;
  }).join('');

  document.getElementById('previous-summary').innerHTML = `
    <table>
      <thead><tr><th>Category</th><th style="text-align:right">Items</th><th style="text-align:right">Total</th></tr></thead>
      <tbody>${rows}</tbody>
      <tfoot><tr class="total-row"><td>Total</td><td>${grandCount} item${grandCount === 1 ? '' : 's'}</td><td>$${grand.toFixed(2)}</td></tr></tfoot>
    </table>`;

  document.getElementById('previous-history').innerHTML =
    '<h3 style="margin-top:20px;font-size:0.95rem;color:#666;margin-bottom:12px;text-transform:uppercase;letter-spacing:0.05em;">Expenses</h3>' +
    monthExpenses.map(e => {
      const color = COLORS[e.category] || '#78909C';
      return `<div class="expense-item">
        <div style="flex:1">
          <div class="expense-desc">${e.description}</div>
          <div class="expense-meta"><span class="category-dot" style="background:${color}"></span>${e.category} &middot; ${formatDate(e.date)}</div>
        </div>
        <span class="expense-amount">-$${e.amount.toFixed(2)}</span>
      </div>`;
    }).join('');
}

function saveRecurring() {
  const data = {};
  recurring.forEach(r => { data[r.id] = r; });
  db.ref('recurring').set(recurring.length ? data : null);
}

function addRecurring() {
  const desc = document.getElementById('rec-desc').value.trim();
  const amount = parseFloat(document.getElementById('rec-amount').value);
  const category = document.getElementById('rec-category').value;
  const frequency = document.getElementById('rec-frequency').value;
  if (!desc) { alert('Please enter a description.'); return; }
  if (!amount || amount <= 0) { alert('Please enter a valid amount.'); return; }
  recurring.push({ id: Date.now(), description: desc, amount: Math.round(amount * 100) / 100, category, frequency, lastPostedMonth: null, lastCheckedMonth: null });
  saveRecurring();
  document.getElementById('rec-desc').value = '';
  document.getElementById('rec-amount').value = '';
  renderRecurring();
}

function deleteRecurring(id) {
  recurring = recurring.filter(r => r.id !== id);
  saveRecurring();
  renderRecurring();
}

function toggleRecurring() {
  const body = document.getElementById('recurring-body');
  const chevron = document.getElementById('recurring-chevron');
  const open = body.style.display !== 'none';
  body.style.display = open ? 'none' : 'block';
  chevron.style.transform = open ? '' : 'rotate(180deg)';
}

function renderRecurring() {
  const el = document.getElementById('recurring-list');
  if (!el) return;
  updateReviewDueButton();
  if (recurring.length === 0) {
    el.innerHTML = '<p class="empty" style="padding:8px 0 4px;">No recurring transactions yet.</p>';
    return;
  }
  const freqLabel = { monthly: 'Monthly', every2months: 'Every 2 months' };
  const cats = ['Food','Transport','Housing','Shopping','Health','Entertainment','Subscriptions','Other'];
  el.innerHTML = recurring.map(r => {
    const color = COLORS[r.category] || '#78909C';
    if (r.id === editingRecurringId) {
      const catOptions = cats.map(c => `<option${c === r.category ? ' selected' : ''}>${c}</option>`).join('');
      return `<div style="padding:12px 0; border-bottom:1px solid #f1f5f9;">
        <input type="text" id="edit-rec-desc" value="${r.description}" style="margin-bottom:8px;">
        <div style="display:flex;gap:8px;margin-bottom:8px;">
          <input type="number" id="edit-rec-amount" value="${r.amount}" step="0.01" min="0" style="flex:1;">
          <select id="edit-rec-freq" style="flex:1;">
            <option value="monthly"${r.frequency==='monthly'?' selected':''}>Monthly</option>
            <option value="every2months"${r.frequency==='every2months'?' selected':''}>Every 2 months</option>
          </select>
        </div>
        <select id="edit-rec-cat" style="margin-bottom:10px;">${catOptions}</select>
        <div style="display:flex;gap:8px;">
          <button onclick="cancelRecurringEdit()" style="flex:1;margin-top:0;background:#f1f5f9;color:#475569;">Cancel</button>
          <button onclick="saveRecurringEdit(${r.id})" style="flex:1;margin-top:0;">Save</button>
        </div>
      </div>`;
    }
    return `<div class="expense-item">
      <div style="flex:1">
        <div class="expense-desc">${r.description}</div>
        <div class="expense-meta"><span class="category-dot" style="background:${color}"></span>${r.category} &middot; ${freqLabel[r.frequency] || r.frequency} &middot; $${r.amount.toFixed(2)}</div>
      </div>
      <button class="delete-btn" onclick="editRecurring(${r.id})" title="Edit" style="color:#94a3b8;font-size:0.95rem;">✎</button>
      <button class="delete-btn" onclick="deleteRecurring(${r.id})" title="Delete">✕</button>
    </div>`;
  }).join('');
}

function editRecurring(id) {
  editingRecurringId = id;
  renderRecurring();
}

function updateReviewDueButton() {
  const wrap = document.getElementById('review-due-wrap');
  if (!wrap) return;
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const hasUnposted = recurring.some(r => !r.lastPostedMonth || (r.frequency === 'monthly' && r.lastPostedMonth !== currentMonth) || (r.frequency === 'every2months' && (() => { const [ly,lm]=r.lastPostedMonth.split('-').map(Number); const [cy,cm]=currentMonth.split('-').map(Number); return (cy-ly)*12+(cm-lm)>=2; })()));
  wrap.style.display = hasUnposted ? 'block' : 'none';
}

function reviewDueRecurring() {
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const freqLabel = { monthly: 'Monthly', every2months: 'Every 2 months' };
  pendingRecurring = recurring.filter(r => {
    if (!r.lastPostedMonth) return true;
    if (r.frequency === 'monthly') return r.lastPostedMonth !== currentMonth;
    if (r.frequency === 'every2months') {
      const [ly,lm] = r.lastPostedMonth.split('-').map(Number);
      const [cy,cm] = currentMonth.split('-').map(Number);
      return (cy-ly)*12+(cm-lm) >= 2;
    }
    return false;
  });
  if (pendingRecurring.length === 0) { alert('All recurring bills are already added for this month.'); return; }
  const listEl = document.getElementById('recurring-modal-list');
  listEl.innerHTML = pendingRecurring.map((r, i) => {
    const color = COLORS[r.category] || '#78909C';
    return `<label class="recurring-check-row">
      <input type="checkbox" id="rec-check-${i}" checked>
      <div style="flex:1">
        <div style="font-weight:600;font-size:0.9rem;color:#0f172a;">${r.description}</div>
        <div style="font-size:0.78rem;color:#94a3b8;margin-top:2px;"><span class="category-dot" style="background:${color}"></span>${r.category} &middot; ${freqLabel[r.frequency] || r.frequency} &middot; $${r.amount.toFixed(2)}</div>
      </div>
    </label>`;
  }).join('');
  document.getElementById('recurring-modal').style.display = 'flex';
}

function cancelRecurringEdit() {
  editingRecurringId = null;
  renderRecurring();
}

function saveRecurringEdit(id) {
  const desc = document.getElementById('edit-rec-desc').value.trim();
  const amount = parseFloat(document.getElementById('edit-rec-amount').value);
  const category = document.getElementById('edit-rec-cat').value;
  const frequency = document.getElementById('edit-rec-freq').value;
  if (!desc) { alert('Please enter a description.'); return; }
  if (!amount || amount <= 0) { alert('Please enter a valid amount.'); return; }
  const idx = recurring.findIndex(r => r.id === id);
  if (idx !== -1) {
    recurring[idx] = { ...recurring[idx], description: desc, amount: Math.round(amount * 100) / 100, category, frequency };
  }
  saveRecurring();
  editingRecurringId = null;
  renderRecurring();
}

function isRecurringDue(r) {
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  if (r.lastCheckedMonth === currentMonth) return false;
  if (!r.lastPostedMonth) return true;
  if (r.frequency === 'monthly') return r.lastPostedMonth !== currentMonth;
  if (r.frequency === 'every2months') {
    const [ly, lm] = r.lastPostedMonth.split('-').map(Number);
    const [cy, cm] = currentMonth.split('-').map(Number);
    return (cy - ly) * 12 + (cm - lm) >= 2;
  }
  return false;
}

function confirmRecurring() {
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const dateStr = today();
  const allExpenses = getExpenses();
  pendingRecurring.forEach((r, i) => {
    const idx = recurring.findIndex(x => x.id === r.id);
    if (idx === -1) return;
    recurring[idx].lastCheckedMonth = currentMonth;
    if (document.getElementById(`rec-check-${i}`)?.checked) {
      allExpenses.push({ id: Date.now() + i, date: dateStr, description: r.description, amount: r.amount, category: r.category });
      recurring[idx].lastPostedMonth = currentMonth;
    }
  });
  saveExpenses(allExpenses);
  saveRecurring();
  document.getElementById('recurring-modal').style.display = 'none';
  pendingRecurring = [];
  render();
  updateReviewDueButton();
}

function skipRecurring() {
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  pendingRecurring.forEach(r => {
    const idx = recurring.findIndex(x => x.id === r.id);
    if (idx !== -1) recurring[idx].lastCheckedMonth = currentMonth;
  });
  saveRecurring();
  document.getElementById('recurring-modal').style.display = 'none';
  pendingRecurring = [];
  updateReviewDueButton();
}

function editExpense(id) {
  editingExpenseId = id;
  render();
}

function cancelExpenseEdit() {
  editingExpenseId = null;
  render();
}

function saveExpenseEdit(id) {
  const desc = document.getElementById('edit-exp-desc').value.trim();
  const amount = parseFloat(document.getElementById('edit-exp-amount').value);
  const category = document.getElementById('edit-exp-cat').value;
  const date = document.getElementById('edit-exp-date').value;
  if (!desc) { alert('Please enter a description.'); return; }
  if (!amount || amount === 0) { alert('Please enter a valid amount.'); return; }
  if (!date) { alert('Please select a date.'); return; }
  const list = getExpenses();
  const idx = list.findIndex(e => e.id === id);
  if (idx !== -1) {
    list[idx] = { ...list[idx], description: desc, amount: Math.round(amount * 100) / 100, category, date };
  }
  saveExpenses(list);
  editingExpenseId = null;
  render();
}

function render() {
  if (!document.getElementById('summary')) return;
  const monthExpenses = getCurrentMonthExpenses();
  const totals = {}, counts = {};
  let grand = 0, grandCount = 0;
  for (const e of monthExpenses) {
    totals[e.category] = (totals[e.category] || 0) + e.amount;
    counts[e.category] = (counts[e.category] || 0) + 1;
    grand += e.amount; grandCount++;
  }

  const summaryEl = document.getElementById('summary');
  if (Object.keys(totals).length === 0) {
    summaryEl.innerHTML = '<p class="empty">No expenses yet.</p>';
  } else {
    const grossTotal = monthExpenses.reduce((sum, e) => sum + (e.amount > 0 ? e.amount : 0), 0);
    const rows = Object.entries(totals).sort((a, b) => b[1] - a[1]).map(([cat, total]) => {
      const color = COLORS[cat] || '#78909C';
      const percentage = grossTotal > 0 ? ((Math.max(total, 0) / grossTotal) * 100).toFixed(1) : '0.0';
      const totalStr = total < 0 ? `<span style="color:#43a047">+$${Math.abs(total).toFixed(2)}</span>` : `$${total.toFixed(2)}`;
      return `<tr><td><span class="category-dot" style="background:${color}"></span>${cat}</td><td>${counts[cat]} item${counts[cat] === 1 ? '' : 's'}</td><td>${totalStr}</td><td style="text-align:right;color:#999">${percentage}%</td></tr>`;
    }).join('');
    summaryEl.innerHTML = `
      <table>
        <thead><tr><th>Category</th><th style="text-align:right">Items</th><th style="text-align:right">Total</th><th style="text-align:right">%</th></tr></thead>
        <tbody>${rows}</tbody>
        <tfoot><tr class="total-row"><td>Total</td><td>${grandCount} item${grandCount === 1 ? '' : 's'}</td><td>$${grand.toFixed(2)}</td><td></td></tr></tfoot>
      </table>`;
  }

  const histEl = document.getElementById('history');
  if (monthExpenses.length === 0) {
    histEl.innerHTML = '<p class="empty">No expenses this month.</p>';
  } else {
    const sorted = [...monthExpenses].sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
    const visible = sorted.slice(0, visibleExpenseCount);
    const cats = ['Food','Transport','Housing','Shopping','Health','Entertainment','Subscriptions','Other'];
    const items = visible.map((e, i) => {
      const color = COLORS[e.category] || '#78909C';
      if (e.id === editingExpenseId) {
        const catOptions = cats.map(c => `<option${c === e.category ? ' selected' : ''}>${c}</option>`).join('');
        return `<div style="padding:12px 0; border-bottom:1px solid #f1f5f9;">
          <input type="text" id="edit-exp-desc" value="${e.description}" style="margin-bottom:8px;">
          <div style="display:flex;gap:8px;margin-bottom:8px;">
            <input type="number" id="edit-exp-amount" value="${e.amount}" step="0.01" style="flex:1;">
            <input type="date" id="edit-exp-date" value="${e.date}" style="flex:1;">
          </div>
          <select id="edit-exp-cat" style="margin-bottom:10px;">${catOptions}</select>
          <div style="display:flex;gap:8px;">
            <button onclick="cancelExpenseEdit()" style="flex:1;margin-top:0;background:#f1f5f9;color:#475569;">Cancel</button>
            <button onclick="saveExpenseEdit(${e.id})" style="flex:1;margin-top:0;">Save</button>
          </div>
        </div>`;
      }
      return `<div class="expense-item">
        <span class="expense-num">${i + 1}</span>
        <div style="flex:1">
          <div class="expense-desc">${e.description}</div>
          <div class="expense-meta"><span class="category-dot" style="background:${color}"></span>${e.category} &middot; ${formatDate(e.date)}</div>
        </div>
        <div style="display:flex;align-items:center">
          <span class="expense-amount" style="${e.amount < 0 ? 'color:#43a047' : ''}">${e.amount < 0 ? '+$' + Math.abs(e.amount).toFixed(2) : '-$' + e.amount.toFixed(2)}</span>
          <button class="delete-btn" onclick="editExpense(${e.id})" title="Edit" style="color:#94a3b8;font-size:0.95rem;">✎</button>
          <button class="delete-btn" onclick="deleteExpense(${e.id})" title="Delete">✕</button>
        </div>
      </div>`;
    }).join('');
    const showMoreBtn = sorted.length > visibleExpenseCount
      ? `<button onclick="showMoreExpenses()" style="width:100%;margin-top:8px;background:#f8fafc;color:#475569;border:1.5px solid #e2e8f0;font-size:0.85rem;padding:10px;">Show more (${sorted.length - visibleExpenseCount} remaining)</button>`
      : '';
    histEl.innerHTML = items + showMoreBtn;
  }

  populateMonthSelector();
  updateBudgetDisplay();
}

function showMoreExpenses() {
  visibleExpenseCount += 10;
  render();
}

// Inline-handler bridges
Object.assign(window, {
  addExpense, deleteExpense, editExpense, cancelExpenseEdit, saveExpenseEdit,
  toggleExpensesDropdown, toggleAddExpense,
  toggleSetBudget, setBudget, showPreviousMonth,
  addRecurring, deleteRecurring, toggleRecurring, editRecurring,
  reviewDueRecurring, cancelRecurringEdit, saveRecurringEdit,
  confirmRecurring, skipRecurring, showMoreExpenses,
});
