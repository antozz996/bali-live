# Bali Live

Travel control center full-stack per Bali 2026: itinerario, prenotazioni, import locale di conferme scelte, escursioni collegate ai giorni, cambio e meteo live, budget, documenti cifrati, sincronizzazione cloud e PWA offline.

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
- `GET /api/exchange`: cambio EUR/IDR aggiornato tramite Frankfurter, con cache di 6 ore.
- `GET /api/config`: sole configurazioni pubbliche e disponibilità delle funzioni.
- `GET /api/state`: legge lo stato; in locale usa `BALI_SYNC_TOKEN`, su Vercel usa il token Google verificato.
- `PUT /api/state`: salva lo stato; stessa autenticazione, sole chiavi ammesse e payload massimo 1 MB.

Lo stato persistente e la cache meteo sono salvati in `.data/`, esclusa da Git. Il server pubblica solo i file frontend esplicitamente autorizzati: `.git`, `.data`, sorgenti backend e file di configurazione non sono esposti.

## Dati e privacy

Non inserire codici di prenotazione reali in una repository pubblica. I backup possono contenere dati di viaggio sensibili: conservarli in un luogo protetto. I documenti caricati nel vault vengono cifrati nel browser con AES-256-GCM; la passphrase non viene salvata e, se persa, i documenti non sono recuperabili. I contatti driver iniziali sono volutamente vuoti e devono essere configurati con i recapiti verificati.

## Account Google e importazione email

Google Identity Services usa un token temporaneo conservato soltanto in memoria e gli scope di identità `openid email profile`. L’account serve a identificare l’utente per la sincronizzazione cloud: l’app non richiede permessi Gmail e non può accedere alla casella.

Le conferme vengono importate scegliendo un singolo file `.eml` scaricato dall’utente o incollando il testo del messaggio. Parsing e anteprima avvengono interamente nel browser; nulla viene aggiunto finché l’utente non preme **Importa**. Il contenuto integrale dell’email non viene inviato o conservato.

1. Crea un progetto Google Cloud.
2. Configura la schermata di consenso OAuth e aggiungi gli utenti di test.
3. Crea un OAuth Client ID di tipo **Applicazione web**.
4. Aggiungi `https://bali-live.vercel.app` alle origini JavaScript autorizzate; per sviluppo aggiungi anche l’origine locale usata.
5. Imposta `GOOGLE_CLIENT_ID` nelle variabili Vercel per Production e Preview.

Non occorre abilitare Gmail API. La pagina `privacy.html` descrive il trattamento applicato dall’app.

## Sincronizzazione cloud

Le Vercel Functions usano PostgreSQL quando è presente `DATABASE_URL` oppure `POSTGRES_URL`. È possibile collegare Neon, Supabase o un altro PostgreSQL dal Vercel Marketplace. La tabella `bali_user_state` viene creata automaticamente al primo utilizzo e ogni record è separato tramite l’identificatore verificato dell’account Google.

Senza `DATABASE_URL`, l’app resta completamente utilizzabile in locale e conserva i dati nel browser. Il vault documenti resta sempre locale e non viene sincronizzato.

## Deployment

`server.js` è adatto a un VPS, container o servizio Node con disco persistente. Su Vercel, i file nella cartella `api/` vengono pubblicati come Functions Node.js; le cache meteo/cambio usano `/tmp` e non richiedono chiavi API.

Il frontend continua a salvare i dati sul dispositivo, supportare backup/ripristino JSON e avviarsi offline. Font e icone essenziali sono locali; Google Identity Services viene caricato solo quando l’utente sceglie di collegare l’account per il cloud.

## Verifica

```bash
npm run check
npm test
```
