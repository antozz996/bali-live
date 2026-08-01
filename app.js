// Bali 2026 — FULL LIVE-EDIT App (ogni sezione è modificabile in tempo reale)

let currentItineraryRegion = 'Tutti';
let currentDayNum = 1;

document.addEventListener('DOMContentLoaded', () => { initApp(); });

function initApp() {
  initCountdown();
  renderWeatherWidget();
  renderDashboard();
  renderItineraryDaySelector();
  renderItineraryDay(currentDayNum);
  renderAccommodations();
  renderBudget();
  renderFood();
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
  updateWalletTotals();
  registerServiceWorker();
}

/* ═══════════════════════════════════════════════════════
   GENERIC STORAGE HELPERS
   ═══════════════════════════════════════════════════════ */
function getSection(key, fallbackArr) {
  try {
    const s = localStorage.getItem(key);
    if (s) return JSON.parse(s);
  } catch(e) {}
  const seed = fallbackArr.map(i => ({...i}));
  localStorage.setItem(key, JSON.stringify(seed));
  return seed;
}
function saveSection(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

/* ═══════════════════════════════════════════════════════
   1. WEATHER
   ═══════════════════════════════════════════════════════ */
function renderWeatherWidget() {
  const c = document.getElementById('weather-widget');
  if (!c) return;
  c.innerHTML = BALI_TRIP_DATA.weather.map(w => `
    <div class="weather-chip">
      <span class="weather-area">${w.area}</span>
      <span>${w.condition.split(' ')[0]}</span>
      <span class="weather-temp">${w.temp}</span>
    </div>`).join('');
}

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
    item.addEventListener('click', () => {
      document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
      document.querySelectorAll('.view-panel').forEach(p => p.classList.remove('active'));
      item.classList.add('active');
      document.getElementById('view-' + item.getAttribute('data-view'))?.classList.add('active');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });
  document.querySelectorAll('.modal-overlay').forEach(o => {
    o.addEventListener('click', e => { if (e.target === o) o.classList.remove('active'); });
  });
}

/* ═══════════════════════════════════════════════════════
   4. BUDGET (full CRUD, localStorage-backed)
   ═══════════════════════════════════════════════════════ */
const BUDGET_KEY      = 'bali_budget_items_v2';
const BUDGET_PAID_KEY = 'bali_paid_items_custom';
const BUDGET_CATS     = ['Voli','Alloggi','Escursioni','Trasporti','Cibo & Ristoranti',
                         'Documenti','Assicurazione','Connettività','Benessere / Spa','Extra & Mance','Altro'];

function getBudgetItems()    { return getSection(BUDGET_KEY, BALI_TRIP_DATA.budgetItems); }
function saveBudgetItems(d)  { saveSection(BUDGET_KEY, d); }
function getBudgetPaidState(){ try { return JSON.parse(localStorage.getItem(BUDGET_PAID_KEY)||'{}'); } catch(e){return{};} }
// alias usato da Gmail sync
function getPaidItemsState() { return getBudgetPaidState(); }

function calculateTotalPaidEUR() {
  const paidSt = getBudgetPaidState();
  let t = getBudgetItems().reduce((a, item) => {
    const paid = paidSt[item.id] !== undefined ? paidSt[item.id] : item.paidDefault;
    return a + (paid ? (parseFloat(item.amount)||0) : 0);
  }, 0);
  return t + getLoggedExpenses().reduce((a, e) => a + e.amountEUR, 0);
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

  container.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:14px;">
      <div class="metric-card" style="text-align:center;padding:12px 6px;">
        <div style="font-size:18px;">💰</div><div class="metric-label">Totale</div>
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
    const sd = (item.desc||'').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
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
      <div style="font-size:13px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;${isPaid?'text-decoration:line-through;color:var(--text-muted);':'color:var(--text-primary);'}">${item.desc}</div>
      <div style="font-size:10px;color:var(--accent-cyan);font-weight:600;margin-top:1px;">${item.cat}</div>
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
  localStorage.setItem(BUDGET_PAID_KEY, JSON.stringify(st));
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
  localStorage.setItem(BUDGET_PAID_KEY,JSON.stringify(st));
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
  localStorage.removeItem(BUDGET_KEY); localStorage.removeItem(BUDGET_PAID_KEY);
  renderBudget(); renderDashboard();
};

/* ═══════════════════════════════════════════════════════
   5. DASHBOARD
   ═══════════════════════════════════════════════════════ */
function renderDashboard() {
  const c = document.getElementById('dashboard-metrics');
  if (!c) return;
  const totalPaid = calculateTotalPaidEUR();
  const budgetMax = BALI_TRIP_DATA.meta.budgetMax;
  const pct       = Math.min(100, Math.round((totalPaid/budgetMax)*100));
  c.innerHTML = `
    <div class="metrics-grid">
      <div class="metric-card"><div class="metric-icon">💰</div><div class="metric-label">Budget Max</div>
        <div class="metric-value">€${budgetMax.toLocaleString('it-IT',{minimumFractionDigits:2})}</div><div class="metric-foot">2 Viaggiatori</div></div>
      <div class="metric-card"><div class="metric-icon">💳</div><div class="metric-label">Pagato</div>
        <div class="metric-value" style="color:var(--accent-emerald);">€${totalPaid.toLocaleString('it-IT',{minimumFractionDigits:2})}</div><div class="metric-foot">${pct}% del totale</div></div>
      <div class="metric-card"><div class="metric-icon">🏨</div><div class="metric-label">Notti</div>
        <div class="metric-value">13</div><div class="metric-foot">Ubud•Gili•Sud</div></div>
      <div class="metric-card"><div class="metric-icon">✅</div><div class="metric-label">Hotel</div>
        <div class="metric-value">3/3</div><div class="metric-foot">Tutti prenotati!</div></div>
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
function getItinerary() { return getSection(ITIN_KEY, BALI_TRIP_DATA.itinerary); }
function saveItinerary(d){ saveSection(ITIN_KEY, d); }

window.filterItineraryByRegion = function(region) {
  currentItineraryRegion = region;
  document.querySelectorAll('#itinerary-region-chips .chip-btn').forEach(b => b.classList.toggle('active', b.innerText.includes(region)));
  renderItineraryDaySelector();
  const days = _filteredDays();
  if(days.length) selectItineraryDay(days[0].dayNum);
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
    <div class="day-pill ${day.dayNum===currentDayNum?'active':''}" onclick="selectItineraryDay(${day.dayNum})">
      <div class="day-pill-num">Giorno ${day.dayNum}</div>
      <div class="day-pill-date">${(day.date||'').split('/')[0]} Set</div>
    </div>`).join('');
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
  const wa = encodeURIComponent(`🌺 Bali 2026 - Giorno ${day.dayNum} (${day.date})\n📍 ${day.location}\n🌅 ${day.morning}\n☀️ ${day.afternoon}\n🌙 ${day.evening}`);
  c.innerHTML = `
    <div class="glass-card itinerary-card">
      <div class="itinerary-head">
        <div>
          <div class="itinerary-day-title">Giorno ${day.dayNum} • ${day.dayName} ${day.date}</div>
          <div class="itinerary-meta"><span>📍 ${day.location||'–'}</span><span>• ${day.phase||''}</span></div>
        </div>
        <div style="display:flex;gap:6px;align-items:center;">
          <span class="badge badge-${(day.intensity||'media').toLowerCase()}">${day.intensity||'Media'}</span>
          <button onclick="itinStartEdit(${day.dayNum})" class="row-btn row-btn-edit" title="Modifica giorno"><i class="fa-solid fa-pen-to-square"></i></button>
          <button onclick="itinDeleteDay(${day.dayNum})" class="row-btn row-btn-delete" title="Elimina giorno"><i class="fa-solid fa-trash"></i></button>
        </div>
      </div>
      <div class="timeline-slot"><div class="time-tag">🌅 Mattina</div><div class="time-content"><div class="time-title">${day.morning||'–'}</div></div></div>
      <div class="timeline-slot"><div class="time-tag">☀️ Pomeriggio</div><div class="time-content"><div class="time-title">${day.afternoon||'–'}</div></div></div>
      <div class="timeline-slot"><div class="time-tag">🌙 Sera</div><div class="time-content"><div class="time-title">${day.evening||'–'}</div></div></div>
      <div style="margin-top:12px;padding-top:10px;border-top:1px solid var(--border-color);display:flex;flex-direction:column;gap:7px;font-size:12px;color:var(--text-secondary);">
        <div><strong>🚗 Trasporto:</strong> ${day.transport||'–'}</div>
        <div><strong>🍱 Pranzo:</strong> ${day.lunch||'–'} ${day.lunchLink?`<a href="${day.lunchLink}" target="_blank" class="link-btn">Menu ↗</a>`:''}</div>
        <div><strong>🍷 Cena:</strong> ${day.dinner||'–'} ${day.dinnerLink?`<a href="${day.dinnerLink}" target="_blank" class="link-btn">Menu ↗</a>`:''}</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:4px;">
          <a href="https://www.google.com/maps/search/?api=1&query=${mq}" target="_blank" class="link-btn link-btn-maps"><i class="fa-solid fa-map-location-dot"></i> Mappa</a>
          <a href="https://wa.me/?text=${wa}" target="_blank" class="link-btn" style="background:rgba(37,211,102,.15);color:#25D366;border-color:rgba(37,211,102,.3);"><i class="fa-brands fa-whatsapp"></i> Condividi</a>
        </div>
        ${day.notes?`<div style="color:var(--accent-amber);font-weight:600;">📌 <em>${day.notes}</em></div>`:''}
      </div>
    </div>`;
}

window.itinStartEdit = function(dayNum) {
  const c   = document.getElementById('itinerary-content');
  if (!c) return;
  const day = getItinerary().find(d => d.dayNum===dayNum);
  if (!day) return;
  const esc = s => (s||'').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
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
  renderItineraryDaySelector();
  const first = _filteredDays()[0];
  if(first){ currentDayNum=first.dayNum; renderItineraryDay(first.dayNum); }
  else document.getElementById('itinerary-content').innerHTML='';
};

/* ═══════════════════════════════════════════════════════
   7. ALLOGGI (full CRUD)
   ═══════════════════════════════════════════════════════ */
const HOTELS_KEY = 'bali_accommodations_v1';
function getHotels()   { return getSection(HOTELS_KEY, BALI_TRIP_DATA.accommodations); }
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
    <div id="hotel-add-form" style="display:none;" class="glass-card" style="border-color:rgba(16,185,129,.35);">
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
  const esc = s => (s||'').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  if(edit) return `
    <div id="hcard-${h.id}" class="glass-card" style="border-color:rgba(6,182,212,.35);">
      <div style="font-size:13px;font-weight:800;color:var(--accent-cyan);margin-bottom:10px;">✏️ Modifica: ${h.name}</div>
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
          <div class="hotel-name">${h.name}</div>
          <div class="hotel-dates">📍 ${h.area} • ${h.checkIn||'?'} → ${h.checkOut||'?'}</div>
        </div>
        <div style="display:flex;flex-direction:column;gap:4px;align-items:flex-end;">
          <span class="badge badge-prenotato">${h.status||'Prenotato'}</span>
          <div style="display:flex;gap:4px;">
            <button onclick="hotelStartEdit('${h.id}')" class="row-btn row-btn-edit" title="Modifica"><i class="fa-solid fa-pen-to-square"></i></button>
            <button onclick="hotelDeleteItem('${h.id}')" class="row-btn row-btn-delete" title="Elimina"><i class="fa-solid fa-trash"></i></button>
          </div>
        </div>
      </div>
      <div class="hotel-details-grid">
        <div class="hotel-detail-item"><div class="hotel-detail-label">Notti</div><div class="hotel-detail-val">${h.nights}</div></div>
        <div class="hotel-detail-item"><div class="hotel-detail-label">Prezzo/Notte</div><div class="hotel-detail-val">€${(h.nightlyPriceEUR||h.totalPriceEUR/h.nights||0).toFixed(0)}</div></div>
        <div class="hotel-detail-item"><div class="hotel-detail-label">Totale</div><div class="hotel-detail-val" style="color:var(--accent-emerald);">€${h.totalPriceEUR}</div></div>
      </div>
      <div style="font-size:12px;color:var(--text-secondary);">
        <div><strong>Codice:</strong> <span style="color:var(--accent-cyan);font-weight:800;">${h.bookingCode||'Da inserire'}</span></div>
        <div style="margin-top:2px;"><strong>Note:</strong> ${h.notes||'–'}</div>
      </div>
      <div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap;">
        ${h.link?`<a href="${h.link}" target="_blank" class="link-btn"><i class="fa-solid fa-bed"></i> Booking.com ↗</a>`:''}
        <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(h.name+' '+h.area)}" target="_blank" class="link-btn link-btn-maps"><i class="fa-solid fa-map-pin"></i> Maps ↗</a>
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
  const nights = parseInt(document.getElementById('hedit-nights-'+id)?.value)||hotels[idx].nights;
  const price  = parseFloat(document.getElementById('hedit-price-'+id)?.value)||hotels[idx].totalPriceEUR;
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
  const nights  = parseInt(document.getElementById('hadd-nights')?.value)||1;
  const price   = parseFloat(document.getElementById('hadd-price')?.value)||0;
  const notes   = document.getElementById('hadd-notes')?.value.trim()||'';
  if(!name){alert('Inserisci almeno il nome!');return;}
  const hotels = getHotels();
  hotels.push({ id:'HOTEL-'+Date.now(), name, area, bookingCode:code, checkIn, checkOut, nights,
                totalPriceEUR:price, nightlyPriceEUR:nights>0?price/nights:0, status:'Prenotato',
                rating:'–', address:'', location:'', notes, link:'' });
  saveHotels(hotels); renderAccommodations();
};

/* ═══════════════════════════════════════════════════════
   8. FOOD (full CRUD + mark visited)
   ═══════════════════════════════════════════════════════ */
const FOOD_KEY = 'bali_food_v1';
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
    <div id="food-add-form" style="display:none;" class="glass-card" style="border-color:rgba(16,185,129,.35);">
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
  const esc = s => (s||'').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
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
        <div class="food-place" style="${visited?'text-decoration:line-through;color:var(--text-muted);':''}">${item.place}</div>
        <div style="display:flex;gap:5px;align-items:center;">
          <div class="food-price">${item.price}</div>
          <button onclick="foodToggleVisited('${item.id}')" title="${visited?'Segna come da visitare':'Segna come visitato'}"
                  class="row-btn" style="${visited?'background:rgba(16,185,129,.15);border-color:rgba(16,185,129,.35);color:var(--accent-emerald);':'border-color:var(--border-color);color:var(--text-muted);'}" >
            <i class="fa-solid fa-check"></i>
          </button>
          <button onclick="foodStartEdit('${item.id}')" class="row-btn row-btn-edit" title="Modifica"><i class="fa-solid fa-pen-to-square"></i></button>
          <button onclick="foodDeleteItem('${item.id}')" class="row-btn row-btn-delete" title="Elimina"><i class="fa-solid fa-trash"></i></button>
        </div>
      </div>
      <div class="food-style">📍 ${item.area} • ${item.meal||''} ${item.date?`(${item.date})`:''} — ${item.style||''}</div>
      ${visited?`<div style="margin-top:4px;"><span class="badge badge-pagato">✅ VISITATO</span></div>`:''}
      ${item.priority?`<div style="margin-top:4px;"><span class="badge badge-imperdibile">${item.priority}</span></div>`:''}
      <div style="display:flex;gap:8px;margin-top:6px;flex-wrap:wrap;">
        ${item.link?`<a href="${item.link}" target="_blank" class="link-btn">Menu ↗</a>`:''}
        <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((item.place||'')+' '+(item.area||''))}" target="_blank" class="link-btn link-btn-maps"><i class="fa-solid fa-compass"></i> Mappa ↗</a>
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
    link:  document.getElementById('fedit-link-'+id)?.value.trim()||items[idx].link||''
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
    link:  document.getElementById('fadd-link')?.value.trim()||'',
    visited:false, maps:''
  });
  saveFoodItems(items); renderFood();
};

/* ═══════════════════════════════════════════════════════
   9. CHECKLIST (add/edit/delete + toggle)
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
    const esc = s=>(s||'').replace(/"/g,'&quot;');
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
        <div class="item-text">${item.item}</div>
        <div class="item-meta">🏷️ ${item.area||''} ${item.timing?`• 🕒 ${item.timing}`:''} ${item.detail?`— ${item.detail}`:''}</div>
        ${item.link?`<a href="${item.link}" target="_blank" class="link-btn" onclick="event.stopPropagation();">Sito Ufficiale ↗</a>`:''}
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
  localStorage.setItem(CHECKLIST_STATE_KEY,JSON.stringify(state));
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
  const esc = s => (s||'').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
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
        <div class="piano-b-title" style="flex:1;">${p.title}</div>
        <div style="display:flex;gap:4px;flex-shrink:0;margin-left:8px;">
          <button onclick="pianoBStartEdit('${p.id}')" class="row-btn row-btn-edit"><i class="fa-solid fa-pen-to-square"></i></button>
          <button onclick="pianoBDeleteItem('${p.id}')" class="row-btn row-btn-delete"><i class="fa-solid fa-trash"></i></button>
        </div>
      </div>
      <div class="piano-b-trigger">⚠️ ${p.trigger}</div>
      <div class="piano-b-action"><strong>👉</strong> ${p.action}</div>
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
  const esc = s => (s||'').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
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
        <div style="font-size:13px;font-weight:800;color:#fff;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${d.name}</div>
        <div style="font-size:11px;color:var(--text-secondary);">${d.role}</div>
      </div>
      <div style="display:flex;gap:6px;flex-shrink:0;margin-left:8px;align-items:center;">
        <a href="https://wa.me/${phone}?text=${encodeURIComponent(d.waText||'')}" target="_blank"
           class="btn-primary" style="text-decoration:none;padding:6px 10px;font-size:11px;background:#25D366;color:#000;display:flex;align-items:center;gap:4px;">
          <i class="fa-brands fa-whatsapp"></i> WA</a>
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
  const esc = x => (x||'').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
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
        <div style="font-weight:800;color:var(--accent-amber);">${s.place}</div>
        <div style="display:flex;gap:4px;">
          <button onclick="photoStartEdit('${s.id}')" class="row-btn row-btn-edit"><i class="fa-solid fa-pen-to-square"></i></button>
          <button onclick="photoDeleteItem('${s.id}')" class="row-btn row-btn-delete"><i class="fa-solid fa-trash"></i></button>
        </div>
      </div>
      <div style="color:var(--accent-cyan);font-weight:600;">🕒 ${s.bestTime}</div>
      <div style="color:var(--text-secondary);margin-top:2px;">💡 ${s.tip}</div>
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
      <div style="font-family:var(--font-heading);font-size:16px;font-weight:800;margin-bottom:8px;">${g.category}</div>
      <ul style="list-style:none;display:flex;flex-direction:column;gap:6px;">
        ${g.tips.map(t=>`<li style="font-size:12px;color:var(--text-secondary);display:flex;gap:8px;"><span style="color:var(--accent-emerald);">•</span><span>${t}</span></li>`).join('')}
      </ul>
    </div>`).join('');
}

/* ═══════════════════════════════════════════════════════
   14. EMERGENZA
   ═══════════════════════════════════════════════════════ */
function renderEmergencyContacts() {
  const c = document.getElementById('emergency-contacts-list');
  if (!c) return;
  c.innerHTML = BALI_TRIP_DATA.emergencyContacts.map(e => `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:10px;background:var(--bg-card);border-radius:10px;border:1px solid var(--border-color);">
      <div>
        <div style="font-size:13px;font-weight:700;">${e.label}</div>
        <div style="font-size:12px;color:var(--accent-coral);font-weight:800;">${e.phone}</div>
      </div>
      <a href="tel:${e.phone.replace(/[^0-9+]/g,'')}" class="btn-primary" style="text-decoration:none;padding:6px 12px;font-size:11px;">Chiama</a>
    </div>`).join('');
}

window.openEmergencyModal  = () => document.getElementById('emergency-modal')?.classList.add('active');
window.closeEmergencyModal = () => document.getElementById('emergency-modal')?.classList.remove('active');
window.openGmailModal      = () => document.getElementById('gmail-modal')?.classList.add('active');
window.closeGmailModal     = () => document.getElementById('gmail-modal')?.classList.remove('active');
window.openRevolutCSVModal  = () => document.getElementById('revolut-csv-modal')?.classList.add('active');
window.closeRevolutCSVModal = () => document.getElementById('revolut-csv-modal')?.classList.remove('active');

/* ═══════════════════════════════════════════════════════
   15. GMAIL SYNC & EMAIL PARSER
   ═══════════════════════════════════════════════════════ */
window.simulateGmailOAuthSync = function() {
  const res=document.getElementById('parse-result-status');
  if(!res) return;
  res.innerHTML=`<span style="color:var(--accent-cyan);">⏳ Connessione Gmail in corso...</span>`;
  setTimeout(()=>{
    const st=getBudgetPaidState();
    st['ITEM-05']=true; st['ITEM-06']=true; st['ITEM-07']=true;
    localStorage.setItem(BUDGET_PAID_KEY,JSON.stringify(st));
    res.innerHTML=`<div style="color:var(--accent-emerald);font-weight:700;">✅ Gmail sincronizzato!</div>
      <div style="font-size:11px;color:var(--text-secondary);margin-top:4px;">3 prenotazioni identificate: Temuku (BK-8849201), Coral Drift (CD-773910), Paranyogan (PH-992014).</div>`;
    renderBudget(); renderDashboard();
  },1200);
};
window.parsePastedEmail = function() {
  const text=document.getElementById('email-paste-area')?.value||'';
  const res=document.getElementById('parse-result-status');
  if(!text.trim()){if(res) res.innerHTML=`<span style="color:var(--accent-coral);">Incolla prima l'email!</span>`;return;}
  const cM=text.match(/(?:conferma|booking|pnr|numero|codice)\s*[:#]?\s*([A-Z0-9-]{5,15})/i);
  const pM=text.match(/(?:EUR|€|IDR|Rp)\s*([\d.,]+)/i)||text.match(/([\d.,]+)\s*(?:EUR|€|IDR|Rp)/i);
  const code=cM?cM[1]:'PNR-'+Math.floor(100000+Math.random()*900000);
  const price=pM?parseFloat(pM[1].replace(/,/g,'')):0;
  const st=getBudgetPaidState(); let match=null;
  if(text.toLowerCase().includes('temuku'))       {st['ITEM-05']=true;match='Temuku Ubud Villas';}
  else if(text.toLowerCase().includes('coral'))   {st['ITEM-06']=true;match='Coral Drift Resort';}
  else if(text.toLowerCase().includes('paranyog')){st['ITEM-07']=true;match='Paranyogan Homestay';}
  localStorage.setItem(BUDGET_PAID_KEY,JSON.stringify(st));
  if(res) res.innerHTML=`<div style="color:var(--accent-emerald);font-weight:700;">🎉 Email analizzata!</div>
    <div style="font-size:11px;margin-top:4px;">Servizio: <strong>${match||'Generico'}</strong> • Codice: <strong>${code}</strong> • Prezzo: <strong>€${price}</strong></div>`;
  renderBudget(); renderDashboard();
};

window.parseRevolutCSV = function() {
  const csv=document.getElementById('revolut-csv-paste')?.value||'';
  if(!csv.trim()) return;
  const expenses=getLoggedExpenses(); let added=0;
  const rate=BALI_TRIP_DATA.meta.exchangeRateEURtoIDR;
  csv.split('\n').forEach(line=>{
    const p=line.split(','); if(p.length<3) return;
    const desc=(p[1]||'Revolut').trim(), amt=parseFloat(p[2]), cur=(p[3]||'EUR').trim().toUpperCase();
    if(isNaN(amt)) return;
    expenses.push({desc,wallet:cur==='IDR'?'revolut_idr':'revolut_eur',
      amountEUR:cur==='IDR'?amt/rate:amt, amountIDR:cur==='IDR'?amt:amt*rate,
      date:(p[0]||'').trim()||new Date().toLocaleDateString('it-IT')});
    added++;
  });
  localStorage.setItem('bali_user_expenses',JSON.stringify(expenses));
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

function getLoggedExpenses() { try{return JSON.parse(localStorage.getItem('bali_user_expenses')||'[]');}catch(e){return[];} }

function initExpenseLogger() {
  const form=document.getElementById('expense-form');
  if(!form) return;
  form.addEventListener('submit',e=>{
    e.preventDefault();
    const desc=document.getElementById('exp-desc').value.trim();
    const wallet=document.getElementById('exp-wallet').value;
    const raw=parseFloat(document.getElementById('exp-amount').value);
    if(!desc||isNaN(raw)) return;
    const rate=BALI_TRIP_DATA.meta.exchangeRateEURtoIDR;
    const isIDR=['revolut_idr','cash_idr','atm_withdrawal'].includes(wallet);
    const expenses=getLoggedExpenses();
    expenses.push({desc,wallet,amountEUR:isIDR?raw/rate:raw,amountIDR:isIDR?raw:raw*rate,date:new Date().toLocaleDateString('it-IT')});
    localStorage.setItem('bali_user_expenses',JSON.stringify(expenses));
    document.getElementById('exp-desc').value=''; document.getElementById('exp-amount').value='';
    renderLoggedExpensesList(); renderDashboard(); updateWalletTotals();
  });
  renderLoggedExpensesList();
}

window.deleteExpense = function(idx) {
  const e=getLoggedExpenses(); e.splice(idx,1);
  localStorage.setItem('bali_user_expenses',JSON.stringify(e));
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
        <div><span style="font-weight:700;">${exp.desc}</span><span style="font-size:10px;color:var(--text-muted);"> (${lbl} • ${exp.date})</span></div>
        <div style="display:flex;align-items:center;gap:8px;">
          <span style="font-weight:800;color:var(--accent-emerald);">€${exp.amountEUR.toFixed(2)}</span>
          <button onclick="deleteExpense(${i})" style="background:none;border:none;color:var(--accent-coral);cursor:pointer;font-size:13px;">✕</button>
        </div>
      </div>`;
    }).join('')}`;
}

function updateWalletTotals() {
  const expenses=getLoggedExpenses(); const rate=BALI_TRIP_DATA.meta.exchangeRateEURtoIDR;
  let revEUR=0,cashIDR=0;
  expenses.forEach(e=>{
    if(e.wallet==='revolut_eur') revEUR+=e.amountEUR;
    else if(e.wallet==='revolut_idr') revEUR+=e.amountIDR/rate;
    else if(e.wallet==='cash_idr') cashIDR+=e.amountIDR;
  });
  const re=document.getElementById('wallet-revolut-total');
  const ce=document.getElementById('wallet-cash-total');
  if(re) re.innerText=`€${revEUR.toFixed(2)}`;
  if(ce) ce.innerText=`Rp ${cashIDR.toLocaleString('it-IT')}`;
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
    tripMeta:BALI_TRIP_DATA.meta, budgetItems:getBudgetItems(), paidState:getBudgetPaidState(),
    itinerary:getItinerary(), accommodations:getHotels(), food:getFoodItems(),
    checklistItems:getChecklistItems(), checklistState:getChecklistState(),
    pianoB:getPianoB(), drivers:getDrivers(), photoSpots:getPhotoSpots(),
    loggedExpenses:getLoggedExpenses(), exportDate:new Date().toISOString()
  },null,2);
  const a=Object.assign(document.createElement('a'),{
    href:'data:text/json;charset=utf-8,'+encodeURIComponent(data),
    download:`Bali_2026_Backup_${new Date().toISOString().split('T')[0]}.json`
  });
  document.body.appendChild(a);a.click();a.remove();
};

/* ═══════════════════════════════════════════════════════
   18. PWA
   ═══════════════════════════════════════════════════════ */
function registerServiceWorker() {
  if('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(()=>{});
}
