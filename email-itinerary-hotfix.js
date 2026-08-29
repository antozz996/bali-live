// Bali 2026 — hotfix merge itinerario verificato via email
(function fixMailVerifiedItinerary() {
  'use strict';
  const VERSION = 'V9-MAIL-ITINERARY-HOTFIX-2026-08-29-1';

  function apply() {
    try {
      if (typeof BALI_TRIP_DATA === 'undefined' || !Array.isArray(BALI_TRIP_DATA.itinerary)) return;
      if (localStorage.getItem('bali_email_itinerary_hotfix_version') === VERSION) return;

      let current = [];
      try {
        const parsed = JSON.parse(localStorage.getItem('bali_itinerary_v1') || 'null');
        if (Array.isArray(parsed)) current = parsed;
      } catch {}

      const verified = BALI_TRIP_DATA.itinerary;
      const byDay = new Map(verified.map(day => [Number(day.dayNum), day]));

      // Se una precedente migrazione ha duplicato/sovrascritto i giorni, ricostruiamo
      // l'itinerario sui 15 dayNum canonici, preservando eventuali campi custom per giorno.
      const currentByDay = new Map();
      current.forEach(day => {
        const num = Number(day?.dayNum);
        if (Number.isFinite(num) && num >= 1 && num <= 15 && !currentByDay.has(num)) currentByDay.set(num, day);
      });

      const merged = verified
        .map(base => ({ ...(currentByDay.get(Number(base.dayNum)) || {}), ...base }))
        .sort((a, b) => Number(a.dayNum) - Number(b.dayNum));

      localStorage.setItem('bali_itinerary_v1', JSON.stringify(merged));
      localStorage.setItem('bali_email_itinerary_hotfix_version', VERSION);

      if (typeof window.renderItineraryDaySelector === 'function') window.renderItineraryDaySelector();
      if (typeof window.renderItineraryDay === 'function') window.renderItineraryDay(typeof currentDayNum === 'number' ? currentDayNum : 1);
      if (typeof window.renderDashboard === 'function') window.renderDashboard();
      if (typeof window.renderTravelMode === 'function') window.renderTravelMode();
      if (typeof scheduleBackendSync === 'function') scheduleBackendSync();
      if (typeof window.scheduleCloudSync === 'function') window.scheduleCloudSync();
    } catch (error) {
      console.error('Mail itinerary hotfix failed', error);
    }
  }

  window.addEventListener('load', () => window.setTimeout(apply, 2800), { once: true });
})();
