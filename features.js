(function setupModernFeatures(global) {
  'use strict';

  const document = global.document;
  const BOOKINGS_KEY = 'bali_bookings_v1';
  const EXCHANGE_KEY = 'bali_exchange_rate_v1';
  const REMINDER_KEY = 'bali_reminder_state';
  const GOOGLE_IDENTITY_SCOPE = 'openid email profile';
  let config = { googleClientId: '', googleLoginEnabled: false, cloudSyncEnabled: false };
  let googleTokenClient = null;
  let googleAccessToken = '';
  let googleProfile = null;
  let gmailCandidates = [];
  let cloudTimer = null;
  let vaultPassphrase = '';

  const esc = value => String(value ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

  function safeUrl(value) {
    try { const url = new URL(String(value || ''), global.location?.origin || 'https://example.invalid'); return ['http:', 'https:'].includes(url.protocol) ? url.href : ''; }
    catch { return ''; }
  }

  function italianToIso(value) {
    const match = String(value || '').match(/(\d{1,2})[\/.\-](\d{1,2})[\/.\-](20\d{2})/);
    if (!match) return '';
    return `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
  }

  function isoFromText(text) {
    const value=String(text||'');
    const iso = value.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/);
    if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
    const numeric=italianToIso(value);if(numeric)return numeric;
    const months={jan:1,january:1,gen:1,gennaio:1,feb:2,february:2,febbraio:2,mar:3,march:3,marzo:3,apr:4,april:4,aprile:4,may:5,maggio:5,jun:6,june:6,giu:6,giugno:6,jul:7,july:7,lug:7,luglio:7,aug:8,august:8,ago:8,agosto:8,sep:9,september:9,set:9,settembre:9,oct:10,october:10,ott:10,ottobre:10,nov:11,november:11,novembre:11,dec:12,december:12,dic:12,dicembre:12};
    const dayFirst=value.match(/\b(\d{1,2})\s+([A-Za-zÀ-ÿ]+)\s+(20\d{2})\b/i);const monthFirst=value.match(/\b([A-Za-zÀ-ÿ]+)\s+(\d{1,2}),?\s+(20\d{2})\b/i);const match=dayFirst||monthFirst;
    if(!match)return'';const monthName=(dayFirst?match[2]:match[1]).toLowerCase().replace(/\.$/,'');const month=months[monthName]||months[monthName.slice(0,3)];const day=Number(dayFirst?match[1]:match[2]);const year=dayFirst?match[3]:match[3];return month&&day<=31?`${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`:'';
  }

  function parseAmount(value) {
    const input=String(value||'').replace(/\s/g,'');const comma=input.lastIndexOf(','),dot=input.lastIndexOf('.');let normalized=input;
    if(comma>dot)normalized=input.replace(/\./g,'').replace(',','.');else if(dot>comma)normalized=input.replace(/,/g,'');else normalized=input.replace(',','.');
    return Number.parseFloat(normalized.replace(/[^0-9.-]/g,''));
  }

  function localIsoDate(date=new Date()) { return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`; }

  function extractBookingFromText(text, metadata = {}) {
    const value = String(text || '').replace(/\s+/g, ' ').trim();
    const lower = `${metadata.subject || ''} ${metadata.from || ''} ${value}`.toLowerCase();
    const type = /emirates|flight|volo|airline|aereo/.test(lower) ? 'Volo'
      : /booking\.com|hotel|villa|resort|homestay|check-in/.test(lower) ? 'Hotel'
      : /getyourguide|escursione|tour|activity|voucher|snorkel|rafting|atv/.test(lower) ? 'Escursione'
      : /boat|traghetto|transfer|driver|taxi/.test(lower) ? 'Trasporto' : 'Altro';
    const codeMatch = value.match(/(?:conferma|confirmation|booking|reservation|pnr|codice|reference|numero)\s*(?:(?:number|reference|code|codice|pnr|no\.?|n\.?)\s*)?(?:[:#-]\s*)?((?=[A-Z0-9-]*\d)[A-Z0-9-]{5,16})/i);
    const amountMatch = value.match(/(?:EUR|€)\s*([\d.,]+)/i) || value.match(/([\d.,]+)\s*(?:EUR|€)/i);
    const amount = amountMatch ? parseAmount(amountMatch[1]) : 0;
    const title = String(metadata.subject || '').trim() || `${type} importata da email`;
    return {
      id: `BOOK-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type, title: title.slice(0, 160), provider: String(metadata.from || '').slice(0, 160),
      startDate: isoFromText(value), endDate: '', code: codeMatch?.[1] || '',
      amountEUR: Number.isFinite(amount) ? amount : 0, status: 'Confermata', paid: false,
      cancellationDeadline: '', location: '', link: '', notes: 'Importata da un’email scelta; verificare i dettagli.',
      source: String(metadata.source || 'Email selezionata'), gmailMessageId: String(metadata.messageId || '')
    };
  }

  function decodeBytes(bytes, charset='utf-8') {
    try { return new TextDecoder(charset || 'utf-8').decode(bytes); }
    catch { return new TextDecoder().decode(bytes); }
  }

  function base64Bytes(value) {
    const normalized=String(value||'').replace(/-/g,'+').replace(/_/g,'/').replace(/\s/g,'');
    if(!normalized)return new Uint8Array();
    if(typeof Buffer!=='undefined')return Uint8Array.from(Buffer.from(normalized,'base64'));
    return Uint8Array.from(atob(normalized),character=>character.charCodeAt(0));
  }

  function quotedPrintableBytes(value, mimeWord=false) {
    const input=String(value||'').replace(/=\r?\n/g,'');
    const bytes=[];
    for(let index=0;index<input.length;index++){
      if(input[index]==='='&&/^[0-9a-f]{2}$/i.test(input.slice(index+1,index+3))){bytes.push(Number.parseInt(input.slice(index+1,index+3),16));index+=2;continue;}
      const character=mimeWord&&input[index]==='_'?' ':input[index];
      if(character.charCodeAt(0)<=255)bytes.push(character.charCodeAt(0));
      else bytes.push(...new TextEncoder().encode(character));
    }
    return Uint8Array.from(bytes);
  }

  function decodeMimeWords(value) {
    return String(value||'').replace(/=\?([^?]+)\?([bq])\?([^?]*)\?=/gi,(_match,charset,encoding,data)=>{
      try {return decodeBytes(encoding.toLowerCase()==='b'?base64Bytes(data):quotedPrintableBytes(data,true),charset);}
      catch{return data;}
    });
  }

  function splitMessage(raw) {
    const value=String(raw||'');const separator=/\r?\n\r?\n/.exec(value);
    return separator?{headerBlock:value.slice(0,separator.index),body:value.slice(separator.index+separator[0].length)}:{headerBlock:'',body:value};
  }

  function parseMailHeaders(headerBlock) {
    const headers={};const unfolded=String(headerBlock||'').replace(/\r?\n[ \t]+/g,' ');
    unfolded.split(/\r?\n/).forEach(line=>{const separator=line.indexOf(':');if(separator<1)return;const name=line.slice(0,separator).trim().toLowerCase();const value=line.slice(separator+1).trim();headers[name]=headers[name]?`${headers[name]}, ${value}`:value;});
    return headers;
  }

  function headerParameter(value,name) {
    const match=String(value||'').match(new RegExp(`(?:^|;)\\s*${name}\\s*=\\s*(?:"([^"]+)"|([^;\\s]+))`,'i'));
    return match?.[1]||match?.[2]||'';
  }

  function decodeTransferBody(body,encoding,charset) {
    try {
      if(/base64/i.test(encoding||''))return decodeBytes(base64Bytes(body),charset);
      if(/quoted-printable/i.test(encoding||''))return decodeBytes(quotedPrintableBytes(body),charset);
    } catch {}
    return String(body||'');
  }

  function htmlToText(html) {
    if(typeof DOMParser!=='undefined')return new DOMParser().parseFromString(String(html||''),'text/html').body?.textContent||'';
    return String(html||'').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<br\s*\/?>/gi,'\n').replace(/<\/p>/gi,'\n').replace(/<[^>]+>/g,' ').replace(/&nbsp;/gi,' ').replace(/&amp;/gi,'&').replace(/&lt;/gi,'<').replace(/&gt;/gi,'>').replace(/&#(\d+);/g,(_match,code)=>String.fromCodePoint(Number(code)));
  }

  function mimeText(headers,body) {
    const contentType=headers['content-type']||'text/plain; charset=utf-8';
    if(/^multipart\//i.test(contentType)){
      const boundary=headerParameter(contentType,'boundary');if(!boundary)return'';
      const marker=`--${boundary}`;let plain='',html='';
      String(body||'').replace(/\r\n/g,'\n').split(marker).slice(1).forEach(part=>{
        if(/^--/.test(part.trimStart()))return;
        const split=splitMessage(part.replace(/^\n/,'').replace(/\n$/,''));const partHeaders=parseMailHeaders(split.headerBlock);
        if(/attachment/i.test(partHeaders['content-disposition']||''))return;
        const text=mimeText(partHeaders,split.body);if(!text)return;
        if(/^text\/html/i.test(partHeaders['content-type']||''))html+=`\n${text}`;else plain+=`\n${text}`;
      });
      return (plain||html).trim();
    }
    if(/^message\/rfc822/i.test(contentType)){const nested=parseEml(body);return nested.text;}
    const charset=headerParameter(contentType,'charset')||'utf-8';const decoded=decodeTransferBody(body,headers['content-transfer-encoding'],charset);
    return /^text\/html/i.test(contentType)?htmlToText(decoded):/^text\//i.test(contentType)?decoded:'';
  }

  function isTravelConfirmation(text,metadata={},booking=extractBookingFromText(text,metadata)) {
    const value=`${metadata.subject||''} ${metadata.from||''} ${text||''}`.toLowerCase();
    const confirmation=/(?:reservation|prenotazione|conferma|confirmation|confirmed|voucher|ticket|biglietto|itinerary|pnr|check[ -]?in)/i.test(value);
    const detail=Boolean(booking.code||booking.startDate||booking.amountEUR>0);
    return booking.type!=='Altro'&&confirmation&&detail;
  }

  function parseEml(raw) {
    const split=splitMessage(String(raw||'').slice(0,2*1024*1024));const headers=parseMailHeaders(split.headerBlock);
    const metadata={subject:decodeMimeWords(headers.subject||''),from:decodeMimeWords(headers.from||''),messageId:String(headers['message-id']||'').replace(/[<>]/g,''),source:'Email selezionata'};
    const text=mimeText(headers,split.body).replace(/\s+/g,' ').trim().slice(0,100000);
    const booking=extractBookingFromText(text,metadata);
    return {headers,metadata,text,booking,recognized:isTravelConfirmation(text,metadata,booking)};
  }

  function defaultBookings() {
    const result = [
      { id:'BOOK-FLIGHT-OUT',type:'Volo',title:'Emirates FCO → DXB → DPS',provider:'Emirates',startDate:'2026-09-15',endDate:'2026-09-16',code:'',amountEUR:1929.36,status:'Confermata',paid:true,cancellationDeadline:'',location:'Roma FCO → Bali DPS',link:'https://www.emirates.com/it/italian/manage-booking/',notes:'EK096 + EK398 · 2 viaggiatori',source:'Dati viaggio' },
      { id:'BOOK-FLIGHT-BACK',type:'Volo',title:'Emirates DPS → DXB → FCO',provider:'Emirates',startDate:'2026-09-29',endDate:'2026-09-30',code:'',amountEUR:0,status:'Confermata',paid:true,cancellationDeadline:'',location:'Bali DPS → Roma FCO',link:'https://www.emirates.com/it/italian/manage-booking/',notes:'Volo di rientro',source:'Dati viaggio' }
    ];
    if (typeof getHotels === 'function') getHotels().forEach(hotel => result.push({
      id:`BOOK-${hotel.id}`,type:'Hotel',title:hotel.name,provider:hotel.name,startDate:italianToIso(hotel.checkIn),endDate:italianToIso(hotel.checkOut),
      code:hotel.bookingCode||'',amountEUR:Number(hotel.totalPriceEUR)||0,status:hotel.status||'Prenotata',paid:false,cancellationDeadline:'',location:hotel.area||'',link:hotel.link||'',notes:hotel.notes||'',source:'Alloggi'
    }));
    if (typeof getExcursions === 'function' && typeof getItinerary === 'function') getExcursions().forEach(item => {
      const day=getItinerary().find(candidate=>Number(candidate.dayNum)===Number(item.dayNum));
      result.push({id:`BOOK-${item.id}`,type:'Escursione',title:item.name,provider:'',startDate:italianToIso(day?.date),endDate:'',code:'',amountEUR:Number(item.priceEUR)||0,status:item.status||'Da valutare',paid:false,cancellationDeadline:'',location:item.region||day?.location||'',link:item.link||'',notes:item.notes||'',source:'Escursioni'});
    });
    return result;
  }

  function normalizeBooking(item, index) {
    const id=String(item?.id||'');
    return {
      id:/^[A-Za-z0-9_-]{1,100}$/.test(id)?id:`BOOK-${index+1}`,type:String(item?.type||'Altro'),title:String(item?.title||'Prenotazione'),
      provider:String(item?.provider||''),startDate:String(item?.startDate||''),endDate:String(item?.endDate||''),code:String(item?.code||''),
      amountEUR:Math.max(0,Number(item?.amountEUR)||0),status:String(item?.status||'Da confermare'),paid:Boolean(item?.paid),
      cancellationDeadline:String(item?.cancellationDeadline||''),location:String(item?.location||''),link:safeUrl(item?.link),notes:String(item?.notes||''),
      source:String(item?.source||'Manuale'),gmailMessageId:String(item?.gmailMessageId||'')
    };
  }

  function getBookings() {
    try {
      const stored=JSON.parse(localStorage.getItem(BOOKINGS_KEY)||'null');
      if(Array.isArray(stored))return stored.map(normalizeBooking);
    } catch {}
    const seed=defaultBookings().map(normalizeBooking);
    localStorage.setItem(BOOKINGS_KEY,JSON.stringify(seed));
    return seed;
  }
  global.getBookings=getBookings;

  function saveBookings(items) {
    if (typeof saveJSON === 'function') saveJSON(BOOKINGS_KEY, items.map(normalizeBooking));
    else localStorage.setItem(BOOKINGS_KEY, JSON.stringify(items.map(normalizeBooking)));
  }

  function bookingStatusClass(status) {
    return /confermata|prenotata|completata/i.test(status)?'badge-pagato':/annullata/i.test(status)?'badge-annullato':'badge-daprenotare';
  }

  function renderBookings() {
    const container=document?.getElementById('bookings-content');
    if(!container)return;
    const bookings=getBookings().sort((a,b)=>(a.startDate||'9999').localeCompare(b.startDate||'9999'));
    const total=bookings.reduce((sum,item)=>sum+item.amountEUR,0);
    const confirmed=bookings.filter(item=>/confermata|prenotata|completata/i.test(item.status)).length;
    container.innerHTML=`
      <div class="metrics-grid booking-metrics"><div class="metric-card"><div class="metric-label">Totali</div><div class="metric-value">${bookings.length}</div></div><div class="metric-card"><div class="metric-label">Confermate</div><div class="metric-value">${confirmed}</div></div><div class="metric-card"><div class="metric-label">Valore</div><div class="metric-value">€${total.toFixed(0)}</div></div></div>
      <div class="feature-actions"><button class="btn-primary" onclick="bookingStartAdd()">+ Prenotazione</button><button class="btn-cancel" onclick="openGmailModal()">Importa email scelta</button></div>
      <div id="booking-form" class="glass-card" style="display:none;"></div>
      <div class="booking-list">${bookings.map(bookingCard).join('')}</div>`;
    renderVault();
  }
  global.renderBookings=renderBookings;

  function bookingCard(item) {
    const url=safeUrl(item.link);
    return `<article class="glass-card booking-card" id="booking-${item.id}">
      <div class="booking-card-head"><div><span class="booking-type">${esc(item.type)}</span><h3>${esc(item.title)}</h3></div><span class="badge ${bookingStatusClass(item.status)}">${esc(item.status)}</span></div>
      <div class="booking-grid"><span>📅 ${esc(item.startDate||'Data da inserire')}${item.endDate?` → ${esc(item.endDate)}`:''}</span><span>📍 ${esc(item.location||'Luogo da inserire')}</span><span>🏢 ${esc(item.provider||'Fornitore da inserire')}</span><span>💶 €${item.amountEUR.toFixed(2)} ${item.paid?'· Pagata':''}</span></div>
      ${item.code?`<div class="booking-code">Codice: <strong>${esc(item.code)}</strong></div>`:''}
      ${item.cancellationDeadline?`<div class="status-note">Cancellazione entro ${esc(item.cancellationDeadline)}</div>`:''}
      ${item.notes?`<p class="booking-notes">${esc(item.notes)}</p>`:''}
      <div class="booking-actions">${url?`<a class="link-btn" href="${esc(url)}" target="_blank" rel="noopener noreferrer">Apri ↗</a>`:'<span></span>'}<div><button class="row-btn row-btn-edit" onclick="bookingStartEdit('${item.id}')" aria-label="Modifica">✎</button><button class="row-btn row-btn-delete" onclick="bookingDelete('${item.id}')" aria-label="Elimina">×</button></div></div>
    </article>`;
  }

  function bookingForm(item={}) {
    const editing=Boolean(item.id);
    return `<h3>${editing?'Modifica':'Nuova'} prenotazione</h3>
      <input id="book-title" class="search-input" value="${esc(item.title||'')}" placeholder="Titolo" required>
      <div class="form-row"><select id="book-type" class="search-input">${['Volo','Hotel','Escursione','Trasporto','Ristorante','Altro'].map(type=>`<option ${type===item.type?'selected':''}>${type}</option>`).join('')}</select><input id="book-provider" class="search-input" value="${esc(item.provider||'')}" placeholder="Fornitore"></div>
      <div class="form-row"><input id="book-start" type="date" class="search-input" value="${esc(item.startDate||'')}"><input id="book-end" type="date" class="search-input" value="${esc(item.endDate||'')}"></div>
      <div class="form-row"><input id="book-code" class="search-input" value="${esc(item.code||'')}" placeholder="Codice"><input id="book-amount" type="number" min="0" step="0.01" class="search-input" value="${Number(item.amountEUR)||0}" placeholder="Importo €"></div>
      <div class="form-row"><select id="book-status" class="search-input">${['Da valutare','Da confermare','Confermata','Prenotata','Completata','Annullata'].map(status=>`<option ${status===item.status?'selected':''}>${status}</option>`).join('')}</select><input id="book-cancel" type="date" class="search-input" value="${esc(item.cancellationDeadline||'')}" aria-label="Cancellazione entro"></div>
      <input id="book-location" class="search-input" value="${esc(item.location||'')}" placeholder="Luogo"><input id="book-link" class="search-input" value="${esc(item.link||'')}" placeholder="Link https://..."><textarea id="book-notes" class="search-input" placeholder="Note">${esc(item.notes||'')}</textarea>
      <label class="check-label"><input id="book-paid" type="checkbox" ${item.paid?'checked':''}> Pagata</label>
      <div class="feature-actions"><button class="btn-primary" onclick="bookingSave('${esc(item.id||'')}')">Salva</button><button class="btn-cancel" onclick="renderBookings()">Annulla</button></div>`;
  }

  global.bookingStartAdd=()=>{const form=document.getElementById('booking-form');if(form){form.style.display='block';form.innerHTML=bookingForm();form.scrollIntoView({behavior:'smooth'});}};
  global.bookingStartEdit=id=>{const item=getBookings().find(x=>x.id===id),form=document.getElementById('booking-form');if(item&&form){form.style.display='block';form.innerHTML=bookingForm(item);form.scrollIntoView({behavior:'smooth'});}};
  global.bookingSave=id=>{
    const title=document.getElementById('book-title')?.value.trim();if(!title){alert('Inserisci un titolo.');return;}
    const items=getBookings(),index=items.findIndex(x=>x.id===id);
    const item=normalizeBooking({id:id||`BOOK-${Date.now()}`,title,type:document.getElementById('book-type')?.value,provider:document.getElementById('book-provider')?.value,startDate:document.getElementById('book-start')?.value,endDate:document.getElementById('book-end')?.value,code:document.getElementById('book-code')?.value,amountEUR:document.getElementById('book-amount')?.value,status:document.getElementById('book-status')?.value,paid:document.getElementById('book-paid')?.checked,cancellationDeadline:document.getElementById('book-cancel')?.value,location:document.getElementById('book-location')?.value,link:document.getElementById('book-link')?.value,notes:document.getElementById('book-notes')?.value,source:index>=0?items[index].source:'Manuale'},0);
    if(index>=0)items[index]=item;else items.push(item);saveBookings(items);renderBookings();renderTravelMode();renderReminders();
  };
  global.bookingDelete=id=>{if(!confirm('Eliminare questa prenotazione?'))return;saveBookings(getBookings().filter(x=>x.id!==id));renderBookings();renderReminders();};

  async function loadConfig() {
    try { const response=await fetch('/api/config',{headers:{Accept:'application/json'}});if(response.ok)config=await response.json(); }
    catch {}
    updateAccountUI();
    return config;
  }

  function setGmailStatus(message,tone='muted') {
    const element=document?.getElementById('gmail-status');if(!element)return;element.textContent=message;element.dataset.tone=tone;
  }

  function loadGoogleScript() {
    if(global.google?.accounts?.oauth2)return Promise.resolve();
    return new Promise((resolve,reject)=>{
      const existing=document.querySelector('script[data-google-identity]');
      if(existing){existing.addEventListener('load',resolve,{once:true});existing.addEventListener('error',reject,{once:true});return;}
      const script=document.createElement('script');script.src='https://accounts.google.com/gsi/client';script.async=true;script.defer=true;script.dataset.googleIdentity='true';script.onload=resolve;script.onerror=()=>reject(new Error('Impossibile caricare Google Identity Services'));document.head.appendChild(script);
    });
  }

  global.connectGoogle=async function() {
    if(!config.googleClientId)await loadConfig();
    if(!config.googleClientId){setGmailStatus('Configura GOOGLE_CLIENT_ID su Vercel per attivare il login.','error');return;}
    try {
      await loadGoogleScript();
      googleTokenClient=googleTokenClient||global.google.accounts.oauth2.initTokenClient({client_id:config.googleClientId,scope:GOOGLE_IDENTITY_SCOPE,include_granted_scopes:false,callback:handleGoogleToken,error_callback:()=>setGmailStatus('Login Google annullato.','error')});
      googleTokenClient.requestAccessToken({prompt:googleAccessToken?'':'select_account'});
    } catch(error){setGmailStatus(error.message,'error');}
  };
  global.connectGmail=global.connectGoogle;

  async function handleGoogleToken(response) {
    if(response.error||!response.access_token){setGmailStatus(response.error_description||'Accesso Google non riuscito.','error');return;}
    if(String(response.scope||'').split(/\s+/).some(scope=>scope.includes('/auth/gmail'))){
      global.google?.accounts?.oauth2?.revoke(response.access_token,()=>{});setGmailStatus('Rilevato un vecchio permesso Gmail: è stato rifiutato. Revocalo da “Gestisci accessi Google” e riprova.','error');return;
    }
    googleAccessToken=response.access_token;
    try {
      const profileResponse=await fetch('https://www.googleapis.com/oauth2/v3/userinfo',{headers:{Authorization:`Bearer ${googleAccessToken}`}});
      if(!profileResponse.ok)throw new Error('Profilo Google non disponibile');
      googleProfile=await profileResponse.json();setGmailStatus(`Connesso: ${googleProfile.email}`,'ok');updateAccountUI();await inspectCloudState();
    } catch(error){setGmailStatus(error.message,'error');}
  }

  global.disconnectGoogle=function() {
    if(googleAccessToken&&global.google?.accounts?.oauth2)global.google.accounts.oauth2.revoke(googleAccessToken,()=>{});
    googleAccessToken='';googleProfile=null;googleTokenClient=null;updateAccountUI();setGmailStatus('Account Google disconnesso.');
  };
  global.disconnectGmail=global.disconnectGoogle;

  function prepareCandidate(text,metadata={}) {
    const booking=extractBookingFromText(text,{...metadata,source:metadata.source||'Testo incollato'});
    if(!isTravelConfirmation(text,metadata,booking)){gmailCandidates=[];renderGmailCandidates();return false;}
    gmailCandidates=[booking];renderGmailCandidates();return true;
  }

  global.chooseConfirmationEmail=()=>document?.getElementById('confirmation-file-input')?.click();
  global.handleConfirmationFile=async function(event) {
    const input=event?.target;const file=input?.files?.[0];if(!file)return;
    gmailCandidates=[];renderGmailCandidates();
    if(file.size>2*1024*1024){setGmailStatus('Il file supera 2 MB: scegli solo il messaggio .eml, senza allegati pesanti.','error');input.value='';return;}
    setGmailStatus(`Analisi locale di ${file.name}…`);
    try {
      const parsed=parseEml(await file.text());
      if(!parsed.recognized){setGmailStatus('Il messaggio scelto non sembra una conferma di viaggio. Nessun dato è stato modificato.','error');input.value='';return;}
      gmailCandidates=[parsed.booking];renderGmailCandidates();setGmailStatus('Conferma riconosciuta. Controlla l’anteprima e premi Importa.','ok');
    } catch {setGmailStatus('Impossibile leggere questo file .eml. Nessun dato è stato modificato.','error');}
    input.value='';
  };

  global.preparePastedConfirmation=function(text) {
    const recognized=prepareCandidate(text,{subject:'Conferma incollata',from:'Importazione manuale',source:'Testo incollato'});
    setGmailStatus(recognized?'Conferma riconosciuta. Controlla l’anteprima e premi Importa.':'Il testo non sembra una conferma di viaggio. Nessun dato è stato modificato.',recognized?'ok':'error');
    return recognized;
  };

  function renderGmailCandidates() {
    const container=document?.getElementById('gmail-results');if(!container)return;
    container.innerHTML=gmailCandidates.length?gmailCandidates.map((item,index)=>`<div class="gmail-result"><div><strong>${esc(item.title)}</strong><span>${esc(item.type)} · ${esc(item.provider)}</span></div><button class="link-btn" onclick="importGmailCandidate(${index})">Importa</button></div>`).join(''):'';
  }

  global.importGmailCandidate=index=>{
    const candidate=gmailCandidates[index];if(!candidate)return;
    const items=getBookings();if(candidate.gmailMessageId&&items.some(item=>item.gmailMessageId===candidate.gmailMessageId)){setGmailStatus('Questa email è già stata importata.','error');return;}
    items.push(candidate);saveBookings(items);renderBookings();renderReminders();setGmailStatus(`Importata: ${candidate.title}`,'ok');
    gmailCandidates=[];renderGmailCandidates();
  };

  function updateAccountUI() {
    const email=googleProfile?.email||'';
    document?.querySelectorAll('[data-google-account]').forEach(element=>{element.textContent=email||'Nessun account connesso';});
    const connect=document?.getElementById('gmail-connect-btn'),disconnect=document?.getElementById('gmail-disconnect-btn');
    if(connect)connect.style.display=email?'none':'';if(disconnect)disconnect.style.display=email?'':'none';
    const cloud=document?.getElementById('cloud-account-status');
    if(cloud)cloud.textContent=email?(config.cloudSyncEnabled?`Cloud pronto per ${email}`:`${email} connesso · database cloud da configurare`):'Accedi con Google per la sincronizzazione cloud.';
  }

  function collectCloudState() {
    const state={};
    (global.BALI_SYNC_KEYS||[]).forEach(key=>{try{const raw=localStorage.getItem(key);if(raw!==null)state[key]=JSON.parse(raw);}catch{}});
    return state;
  }

  async function cloudRequest(method,state) {
    if(!googleAccessToken)throw new Error('Accedi con Google');
    const response=await fetch('/api/state',{method,headers:{Authorization:`Bearer ${googleAccessToken}`,'Content-Type':'application/json',Accept:'application/json'},body:method==='PUT'?JSON.stringify({state}):undefined});
    const payload=await response.json().catch(()=>({}));if(!response.ok)throw new Error(payload.error||`Cloud ${response.status}`);return payload;
  }

  async function inspectCloudState() {
    if(!config.cloudSyncEnabled)return;
    try {const payload=await cloudRequest('GET');const hasRemote=Object.keys(payload.state||{}).length>0;const status=document.getElementById('cloud-account-status');if(status)status.textContent=hasRemote?`Cloud disponibile · aggiornato ${new Date(payload.updatedAt).toLocaleString('it-IT')}`:'Cloud vuoto: puoi caricare i dati del dispositivo.';}
    catch(error){const status=document.getElementById('cloud-account-status');if(status)status.textContent=error.message;}
  }

  global.cloudPush=async function() {try{const payload=await cloudRequest('PUT',collectCloudState());localStorage.setItem('bali_last_cloud_sync',payload.updatedAt||new Date().toISOString());updateSyncStatus?.('Dati salvati nel cloud Google/Postgres.','ok');updateAccountUI();}catch(error){updateSyncStatus?.(error.message,'error');}};
  global.cloudPull=async function() {try{const payload=await cloudRequest('GET');if(!Object.keys(payload.state||{}).length)throw new Error('Nessun dato nel cloud');if(!confirm('Sostituire i dati di questo dispositivo con quelli cloud?'))return;Object.entries(payload.state).forEach(([key,value])=>{if((global.BALI_SYNC_KEYS||[]).includes(key))localStorage.setItem(key,JSON.stringify(value));});global.location.reload();}catch(error){updateSyncStatus?.(error.message,'error');}};
  global.scheduleCloudSync=function(){if(!googleAccessToken||!config.cloudSyncEnabled)return;clearTimeout(cloudTimer);cloudTimer=setTimeout(()=>global.cloudPush(),1200);};

  async function refreshExchange(force=false) {
    const label=document?.getElementById('exchange-rate-status');
    try {const response=await fetch(`/api/exchange${force?'?refresh=1':''}`);if(!response.ok)throw new Error('Cambio live non disponibile');const payload=await response.json();localStorage.setItem(EXCHANGE_KEY,JSON.stringify(payload));global.setActiveExchangeRate?.(payload.rate);if(label)label.textContent=`1 € = Rp ${Number(payload.rate).toLocaleString('it-IT')} · ${payload.asOf}${payload.stale?' · ultimo dato':''}`;const rateInput=document.getElementById('exp-rate');if(rateInput&&!rateInput.value)rateInput.placeholder=String(payload.rate);}
    catch(error){try{const cached=JSON.parse(localStorage.getItem(EXCHANGE_KEY)||'null');if(cached?.rate){global.setActiveExchangeRate?.(cached.rate);if(label)label.textContent=`1 € = Rp ${Number(cached.rate).toLocaleString('it-IT')} · ultimo dato disponibile`;return;}}catch{}if(label)label.textContent=error.message;}
  }
  global.refreshExchange=refreshExchange;

  function computeReminders() {
    const now=new Date(),today=new Date(now.getFullYear(),now.getMonth(),now.getDate());
    const daysUntil=value=>{if(!value)return null;const date=new Date(`${value}T12:00:00`);return Number.isNaN(date.getTime())?null:Math.ceil((date-today)/86400000);};
    const reminders=[];
    getBookings().forEach(item=>{
      const start=daysUntil(item.startDate),cancel=daysUntil(item.cancellationDeadline);
      if(cancel!==null&&cancel>=0&&cancel<=14)reminders.push({id:`cancel-${item.id}-${item.cancellationDeadline}`,level:cancel<=2?'urgent':'warn',title:`Cancellazione ${item.title}`,detail:cancel===0?'Scade oggi':`Scade tra ${cancel} giorni`});
      if(start!==null&&start>=0&&start<=60)reminders.push({id:`start-${item.id}-${item.startDate}`,level:start<=1?'urgent':start<=7?'warn':'info',title:item.title,detail:start===0?'Oggi':start===1?'Domani':`Tra ${start} giorni`});
    });
    if(typeof getExcursions==='function'&&typeof getItinerary==='function')getExcursions().filter(item=>!/prenotata|completata/i.test(item.status)).forEach(item=>{const day=getItinerary().find(d=>Number(d.dayNum)===Number(item.dayNum));const left=daysUntil(italianToIso(day?.date));if(left!==null&&left>=0&&left<=45)reminders.push({id:`tour-${item.id}`,level:left<=7?'urgent':'warn',title:`Prenota ${item.name}`,detail:`${day?.date||'Data da definire'} · ${item.status}`});});
    const priority={urgent:0,warn:1,info:2};
    return reminders.sort((a,b)=>priority[a.level]-priority[b.level]);
  }

  function renderReminders() {
    const reminders=computeReminders(),containers=[document?.getElementById('dashboard-reminders'),document?.getElementById('travel-reminders')].filter(Boolean);
    const markup=reminders.length?`<div class="reminder-head"><strong>Promemoria</strong><button class="link-btn" onclick="enableNotifications()">Attiva notifiche</button></div>${reminders.slice(0,6).map(item=>`<div class="reminder-item ${item.level}"><span></span><div><strong>${esc(item.title)}</strong><small>${esc(item.detail)}</small></div></div>`).join('')}`:'<div class="status-note">Nessun promemoria urgente.</div>';
    containers.forEach(container=>container.innerHTML=markup);
  }
  global.renderReminders=renderReminders;

  global.enableNotifications=async function(){if(!('Notification'in global)){alert('Le notifiche non sono supportate.');return;}const permission=await Notification.requestPermission();if(permission!=='granted'){alert('Permesso notifiche non concesso.');return;}const sent=JSON.parse(localStorage.getItem(REMINDER_KEY)||'{}'),today=localIsoDate();for(const item of computeReminders().filter(x=>x.level==='urgent').slice(0,3)){if(sent[item.id]===today)continue;const registration=await navigator.serviceWorker?.ready;registration?.showNotification(`Bali Live · ${item.title}`,{body:item.detail,icon:'icons/icon.svg',tag:item.id});sent[item.id]=today;}localStorage.setItem(REMINDER_KEY,JSON.stringify(sent));renderReminders();};

  function renderTravelMode() {
    const container=document?.getElementById('travel-content');if(!container)return;
    const todayIso=localIsoDate();const days=typeof getItinerary==='function'?getItinerary():[];
    const day=days.find(item=>italianToIso(item.date)===todayIso)||days.find(item=>italianToIso(item.date)>=todayIso)||days.at(-1);
    if(!day){container.innerHTML='<div class="glass-card">Nessun giorno disponibile.</div>';return;}
    const bookings=getBookings().filter(item=>item.startDate===italianToIso(day.date));const excursions=typeof getExcursions==='function'?getExcursions().filter(item=>Number(item.dayNum)===Number(day.dayNum)):[];
    const weather=(()=>{try{return JSON.parse(localStorage.getItem('bali_last_weather')||'null');}catch{return null;}})();
    const weatherLocation=weather?.locations?.find(item=>String(day.location).toLowerCase().includes(String(item.name).toLowerCase()))||weather?.locations?.[0];
    container.innerHTML=`<div class="travel-hero"><span>Giorno ${day.dayNum} · ${esc(day.date)}</span><h2>${esc(day.location)}</h2><p>${esc(day.phase||'')}</p></div>
      ${weatherLocation?`<div class="glass-card travel-weather"><strong><span class="weather-symbol weather-${Number(weatherLocation.weatherCode)||0}" aria-hidden="true"></span>${esc(weatherLocation.name)} · ${Math.round(weatherLocation.temperatureC)}°C</strong><span>${esc(weatherLocation.description)} · percepiti ${Math.round(weatherLocation.apparentTemperatureC)}°</span></div>`:''}
      <div class="glass-card"><div class="timeline-slot"><div class="time-tag">Mattina</div><div class="time-title">${esc(day.morning||'–')}</div></div><div class="timeline-slot"><div class="time-tag">Pomeriggio</div><div class="time-title">${esc(day.afternoon||'–')}</div></div><div class="timeline-slot"><div class="time-tag">Sera</div><div class="time-title">${esc(day.evening||'–')}</div></div></div>
      <div class="travel-quick"><button class="btn-primary" onclick="openItineraryDay(${day.dayNum})">Itinerario completo</button><button class="btn-cancel" onclick="activateView('budget');document.getElementById('exp-desc')?.focus()">Spesa rapida</button></div>
      ${(bookings.length||excursions.length)?`<div class="glass-card"><h3>Prenotazioni di giornata</h3>${bookings.map(item=>`<button class="travel-link" onclick="activateView('bookings');document.getElementById('booking-${item.id}')?.scrollIntoView()">${esc(item.type)} · ${esc(item.title)}</button>`).join('')}${excursions.map(item=>`<button class="travel-link" onclick="openExcursion('${item.id}')">Escursione · ${esc(item.name)}</button>`).join('')}</div>`:''}`;
    renderReminders();
  }
  global.renderTravelMode=renderTravelMode;

  async function renderVault() {
    const container=document?.getElementById('vault-content');if(!container||!global.BaliVault)return;
    let files=[];try{files=await global.BaliVault.listFiles();}catch{}
    container.innerHTML=`<div class="vault-head"><div><strong>Documenti cifrati</strong><div class="status-note">AES‑256; passphrase mai salvata.</div></div><button class="link-btn" onclick="${vaultPassphrase?'lockVault()':'unlockVault()'}">${vaultPassphrase?'Blocca':'Sblocca'}</button></div>
      ${vaultPassphrase?`<div class="feature-actions"><button class="btn-cancel" onclick="document.getElementById('vault-file-input').click()">＋ Documento</button><input id="vault-file-input" type="file" hidden><select id="vault-booking" class="search-input"><option value="">Nessuna prenotazione</option>${getBookings().map(item=>`<option value="${item.id}">${esc(item.title)}</option>`).join('')}</select></div>`:''}
      <div>${files.length?files.map(file=>`<div class="vault-file"><div><strong>${esc(file.name)}</strong><small>${Math.ceil(file.size/1024)} KB · ${esc(getBookings().find(x=>x.id===file.bookingId)?.title||'Generale')}</small></div><div><button class="row-btn" onclick="downloadVaultFile('${file.id}')">↓</button><button class="row-btn row-btn-delete" onclick="deleteVaultFile('${file.id}')">×</button></div></div>`).join(''):'<div class="status-note">Nessun documento nel vault.</div>'}</div>`;
    document.getElementById('vault-file-input')?.addEventListener('change',uploadVaultFile,{once:true});
  }

  global.unlockVault=()=>{const value=prompt('Passphrase del vault (minimo 8 caratteri). Non viene salvata:');if(value===null)return;if(value.length<8){alert('Servono almeno 8 caratteri.');return;}vaultPassphrase=value;renderVault();};
  global.lockVault=()=>{vaultPassphrase='';renderVault();};
  async function uploadVaultFile(event){const file=event.target.files?.[0];if(!file||!vaultPassphrase)return;try{await global.BaliVault.storeFile(file,vaultPassphrase,document.getElementById('vault-booking')?.value||'');await renderVault();}catch(error){alert(error.message);}}
  global.downloadVaultFile=async id=>{if(!vaultPassphrase){global.unlockVault();return;}try{const result=await global.BaliVault.getFile(id,vaultPassphrase);const url=URL.createObjectURL(result.blob),link=document.createElement('a');link.href=url;link.download=result.metadata.name;document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),0);}catch(error){alert(error.message);}};
  global.deleteVaultFile=async id=>{if(!confirm('Eliminare definitivamente questo documento cifrato?'))return;await global.BaliVault.deleteFile(id);renderVault();};

  global.initModernFeatures=async function() {
    await loadConfig();
    try{const cached=JSON.parse(localStorage.getItem(EXCHANGE_KEY)||'null');if(cached?.rate)global.setActiveExchangeRate?.(cached.rate);}catch{}
    await refreshExchange();renderBookings();renderTravelMode();renderReminders();renderVault();updateAccountUI();
  };

  global.ModernFeatures={extractBookingFromText,isTravelConfirmation,parseEml,italianToIso,normalizeBooking,computeReminders};
  if(typeof module!=='undefined'&&module.exports)module.exports={extractBookingFromText,isTravelConfirmation,parseEml,italianToIso,normalizeBooking};
})(typeof window!=='undefined'?window:globalThis);
