# Bali Live

Travel control center full-stack per Bali 2026: itinerario, escursioni collegate ai giorni, budget, spese, checklist, meteo live e PWA offline.

## Avvio

Richiede Node.js 18 o superiore e non ha dipendenze npm esterne.

```bash
# Imposta la variabile nella shell oppure nel servizio di hosting.
BALI_SYNC_TOKEN="un-token-lungo-e-casuale" npm start
```

Apri `http://127.0.0.1:8765`. Il frontend funziona anche senza token; il token abilita soltanto la sincronizzazione protetta dello stato. Nell’app, vai in Utility → Configura Sync Server e inserisci lo stesso valore. Il token resta in `sessionStorage`, quindi non viene scritto nei backup o nel repository.

## API

- `GET /api/health`: stato del servizio.
- `GET /api/weather`: condizioni correnti e previsione giornaliera per Ubud, Gili Air e Uluwatu. Il backend usa Open-Meteo, cache di 10 minuti e ultimo dato valido come fallback.
- `GET /api/state`: legge lo stato; richiede `Authorization: Bearer <BALI_SYNC_TOKEN>`.
- `PUT /api/state`: salva lo stato in modo atomico; stessa autenticazione, payload massimo 1 MB.

Lo stato persistente e la cache meteo sono salvati in `.data/`, esclusa da Git. Il server pubblica solo i file frontend esplicitamente autorizzati: `.git`, `.data`, sorgenti backend e file di configurazione non sono esposti.

## Dati e privacy

Non inserire codici di prenotazione reali in una repository pubblica. I backup possono contenere dati di viaggio sensibili: conservarli in un luogo protetto. I contatti driver iniziali sono volutamente vuoti e devono essere configurati con i recapiti verificati.

## Deployment

`server.js` è adatto a un VPS, container o servizio Node con disco persistente. Un filesystem serverless effimero, come quello delle normali Functions, non è sufficiente per `/api/state`: in quel caso sostituire `StateStore` con Postgres/KV mantenendo lo stesso contratto API. Il meteo non richiede chiavi API.

## Verifica

```bash
npm run check
npm test
```
