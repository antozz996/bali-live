// Bali 2026 — FULL LIVE-EDIT App (ogni sezione è modificabile in tempo reale)

let currentItineraryRegion = 'Tutti';
let currentDayNum = 1;
let backendSyncTimer = null;
let weatherRefreshTimer = null;
let isHydratingFromBackend = false;

const SYNC_KEYS = [
  'bali_budget_items_v2', 'bali_paid_items_custom', 'bali_itinerary_v1',
  'bali_accommodations_v1', 'bali_food_v2', 'bali_checklist_items_v1',
  'bali_checklist_state', 'bali_pianob_v1', 'bali_drivers_v1',
  'bali_photos_v1', 'bali_excursions_v1', 'bali_user_expenses'
];

const h = value => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');
const escapeHTML = h;

function safeExternalUrl(value) {
  if (!value) return '';
  try {
    const url = new URL(String(value), window.location.origin);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
  } catch { return ''; }
}

function saveJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
  scheduleBackendSync();
}

function removeStoredKey(key) {
  localStorage.removeItem(key);
  scheduleBackendSync();
}

function normalizeCollection(key, items) {
  const prefixByKey = {
    [BUDGET_KEY || 'bali_budget_items_v2']: 'BUD',
    bali_accommodations_v1: 'HOTEL', bali_food_v2: 'FOOD', bali_checklist_items_v1: 'CL',
    bali_pianob_v1: 'PB', bali_drivers_v1: 'DRV', bali_photos_v1: 'PS', bali_excursions_v1: 'EX'
  };
  const prefix = prefixByKey[key] || 'ITEM';
  return items.filter(item => item && typeof item === 'object').map((item, index) => {
    const id = String(item.id || '');
    return { ...item, id: /^[A-Za-z0-9_-]{1,80}$/.test(id) ? id : `${prefix}-${index + 1}` };
  });
}

document.addEventListener('DOMContentLoaded', () => { initApp().catch(showFatalError); });

async function initApp() {
  migrateLocalData();
  await hydrateStateFromBackend();
  initCountdown();
  await refreshWeather();
  renderDashboard();
  renderItineraryDaySelector();
  renderItineraryDay(currentDayNum);
  renderAccommodations();
  renderBudget();
  renderFood();
  renderExcursions();
  renderChecklist();
  renderPianoB();
  renderEmergencyContacts();
  renderDrivers();
  renderPhotoSpots();
  renderSurvivalGuide();
  initCurrencyConverter();
  initExpenseLogger();
  initNavigation();
  initSearch();
  initBackupImport();
  initModalAccessibility();
  updateWalletTotals();
  registerServiceWorker();
  weatherRefreshTimer = window.setInterval(() => refreshWeather(), 10 * 60 * 1000);
}

function showFatalError(error) {
  console.error(error);
  const app = document.getElementById('app');
  if (app) app.insertAdjacentHTML('afterbegin', '<div class="app-error">Impossibile avviare l’app. Ricarica la pagina o ripristina un backup.</div>');
}

function migrateLocalData() {
  const oldFood = localStorage.getItem('bali_food_v1');
  if (oldFood && !localStorage.getItem('bali_food_v2')) {
    try {
      const migrated = JSON.parse(oldFood).map((item, index) => ({ ...item, id: item.id || `FOOD-${index + 1}` }));
      localStorage.setItem('bali_food_v2', JSON.stringify(migrated));
    } catch {}
  }
}

/* ═══════════════════════════════════════════════════════
   GENERIC STORAGE HELPERS
   ═══════════════════════════════════════════════════════ */
function getSection(key, fallbackArr) {
  try {
    const s = localStorage.getItem(key);
    if (s) {
      const parsed = JSON.parse(s);
      if (Array.isArray(parsed)) return normalizeCollection(key, parsed);
    }
  } catch(e) {}
  const seed = normalizeCollection(key, fallbackArr.map(i => ({...i})));
  localStorage.setItem(key, JSON.stringify(seed));
  return seed;
}
function saveSection(key, data) {
  saveJSON(key, data);
}

/* ═══════════════════════════════════════════════════════
   1. WEATHER
   ═══════════════════════════════════════════════════════ */
function renderWeatherWidget(payload) {
  const c = document.getElementById('weather-widget');
  if (!c) return;
  const locations = payload?.locations || [];
  c.className = 'weather-bar';
  c.innerHTML = locations.map(w => `
    <div class="weather-chip">
      <span class="weather-area">${h(w.name)}</span>
      <span aria-hidden="true">${h(w.icon)}</span>
      <span class="weather-details">
        <span class="weather-temp">${Number(w.temperatureC).toFixed(0)}°C</span>
        <span class="weather-extra">${h(w.description)} · 💧${h(w.humidityPercent)}% · ${h(w.today?.minTemperatureC)}°/${h(w.today?.maxTemperatureC)}°</span>
      </span>
    </div>`).join('') + `
    <button class="icon-btn weather-refresh" onclick="refreshWeather(true)" aria-label="Aggiorna meteo" title="Aggiorna meteo">↻</button>`;
  c.title = `${payload.stale ? 'Ultimo dato disponibile' : 'Aggiornato'}: ${new Date(payload.fetchedAt).toLocaleString('it-IT')}`;
}

async function refreshWeather(force = false) {
  const c = document.getElementById('weather-widget');
  if (!c) return;
  c.className = 'weather-bar loading';
  c.textContent = 'Aggiornamento meteo live…';
  try {
    const response = await fetch(`/api/weather${force ? '?refresh=1' : ''}`, { headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`Meteo non disponibile (${response.status})`);
    const payload = await response.json();
    localStorage.setItem('bali_last_weather', JSON.stringify(payload));
    renderWeatherWidget(payload);
  } catch (error) {
    let cached = null;
    try { cached = JSON.parse(localStorage.getItem('bali_last_weather') || 'null'); } catch {}
    if (cached?.locations?.length) renderWeatherWidget({ ...cached, stale: true });
    else {
      c.className = 'weather-bar error';
      c.innerHTML = `<span>Meteo live non raggiungibile</span><button class="btn-cancel" onclick="refreshWeather(true)" style="padding:6px 10px;">Riprova</button>`;
    }
  }
}
window.refreshWeather = refreshWeather;

/* ═══════════════════════════════════════════════════════
   2. COUNTDOWN
   ═══════════════════════════════════════════════════════ */
function initCountdown() {
  const target = new Date(BALI_TRIP_DATA.meta.departureDate).getTime();
  function tick() {
    const diff = target - Date.now();
    const set  = (id, v) => { const e = document.getElementById(id); if(e) e.innerText = v; };
    if (diff <= 0) { set('days-val',0); set('hours-val',0); set('mins-val',0); return; }
    set('days-val',  Math.floor(diff / 86400000));
    set('hours-val', Math.floor((diff % 86400000) / 3600000));
    set('mins-val',  Math.floor((diff % 3600000) / 60000));
  }
  tick(); setInterval(tick, 60000);
}

/* ═══════════════════════════════════════════════════════
   3. NAVIGATION
   ═══════════════════════════════════════════════════════ */
function initNavigation() {
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => activateView(item.getAttribute('data-view')));
  });
  document.querySelectorAll('.modal-overlay').forEach(o => {
    o.addEventListener('click', e => { if (e.target === o) o.classList.remove('active'); });
  });
  activateView('dashboard');
}

function activateView(view) {
  document.querySelectorAll('.nav-item').forEach(item => {
    const active = item.getAttribute('data-view') === view;
    item.classList.toggle('active', active);
    item.setAttribute('aria-current', active ? 'page' : 'false');
  });
  document.querySelectorAll('.view-panel').forEach(panel => {
    const active = panel.id === `view-${view}`;
    panel.classList.toggle('active', active);
    panel.setAttribute('aria-hidden', String(!active));
  });
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
window.activateView = activateView;

function initModalAccessibility() {
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    document.querySelectorAll('.modal-overlay.active').forEach(modal => modal.classList.remove('active'));
  });
}

/* ═══════════════════════════════════════════════════════
   4. BUDGET (full CRUD, localStorage-backed)
   ═══════════════════════════════════════════════════════ */
const BUDGET_KEY      = 'bali_budget_items_v2';
const BUDGET_PAID_KEY = 'bali_paid_items_custom';
const BUDGET_CATS     = ['Voli','Alloggi','Escursioni','Trasporti','Cibo & Ristoranti',
                         'Documenti','Assicurazione','Connettività','Benessere / Spa','Extra & Mance','Altro'];

function getBudgetItems()    { return getSection(BUDGET_KEY, BALI_TRIP_DATA.budgetItems).map(item => ({ ...item, amount: Number(item.amount) || 0, paidDefault: Boolean(item.paidDefault) })); }
function saveBudgetItems(d)  { saveSection(BUDGET_KEY, d); }
function getBudgetPaidState(){ try { const value=JSON.parse(localStorage.getItem(BUDGET_PAID_KEY)||'{}'); return value&&typeof value==='object'&&!Array.isArray(value)?value:{}; } catch(e){return{};} }
// alias usato da Gmail sync
function getPaidItemsState() { return getBudgetPaidState(); }

function calculateTotalPaidEUR() {
  const paidSt = getBudgetPaidState();
  let t = getBudgetItems().reduce((a, item) => {
    const paid = paidSt[item.id] !== undefined ? paidSt[item.id] : item.paidDefault;
    return a + (paid ? (parseFloat(item.amount)||0) : 0);
  }, 0);
  return t;
}

function calculateActualExpensesEUR() {
  return getLoggedExpenses()
    .filter(expense => expense.wallet !== 'atm_withdrawal')
    .reduce((total, expense) => total + (Number(expense.amountEUR) || 0), 0);
}

function renderBudget() {
  const container = document.getElementById('budget-content');
  if (!container) return;
  const items  = getBudgetItems();
  const paidSt = getBudgetPaidState();
  let paid=0, pending=0;
  items.forEach(i => {
    const p = paidSt[i.id] !== undefined ? paidSt[i.id] : i.paidDefault;
    const a = parseFloat(i.amount)||0;
    if(p) paid+=a; else pending+=a;
  });
  const grand = paid+pending;
  const pct   = grand>0 ? Math.round((paid/grand)*100) : 0;
  const actualExpenses = calculateActualExpensesEUR();

  container.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:14px;">
      <div class="metric-card" style="text-align:center;padding:12px 6px;">
        <div style="font-size:18px;">💰</div><div class="metric-label">Piano spese</div>
        <div class="metric-value" style="font-size:16px;">€${grand.toFixed(0)}</div>
      </div>
      <div class="metric-card" style="text-align:center;padding:12px 6px;border-color:rgba(16,185,129,.3);">
        <div style="font-size:18px;">✅</div><div class="metric-label">Saldato</div>
        <div class="metric-value" style="font-size:16px;color:var(--accent-emerald);">€${paid.toFixed(0)}</div>
      </div>
      <div class="metric-card" style="text-align:center;padding:12px 6px;border-color:rgba(245,158,11,.3);">
        <div style="font-size:18px;">⏳</div><div class="metric-label">Da Saldare</div>
        <div class="metric-value" style="font-size:16px;color:var(--accent-amber);">€${pending.toFixed(0)}</div>
      </div>
    </div>
    <div class="glass-card" style="padding:12px 16px;margin-bottom:14px;border-color:rgba(6,182,212,.25);">
      <div class="progress-labels"><span>Spese effettive registrate</span><strong style="color:var(--accent-cyan);">€${actualExpenses.toFixed(2)}</strong></div>
      <div style="font-size:10px;color:var(--text-muted);">I prelievi ATM sono trasferimenti e non vengono conteggiati come spesa.</div>
    </div>
    <div class="glass-card" style="padding:12px 16px;margin-bottom:14px;">
      <div class="progress-labels">
        <span style="font-weight:700;">Avanzamento Pagamenti</span>
        <span style="color:var(--accent-emerald);font-weight:800;">${pct}%</span>
      </div>
      <div class="progress-bar-bg" style="margin-top:6px;">
        <div class="progress-bar-fill" style="width:${pct}%;"></div>
      </div>
    </div>
    <div class="glass-card" style="border-color:rgba(245,158,11,.25);padding:14px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
        <div style="font-family:var(--font-heading);font-size:15px;font-weight:800;color:var(--accent-amber);">
          📋 Voci di Spesa <span style="color:var(--text-muted);font-size:12px;">(${items.length})</span>
        </div>
        <button onclick="budgetStartAdd()" class="btn-primary" style="padding:6px 14px;font-size:12px;gap:5px;display:flex;align-items:center;">
          <i class="fa-solid fa-plus"></i> Aggiungi
        </button>
      </div>
      <div id="budget-add-form" style="display:none;background:rgba(16,185,129,.06);border:1px solid rgba(16,185,129,.3);border-radius:12px;padding:12px;margin-bottom:12px;">
        <div style="font-size:12px;font-weight:800;color:var(--accent-emerald);margin-bottom:8px;">➕ Nuova Voce</div>
        <input id="badd-desc" class="search-input" placeholder="Descrizione (es. Tour Kecak, Sarong...)" style="margin-bottom:6px;">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:8px;">
          <input id="badd-amount" type="number" step="0.01" min="0" class="search-input" placeholder="€ Importo">
          <select id="badd-cat" class="search-input">
            ${BUDGET_CATS.map(c=>`<option value="${c}">${c}</option>`).join('')}
          </select>
        </div>
        <div style="display:flex;gap:6px;">
          <button onclick="budgetConfirmAdd()" class="btn-primary" style="flex:1;padding:9px;">✓ Salva</button>
          <button onclick="budgetCancelAdd()" class="btn-cancel" style="flex:1;padding:9px;">Annulla</button>
        </div>
      </div>
      <div id="budget-items-list" style="display:flex;flex-direction:column;gap:8px;">
        ${items.map(item => _budgetRow(item, paidSt)).join('')}
      </div>
    </div>
    <div style="text-align:center;margin-top:4px;">
      <button onclick="budgetResetToDefault()" style="background:none;border:none;color:var(--text-muted);font-size:11px;cursor:pointer;text-decoration:underline;">
        ↺ Ripristina voci originali
      </button>
    </div>`;
}

function _budgetRow(item, paidSt, edit) {
  const isPaid = paidSt[item.id] !== undefined ? paidSt[item.id] : item.paidDefault;
  const amt    = parseFloat(item.amount)||0;
  if (edit) {
    const sd = h(item.desc||'');
    return `<div id="brow-${item.id}" style="background:rgba(6,182,212,.07);border:1px solid rgba(6,182,212,.35);border-radius:12px;padding:12px;">
      <div style="font-size:11px;font-weight:800;color:var(--accent-cyan);margin-bottom:8px;">✏️ Modifica voce</div>
      <input id="bedit-desc-${item.id}" class="search-input" value="${sd}" style="margin-bottom:6px;">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:8px;">
        <input id="bedit-amount-${item.id}" type="number" step="0.01" min="0" class="search-input" value="${amt.toFixed(2)}" placeholder="€">
        <select id="bedit-cat-${item.id}" class="search-input">
          ${BUDGET_CATS.map(c=>`<option value="${c}" ${c===item.cat?'selected':''}>${c}</option>`).join('')}
        </select>
      </div>
      <div style="display:flex;gap:6px;">
        <button onclick="budgetSaveEdit('${item.id}')" class="btn-primary" style="flex:1;padding:9px;font-size:13px;">✓ Salva</button>
        <button onclick="renderBudget()" class="btn-cancel" style="flex:1;padding:9px;font-size:13px;">Annulla</button>
      </div>
    </div>`;
  }
  return `<div id="brow-${item.id}" style="display:flex;align-items:center;gap:10px;padding:11px 12px;background:${isPaid?'rgba(16,185,129,.07)':'rgba(15,23,42,.88)'};border-radius:12px;border:1px solid ${isPaid?'rgba(16,185,129,.28)':'rgba(255,255,255,.07)'};transition:background .15s;">
    <div onclick="toggleBudgetItemPaid('${item.id}')" style="width:28px;height:28px;border-radius:8px;flex-shrink:0;display:flex;align-items:center;justify-content:center;cursor:pointer;user-select:none;${isPaid?'background:var(--accent-emerald);color:#000;font-weight:900;font-size:15px;':'border:2px solid var(--accent-amber);background:rgba(245,158,11,.05);color:transparent;'}">
      ${isPaid?'✓':'○'}
    </div>
    <div onclick="toggleBudgetItemPaid('${item.id}')" style="flex:1;min-width:0;cursor:pointer;user-select:none;">
      <div style="font-size:13px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;${isPaid?'text-decoration:line-through;color:var(--text-muted);':'color:var(--text-primary);'}">${h(item.desc)}</div>
      <div style="font-size:10px;color:var(--accent-cyan);font-weight:600;margin-top:1px;">${h(item.cat)}</div>
    </div>
    <div onclick="toggleBudgetItemPaid('${item.id}')" style="text-align:right;flex-shrink:0;cursor:pointer;user-select:none;">
      <div style="font-family:var(--font-heading);font-weight:800;font-size:14px;white-space:nowrap;color:${isPaid?'var(--accent-emerald)':'var(--accent-amber)'};">€${amt.toFixed(2)}</div>
      <div style="font-size:9px;font-weight:700;margin-top:2px;color:${isPaid?'var(--accent-emerald)':'#fbbf24'};">${isPaid?'SALDATO ✅':'DA SALDARE'}</div>
    </div>
    <div style="display:flex;flex-direction:column;gap:4px;flex-shrink:0;margin-left:4px;">
      <button onclick="budgetStartEdit('${item.id}')" title="Modifica" class="row-btn row-btn-edit"><i class="fa-solid fa-pen-to-square"></i></button>
      <button onclick="budgetDeleteItem('${item.id}')" title="Elimina" class="row-btn row-btn-delete"><i class="fa-solid fa-trash"></i></button>
    </div>
  </div>`;
}

window.toggleBudgetItemPaid = function(id) {
  const st = getBudgetPaidState();
  const items = getBudgetItems();
  const item  = items.find(i=>i.id===id);
  if(!item) return;
  st[id] = !(st[id] !== undefined ? st[id] : item.paidDefault);
  saveJSON(BUDGET_PAID_KEY, st);
  renderBudget(); renderDashboard();
};
window.budgetStartEdit = function(id) {
  const items=getBudgetItems(), paidSt=getBudgetPaidState(), item=items.find(i=>i.id===id);
  if(!item) return;
  const row=document.getElementById('brow-'+id);
  if(row) row.outerHTML=_budgetRow(item, paidSt, true);
};
window.budgetSaveEdit = function(id) {
  const items=getBudgetItems(), idx=items.findIndex(i=>i.id===id);
  if(idx===-1) return;
  const desc=document.getElementById('bedit-desc-'+id)?.value.trim();
  const amt =parseFloat(document.getElementById('bedit-amount-'+id)?.value);
  const cat =document.getElementById('bedit-cat-'+id)?.value||'Altro';
  if(!desc||isNaN(amt)||amt<0){alert('Inserisci valori validi!');return;}
  items[idx]={...items[idx],desc,amount:amt,cat};
  saveBudgetItems(items); renderBudget(); renderDashboard();
};
window.budgetDeleteItem = function(id) {
  if(!confirm('Eliminare questa voce?')) return;
  saveBudgetItems(getBudgetItems().filter(i=>i.id!==id));
  const st=getBudgetPaidState(); delete st[id];
  saveJSON(BUDGET_PAID_KEY, st);
  renderBudget(); renderDashboard();
};
window.budgetStartAdd   = () => { const f=document.getElementById('budget-add-form'); if(f){f.style.display='block';document.getElementById('badd-desc')?.focus();} };
window.budgetCancelAdd  = () => { const f=document.getElementById('budget-add-form'); if(f) f.style.display='none'; };
window.budgetConfirmAdd = function() {
  const desc=document.getElementById('badd-desc')?.value.trim();
  const amt =parseFloat(document.getElementById('badd-amount')?.value);
  const cat =document.getElementById('badd-cat')?.value||'Altro';
  if(!desc||isNaN(amt)||amt<0){alert('Inserisci descrizione e importo!');return;}
  const items=getBudgetItems();
  items.push({id:'CUSTOM-'+Date.now(),cat,desc,amount:amt,paidDefault:false,defaultStatus:'Da saldare'});
  saveBudgetItems(items); renderBudget(); renderDashboard();
};
window.budgetResetToDefault = function() {
  if(!confirm('Ripristinare le voci originali? Tutte le modifiche verranno perse.')) return;
  removeStoredKey(BUDGET_KEY); removeStoredKey(BUDGET_PAID_KEY);
  renderBudget(); renderDashboard();
};

/* ═══════════════════════════════════════════════════════
   5. DASHBOARD
   ═══════════════════════════════════════════════════════ */
function renderDashboard() {
  const c = document.getElementById('dashboard-metrics');
  if (!c) return;
  const totalPaid = calculateTotalPaidEUR();
  const actualExpenses = calculateActualExpensesEUR();
  const budgetMax = BALI_TRIP_DATA.meta.budgetMax;
  const pct       = Math.min(100, Math.round((totalPaid/budgetMax)*100));
  const hotels = getHotels();
  const nights = hotels.reduce((total, hotel) => total + (Number(hotel.nights) || 0), 0);
  const excursions = getExcursions();
  const bookedExcursions = excursions.filter(excursion => excursion.status === 'Prenotata').length;
  c.innerHTML = `
    <div class="metrics-grid">
      <div class="metric-card"><div class="metric-icon">💰</div><div class="metric-label">Budget Max</div>
        <div class="metric-value">€${budgetMax.toLocaleString('it-IT',{minimumFractionDigits:2})}</div><div class="metric-foot">2 Viaggiatori</div></div>
      <div class="metric-card"><div class="metric-icon">💳</div><div class="metric-label">Pagato</div>
        <div class="metric-value" style="color:var(--accent-emerald);">€${totalPaid.toLocaleString('it-IT',{minimumFractionDigits:2})}</div><div class="metric-foot">${pct}% del totale</div></div>
      <div class="metric-card"><div class="metric-icon">🧾</div><div class="metric-label">Spese viaggio</div>
        <div class="metric-value">€${actualExpenses.toFixed(2)}</div><div class="metric-foot">Prelievi esclusi</div></div>
      <div class="metric-card"><div class="metric-icon">🏨</div><div class="metric-label">Notti</div>
        <div class="metric-value">${nights}</div><div class="metric-foot">${hotels.length} alloggi</div></div>
      <div class="metric-card"><div class="metric-icon">✅</div><div class="metric-label">Hotel</div>
        <div class="metric-value">${hotels.length}</div><div class="metric-foot">Prenotazioni salvate</div></div>
      <div class="metric-card"><div class="metric-icon">🧭</div><div class="metric-label">Escursioni</div>
        <div class="metric-value">${bookedExcursions}/${excursions.length}</div><div class="metric-foot">Prenotate</div></div>
    </div>
    <div class="glass-card">
      <div class="progress-labels"><span>Avanzamento Pagamenti</span><span>€${totalPaid.toFixed(0)} / €${budgetMax.toFixed(0)}</span></div>
      <div class="progress-bar-bg"><div class="progress-bar-fill" style="width:${pct}%;"></div></div>
    </div>`;
}

/* ═══════════════════════════════════════════════════════
   6. ITINERARIO (full CRUD)
   ═══════════════════════════════════════════════════════ */
const ITIN_KEY = 'bali_itinerary_v1';
function getItinerary() {
  const seen = new Set();
  return getSection(ITIN_KEY, BALI_TRIP_DATA.itinerary)
    .map(day => ({ ...day, dayNum: Number.parseInt(day.dayNum, 10) }))
    .filter(day => Number.isInteger(day.dayNum) && day.dayNum > 0 && !seen.has(day.dayNum) && seen.add(day.dayNum));
}
function saveItinerary(d){ saveSection(ITIN_KEY, d); }

window.filterItineraryByRegion = function(region) {
  currentItineraryRegion = region;
  document.querySelectorAll('#itinerary-region-chips .chip-btn').forEach(b => b.classList.toggle('active', b.innerText.includes(region)));
  renderItineraryDaySelector();
  const days = _filteredDays();
  if(days.length) selectItineraryDay(days[0].dayNum);
  else {
    const content = document.getElementById('itinerary-content');
    if (content) content.innerHTML = '<div class="glass-card">Nessun giorno in questa area.</div>';
  }
};

function _filteredDays() {
  const all = getItinerary();
  if (currentItineraryRegion === 'Tutti') return all;
  return all.filter(d => d.regionGroup === currentItineraryRegion || (d.location||'').includes(currentItineraryRegion));
}

function renderItineraryDaySelector() {
  const c = document.getElementById('day-selector-container');
  if (!c) return;
  c.innerHTML = _filteredDays().map(day => `
    <button type="button" class="day-pill ${day.dayNum===currentDayNum?'active':''}" onclick="selectItineraryDay(${day.dayNum})" aria-label="Apri giorno ${day.dayNum}">
      <div class="day-pill-num">Giorno ${day.dayNum}</div>
      <div class="day-pill-date">${h((day.date||'').split('/')[0])} Set</div>
    </button>`).join('') + '<button type="button" class="day-pill day-pill-add" onclick="itinStartAdd()" aria-label="Aggiungi giorno">＋</button>';
}

window.selectItineraryDay = function(dayNum) {
  currentDayNum = dayNum;
  document.querySelectorAll('.day-pill').forEach(p => p.classList.toggle('active', p.getAttribute('onclick').includes(`(${dayNum})`)));
  renderItineraryDay(dayNum);
};

function renderItineraryDay(dayNum) {
  const c   = document.getElementById('itinerary-content');
  if (!c) return;
  const day = getItinerary().find(d => d.dayNum === dayNum);
  if (!day) { c.innerHTML = `<div style="color:var(--text-muted);font-size:13px;padding:16px;">Nessun giorno selezionato.</div>`; return; }
  const mq = encodeURIComponent(`${day.location} Bali`);
  const intensity = ['alta','media','bassa'].includes(String(day.intensity).toLowerCase()) ? String(day.intensity).toLowerCase() : 'media';
  const wa = encodeURIComponent(`🌺 Bali 2026 - Giorno ${day.dayNum} (${day.date})\n📍 ${day.location}\n🌅 ${day.morning}\n☀️ ${day.afternoon}\n🌙 ${day.evening}`);
  const linkedExcursions = getExcursions().filter(excursion => Number(excursion.dayNum) === Number(dayNum));
  c.innerHTML = `
    <div class="glass-card itinerary-card">
      <div class="itinerary-head">
        <div>
          <div class="itinerary-day-title">Giorno ${day.dayNum} • ${h(day.dayName)} ${h(day.date)}</div>
          <div class="itinerary-meta"><span>📍 ${h(day.location||'–')}</span><span>• ${h(day.phase||'')}</span></div>
        </div>
        <div style="display:flex;gap:6px;align-items:center;">
          <span class="badge badge-${intensity}">${h(day.intensity||'Media')}</span>
          <button onclick="itinStartEdit(${day.dayNum})" class="row-btn row-btn-edit" title="Modifica giorno"><i class="fa-solid fa-pen-to-square"></i></button>
          <button onclick="itinDeleteDay(${day.dayNum})" class="row-btn row-btn-delete" title="Elimina giorno"><i class="fa-solid fa-trash"></i></button>
        </div>
      </div>
      <div class="timeline-slot"><div class="time-tag">🌅 Mattina</div><div class="time-content"><div class="time-title">${h(day.morning||'–')}</div></div></div>
      <div class="timeline-slot"><div class="time-tag">☀️ Pomeriggio</div><div class="time-content"><div class="time-title">${h(day.afternoon||'–')}</div></div></div>
      <div class="timeline-slot"><div class="time-tag">🌙 Sera</div><div class="time-content"><div class="time-title">${h(day.evening||'–')}</div></div></div>
      <div style="margin-top:12px;padding-top:10px;border-top:1px solid var(--border-color);display:flex;flex-direction:column;gap:7px;font-size:12px;color:var(--text-secondary);">
        <div><strong>🚗 Trasporto:</strong> ${h(day.transport||'–')}</div>
        <div><strong>🍱 Pranzo:</strong> ${h(day.lunch||'–')} ${safeExternalUrl(day.lunchLink)?`<a href="${h(safeExternalUrl(day.lunchLink))}" target="_blank" rel="noopener noreferrer" class="link-btn">Menu ↗</a>`:''}</div>
        <div><strong>🍷 Cena:</strong> ${h(day.dinner||'–')} ${safeExternalUrl(day.dinnerLink)?`<a href="${h(safeExternalUrl(day.dinnerLink))}" target="_blank" rel="noopener noreferrer" class="link-btn">Menu ↗</a>`:''}</div>
        ${linkedExcursions.length ? `<div class="linked-excursions"><strong>🧭 Escursioni:</strong>${linkedExcursions.map(excursion => `<button class="link-btn" onclick="openExcursion('${h(excursion.id)}')">${h(excursion.name)} · ${h(excursion.status)}</button>`).join('')}</div>` : '<div><strong>🧭 Escursioni:</strong> nessuna collegata</div>'}
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:4px;">
          <a href="https://www.google.com/maps/search/?api=1&query=${mq}" target="_blank" rel="noopener noreferrer" class="link-btn link-btn-maps"><i class="fa-solid fa-map-location-dot"></i> Mappa</a>
          <a href="https://wa.me/?text=${wa}" target="_blank" rel="noopener noreferrer" class="link-btn" style="background:rgba(37,211,102,.15);color:#25D366;border-color:rgba(37,211,102,.3);"><i class="fa-brands fa-whatsapp"></i> Condividi</a>
        </div>
        ${day.notes?`<div style="color:var(--accent-amber);font-weight:600;">📌 <em>${h(day.notes)}</em></div>`:''}
      </div>
    </div>`;
}

window.itinStartEdit = function(dayNum) {
  const c   = document.getElementById('itinerary-content');
  if (!c) return;
  const day = getItinerary().find(d => d.dayNum===dayNum);
  if (!day) return;
  const esc = h;
  c.innerHTML = `
    <div class="glass-card" style="border-color:rgba(6,182,212,.35);">
      <div style="font-family:var(--font-heading);font-size:15px;font-weight:800;color:var(--accent-cyan);margin-bottom:12px;">✏️ Modifica Giorno ${dayNum}</div>
      <label class="edit-label">📍 Luogo</label>
      <input id="iedit-location" class="search-input" value="${esc(day.location)}" style="margin-bottom:6px;">
      <label class="edit-label">🌅 Mattina</label>
      <textarea id="iedit-morning" class="search-input" rows="2" style="margin-bottom:6px;">${esc(day.morning)}</textarea>
      <label class="edit-label">☀️ Pomeriggio</label>
      <textarea id="iedit-afternoon" class="search-input" rows="2" style="margin-bottom:6px;">${esc(day.afternoon)}</textarea>
      <label class="edit-label">🌙 Sera</label>
      <textarea id="iedit-evening" class="search-input" rows="2" style="margin-bottom:6px;">${esc(day.evening)}</textarea>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:6px;">
        <div><label class="edit-label">🍱 Pranzo</label><input id="iedit-lunch" class="search-input" value="${esc(day.lunch)}"></div>
        <div><label class="edit-label">🍷 Cena</label><input id="iedit-dinner" class="search-input" value="${esc(day.dinner)}"></div>
      </div>
      <label class="edit-label">🚗 Trasporto</label>
      <input id="iedit-transport" class="search-input" value="${esc(day.transport)}" style="margin-bottom:6px;">
      <label class="edit-label">📌 Note / Avvisi</label>
      <textarea id="iedit-notes" class="search-input" rows="2" style="margin-bottom:10px;">${esc(day.notes)}</textarea>
      <div style="display:flex;gap:6px;">
        <button onclick="itinSaveEdit(${dayNum})" class="btn-primary" style="flex:1;padding:10px;">✓ Salva Giorno</button>
        <button onclick="renderItineraryDay(${dayNum})" class="btn-cancel" style="flex:1;padding:10px;">Annulla</button>
      </div>
    </div>`;
};

window.itinSaveEdit = function(dayNum) {
  const days = getItinerary();
  const idx  = days.findIndex(d=>d.dayNum===dayNum);
  if(idx===-1) return;
  days[idx] = { ...days[idx],
    location  : document.getElementById('iedit-location')?.value.trim()||days[idx].location,
    morning   : document.getElementById('iedit-morning')?.value.trim()||'',
    afternoon : document.getElementById('iedit-afternoon')?.value.trim()||'',
    evening   : document.getElementById('iedit-evening')?.value.trim()||'',
    lunch     : document.getElementById('iedit-lunch')?.value.trim()||'',
    dinner    : document.getElementById('iedit-dinner')?.value.trim()||'',
    transport : document.getElementById('iedit-transport')?.value.trim()||'',
    notes     : document.getElementById('iedit-notes')?.value.trim()||''
  };
  saveItinerary(days); renderItineraryDay(dayNum);
};

window.itinDeleteDay = function(dayNum) {
  if(!confirm(`Eliminare il Giorno ${dayNum} dall'itinerario?`)) return;
  const days = getItinerary().filter(d=>d.dayNum!==dayNum);
  saveItinerary(days);
  saveExcursions(getExcursions().map(excursion => Number(excursion.dayNum) === Number(dayNum) ? { ...excursion, dayNum: null } : excursion));
  renderItineraryDaySelector();
  const first = _filteredDays()[0];
  if(first){ currentDayNum=first.dayNum; renderItineraryDay(first.dayNum); }
  else document.getElementById('itinerary-content').innerHTML='';
};

window.itinStartAdd = function() {
  const c = document.getElementById('itinerary-content');
  if (!c) return;
  const suggestedDay = Math.max(0, ...getItinerary().map(day => Number(day.dayNum) || 0)) + 1;
  c.innerHTML = `
    <div class="glass-card" style="border-color:rgba(16,185,129,.35);">
      <div style="font-family:var(--font-heading);font-weight:800;color:var(--accent-emerald);margin-bottom:10px;">➕ Nuovo giorno</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">
        <input id="iadd-num" type="number" min="1" class="search-input" value="${suggestedDay}" aria-label="Numero giorno">
        <input id="iadd-date" type="date" class="search-input" aria-label="Data">
        <input id="iadd-name" class="search-input" placeholder="Giorno settimana" aria-label="Giorno settimana">
        <select id="iadd-region" class="search-input" aria-label="Area"><option>Ubud</option><option>Gili Air</option><option value="Uluwatu">Jimbaran/Uluwatu</option><option>Voli</option></select>
      </div>
      <input id="iadd-location" class="search-input" placeholder="Luogo" style="margin-top:6px;">
      <textarea id="iadd-morning" class="search-input" placeholder="Mattina" style="margin-top:6px;"></textarea>
      <textarea id="iadd-afternoon" class="search-input" placeholder="Pomeriggio" style="margin-top:6px;"></textarea>
      <textarea id="iadd-evening" class="search-input" placeholder="Sera" style="margin-top:6px;"></textarea>
      <div style="display:flex;gap:6px;margin-top:8px;"><button onclick="itinConfirmAdd()" class="btn-primary" style="flex:1;">Salva</button><button onclick="renderItineraryDay(currentDayNum)" class="btn-cancel" style="flex:1;">Annulla</button></div>
    </div>`;
};

window.itinConfirmAdd = function() {
  const days = getItinerary();
  const dayNum = Number.parseInt(document.getElementById('iadd-num')?.value, 10);
  const isoDate = document.getElementById('iadd-date')?.value;
  const location = document.getElementById('iadd-location')?.value.trim();
  if (!dayNum || days.some(day => Number(day.dayNum) === dayNum) || !isoDate || !location) {
    alert('Inserisci numero univoco, data e luogo.');
    return;
  }
  const [year, month, day] = isoDate.split('-');
  days.push({
    dayNum,
    date: `${day}/${month}/${year}`,
    dayName: document.getElementById('iadd-name')?.value.trim() || '',
    phase: 'Personalizzato',
    location,
    regionGroup: document.getElementById('iadd-region')?.value || 'Ubud',
    intensity: 'Media',
    morning: document.getElementById('iadd-morning')?.value.trim() || '',
    afternoon: document.getElementById('iadd-afternoon')?.value.trim() || '',
    evening: document.getElementById('iadd-evening')?.value.trim() || '',
    transport: '', lunch: '', dinner: '', notes: ''
  });
  days.sort((a, b) => Number(a.dayNum) - Number(b.dayNum));
  saveItinerary(days);
  currentDayNum = dayNum;
  currentItineraryRegion = 'Tutti';
  renderItineraryDaySelector();
  renderItineraryDay(dayNum);
};

/* ═══════════════════════════════════════════════════════
   7. ALLOGGI (full CRUD)
   ═══════════════════════════════════════════════════════ */
const HOTELS_KEY = 'bali_accommodations_v1';
function getHotels()   { return getSection(HOTELS_KEY, BALI_TRIP_DATA.accommodations).map(hotel => ({ ...hotel, nights: Math.max(1, Number.parseInt(hotel.nights, 10) || 1), totalPriceEUR: Number(hotel.totalPriceEUR) || 0, nightlyPriceEUR: Number(hotel.nightlyPriceEUR) || 0 })); }
function saveHotels(d) { saveSection(HOTELS_KEY, d); }

function renderAccommodations() {
  const c = document.getElementById('accommodations-content');
  if (!c) return;
  const hotels = getHotels();
  c.innerHTML = `
    ${hotels.map(h => _hotelCard(h)).join('')}
    <div style="text-align:center;margin-bottom:12px;">
      <button onclick="hotelStartAdd()" class="btn-primary" style="padding:8px 20px;font-size:13px;gap:6px;display:inline-flex;align-items:center;">
        <i class="fa-solid fa-plus"></i> Aggiungi Alloggio
      </button>
    </div>
    <div id="hotel-add-form" class="glass-card" style="display:none;border-color:rgba(16,185,129,.35);">
      <div style="font-size:13px;font-weight:800;color:var(--accent-emerald);margin-bottom:10px;">➕ Nuovo Alloggio</div>
      <input id="hadd-name" class="search-input" placeholder="Nome struttura" style="margin-bottom:6px;">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:6px;">
        <input id="hadd-area"    class="search-input" placeholder="Area (es. Ubud)">
        <input id="hadd-code"   class="search-input" placeholder="Codice prenotazione">
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:6px;">
        <input id="hadd-checkin"  class="search-input" placeholder="Check-in (dd/mm/yyyy)">
        <input id="hadd-checkout" class="search-input" placeholder="Check-out (dd/mm/yyyy)">
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:6px;">
        <input id="hadd-nights" type="number" min="1" class="search-input" placeholder="Notti">
        <input id="hadd-price"  type="number" step="0.01" class="search-input" placeholder="€ Totale">
      </div>
      <textarea id="hadd-notes" class="search-input" rows="2" placeholder="Note (es. late checkout, piscina...)" style="margin-bottom:8px;"></textarea>
      <div style="display:flex;gap:6px;">
        <button onclick="hotelConfirmAdd()" class="btn-primary" style="flex:1;padding:9px;">✓ Salva</button>
        <button onclick="hotelCancelAdd()" class="btn-cancel" style="flex:1;padding:9px;">Annulla</button>
      </div>
    </div>`;
}

function _hotelCard(h, edit) {
  const esc = escapeHTML;
  if(edit) return `
    <div id="hcard-${h.id}" class="glass-card" style="border-color:rgba(6,182,212,.35);">
      <div style="font-size:13px;font-weight:800;color:var(--accent-cyan);margin-bottom:10px;">✏️ Modifica: ${escapeHTML(h.name)}</div>
      <input id="hedit-name-${h.id}" class="search-input" value="${esc(h.name)}" placeholder="Nome" style="margin-bottom:6px;">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:6px;">
        <input id="hedit-area-${h.id}" class="search-input" value="${esc(h.area)}" placeholder="Area">
        <input id="hedit-code-${h.id}" class="search-input" value="${esc(h.bookingCode||'')}" placeholder="Codice Prenotazione">
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:6px;">
        <input id="hedit-checkin-${h.id}"  class="search-input" value="${esc(h.checkIn)}"  placeholder="Check-in">
        <input id="hedit-checkout-${h.id}" class="search-input" value="${esc(h.checkOut)}" placeholder="Check-out">
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:6px;">
        <input id="hedit-nights-${h.id}" type="number" class="search-input" value="${h.nights||0}" placeholder="Notti">
        <input id="hedit-price-${h.id}"  type="number" class="search-input" value="${h.totalPriceEUR||0}" placeholder="€ Totale">
      </div>
      <textarea id="hedit-notes-${h.id}" class="search-input" rows="2" style="margin-bottom:8px;">${esc(h.notes)}</textarea>
      <div style="display:flex;gap:6px;">
        <button onclick="hotelSaveEdit('${h.id}')" class="btn-primary" style="flex:1;padding:9px;">✓ Salva</button>
        <button onclick="renderAccommodations()" class="btn-cancel" style="flex:1;padding:9px;">Annulla</button>
      </div>
    </div>`;

  return `
    <div id="hcard-${h.id}" class="glass-card hotel-card">
      <div class="hotel-header">
        <div>
          <div class="hotel-name">${escapeHTML(h.name)}</div>
          <div class="hotel-dates">📍 ${escapeHTML(h.area)} • ${escapeHTML(h.checkIn||'?')} → ${escapeHTML(h.checkOut||'?')}</div>
        </div>
        <div style="display:flex;flex-direction:column;gap:4px;align-items:flex-end;">
          <span class="badge badge-prenotato">${escapeHTML(h.status||'Prenotato')}</span>
          <div style="display:flex;gap:4px;">
            <button onclick="hotelStartEdit('${h.id}')" class="row-btn row-btn-edit" title="Modifica"><i class="fa-solid fa-pen-to-square"></i></button>
            <button onclick="hotelDeleteItem('${h.id}')" class="row-btn row-btn-delete" title="Elimina"><i class="fa-solid fa-trash"></i></button>
          </div>
        </div>
      </div>
      <div class="hotel-details-grid">
        <div class="hotel-detail-item"><div class="hotel-detail-label">Notti</div><div class="hotel-detail-val">${h.nights}</div></div>
        <div class="hotel-detail-item"><div class="hotel-detail-label">Prezzo/Notte</div><div class="hotel-detail-val">€${(Number(h.nightlyPriceEUR)||Number(h.totalPriceEUR)/Number(h.nights)||0).toFixed(0)}</div></div>
        <div class="hotel-detail-item"><div class="hotel-detail-label">Totale</div><div class="hotel-detail-val" style="color:var(--accent-emerald);">€${h.totalPriceEUR}</div></div>
      </div>
      <div style="font-size:12px;color:var(--text-secondary);">
        <div><strong>Codice:</strong> <span style="color:var(--accent-cyan);font-weight:800;">${escapeHTML(h.bookingCode||'Da inserire')}</span></div>
        <div style="margin-top:2px;"><strong>Note:</strong> ${escapeHTML(h.notes||'–')}</div>
      </div>
      <div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap;">
        ${safeExternalUrl(h.link)?`<a href="${escapeHTML(safeExternalUrl(h.link))}" target="_blank" rel="noopener noreferrer" class="link-btn"><i class="fa-solid fa-bed"></i> Sito ↗</a>`:''}
        <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(h.name+' '+h.area)}" target="_blank" rel="noopener noreferrer" class="link-btn link-btn-maps"><i class="fa-solid fa-map-pin"></i> Maps ↗</a>
      </div>
    </div>`;
}

window.hotelStartEdit = function(id) {
  const h = getHotels().find(x=>x.id===id);
  if(!h) return;
  const card = document.getElementById('hcard-'+id);
  if(card) card.outerHTML = _hotelCard(h, true);
};
window.hotelSaveEdit = function(id) {
  const hotels = getHotels(); const idx = hotels.findIndex(x=>x.id===id);
  if(idx===-1) return;
  const nights = parseInt(document.getElementById('hedit-nights-'+id)?.value, 10);
  const price  = parseFloat(document.getElementById('hedit-price-'+id)?.value);
  if (!Number.isInteger(nights) || nights < 1 || !Number.isFinite(price) || price < 0) { alert('Notti o prezzo non validi.'); return; }
  hotels[idx]  = { ...hotels[idx],
    name:         document.getElementById('hedit-name-'+id)?.value.trim()||hotels[idx].name,
    area:         document.getElementById('hedit-area-'+id)?.value.trim()||hotels[idx].area,
    bookingCode:  document.getElementById('hedit-code-'+id)?.value.trim(),
    checkIn:      document.getElementById('hedit-checkin-'+id)?.value.trim()||hotels[idx].checkIn,
    checkOut:     document.getElementById('hedit-checkout-'+id)?.value.trim()||hotels[idx].checkOut,
    notes:        document.getElementById('hedit-notes-'+id)?.value.trim(),
    nights, totalPriceEUR: price,
    nightlyPriceEUR: nights>0 ? price/nights : 0
  };
  saveHotels(hotels); renderAccommodations();
};
window.hotelDeleteItem = function(id) {
  if(!confirm('Eliminare questo alloggio?')) return;
  saveHotels(getHotels().filter(x=>x.id!==id)); renderAccommodations();
};
window.hotelStartAdd  = () => { const f=document.getElementById('hotel-add-form'); if(f){f.style.display='block';document.getElementById('hadd-name')?.focus();} };
window.hotelCancelAdd = () => { const f=document.getElementById('hotel-add-form'); if(f) f.style.display='none'; };
window.hotelConfirmAdd = function() {
  const name    = document.getElementById('hadd-name')?.value.trim();
  const area    = document.getElementById('hadd-area')?.value.trim()||'';
  const code    = document.getElementById('hadd-code')?.value.trim()||'';
  const checkIn = document.getElementById('hadd-checkin')?.value.trim()||'';
  const checkOut= document.getElementById('hadd-checkout')?.value.trim()||'';
  const nightsRaw = document.getElementById('hadd-nights')?.value;
  const priceRaw = document.getElementById('hadd-price')?.value;
  const nights  = nightsRaw ? parseInt(nightsRaw, 10) : 1;
  const price   = priceRaw ? parseFloat(priceRaw) : 0;
  const notes   = document.getElementById('hadd-notes')?.value.trim()||'';
  if(!name || !Number.isInteger(nights) || nights < 1 || !Number.isFinite(price) || price < 0){alert('Inserisci nome, notti e prezzo validi.');return;}
  const hotels = getHotels();
  hotels.push({ id:'HOTEL-'+Date.now(), name, area, bookingCode:code, checkIn, checkOut, nights,
                totalPriceEUR:price, nightlyPriceEUR:nights>0?price/nights:0, status:'Prenotato',
                rating:'–', address:'', location:'', notes, link:'' });
  saveHotels(hotels); renderAccommodations();
};

/* ═══════════════════════════════════════════════════════
   8. FOOD (full CRUD + mark visited)
   ═══════════════════════════════════════════════════════ */
const FOOD_KEY = 'bali_food_v2';
function getFoodItems()   { return getSection(FOOD_KEY, BALI_TRIP_DATA.foodHighlights); }
function saveFoodItems(d) { saveSection(FOOD_KEY, d); }

function renderFood() {
  const c = document.getElementById('food-content');
  if (!c) return;
  const items = getFoodItems();
  c.innerHTML = `
    <div style="text-align:right;margin-bottom:8px;">
      <button onclick="foodStartAdd()" class="btn-primary" style="padding:6px 14px;font-size:12px;gap:5px;display:inline-flex;align-items:center;">
        <i class="fa-solid fa-plus"></i> Aggiungi Ristorante
      </button>
    </div>
    <div id="food-add-form" class="glass-card" style="display:none;border-color:rgba(16,185,129,.35);">
      <div style="font-size:13px;font-weight:800;color:var(--accent-emerald);margin-bottom:8px;">➕ Nuovo Locale</div>
      <input id="fadd-place" class="search-input" placeholder="Nome locale" style="margin-bottom:6px;">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:6px;">
        <input id="fadd-area"  class="search-input" placeholder="Area (Ubud, Gili...)">
        <input id="fadd-meal"  class="search-input" placeholder="Pasto (Pranzo, Cena...)">
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:6px;">
        <input id="fadd-price" class="search-input" placeholder="Prezzo (es. €20-40)">
        <input id="fadd-date"  class="search-input" placeholder="Data (es. 17/09)">
      </div>
      <input id="fadd-style" class="search-input" placeholder="Stile / Descrizione" style="margin-bottom:6px;">
      <input id="fadd-link"  class="search-input" placeholder="Link sito/menu (opzionale)" style="margin-bottom:8px;">
      <div style="display:flex;gap:6px;">
        <button onclick="foodConfirmAdd()" class="btn-primary" style="flex:1;padding:9px;">✓ Salva</button>
        <button onclick="foodCancelAdd()" class="btn-cancel" style="flex:1;padding:9px;">Annulla</button>
      </div>
    </div>
    <div id="food-items-list">
      ${items.map(item => _foodCard(item)).join('')}
    </div>`;
}

function _foodCard(item, edit) {
  const esc = h;
  const visited = item.visited;
  if(edit) return `
    <div id="fcard-${item.id}" class="glass-card" style="border-color:rgba(6,182,212,.35);">
      <div style="font-size:13px;font-weight:800;color:var(--accent-cyan);margin-bottom:8px;">✏️ Modifica Locale</div>
      <input id="fedit-place-${item.id}" class="search-input" value="${esc(item.place)}" placeholder="Nome" style="margin-bottom:6px;">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:6px;">
        <input id="fedit-area-${item.id}" class="search-input" value="${esc(item.area)}" placeholder="Area">
        <input id="fedit-meal-${item.id}" class="search-input" value="${esc(item.meal)}" placeholder="Pasto">
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:6px;">
        <input id="fedit-price-${item.id}" class="search-input" value="${esc(item.price)}" placeholder="Prezzo">
        <input id="fedit-date-${item.id}"  class="search-input" value="${esc(item.date)}" placeholder="Data">
      </div>
      <input id="fedit-style-${item.id}" class="search-input" value="${esc(item.style)}" placeholder="Stile" style="margin-bottom:6px;">
      <input id="fedit-link-${item.id}"  class="search-input" value="${esc(item.link||'')}" placeholder="Link" style="margin-bottom:8px;">
      <div style="display:flex;gap:6px;">
        <button onclick="foodSaveEdit('${item.id}')" class="btn-primary" style="flex:1;padding:9px;">✓ Salva</button>
        <button onclick="renderFood()" class="btn-cancel" style="flex:1;padding:9px;">Annulla</button>
      </div>
    </div>`;

  return `
    <div id="fcard-${item.id}" class="glass-card food-card" style="${visited?'opacity:.6;':''}" >
      <div class="food-title-row">
        <div class="food-place" style="${visited?'text-decoration:line-through;color:var(--text-muted);':''}">${h(item.place)}</div>
        <div style="display:flex;gap:5px;align-items:center;">
          <div class="food-price">${h(item.price)}</div>
          <button onclick="foodToggleVisited('${item.id}')" title="${visited?'Segna come da visitare':'Segna come visitato'}"
                  class="row-btn" style="${visited?'background:rgba(16,185,129,.15);border-color:rgba(16,185,129,.35);color:var(--accent-emerald);':'border-color:var(--border-color);color:var(--text-muted);'}" >
            <i class="fa-solid fa-check"></i>
          </button>
          <button onclick="foodStartEdit('${item.id}')" class="row-btn row-btn-edit" title="Modifica"><i class="fa-solid fa-pen-to-square"></i></button>
          <button onclick="foodDeleteItem('${item.id}')" class="row-btn row-btn-delete" title="Elimina"><i class="fa-solid fa-trash"></i></button>
        </div>
      </div>
      <div class="food-style">📍 ${h(item.area)} • ${h(item.meal||'')} ${item.date?`(${h(item.date)})`:''} — ${h(item.style||'')}</div>
      ${visited?`<div style="margin-top:4px;"><span class="badge badge-pagato">✅ VISITATO</span></div>`:''}
      ${item.priority?`<div style="margin-top:4px;"><span class="badge badge-imperdibile">${h(item.priority)}</span></div>`:''}
      <div style="display:flex;gap:8px;margin-top:6px;flex-wrap:wrap;">
        ${safeExternalUrl(item.link)?`<a href="${h(safeExternalUrl(item.link))}" target="_blank" rel="noopener noreferrer" class="link-btn">Menu ↗</a>`:''}
        <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((item.place||'')+' '+(item.area||''))}" target="_blank" rel="noopener noreferrer" class="link-btn link-btn-maps"><i class="fa-solid fa-compass"></i> Mappa ↗</a>
      </div>
    </div>`;
}

window.foodStartEdit = function(id) {
  const item = getFoodItems().find(x=>x.id===id);
  if(!item) return;
  const card = document.getElementById('fcard-'+id);
  if(card) card.outerHTML = _foodCard(item, true);
};
window.foodSaveEdit = function(id) {
  const items=getFoodItems(), idx=items.findIndex(x=>x.id===id);
  if(idx===-1) return;
  items[idx]={...items[idx],
    place: document.getElementById('fedit-place-'+id)?.value.trim()||items[idx].place,
    area:  document.getElementById('fedit-area-'+id)?.value.trim()||items[idx].area,
    meal:  document.getElementById('fedit-meal-'+id)?.value.trim()||items[idx].meal,
    price: document.getElementById('fedit-price-'+id)?.value.trim()||items[idx].price,
    date:  document.getElementById('fedit-date-'+id)?.value.trim()||items[idx].date,
    style: document.getElementById('fedit-style-'+id)?.value.trim()||items[idx].style,
    link:  safeExternalUrl(document.getElementById('fedit-link-'+id)?.value.trim())
  };
  saveFoodItems(items); renderFood();
};
window.foodDeleteItem = function(id) {
  if(!confirm('Eliminare questo locale dalla lista?')) return;
  saveFoodItems(getFoodItems().filter(x=>x.id!==id)); renderFood();
};
window.foodToggleVisited = function(id) {
  const items=getFoodItems(), idx=items.findIndex(x=>x.id===id);
  if(idx===-1) return;
  items[idx]={...items[idx],visited:!items[idx].visited};
  saveFoodItems(items); renderFood();
};
window.foodStartAdd  = () => { const f=document.getElementById('food-add-form'); if(f){f.style.display='block';document.getElementById('fadd-place')?.focus();} };
window.foodCancelAdd = () => { const f=document.getElementById('food-add-form'); if(f) f.style.display='none'; };
window.foodConfirmAdd = function() {
  const place=document.getElementById('fadd-place')?.value.trim();
  if(!place){alert('Inserisci il nome del locale!');return;}
  const items=getFoodItems();
  items.push({ id:'FOOD-'+Date.now(),
    place, area:document.getElementById('fadd-area')?.value.trim()||'',
    meal:  document.getElementById('fadd-meal')?.value.trim()||'',
    price: document.getElementById('fadd-price')?.value.trim()||'',
    date:  document.getElementById('fadd-date')?.value.trim()||'',
    style: document.getElementById('fadd-style')?.value.trim()||'',
    link:  safeExternalUrl(document.getElementById('fadd-link')?.value.trim()),
    visited:false, maps:''
  });
  saveFoodItems(items); renderFood();
};

/* ═══════════════════════════════════════════════════════
   9. ESCURSIONI (CRUD + collegamento itinerario)
   ═══════════════════════════════════════════════════════ */
const EXCURSIONS_KEY = 'bali_excursions_v1';
const EXCURSION_STATUSES = ['Da valutare', 'Da confermare', 'Da prenotare', 'Prenotata', 'Completata', 'Annullata'];
function getExcursions() { return getSection(EXCURSIONS_KEY, BALI_TRIP_DATA.excursions || []).map(item => ({ ...item, dayNum: item.dayNum ? Number.parseInt(item.dayNum, 10) || null : null })); }
function saveExcursions(items) { saveSection(EXCURSIONS_KEY, items); }

function excursionDayOptions(selected) {
  return `<option value="">Non collegata</option>${getItinerary().map(day =>
    `<option value="${day.dayNum}" ${Number(selected)===Number(day.dayNum)?'selected':''}>Giorno ${day.dayNum} · ${h(day.date)} · ${h(day.location)}</option>`
  ).join('')}`;
}

function renderExcursions() {
  const c = document.getElementById('excursions-content');
  if (!c) return;
  const items = getExcursions();
  const booked = items.filter(item => item.status === 'Prenotata' || item.status === 'Completata').length;
  const total = items.reduce((sum, item) => sum + (Number(item.priceEUR) || 0), 0);
  c.innerHTML = `
    <div class="metrics-grid">
      <div class="metric-card"><div class="metric-label">Pianificate</div><div class="metric-value">${items.length}</div></div>
      <div class="metric-card"><div class="metric-label">Prenotate</div><div class="metric-value" style="color:var(--accent-emerald);">${booked}</div></div>
      <div class="metric-card"><div class="metric-label">Valore previsto</div><div class="metric-value">€${total.toFixed(2)}</div></div>
      <div class="metric-card"><div class="metric-label">Collegate</div><div class="metric-value">${items.filter(item=>item.dayNum).length}/${items.length}</div></div>
    </div>
    <button onclick="excursionStartAdd()" class="btn-primary" style="width:100%;margin-bottom:12px;">＋ Aggiungi escursione</button>
    <div id="excursion-add-form" class="glass-card" style="display:none;border-color:rgba(16,185,129,.35);">
      <input id="exadd-name" class="search-input" placeholder="Nome escursione" style="margin-bottom:6px;">
      <select id="exadd-day" class="search-input" style="margin-bottom:6px;">${excursionDayOptions('')}</select>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:6px;"><input id="exadd-region" class="search-input" placeholder="Area"><input id="exadd-time" class="search-input" placeholder="Orario"></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:6px;"><select id="exadd-status" class="search-input">${EXCURSION_STATUSES.map(status=>`<option>${status}</option>`).join('')}</select><input id="exadd-price" type="number" min="0" step="0.01" class="search-input" placeholder="Prezzo €"></div>
      <input id="exadd-link" class="search-input" placeholder="Link prenotazione (https://...)" style="margin-bottom:6px;">
      <textarea id="exadd-notes" class="search-input" placeholder="Note"></textarea>
      <div style="display:flex;gap:6px;margin-top:8px;"><button onclick="excursionConfirmAdd()" class="btn-primary" style="flex:1;">Salva</button><button onclick="excursionCancelAdd()" class="btn-cancel" style="flex:1;">Annulla</button></div>
    </div>
    <div id="excursions-list">${items.map(item => excursionCard(item)).join('')}</div>`;
}

function excursionCard(item, edit = false) {
  const day = getItinerary().find(candidate => Number(candidate.dayNum) === Number(item.dayNum));
  if (edit) return `<div id="excard-${item.id}" class="glass-card excursion-card">
    <input id="exedit-name-${item.id}" class="search-input" value="${h(item.name)}" style="margin-bottom:6px;">
    <select id="exedit-day-${item.id}" class="search-input" style="margin-bottom:6px;">${excursionDayOptions(item.dayNum)}</select>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:6px;"><input id="exedit-region-${item.id}" class="search-input" value="${h(item.region)}"><input id="exedit-time-${item.id}" class="search-input" value="${h(item.time)}"></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:6px;"><select id="exedit-status-${item.id}" class="search-input">${EXCURSION_STATUSES.map(status=>`<option ${status===item.status?'selected':''}>${status}</option>`).join('')}</select><input id="exedit-price-${item.id}" type="number" min="0" step="0.01" class="search-input" value="${Number(item.priceEUR)||0}"></div>
    <input id="exedit-link-${item.id}" class="search-input" value="${h(item.link||'')}" placeholder="Link" style="margin-bottom:6px;">
    <textarea id="exedit-notes-${item.id}" class="search-input">${h(item.notes||'')}</textarea>
    <div style="display:flex;gap:6px;margin-top:8px;"><button onclick="excursionSaveEdit('${item.id}')" class="btn-primary" style="flex:1;">Salva</button><button onclick="renderExcursions()" class="btn-cancel" style="flex:1;">Annulla</button></div>
  </div>`;

  const booked = ['Prenotata', 'Completata'].includes(item.status);
  const paidState = getBudgetPaidState();
  const paid = item.budgetItemId ? Boolean(paidState[item.budgetItemId] ?? getBudgetItems().find(row=>row.id===item.budgetItemId)?.paidDefault) : false;
  return `<article id="excard-${item.id}" class="glass-card excursion-card ${booked?'booked':''}">
    <div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start;"><div class="excursion-title">${h(item.name)}</div><span class="badge ${booked?'badge-pagato':'badge-daprenotare'}">${h(item.status)}</span></div>
    <div class="excursion-meta"><span>📍 ${h(item.region||day?.location||'Da definire')}</span><span>🕒 ${h(item.time||'Da definire')}</span><span>💶 €${(Number(item.priceEUR)||0).toFixed(2)}</span>${item.budgetItemId?`<span>${paid?'✅ Pagata':'⏳ Da pagare'}</span>`:''}</div>
    ${day?`<button class="link-btn" onclick="openItineraryDay(${day.dayNum})">🗓 Giorno ${day.dayNum} · ${h(day.date)}</button>`:'<span class="status-note">Non collegata all’itinerario</span>'}
    ${item.notes?`<p style="font-size:12px;color:var(--text-secondary);margin-top:8px;">${h(item.notes)}</p>`:''}
    <div class="excursion-actions" style="margin-top:10px;">
      ${safeExternalUrl(item.link)?`<a href="${h(safeExternalUrl(item.link))}" target="_blank" rel="noopener noreferrer" class="link-btn">Prenotazione ↗</a>`:'<span></span>'}
      <div style="display:flex;justify-content:flex-end;gap:5px;"><button onclick="excursionStartEdit('${item.id}')" class="row-btn row-btn-edit" aria-label="Modifica ${h(item.name)}"><i class="fa-solid fa-pen-to-square"></i></button><button onclick="excursionDelete('${item.id}')" class="row-btn row-btn-delete" aria-label="Elimina ${h(item.name)}"><i class="fa-solid fa-trash"></i></button></div>
    </div>
  </article>`;
}

window.excursionStartAdd = () => { const form=document.getElementById('excursion-add-form'); if(form){form.style.display='block';document.getElementById('exadd-name')?.focus();} };
window.excursionCancelAdd = () => { const form=document.getElementById('excursion-add-form'); if(form) form.style.display='none'; };
window.excursionConfirmAdd = function() {
  const name=document.getElementById('exadd-name')?.value.trim();
  const price=Number.parseFloat(document.getElementById('exadd-price')?.value || '0');
  if(!name || !Number.isFinite(price) || price < 0){alert('Inserisci nome e prezzo validi.');return;}
  const items=getExcursions();
  items.push({id:`EX-${Date.now()}`,name,dayNum:Number(document.getElementById('exadd-day')?.value)||null,region:document.getElementById('exadd-region')?.value.trim()||'',time:document.getElementById('exadd-time')?.value.trim()||'',status:document.getElementById('exadd-status')?.value||'Da valutare',priceEUR:price,budgetItemId:'',notes:document.getElementById('exadd-notes')?.value.trim()||'',link:safeExternalUrl(document.getElementById('exadd-link')?.value.trim())});
  saveExcursions(items); renderExcursions(); renderDashboard(); renderItineraryDay(currentDayNum);
};
window.excursionStartEdit = id => { const item=getExcursions().find(candidate=>candidate.id===id); const card=document.getElementById(`excard-${id}`); if(item&&card) card.outerHTML=excursionCard(item,true); };
window.excursionSaveEdit = function(id) {
  const items=getExcursions(), index=items.findIndex(item=>item.id===id); if(index<0)return;
  const price=Number.parseFloat(document.getElementById(`exedit-price-${id}`)?.value || '0');
  const name=document.getElementById(`exedit-name-${id}`)?.value.trim();
  if(!name || !Number.isFinite(price) || price<0){alert('Inserisci nome e prezzo validi.');return;}
  items[index]={...items[index],name,dayNum:Number(document.getElementById(`exedit-day-${id}`)?.value)||null,region:document.getElementById(`exedit-region-${id}`)?.value.trim()||'',time:document.getElementById(`exedit-time-${id}`)?.value.trim()||'',status:document.getElementById(`exedit-status-${id}`)?.value||'Da valutare',priceEUR:price,link:safeExternalUrl(document.getElementById(`exedit-link-${id}`)?.value.trim()),notes:document.getElementById(`exedit-notes-${id}`)?.value.trim()||''};
  saveExcursions(items); renderExcursions(); renderDashboard(); renderItineraryDay(currentDayNum);
};
window.excursionDelete = id => { if(!confirm('Eliminare questa escursione?'))return; saveExcursions(getExcursions().filter(item=>item.id!==id)); renderExcursions(); renderDashboard(); renderItineraryDay(currentDayNum); };
window.openItineraryDay = dayNum => { activateView('itinerary'); currentItineraryRegion='Tutti'; renderItineraryDaySelector(); selectItineraryDay(Number(dayNum)); };
window.openExcursion = id => { activateView('excursions'); requestAnimationFrame(()=>document.getElementById(`excard-${id}`)?.scrollIntoView({behavior:'smooth',block:'center'})); };

/* ═══════════════════════════════════════════════════════
   10. CHECKLIST (add/edit/delete + toggle)
   ═══════════════════════════════════════════════════════ */
const CHECKLIST_KEY = 'bali_checklist_items_v1';
const CHECKLIST_STATE_KEY = 'bali_checklist_state';
function getChecklistItems() { return getSection(CHECKLIST_KEY, BALI_TRIP_DATA.checklist.map((c,i)=>({...c,id:'CL-'+i}))); }
function saveChecklistItems(d){ saveSection(CHECKLIST_KEY, d); }
function getChecklistState() { try { return JSON.parse(localStorage.getItem(CHECKLIST_STATE_KEY)||'{}'); } catch(e){return{};} }

function renderChecklist() {
  const c = document.getElementById('checklist-content');
  if (!c) return;
  const items = getChecklistItems();
  const state = getChecklistState();
  let done = 0;
  items.forEach(item => { if(state[item.id]||item.status==='Pagato') done++; });
  const pct = items.length>0 ? Math.round((done/items.length)*100) : 0;
  const pt = document.getElementById('checklist-progress-text');
  const pb = document.getElementById('checklist-progress-bar');
  if(pt) pt.innerText = `${done} su ${items.length} (${pct}%) completati`;
  if(pb) pb.style.width = pct+'%';

  c.innerHTML = `
    <div style="text-align:right;margin-bottom:8px;">
      <button onclick="checklistStartAdd()" class="btn-primary" style="padding:6px 14px;font-size:12px;gap:5px;display:inline-flex;align-items:center;">
        <i class="fa-solid fa-plus"></i> Aggiungi
      </button>
    </div>
    <div id="checklist-add-form" style="display:none;background:rgba(16,185,129,.06);border:1px solid rgba(16,185,129,.3);border-radius:12px;padding:12px;margin-bottom:12px;">
      <div style="font-size:12px;font-weight:800;color:var(--accent-emerald);margin-bottom:8px;">➕ Nuova Voce</div>
      <input id="cladd-item"   class="search-input" placeholder="Cosa devo fare/portare" style="margin-bottom:6px;">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:8px;">
        <input id="cladd-area"   class="search-input" placeholder="Area (es. DOCUMENTI)">
        <input id="cladd-timing" class="search-input" placeholder="Quando (es. Prima di partire)">
      </div>
      <input id="cladd-detail" class="search-input" placeholder="Dettaglio / nota" style="margin-bottom:8px;">
      <div style="display:flex;gap:6px;">
        <button onclick="checklistConfirmAdd()" class="btn-primary" style="flex:1;padding:9px;">✓ Salva</button>
        <button onclick="checklistCancelAdd()" class="btn-cancel" style="flex:1;padding:9px;">Annulla</button>
      </div>
    </div>
    ${items.map(item => _checklistRow(item, state)).join('')}`;
}

function _checklistRow(item, state, edit) {
  const checked = state[item.id] || item.status==='Pagato';
  if(edit) {
    const esc = h;
    return `<div id="clrow-${item.id}" style="background:rgba(6,182,212,.07);border:1px solid rgba(6,182,212,.35);border-radius:12px;padding:12px;margin-bottom:8px;">
      <div style="font-size:11px;font-weight:800;color:var(--accent-cyan);margin-bottom:8px;">✏️ Modifica voce</div>
      <input id="cledit-item-${item.id}"   class="search-input" value="${esc(item.item)}" style="margin-bottom:6px;">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:6px;">
        <input id="cledit-area-${item.id}"   class="search-input" value="${esc(item.area||'')}" placeholder="Area">
        <input id="cledit-timing-${item.id}" class="search-input" value="${esc(item.timing||'')}" placeholder="Quando">
      </div>
      <input id="cledit-detail-${item.id}" class="search-input" value="${esc(item.detail||'')}" placeholder="Dettaglio" style="margin-bottom:8px;">
      <div style="display:flex;gap:6px;">
        <button onclick="checklistSaveEdit('${item.id}')" class="btn-primary" style="flex:1;padding:9px;">✓ Salva</button>
        <button onclick="renderChecklist()" class="btn-cancel" style="flex:1;padding:9px;">Annulla</button>
      </div>
    </div>`;
  }
  return `
    <div id="clrow-${item.id}" class="checklist-item ${checked?'checked':''}" style="position:relative;">
      <div onclick="toggleChecklistItem('${item.id}')" class="custom-checkbox" style="cursor:pointer;">${checked?'✓':''}</div>
      <div class="item-content" onclick="toggleChecklistItem('${item.id}')" style="cursor:pointer;flex:1;">
        <div class="item-text">${h(item.item)}</div>
        <div class="item-meta">🏷️ ${h(item.area||'')} ${item.timing?`• 🕒 ${h(item.timing)}`:''} ${item.detail?`— ${h(item.detail)}`:''}</div>
        ${safeExternalUrl(item.link)?`<a href="${h(safeExternalUrl(item.link))}" target="_blank" rel="noopener noreferrer" class="link-btn" onclick="event.stopPropagation();">Sito Ufficiale ↗</a>`:''}
      </div>
      <div style="display:flex;gap:4px;flex-shrink:0;">
        <button onclick="checklistStartEdit('${item.id}')" class="row-btn row-btn-edit" title="Modifica"><i class="fa-solid fa-pen-to-square"></i></button>
        <button onclick="checklistDeleteItem('${item.id}')" class="row-btn row-btn-delete" title="Elimina"><i class="fa-solid fa-trash"></i></button>
      </div>
    </div>`;
}

window.toggleChecklistItem = function(id) {
  const state=getChecklistState();
  state[id]=!state[id];
  saveJSON(CHECKLIST_STATE_KEY, state);
  renderChecklist();
};
window.checklistStartEdit = function(id) {
  const item=getChecklistItems().find(x=>x.id===id);
  if(!item) return;
  const row=document.getElementById('clrow-'+id);
  if(row) row.outerHTML=_checklistRow(item,getChecklistState(),true);
};
window.checklistSaveEdit = function(id) {
  const items=getChecklistItems(), idx=items.findIndex(x=>x.id===id);
  if(idx===-1) return;
  items[idx]={...items[idx],
    item:   document.getElementById('cledit-item-'+id)?.value.trim()||items[idx].item,
    area:   document.getElementById('cledit-area-'+id)?.value.trim()||'',
    timing: document.getElementById('cledit-timing-'+id)?.value.trim()||'',
    detail: document.getElementById('cledit-detail-'+id)?.value.trim()||''
  };
  saveChecklistItems(items); renderChecklist();
};
window.checklistDeleteItem = function(id) {
  if(!confirm('Eliminare questa voce dalla checklist?')) return;
  saveChecklistItems(getChecklistItems().filter(x=>x.id!==id)); renderChecklist();
};
window.checklistStartAdd  = () => { const f=document.getElementById('checklist-add-form'); if(f){f.style.display='block';document.getElementById('cladd-item')?.focus();} };
window.checklistCancelAdd = () => { const f=document.getElementById('checklist-add-form'); if(f) f.style.display='none'; };
window.checklistConfirmAdd = function() {
  const item=document.getElementById('cladd-item')?.value.trim();
  if(!item){alert('Inserisci la voce!');return;}
  const items=getChecklistItems();
  items.push({ id:'CL-'+Date.now(),
    item, area:document.getElementById('cladd-area')?.value.trim()||'',
    timing:document.getElementById('cladd-timing')?.value.trim()||'',
    detail:document.getElementById('cladd-detail')?.value.trim()||'',
    status:'Da fare', link:''
  });
  saveChecklistItems(items); renderChecklist();
};

/* ═══════════════════════════════════════════════════════
   10. PIANO B (full CRUD)
   ═══════════════════════════════════════════════════════ */
const PIANOB_KEY = 'bali_pianob_v1';
function getPianoB()   { return getSection(PIANOB_KEY, BALI_TRIP_DATA.contingencies.map((c,i)=>({...c,id:'PB-'+i}))); }
function savePianoB(d) { saveSection(PIANOB_KEY, d); }

function renderPianoB() {
  const c = document.getElementById('piano-b-content');
  if (!c) return;
  const items = getPianoB();
  c.innerHTML = `
    ${items.map(p => _pianoBCard(p)).join('')}
    <div style="text-align:center;margin-bottom:12px;">
      <button onclick="pianoBStartAdd()" class="btn-primary" style="padding:7px 16px;font-size:12px;gap:5px;display:inline-flex;align-items:center;">
        <i class="fa-solid fa-plus"></i> Aggiungi Piano B
      </button>
    </div>
    <div id="pianob-add-form" style="display:none;background:rgba(244,63,94,.06);border:1px solid rgba(244,63,94,.3);border-radius:12px;padding:12px;">
      <div style="font-size:12px;font-weight:800;color:var(--accent-coral);margin-bottom:8px;">➕ Nuovo Scenario</div>
      <input id="pbadd-title" class="search-input" placeholder="Titolo scenario (es. Fast Boat Annullata)" style="margin-bottom:6px;">
      <input id="pbadd-trigger" class="search-input" placeholder="Segnale d'allarme" style="margin-bottom:6px;">
      <textarea id="pbadd-action" class="search-input" rows="2" placeholder="Azione da intraprendere" style="margin-bottom:8px;"></textarea>
      <div style="display:flex;gap:6px;">
        <button onclick="pianoBConfirmAdd()" class="btn-primary" style="flex:1;padding:9px;">✓ Salva</button>
        <button onclick="pianoBCancelAdd()" class="btn-cancel" style="flex:1;padding:9px;">Annulla</button>
      </div>
    </div>`;
}

function _pianoBCard(p, edit) {
  const esc = h;
  if(edit) return `
    <div id="pbcard-${p.id}" class="glass-card piano-b-card">
      <input id="pbedit-title-${p.id}" class="search-input" value="${esc(p.title)}" placeholder="Titolo" style="margin-bottom:6px;">
      <input id="pbedit-trigger-${p.id}" class="search-input" value="${esc(p.trigger)}" placeholder="Segnale" style="margin-bottom:6px;">
      <textarea id="pbedit-action-${p.id}" class="search-input" rows="2" style="margin-bottom:8px;">${esc(p.action)}</textarea>
      <div style="display:flex;gap:6px;">
        <button onclick="pianoBSaveEdit('${p.id}')" class="btn-primary" style="flex:1;padding:9px;">✓ Salva</button>
        <button onclick="renderPianoB()" class="btn-cancel" style="flex:1;padding:9px;">Annulla</button>
      </div>
    </div>`;
  return `
    <div id="pbcard-${p.id}" class="glass-card piano-b-card">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;">
        <div class="piano-b-title" style="flex:1;">${h(p.title)}</div>
        <div style="display:flex;gap:4px;flex-shrink:0;margin-left:8px;">
          <button onclick="pianoBStartEdit('${p.id}')" class="row-btn row-btn-edit"><i class="fa-solid fa-pen-to-square"></i></button>
          <button onclick="pianoBDeleteItem('${p.id}')" class="row-btn row-btn-delete"><i class="fa-solid fa-trash"></i></button>
        </div>
      </div>
      <div class="piano-b-trigger">⚠️ ${h(p.trigger)}</div>
      <div class="piano-b-action"><strong>👉</strong> ${h(p.action)}</div>
    </div>`;
}

window.pianoBStartEdit = function(id) {
  const p=getPianoB().find(x=>x.id===id);
  if(!p) return;
  const card=document.getElementById('pbcard-'+id);
  if(card) card.outerHTML=_pianoBCard(p,true);
};
window.pianoBSaveEdit = function(id) {
  const items=getPianoB(), idx=items.findIndex(x=>x.id===id);
  if(idx===-1) return;
  items[idx]={...items[idx],
    title:   document.getElementById('pbedit-title-'+id)?.value.trim()||items[idx].title,
    trigger: document.getElementById('pbedit-trigger-'+id)?.value.trim()||items[idx].trigger,
    action:  document.getElementById('pbedit-action-'+id)?.value.trim()||items[idx].action
  };
  savePianoB(items); renderPianoB();
};
window.pianoBDeleteItem = function(id) {
  if(!confirm('Eliminare questo scenario Piano B?')) return;
  savePianoB(getPianoB().filter(x=>x.id!==id)); renderPianoB();
};
window.pianoBStartAdd  = () => { const f=document.getElementById('pianob-add-form'); if(f){f.style.display='block';document.getElementById('pbadd-title')?.focus();} };
window.pianoBCancelAdd = () => { const f=document.getElementById('pianob-add-form'); if(f) f.style.display='none'; };
window.pianoBConfirmAdd = function() {
  const title=document.getElementById('pbadd-title')?.value.trim();
  if(!title){alert('Inserisci il titolo!');return;}
  const items=getPianoB();
  items.push({ id:'PB-'+Date.now(), title,
    trigger:document.getElementById('pbadd-trigger')?.value.trim()||'',
    action: document.getElementById('pbadd-action')?.value.trim()||''
  });
  savePianoB(items); renderPianoB();
};

/* ═══════════════════════════════════════════════════════
   11. DRIVER & CONTATTI (full CRUD)
   ═══════════════════════════════════════════════════════ */
const DRIVERS_KEY = 'bali_drivers_v1';
function getDrivers()   { return getSection(DRIVERS_KEY, BALI_TRIP_DATA.driversAndTransfers.map((d,i)=>({...d,id:'DRV-'+i}))); }
function saveDrivers(d) { saveSection(DRIVERS_KEY, d); }

function renderDrivers() {
  const c = document.getElementById('drivers-list');
  if (!c) return;
  const drivers = getDrivers();
  c.innerHTML = `
    ${drivers.map(d => _driverCard(d)).join('')}
    <button onclick="driverStartAdd()" class="btn-primary" style="width:100%;padding:8px;font-size:12px;gap:6px;display:flex;align-items:center;justify-content:center;margin-top:4px;">
      <i class="fa-solid fa-plus"></i> Aggiungi Contatto
    </button>
    <div id="driver-add-form" style="display:none;background:rgba(37,211,102,.06);border:1px solid rgba(37,211,102,.3);border-radius:12px;padding:12px;margin-top:8px;">
      <div style="font-size:12px;font-weight:800;color:#25D366;margin-bottom:8px;">➕ Nuovo Contatto</div>
      <input id="dadd-name"  class="search-input" placeholder="Nome" style="margin-bottom:6px;">
      <input id="dadd-role"  class="search-input" placeholder="Ruolo (es. Driver Ubud)" style="margin-bottom:6px;">
      <input id="dadd-phone" class="search-input" placeholder="+62..." style="margin-bottom:6px;">
      <textarea id="dadd-msg" class="search-input" rows="2" placeholder="Messaggio WhatsApp precompilato" style="margin-bottom:8px;"></textarea>
      <div style="display:flex;gap:6px;">
        <button onclick="driverConfirmAdd()" class="btn-primary" style="flex:1;padding:9px;">✓ Salva</button>
        <button onclick="driverCancelAdd()" class="btn-cancel" style="flex:1;padding:9px;">Annulla</button>
      </div>
    </div>`;
}

function _driverCard(d, edit) {
  const esc = h;
  if(edit) return `
    <div id="drv-${d.id}" style="background:rgba(37,211,102,.06);border:1px solid rgba(37,211,102,.3);border-radius:12px;padding:12px;margin-bottom:8px;">
      <input id="dedit-name-${d.id}"  class="search-input" value="${esc(d.name)}" placeholder="Nome" style="margin-bottom:6px;">
      <input id="dedit-role-${d.id}"  class="search-input" value="${esc(d.role)}" placeholder="Ruolo" style="margin-bottom:6px;">
      <input id="dedit-phone-${d.id}" class="search-input" value="${esc(d.phone||d.waPhone||'')}" placeholder="Telefono" style="margin-bottom:6px;">
      <textarea id="dedit-msg-${d.id}" class="search-input" rows="2" style="margin-bottom:8px;">${esc(d.waText||'')}</textarea>
      <div style="display:flex;gap:6px;">
        <button onclick="driverSaveEdit('${d.id}')" class="btn-primary" style="flex:1;padding:9px;">✓ Salva</button>
        <button onclick="renderDrivers()" class="btn-cancel" style="flex:1;padding:9px;">Annulla</button>
      </div>
    </div>`;
  const phone = (d.phone||d.waPhone||'').replace(/[^0-9]/g,'');
  return `
    <div id="drv-${d.id}" style="padding:10px;background:rgba(8,12,20,.6);border-radius:12px;border:1px solid var(--border-color);display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
      <div style="flex:1;min-width:0;">
        <div style="font-size:13px;font-weight:800;color:#fff;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${h(d.name)}</div>
        <div style="font-size:11px;color:var(--text-secondary);">${h(d.role)}</div>
      </div>
      <div style="display:flex;gap:6px;flex-shrink:0;margin-left:8px;align-items:center;">
        ${phone ? `<a href="https://wa.me/${phone}?text=${encodeURIComponent(d.waText||'')}" target="_blank" rel="noopener noreferrer"
           class="btn-primary" style="text-decoration:none;padding:6px 10px;font-size:11px;background:#25D366;color:#000;display:flex;align-items:center;gap:4px;">
          <i class="fa-brands fa-whatsapp"></i> WA</a>` : '<span class="badge badge-dagestire">Aggiungi numero</span>'}
        <button onclick="driverStartEdit('${d.id}')" class="row-btn row-btn-edit" title="Modifica"><i class="fa-solid fa-pen-to-square"></i></button>
        <button onclick="driverDeleteItem('${d.id}')" class="row-btn row-btn-delete" title="Elimina"><i class="fa-solid fa-trash"></i></button>
      </div>
    </div>`;
}

window.driverStartEdit = function(id) {
  const d=getDrivers().find(x=>x.id===id);
  if(!d) return;
  const card=document.getElementById('drv-'+id);
  if(card) card.outerHTML=_driverCard(d,true);
};
window.driverSaveEdit = function(id) {
  const items=getDrivers(), idx=items.findIndex(x=>x.id===id);
  if(idx===-1) return;
  items[idx]={...items[idx],
    name:   document.getElementById('dedit-name-'+id)?.value.trim()||items[idx].name,
    role:   document.getElementById('dedit-role-'+id)?.value.trim()||items[idx].role,
    phone:  document.getElementById('dedit-phone-'+id)?.value.trim()||'',
    waText: document.getElementById('dedit-msg-'+id)?.value.trim()||''
  };
  saveDrivers(items); renderDrivers();
};
window.driverDeleteItem = function(id) {
  if(!confirm('Eliminare questo contatto?')) return;
  saveDrivers(getDrivers().filter(x=>x.id!==id)); renderDrivers();
};
window.driverStartAdd  = () => { const f=document.getElementById('driver-add-form'); if(f){f.style.display='block';document.getElementById('dadd-name')?.focus();} };
window.driverCancelAdd = () => { const f=document.getElementById('driver-add-form'); if(f) f.style.display='none'; };
window.driverConfirmAdd = function() {
  const name=document.getElementById('dadd-name')?.value.trim();
  if(!name){alert('Inserisci almeno il nome!');return;}
  const items=getDrivers();
  items.push({ id:'DRV-'+Date.now(), name,
    role:  document.getElementById('dadd-role')?.value.trim()||'',
    phone: document.getElementById('dadd-phone')?.value.trim()||'',
    waText:document.getElementById('dadd-msg')?.value.trim()||'Ciao!'
  });
  saveDrivers(items); renderDrivers();
};

/* ═══════════════════════════════════════════════════════
   12. PHOTO SPOTS (full CRUD)
   ═══════════════════════════════════════════════════════ */
const PHOTOS_KEY = 'bali_photos_v1';
function getPhotoSpots()   { return getSection(PHOTOS_KEY, BALI_TRIP_DATA.photoSpots.map((p,i)=>({...p,id:'PS-'+i}))); }
function savePhotoSpots(d) { saveSection(PHOTOS_KEY, d); }

function renderPhotoSpots() {
  const c = document.getElementById('photo-spots-list');
  if (!c) return;
  const spots = getPhotoSpots();
  c.innerHTML = `
    ${spots.map(s => _photoCard(s)).join('')}
    <button onclick="photoStartAdd()" class="btn-primary" style="width:100%;padding:7px;font-size:12px;gap:5px;display:flex;align-items:center;justify-content:center;margin-top:4px;">
      <i class="fa-solid fa-plus"></i> Aggiungi Spot
    </button>
    <div id="photo-add-form" style="display:none;background:rgba(245,158,11,.06);border:1px solid rgba(245,158,11,.3);border-radius:12px;padding:12px;margin-top:8px;">
      <div style="font-size:12px;font-weight:800;color:var(--accent-amber);margin-bottom:8px;">📸 Nuovo Photo Spot</div>
      <input id="psadd-place" class="search-input" placeholder="Luogo (es. Tegalalang)" style="margin-bottom:6px;">
      <input id="psadd-time"  class="search-input" placeholder="Orario ideale (es. 07:00-08:30)" style="margin-bottom:6px;">
      <textarea id="psadd-tip" class="search-input" rows="2" placeholder="Consiglio / tip fotografico" style="margin-bottom:8px;"></textarea>
      <div style="display:flex;gap:6px;">
        <button onclick="photoConfirmAdd()" class="btn-primary" style="flex:1;padding:9px;">✓ Salva</button>
        <button onclick="photoCancelAdd()" class="btn-cancel" style="flex:1;padding:9px;">Annulla</button>
      </div>
    </div>`;
}

function _photoCard(s, edit) {
  const esc = h;
  if(edit) return `
    <div id="pscard-${s.id}" style="background:rgba(245,158,11,.07);border:1px solid rgba(245,158,11,.35);border-radius:10px;padding:10px;margin-bottom:8px;">
      <input id="psedit-place-${s.id}" class="search-input" value="${esc(s.place)}" placeholder="Luogo" style="margin-bottom:6px;">
      <input id="psedit-time-${s.id}"  class="search-input" value="${esc(s.bestTime)}" placeholder="Orario" style="margin-bottom:6px;">
      <textarea id="psedit-tip-${s.id}" class="search-input" rows="2" style="margin-bottom:8px;">${esc(s.tip)}</textarea>
      <div style="display:flex;gap:6px;">
        <button onclick="photoSaveEdit('${s.id}')" class="btn-primary" style="flex:1;padding:9px;">✓ Salva</button>
        <button onclick="renderPhotoSpots()" class="btn-cancel" style="flex:1;padding:9px;">Annulla</button>
      </div>
    </div>`;
  return `
    <div id="pscard-${s.id}" style="padding:8px 10px;background:rgba(8,12,20,.5);border-radius:10px;border:1px solid var(--border-color);font-size:12px;margin-bottom:6px;">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <div style="font-weight:800;color:var(--accent-amber);">${h(s.place)}</div>
        <div style="display:flex;gap:4px;">
          <button onclick="photoStartEdit('${s.id}')" class="row-btn row-btn-edit"><i class="fa-solid fa-pen-to-square"></i></button>
          <button onclick="photoDeleteItem('${s.id}')" class="row-btn row-btn-delete"><i class="fa-solid fa-trash"></i></button>
        </div>
      </div>
      <div style="color:var(--accent-cyan);font-weight:600;">🕒 ${h(s.bestTime)}</div>
      <div style="color:var(--text-secondary);margin-top:2px;">💡 ${h(s.tip)}</div>
    </div>`;
}

window.photoStartEdit  = id => { const s=getPhotoSpots().find(x=>x.id===id); if(!s) return; const c=document.getElementById('pscard-'+id); if(c) c.outerHTML=_photoCard(s,true); };
window.photoSaveEdit   = id => {
  const items=getPhotoSpots(), idx=items.findIndex(x=>x.id===id);
  if(idx===-1) return;
  items[idx]={...items[idx],
    place:    document.getElementById('psedit-place-'+id)?.value.trim()||items[idx].place,
    bestTime: document.getElementById('psedit-time-'+id)?.value.trim()||items[idx].bestTime,
    tip:      document.getElementById('psedit-tip-'+id)?.value.trim()||items[idx].tip
  };
  savePhotoSpots(items); renderPhotoSpots();
};
window.photoDeleteItem = id => { if(!confirm('Eliminare questo spot?')) return; savePhotoSpots(getPhotoSpots().filter(x=>x.id!==id)); renderPhotoSpots(); };
window.photoStartAdd   = () => { const f=document.getElementById('photo-add-form'); if(f){f.style.display='block';document.getElementById('psadd-place')?.focus();} };
window.photoCancelAdd  = () => { const f=document.getElementById('photo-add-form'); if(f) f.style.display='none'; };
window.photoConfirmAdd = function() {
  const place=document.getElementById('psadd-place')?.value.trim();
  if(!place){alert('Inserisci il luogo!');return;}
  const items=getPhotoSpots();
  items.push({ id:'PS-'+Date.now(), place,
    bestTime:document.getElementById('psadd-time')?.value.trim()||'',
    tip:document.getElementById('psadd-tip')?.value.trim()||''
  });
  savePhotoSpots(items); renderPhotoSpots();
};

/* ═══════════════════════════════════════════════════════
   13. SURVIVAL GUIDE (read-only, non essenziale da modificare)
   ═══════════════════════════════════════════════════════ */
function renderSurvivalGuide() {
  const c = document.getElementById('survival-guide-content');
  if (!c) return;
  c.innerHTML = BALI_TRIP_DATA.survivalGuide.map(g => `
    <div class="glass-card">
      <div style="font-family:var(--font-heading);font-size:16px;font-weight:800;margin-bottom:8px;">${h(g.category)}</div>
      <ul style="list-style:none;display:flex;flex-direction:column;gap:6px;">
        ${g.tips.map(t=>`<li style="font-size:12px;color:var(--text-secondary);display:flex;gap:8px;"><span style="color:var(--accent-emerald);">•</span><span>${h(t)}</span></li>`).join('')}
      </ul>
    </div>`).join('');
}

/* ═══════════════════════════════════════════════════════
   14. EMERGENZA
   ═══════════════════════════════════════════════════════ */
function renderEmergencyContacts() {
  const c = document.getElementById('emergency-contacts-list');
  if (!c) return;
  c.innerHTML = BALI_TRIP_DATA.emergencyContacts.map(e => {
    const phone = String(e.phone || '');
    const callable = phone.replace(/[^0-9+]/g, '');
    return `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:10px;background:var(--bg-card);border-radius:10px;border:1px solid var(--border-color);">
      <div>
        <div style="font-size:13px;font-weight:700;">${h(e.label)}</div>
        <div style="font-size:12px;color:var(--accent-coral);font-weight:800;">${h(phone)}</div>
      </div>
      ${callable ? `<a href="tel:${callable}" class="btn-primary" style="text-decoration:none;padding:6px 12px;font-size:11px;">Chiama</a>` : '<span class="status-note">Da configurare</span>'}
    </div>`;
  }).join('');
}

function openModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  modal.classList.add('active');
  requestAnimationFrame(() => modal.querySelector('button, input, textarea, select, a')?.focus());
}
window.openEmergencyModal  = () => openModal('emergency-modal');
window.closeEmergencyModal = () => document.getElementById('emergency-modal')?.classList.remove('active');
window.openGmailModal      = () => openModal('gmail-modal');
window.closeGmailModal     = () => document.getElementById('gmail-modal')?.classList.remove('active');
window.openRevolutCSVModal  = () => openModal('revolut-csv-modal');
window.closeRevolutCSVModal = () => document.getElementById('revolut-csv-modal')?.classList.remove('active');

/* ═══════════════════════════════════════════════════════
   15. EMAIL CONFIRMATION PARSER
   ═══════════════════════════════════════════════════════ */
function parseLocalizedNumber(value) {
  const input = String(value || '').replace(/\s/g, '');
  if (!input) return NaN;
  const lastComma = input.lastIndexOf(',');
  const lastDot = input.lastIndexOf('.');
  let normalized = input;
  if (lastComma > lastDot) normalized = input.replace(/\./g, '').replace(',', '.');
  else if (lastDot > lastComma) normalized = input.replace(/,/g, '');
  else normalized = input.replace(',', '.');
  return Number.parseFloat(normalized.replace(/[^0-9.-]/g, ''));
}

window.parsePastedEmail = function() {
  const text=document.getElementById('email-paste-area')?.value||'';
  const res=document.getElementById('parse-result-status');
  if(!text.trim()){if(res) res.innerHTML=`<span style="color:var(--accent-coral);">Incolla prima l'email!</span>`;return;}
  const cM=text.match(/(?:conferma|booking|pnr|numero|codice)\s*[:#]?\s*([A-Z0-9-]{5,15})/i);
  const pM=text.match(/(EUR|€|IDR|Rp)\s*([\d.,]+)/i)||text.match(/([\d.,]+)\s*(EUR|€|IDR|Rp)/i);
  const code=cM?cM[1]:'PNR-'+Math.floor(100000+Math.random()*900000);
  const currencyFirst = pM ? /^(EUR|€|IDR|Rp)$/i.test(pM[1]) : false;
  const amountRaw = pM ? (currencyFirst ? pM[2] : pM[1]) : '';
  const currency = pM ? (currencyFirst ? pM[1] : pM[2]) : '';
  const price = parseLocalizedNumber(amountRaw);
  const lower = text.toLowerCase();
  const candidates = [
    { test: 'temuku', budgetId: 'ITEM-05', hotelId: 'UB-01' },
    { test: 'coral', budgetId: 'ITEM-06', hotelId: 'GI-01' },
    { test: 'paranyog', budgetId: 'ITEM-07', hotelId: 'UL-01' }
  ];
  const found = candidates.find(candidate => lower.includes(candidate.test));
  if (!found) {
    if(res) res.innerHTML='<span style="color:var(--accent-amber);">Nessuna prenotazione conosciuta riconosciuta: nessun dato è stato modificato.</span>';
    return;
  }
  const st=getBudgetPaidState();
  st[found.budgetId]=true;
  saveJSON(BUDGET_PAID_KEY, st);
  const hotels = getHotels();
  const hotel = hotels.find(item => item.id === found.hotelId);
  if (hotel) hotel.bookingCode = code;
  saveHotels(hotels);
  if(res) res.innerHTML=`<div style="color:var(--accent-emerald);font-weight:700;">✅ Conferma riconosciuta e aggiornata</div>
    <div style="font-size:11px;margin-top:4px;">Servizio: <strong>${h(hotel?.name || found.hotelId)}</strong> • Codice: <strong>${h(code)}</strong>${Number.isFinite(price)?` • Importo: <strong>${h(currency)} ${price.toLocaleString('it-IT')}</strong>`:''}</div>`;
  renderBudget(); renderDashboard();
};

function parseCSVLine(line) {
  const cells = [];
  let current = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"' && line[i + 1] === '"' && quoted) { current += '"'; i++; }
    else if (char === '"') quoted = !quoted;
    else if (char === ',' && !quoted) { cells.push(current.trim()); current = ''; }
    else current += char;
  }
  cells.push(current.trim());
  return cells;
}

window.parseRevolutCSV = function() {
  const csv=document.getElementById('revolut-csv-paste')?.value||'';
  if(!csv.trim()) return;
  const expenses=getLoggedExpenses(); let added=0;
  const rate=BALI_TRIP_DATA.meta.exchangeRateEURtoIDR;
  const existing = new Set(expenses.map(expense => expense.id));
  csv.split(/\r?\n/).forEach(line=>{
    const p=parseCSVLine(line); if(p.length<3) return;
    const desc=(p[1]||'Revolut').trim(), amt=parseLocalizedNumber(p[2]), cur=(p[3]||'EUR').trim().toUpperCase();
    if(isNaN(amt)) return;
    const id = `CSV-${(p[0]||'').trim()}-${desc}-${amt}-${cur}`.replace(/[^a-z0-9-]/gi,'_').slice(0,120);
    if (existing.has(id)) return;
    existing.add(id);
    expenses.push({id,desc,wallet:cur==='IDR'?'revolut_idr':'revolut_eur',
      amountEUR:cur==='IDR'?amt/rate:amt, amountIDR:cur==='IDR'?amt:amt*rate,
      date:(p[0]||'').trim()||new Date().toLocaleDateString('it-IT')});
    added++;
  });
  saveJSON('bali_user_expenses', expenses);
  window.closeRevolutCSVModal();
  renderLoggedExpensesList(); renderDashboard(); updateWalletTotals();
  alert(`Importate ${added} transazioni da Revolut!`);
};

/* ═══════════════════════════════════════════════════════
   16. CONVERTITORE & EXPENSE LOGGER
   ═══════════════════════════════════════════════════════ */
function initCurrencyConverter() {
  const eur=document.getElementById('calc-eur'), idr=document.getElementById('calc-idr');
  if(!eur||!idr) return;
  const rate=BALI_TRIP_DATA.meta.exchangeRateEURtoIDR;
  eur.addEventListener('input',()=>{ const v=parseFloat(eur.value); idr.value=isNaN(v)?'':Math.round(v*rate).toLocaleString('it-IT'); });
  idr.addEventListener('input',()=>{ const v=parseFloat(idr.value.replace(/\./g,'').replace(/,/g,'')); eur.value=isNaN(v)?'':(v/rate).toFixed(2); });
}

function getLoggedExpenses() { try{const value=JSON.parse(localStorage.getItem('bali_user_expenses')||'[]');return Array.isArray(value)?value.map((item,index)=>({...item,id:/^[A-Za-z0-9_-]{1,120}$/.test(String(item.id||''))?item.id:`EXP-${index+1}`,amountEUR:Number(item.amountEUR)||0,amountIDR:Number(item.amountIDR)||0})):[];}catch(e){return[];} }

function initExpenseLogger() {
  const form=document.getElementById('expense-form');
  if(!form) return;
  form.addEventListener('submit',e=>{
    e.preventDefault();
    const desc=document.getElementById('exp-desc').value.trim();
    const wallet=document.getElementById('exp-wallet').value;
    const raw=parseFloat(document.getElementById('exp-amount').value);
    if(!desc||isNaN(raw)||raw<=0){ alert('Inserisci un importo maggiore di zero.'); return; }
    const rate=BALI_TRIP_DATA.meta.exchangeRateEURtoIDR;
    const isIDR=['revolut_idr','cash_idr','atm_withdrawal'].includes(wallet);
    const expenses=getLoggedExpenses();
    expenses.push({id:`EXP-${Date.now()}`,desc,wallet,amountEUR:isIDR?raw/rate:raw,amountIDR:isIDR?raw:raw*rate,date:new Date().toLocaleDateString('it-IT')});
    saveJSON('bali_user_expenses', expenses);
    document.getElementById('exp-desc').value=''; document.getElementById('exp-amount').value='';
    renderLoggedExpensesList(); renderDashboard(); updateWalletTotals();
  });
  renderLoggedExpensesList();
}

window.deleteExpense = function(idx) {
  const e=getLoggedExpenses(); e.splice(idx,1);
  saveJSON('bali_user_expenses', e);
  renderLoggedExpensesList(); renderDashboard(); updateWalletTotals();
};

function renderLoggedExpensesList() {
  const c=document.getElementById('logged-expenses-list');
  if(!c) return;
  const expenses=getLoggedExpenses();
  if(!expenses.length){c.innerHTML=`<div style="font-size:12px;color:var(--text-muted);">Nessuna spesa registrata.</div>`;return;}
  c.innerHTML=`
    <div style="font-size:13px;font-weight:700;margin-bottom:8px;">Spese registrate (${expenses.length}):</div>
    ${expenses.map((exp,i)=>{
      const lbl=exp.wallet==='cash_idr'?'💵 Contanti':exp.wallet==='atm_withdrawal'?'🏦 ATM':'💳 Revolut';
      return `<div style="display:flex;justify-content:space-between;align-items:center;font-size:12px;padding:6px 0;border-bottom:1px dashed var(--border-color);">
        <div><span style="font-weight:700;">${h(exp.desc)}</span><span style="font-size:10px;color:var(--text-muted);"> (${h(lbl)} • ${h(exp.date)})</span></div>
        <div style="display:flex;align-items:center;gap:8px;">
          <span style="font-weight:800;color:var(--accent-emerald);">€${exp.amountEUR.toFixed(2)}</span>
          <button onclick="deleteExpense(${i})" style="background:none;border:none;color:var(--accent-coral);cursor:pointer;font-size:13px;">✕</button>
        </div>
      </div>`;
    }).join('')}`;
}

function updateWalletTotals() {
  const expenses=getLoggedExpenses(); const rate=BALI_TRIP_DATA.meta.exchangeRateEURtoIDR;
  let revEUR=0,cashSpentIDR=0,withdrawnIDR=0;
  expenses.forEach(e=>{
    if(e.wallet==='revolut_eur') revEUR+=e.amountEUR;
    else if(e.wallet==='revolut_idr') revEUR+=e.amountIDR/rate;
    else if(e.wallet==='cash_idr') cashSpentIDR+=e.amountIDR;
    else if(e.wallet==='atm_withdrawal') withdrawnIDR+=e.amountIDR;
  });
  const re=document.getElementById('wallet-revolut-total');
  const ce=document.getElementById('wallet-cash-total');
  const ae=document.getElementById('wallet-atm-total');
  if(re) re.innerText=`€${revEUR.toFixed(2)}`;
  if(ce) ce.innerText=`Rp ${(withdrawnIDR-cashSpentIDR).toLocaleString('it-IT')}`;
  if(ae) ae.innerText=`Rp ${withdrawnIDR.toLocaleString('it-IT')}`;
}

/* ═══════════════════════════════════════════════════════
   17. SEARCH & BACKUP
   ═══════════════════════════════════════════════════════ */
function initSearch() {
  const inp=document.getElementById('global-search');
  if(!inp) return;
  inp.addEventListener('input',e=>{
    const q=e.target.value.toLowerCase().trim();
    if(!q){renderFood();return;}
    const fc=document.getElementById('food-items-list');
    if(!fc) return;
    fc.innerHTML=getFoodItems()
      .filter(f=>(f.place||'').toLowerCase().includes(q)||(f.area||'').toLowerCase().includes(q)||(f.style||'').toLowerCase().includes(q))
      .map(item=>_foodCard(item)).join('');
  });
}

window.exportTripBackupData = function() {
  const data=JSON.stringify({
    schemaVersion:2,
    tripMeta:BALI_TRIP_DATA.meta, budgetItems:getBudgetItems(), paidState:getBudgetPaidState(),
    itinerary:getItinerary(), accommodations:getHotels(), food:getFoodItems(),
    excursions:getExcursions(),
    checklistItems:getChecklistItems(), checklistState:getChecklistState(),
    pianoB:getPianoB(), drivers:getDrivers(), photoSpots:getPhotoSpots(),
    loggedExpenses:getLoggedExpenses(), exportDate:new Date().toISOString()
  },null,2);
  const objectUrl=URL.createObjectURL(new Blob([data],{type:'application/json'}));
  const a=Object.assign(document.createElement('a'),{
    href:objectUrl,
    download:`Bali_2026_Backup_${new Date().toISOString().split('T')[0]}.json`
  });
  document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(objectUrl),0);
};

function initBackupImport() {
  document.getElementById('backup-import-input')?.addEventListener('change', async event => {
    const file=event.target.files?.[0];
    event.target.value='';
    if(!file)return;
    try {
      if(file.size>1024*1024) throw new Error('Il backup supera 1 MB.');
      const backup=JSON.parse(await file.text());
      if(!backup || typeof backup!=='object' || !Array.isArray(backup.itinerary)) throw new Error('Backup non riconosciuto.');
      if(!confirm('Ripristinare questo backup? I dati correnti sul dispositivo saranno sostituiti.'))return;
      const mapping={
        budgetItems:BUDGET_KEY,paidState:BUDGET_PAID_KEY,itinerary:ITIN_KEY,accommodations:HOTELS_KEY,
        food:FOOD_KEY,excursions:EXCURSIONS_KEY,checklistItems:CHECKLIST_KEY,checklistState:CHECKLIST_STATE_KEY,
        pianoB:PIANOB_KEY,drivers:DRIVERS_KEY,photoSpots:PHOTOS_KEY,loggedExpenses:'bali_user_expenses'
      };
      Object.entries(mapping).forEach(([source,key])=>{
        if(backup[source]!==undefined) localStorage.setItem(key,JSON.stringify(backup[source]));
      });
      scheduleBackendSync();
      window.location.reload();
    } catch(error) { alert(`Impossibile importare il backup: ${error.message}`); }
  });
}

function getSyncToken() { return sessionStorage.getItem('bali_sync_token') || ''; }
function updateSyncStatus(message, tone='muted') {
  const status=document.getElementById('sync-status');
  if(!status)return;
  status.textContent=message;
  status.style.color=tone==='ok'?'var(--accent-emerald)':tone==='error'?'var(--accent-coral)':'var(--text-muted)';
}

function collectSyncState() {
  const state={};
  for(const key of SYNC_KEYS){
    try { const raw=localStorage.getItem(key); if(raw!==null) state[key]=JSON.parse(raw); } catch {}
  }
  return state;
}

async function requestServerState(method='GET', state) {
  const token=getSyncToken();
  if(!token) throw new Error('Token non configurato');
  const response=await fetch('/api/state',{method,headers:{Accept:'application/json','Content-Type':'application/json',Authorization:`Bearer ${token}`},body:method==='PUT'?JSON.stringify({state}):undefined});
  const payload=await response.json().catch(()=>({}));
  if(!response.ok) throw new Error(payload.error||`Errore server ${response.status}`);
  return payload;
}

async function hydrateStateFromBackend() {
  if(!getSyncToken()) return;
  try {
    updateSyncStatus('Sincronizzazione dal server…');
    const payload=await requestServerState();
    const entries=Object.entries(payload.state||{}).filter(([key])=>SYNC_KEYS.includes(key));
    if(!entries.length){ await syncStateToBackend(); return; }
    isHydratingFromBackend=true;
    entries.forEach(([key,value])=>localStorage.setItem(key,JSON.stringify(value)));
    isHydratingFromBackend=false;
    updateSyncStatus(`Sincronizzato · ${new Date(payload.updatedAt).toLocaleString('it-IT')}`,'ok');
  } catch(error) { isHydratingFromBackend=false; updateSyncStatus(error.message,'error'); }
}

function scheduleBackendSync() {
  if(isHydratingFromBackend||!getSyncToken())return;
  clearTimeout(backendSyncTimer);
  backendSyncTimer=setTimeout(()=>syncStateToBackend(),700);
}

async function syncStateToBackend() {
  if(!getSyncToken())return;
  try {
    updateSyncStatus('Salvataggio sul server…');
    const payload=await requestServerState('PUT',collectSyncState());
    updateSyncStatus(`Salvato sul server · ${new Date(payload.updatedAt).toLocaleTimeString('it-IT')}`,'ok');
  } catch(error) { updateSyncStatus(error.message,'error'); }
}

window.configureBackendSync=async function() {
  const token=window.prompt('Inserisci BALI_SYNC_TOKEN configurato sul backend. Rimarrà solo in questa sessione del browser:','');
  if(token===null)return;
  if(!token.trim()){
    sessionStorage.removeItem('bali_sync_token');
    updateSyncStatus('Sincronizzazione server disattivata.');
    return;
  }
  sessionStorage.setItem('bali_sync_token',token.trim());
  await hydrateStateFromBackend();
};

/* ═══════════════════════════════════════════════════════
   18. PWA
   ═══════════════════════════════════════════════════════ */
function registerServiceWorker() {
  if('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(()=>{});
}
