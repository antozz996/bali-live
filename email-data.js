// Bali 2026 — dati operativi verificati da conferme email (29/08/2026)
// IMPORTANTE: questo file è pubblico. Non contiene PIN, PNR, codici prenotazione,
// date di nascita, e-mail/telefono personali o token di gestione prenotazione.
(function applyEmailVerifiedData() {
  'use strict';

  if (typeof BALI_TRIP_DATA === 'undefined') return;

  const VERSION = 'V9-MAIL-2026-08-29-1';
  const data = BALI_TRIP_DATA;

  const findById = (list, id) => Array.isArray(list) ? list.find(item => item && item.id === id) : null;
  const patchById = (list, id, patch) => {
    const item = findById(list, id);
    if (item) Object.assign(item, patch);
    return item;
  };
  const patchDay = (dayNum, patch) => {
    const item = Array.isArray(data.itinerary) ? data.itinerary.find(day => Number(day.dayNum) === Number(dayNum)) : null;
    if (item) Object.assign(item, patch);
  };
  const addUnique = (list, item) => {
    if (!Array.isArray(list) || !item?.id) return;
    const existing = list.find(candidate => candidate?.id === item.id);
    if (existing) Object.assign(existing, item);
    else list.push(item);
  };

  // --- Budget: preserviamo i valori EUR decisi nella V9; aggiorniamo solo importi EUR
  // esplicitamente confermati dalle email e gli stati di pagamento reali.
  Object.assign(data.meta, {
    budgetMax: 5631.10,
    budgetMin: 4801.10,
    budgetPaid: 3239.36,
    dataVersion: VERSION,
    emailVerifiedAt: '2026-08-29'
  });

  patchById(data.budgetItems, 'ITEM-02', {
    paidDefault: true,
    defaultStatus: 'Pagato',
    notes: 'Temuku pagato tramite Booking.com: Rp 4.668.064.'
  });
  patchById(data.budgetItems, 'ITEM-03', {
    paidDefault: true,
    defaultStatus: 'Pagato',
    notes: 'Coral Drift pagato tramite Booking.com: Rp 13.168.882.'
  });
  patchById(data.budgetItems, 'ITEM-04', {
    paidDefault: true,
    defaultStatus: 'Pagato',
    notes: 'Paranyogan pagato tramite Booking.com: Rp 936.000.'
  });
  patchById(data.budgetItems, 'ITEM-10', {
    desc: 'Booking.com Rides / Talixo — DPS → Temuku Ubud Villas',
    paidDefault: true,
    defaultStatus: 'Confermato · €0',
    notes: 'Corsa gratuita/promozionale confermata per il 16/09 alle 22:45.'
  });
  patchById(data.budgetItems, 'ITEM-12', {
    desc: 'BlueWater Express Bali ↔ Gili Air + transfer privati',
    paidDefault: true,
    defaultStatus: 'Pagato',
    notes: 'Ticket + transfer privati saldati. Totale operativo pagato: Rp 3.905.900 (Rp 3.051.000 ticket + Rp 854.900 saldo transfer/admin).'
  });
  patchById(data.budgetItems, 'ITEM-15', {
    amount: 78.38,
    paidDefault: false,
    defaultStatus: 'Prenotato · addebito 14/09',
    notes: 'GetYourGuide: pagamento automatico previsto 14/09/2026.'
  });
  patchById(data.budgetItems, 'ITEM-16', {
    amount: 108.72,
    paidDefault: false,
    defaultStatus: 'Prenotato · addebito 15/09',
    notes: 'GetYourGuide: pagamento automatico previsto 15/09/2026.'
  });
  patchById(data.budgetItems, 'ITEM-17', {
    amount: 192.14,
    paidDefault: false,
    defaultStatus: 'Prenotato · addebito 16/09',
    notes: 'GetYourGuide: pagamento automatico previsto 16/09/2026.'
  });

  // --- Alloggi verificati da Booking.com.
  patchById(data.accommodations, 'UB-01', {
    status: 'Pagato',
    address: 'Jalan Pura Ulun Carik No. 7, Br. Lungsiakan, Desa Kedewatan, 80571 Ubud, Indonesia',
    location: 'Kedewatan, Ubud · One-Bedroom Pool Villa with Rice Field View',
    phone: '+62 361 9080087',
    amountIDR: 4668064,
    paidIDR: 4668064,
    cancellationDeadline: '2026-09-08T23:59:00+08:00',
    checkInWindow: 'dalle 14:00',
    checkOutWindow: 'entro le 12:00',
    mealPlan: 'Colazione inclusa',
    notes: 'PAGATO via Booking.com (Rp 4.668.064). Late check-in confermato dalla struttura. Cancellazione gratuita fino all’08/09 alle 23:59 WITA; dal 09/09 penale pari alla prima notte. Colazione inclusa.'
  });
  patchById(data.accommodations, 'GI-01', {
    status: 'Pagato',
    address: 'Jl. Bambu, 83352 Gili Air, Indonesia',
    location: 'Gili Air · Villa con 1 camera da letto',
    phone: '+62 822 6471 7104',
    amountIDR: 13168882,
    paidIDR: 13168882,
    cancellationDeadline: '2026-08-20T23:59:00+08:00',
    checkInWindow: '14:00–21:00',
    checkOutWindow: '08:00–11:00',
    mealPlan: 'Colazione inclusa',
    notes: 'PAGATO via Booking.com (Rp 13.168.882). Reception 07:00–22:00. Cancellazione gratuita scaduta il 20/08 alle 23:59 WITA: prenotazione ora non rimborsabile secondo le condizioni ricevute. Colazione inclusa.'
  });
  patchById(data.accommodations, 'UL-01', {
    status: 'Pagato',
    address: 'Jalan Pantai Balangan No 11, Kabupaten Badung, Uluwatu, 80361, Indonesia',
    location: 'Uluwatu / Balangan · Camera King',
    phone: '+62 811 3950 080',
    amountIDR: 936000,
    paidIDR: 936000,
    cancellationDeadline: '2026-09-24T23:59:00+08:00',
    checkInWindow: '14:00–22:00',
    checkOutWindow: '08:00–11:00',
    mealPlan: 'Pasti non inclusi',
    notes: 'PAGATO via Booking.com (Rp 936.000). Cancellazione gratuita fino al 24/09 alle 23:59 WITA; dal 25/09 penale prima notte. Pasti non inclusi. Per eventuali extra in struttura, la conferma originaria indica pagamento in contanti.'
  });

  // --- Itinerario: orari operativi reali dalle conferme.
  patchDay(2, {
    evening: 'Arrivo DPS 22:25 (EK398); Booking.com Rides/Talixo previsto alle 22:45 → Temuku Ubud Villas',
    transport: 'Aereo + taxi Booking.com/Talixo',
    requiredBookings: 'Taxi aeroporto confermato · €0',
    notes: 'L’autista monitora EK398 e attende fino a 45 minuti dopo l’arrivo. Late check-in Temuku confermato.'
  });
  patchDay(3, {
    morning: '08:00 pickup Temuku — Tour privato Ubud: Tegalalang, Tirta Empul e cascate',
    requiredBookings: 'Tour Ubud prenotato · €78,38 · addebito 14/09',
    notes: 'Pickup confermato alle 08:00 dalla hall. Tour max 10h; ingressi inclusi. Cancellazione gratuita entro le 08:00 del 16/09.'
  });
  patchDay(4, {
    morning: 'Monte Batur in Jeep 4×4 all’alba + sorgenti termali (pickup Temuku da confermare)',
    requiredBookings: 'Jeep Batur prenotata · €108,72 · addebito 15/09; pickup da confermare',
    evening: 'Kubu: richiesta anniversario in attesa di conferma · backup The Sayan House',
    dinner: 'Kubu (richiesta in attesa) / The Sayan House backup',
    notes: 'GetYourGuide comunicherà il pickup del Batur; indicativamente circa 2h prima del tour. Cancellazione gratuita entro le 03:00 del 17/09. Kubu non è ancora confermato.'
  });
  patchDay(5, {
    morning: '07:00 pickup Temuku — ATV + rafting + Monkey Forest (pacchetto completo)',
    requiredBookings: 'Pacchetto prenotato · €192,14 · addebito 16/09',
    notes: 'Pickup 07:00. Pranzo, ATV, rafting, Monkey Forest e trasporto privato inclusi. Cancellazione gratuita entro le 07:00 del 18/09.'
  });
  patchDay(6, {
    morning: '05:30–06:00 pickup Temuku → Padang Bai; BlueWater Express 08:00 → Gili Air',
    afternoon: 'Arrivo Gili Air 10:05; trasferimento bagagli/check-in Coral Drift e mare',
    transport: 'Transfer privato + BlueWater Express',
    requiredBookings: 'BlueWater + pickup privato PAGATI',
    notes: 'BlueWater invierà il numero del driver il 19/09 entro le 20:00. Check-in Coral Drift dalle 14:00; reception 07:00–22:00.'
  });
  patchDay(8, {
    morning: '06:30 snorkeling privato Gili Meno + tartarughe + statue subacquee (4h, GoPro inclusa)',
    requiredBookings: 'Snorkeling privato prenotato',
    notes: 'Partenza attività confermata alle 06:30. Esperienza privata di 4 ore con GoPro inclusa; conservare voucher offline.'
  });
  patchDay(13, {
    morning: 'BlueWater Express Gili Air 11:50 → Serangan 14:55',
    afternoon: 'Arrivo Serangan 14:55; transfer privato incluso → Paranyogan Homestay',
    transport: 'BlueWater Express + transfer privato',
    requiredBookings: 'Rientro BlueWater + drop-off Paranyogan PAGATI',
    notes: 'Drop-off privato Serangan → Paranyogan incluso e saldato. Check-in Paranyogan 14:00–22:00.'
  });
  patchDay(15, {
    afternoon: 'Dubai → Roma EK097 ore 09:05; arrivo FCO 13:25 (Terminal 3) → Napoli',
    requiredBookings: 'Emirates confermato; EK097 aggiornato a 09:05 · treno FCO→Napoli da completare',
    notes: 'Emirates ha spostato EK097 da 08:50 a 09:05; arrivo FCO invariato alle 13:25.'
  });

  // --- Escursioni: importi, pickup, scadenze e fornitori verificati.
  patchById(data.excursions, 'EX-01', {
    time: '08:00 pickup Temuku',
    status: 'Prenotata · pagamento 14/09',
    priceEUR: 78.38,
    paymentDate: '2026-09-14',
    cancellationDeadline: '2026-09-16T08:00:00+08:00',
    provider: 'CV. Bali Private Transports',
    providerPhone: '+62 819 2812 0030',
    notes: 'Pickup 08:00 dalla hall Temuku. 10h max; ingressi inclusi; rientro stesso hotel. Cancellazione gratuita entro 16/09 08:00.'
  });
  patchById(data.excursions, 'EX-02', {
    time: 'Pickup da confermare (~2h prima)',
    status: 'Prenotata · pagamento 15/09',
    priceEUR: 108.72,
    paymentDate: '2026-09-15',
    cancellationDeadline: '2026-09-17T03:00:00+08:00',
    provider: 'Your Bali Trekking Tour',
    providerPhone: '+62 812 3966 4605',
    notes: '8h, Jeep + sorgenti termali, transfer Ubud incluso. L’operatore confermerà il pickup. Cancellazione gratuita entro 17/09 03:00.'
  });
  patchById(data.excursions, 'EX-03', {
    status: 'Richiesta info inviata · attesa risposta',
    notes: 'Email inviata il 29/08 per Putri Royal Package per 2 persone il 18/09; in attesa di prezzo finale, disponibilità e dettagli anniversario.'
  });
  patchById(data.excursions, 'EX-04', {
    time: '07:00 pickup Temuku',
    status: 'Prenotata · pagamento 16/09',
    priceEUR: 192.14,
    paymentDate: '2026-09-16',
    cancellationDeadline: '2026-09-18T07:00:00+08:00',
    provider: 'Hire Bali Driver',
    providerPhone: '+62 812 3720 5332',
    notes: 'Pacchetto completo: ATV + rafting + Monkey Forest + pranzo + trasporto privato climatizzato. Pickup 07:00; cancellazione gratuita entro 18/09 07:00.'
  });
  patchById(data.excursions, 'EX-05', {
    time: '06:30 · 4 ore',
    provider: 'Blissful Paradise Indonesia',
    notes: 'Snorkeling privato da Gili Air con tartarughe, statua sottomarina e GoPro inclusa. Orario confermato 22/09 alle 06:30.'
  });

  // --- Food: Kubu è una richiesta, NON una prenotazione confermata.
  addUnique(data.foodHighlights, {
    id: 'FOOD-KUBU-REQUEST',
    date: '18/09',
    place: 'Kubu at Mandapa',
    area: 'Ubud',
    meal: 'Cena · richiesta',
    style: 'Anniversario · Private Cocoon/Bamboo Pavilion richiesto; attenzione: SevenRooms mostra 19:30–20:00 mentre il messaggio chiede 21:00',
    price: 'Da confermare / prepagamento',
    link: 'https://kubuatmandapa.com/',
    priority: 'IN ATTESA ⏳',
    maps: 'Kubu+at+Mandapa+Ubud'
  });

  // --- Driver e transfer.
  patchById(data.driversAndTransfers, 'DRV-01', {
    role: 'DPS → Temuku Ubud Villas',
    name: 'Booking.com Rides · Talixo',
    phone: '',
    status: 'Confermato · €0',
    waText: '16/09: pickup previsto 22:45 a DPS per Temuku. Il driver monitora EK398 e attende fino a 45 minuti.'
  });
  patchById(data.driversAndTransfers, 'DRV-02', {
    role: 'BlueWater Express · Bali ↔ Gili Air + transfer privati',
    name: 'BlueWater Express',
    phone: '+62 811 3812 0199',
    status: 'Pagato',
    waText: '20/09 pickup Temuku 05:30–06:00; Padang Bai 08:00 → Gili Air 10:05. 27/09 Gili Air 11:50 → Serangan 14:55 + drop-off Paranyogan.'
  });

  // --- Centro prenotazioni (senza codici/PIN sensibili).
  const bookings = Array.isArray(data.bookings) ? data.bookings : (data.bookings = []);
  const bookingPatch = (id, patch) => patchById(bookings, id, patch);

  bookingPatch('BOOK-DPS-UBUD', {
    type: 'Trasporto',
    title: 'DPS → Temuku Ubud Villas',
    provider: 'Booking.com Rides · Talixo',
    startDate: '2026-09-16',
    amountEUR: 0,
    status: 'Confermata',
    paid: true,
    cancellationDeadline: '2026-09-16',
    location: 'Bali Airport (DPS) → Temuku Ubud Villas',
    notes: 'Pickup 22:45. Driver segue EK398 e attende fino a 45 min dopo l’arrivo. Cancellazione gratuita fino alle 19:45 locali. Codice corsa conservato solo fuori dal repository pubblico.',
    source: 'Email Booking.com verificata 29/08'
  });
  bookingPatch('BOOK-UB-01', {
    status: 'Confermata',
    paid: true,
    cancellationDeadline: '2026-09-08',
    notes: 'PAGATO Rp 4.668.064. Late check-in confermato; colazione inclusa; check-out entro 12:00. Cancellazione gratuita fino 08/09 23:59 WITA.',
    source: 'Email Booking.com verificata 29/08'
  });
  bookingPatch('BOOK-GI-01', {
    status: 'Confermata',
    paid: true,
    cancellationDeadline: '2026-08-20',
    notes: 'PAGATO Rp 13.168.882. Check-in 14:00–21:00; reception 07:00–22:00; colazione inclusa. Finestra di cancellazione gratuita scaduta.',
    source: 'Email Booking.com verificata 29/08'
  });
  bookingPatch('BOOK-UL-01', {
    status: 'Confermata',
    paid: true,
    cancellationDeadline: '2026-09-24',
    notes: 'PAGATO Rp 936.000. Check-in 14:00–22:00; check-out 08:00–11:00; pasti non inclusi. Cancellazione gratuita fino 24/09 23:59 WITA.',
    source: 'Email Booking.com verificata 29/08'
  });
  bookingPatch('BOOK-GILI-PACK', {
    provider: 'BlueWater Express',
    startDate: '2026-09-20',
    endDate: '2026-09-27',
    amountEUR: 190,
    status: 'Confermata',
    paid: true,
    location: 'Temuku → Padang Bai → Gili Air → Serangan → Paranyogan',
    notes: 'PAGATO. Operativo: 20/09 pickup Temuku 05:30–06:00, boat 08:00→10:05. 27/09 boat 11:50→14:55, drop-off privato Paranyogan. Totale pagato documentato Rp 3.905.900. Driver comunicato il giorno prima entro le 20:00.',
    source: 'Email BlueWater/DOKU verificata 29/08'
  });
  bookingPatch('BOOK-FLIGHT-BACK', {
    notes: 'EK399 DPS→DXB 00:35; EK097 DXB→FCO aggiornato alle 09:05, arrivo FCO 13:25 Terminal 3.',
    source: 'Email Emirates verificata 29/08'
  });
  bookingPatch('BOOK-EX-01', {
    amountEUR: 78.38,
    status: 'Prenotata',
    paid: false,
    cancellationDeadline: '2026-09-16',
    provider: 'CV. Bali Private Transports',
    notes: 'Pickup Temuku 08:00. Addebito automatico 14/09. Cancellazione gratuita entro 16/09 08:00. Ingressi inclusi.',
    source: 'Email GetYourGuide verificata 29/08'
  });
  bookingPatch('BOOK-EX-02', {
    amountEUR: 108.72,
    status: 'Prenotata',
    paid: false,
    cancellationDeadline: '2026-09-17',
    provider: 'Your Bali Trekking Tour',
    notes: 'Addebito automatico 15/09. Pickup Temuku da confermare; circa 2h prima. Cancellazione gratuita entro 17/09 03:00.',
    source: 'Email GetYourGuide verificata 29/08'
  });
  bookingPatch('BOOK-EX-03', {
    status: 'Da confermare',
    paid: false,
    provider: 'Putri Ubud Spa',
    notes: 'Richiesta informazioni inviata 29/08 per Putri Royal Package, 2 persone, 18/09. In attesa di risposta.',
    source: 'Email inviata 29/08'
  });
  bookingPatch('BOOK-EX-04', {
    amountEUR: 192.14,
    status: 'Prenotata',
    paid: false,
    cancellationDeadline: '2026-09-18',
    provider: 'Hire Bali Driver',
    notes: 'Pickup 07:00. Addebito automatico 16/09. ATV + rafting + Monkey Forest + pranzo e transfer inclusi. Cancellazione gratuita entro 18/09 07:00.',
    source: 'Email GetYourGuide verificata 29/08'
  });
  bookingPatch('BOOK-EX-05', {
    status: 'Prenotata',
    provider: 'Blissful Paradise Indonesia',
    startDate: '2026-09-22',
    notes: 'Snorkeling privato 4h con GoPro inclusa. Orario confermato 06:30.',
    source: 'Email fornitore GetYourGuide verificata'
  });

  addUnique(bookings, {
    id: 'BOOK-KUBU-REQUEST',
    type: 'Ristorante',
    title: 'Kubu at Mandapa — anniversario',
    provider: 'Kubu / SevenRooms',
    startDate: '2026-09-18',
    endDate: '',
    code: '',
    amountEUR: 0,
    status: 'Da confermare',
    paid: false,
    cancellationDeadline: '',
    location: 'Ubud',
    link: 'https://kubuatmandapa.com/',
    notes: 'RICHIESTA NON CONFERMATA. SevenRooms mostra 2 ospiti 19:30–20:00, ma il testo inviato chiede 21:00: verificare la risposta. Richiesti Private Cocoon, fiori/dessert anniversario e relativi costi.',
    source: 'Email Kubu/SevenRooms 29/08'
  });

  // Checklist: le informazioni economiche degli hotel sono ora verificate.
  patchById(data.checklist, 'CL-07', {
    status: 'Verificato',
    detail: 'Temuku, Coral Drift e Paranyogan risultano pagati. Scadenze cancellazione inserite. PIN/codici restano volutamente fuori dal repository pubblico.'
  });
  patchById(data.checklist, 'CL-08', {
    status: 'Da completare',
    detail: 'BlueWater verificato; GetYourGuide Ubud/Batur/ATV verificati. Salvare offline i voucher e i codici privati prima della partenza.'
  });

  function mergeStoredById(key, baseList, additions = []) {
    let current = [];
    try {
      const parsed = JSON.parse(localStorage.getItem(key) || 'null');
      if (Array.isArray(parsed)) current = parsed;
    } catch {}
    if (!current.length && Array.isArray(baseList)) current = baseList.map(item => ({ ...item }));
    const baseMap = new Map((baseList || []).filter(Boolean).map(item => [item.id, item]));
    current = current.map(item => baseMap.has(item.id) ? { ...item, ...baseMap.get(item.id) } : item);
    for (const item of additions) {
      const idx = current.findIndex(candidate => candidate?.id === item.id);
      if (idx >= 0) current[idx] = { ...current[idx], ...item };
      else current.push({ ...item });
    }
    localStorage.setItem(key, JSON.stringify(current));
  }

  function persistVerifiedData() {
    try {
      if (localStorage.getItem('bali_email_data_version') === VERSION) return;

      mergeStoredById('bali_budget_items_v2', data.budgetItems);
      const paidState = {};
      (data.budgetItems || []).forEach(item => { paidState[item.id] = Boolean(item.paidDefault); });
      localStorage.setItem('bali_paid_items_custom', JSON.stringify(paidState));
      mergeStoredById('bali_accommodations_v1', data.accommodations);
      mergeStoredById('bali_itinerary_v1', data.itinerary);
      mergeStoredById('bali_food_v2', data.foodHighlights, [findById(data.foodHighlights, 'FOOD-KUBU-REQUEST')].filter(Boolean));
      mergeStoredById('bali_excursions_v1', data.excursions);
      mergeStoredById('bali_checklist_items_v1', data.checklist);
      mergeStoredById('bali_drivers_v1', data.driversAndTransfers);
      mergeStoredById('bali_bookings_v1', data.bookings, [findById(data.bookings, 'BOOK-KUBU-REQUEST')].filter(Boolean));

      localStorage.setItem('bali_email_data_version', VERSION);

      const rerender = [
        'renderDashboard', 'renderItineraryDaySelector', 'renderAccommodations', 'renderBudget',
        'renderFood', 'renderExcursions', 'renderChecklist', 'renderDrivers', 'renderBookings',
        'renderTravelMode', 'renderReminders'
      ];
      rerender.forEach(name => { if (typeof window[name] === 'function') window[name](); });
      if (typeof window.renderItineraryDay === 'function') {
        window.renderItineraryDay(typeof currentDayNum === 'number' ? currentDayNum : 1);
      }
      if (typeof scheduleBackendSync === 'function') scheduleBackendSync();
      if (typeof window.scheduleCloudSync === 'function') window.scheduleCloudSync();
    } catch (error) {
      console.error('Email verified data migration failed', error);
    }
  }

  // La V9 base effettua una propria migrazione dopo il load. Applichiamo i dati email
  // subito come fallback e poi nuovamente dopo, così prevalgono anche su vecchi local/cloud state.
  window.addEventListener('load', () => window.setTimeout(persistVerifiedData, 2200), { once: true });
})();
