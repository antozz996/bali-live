// Bali 2026 — curated restaurant plan (30/08/2026)
(function applyCuratedFoodPlan(){
  'use strict';
  if (typeof BALI_TRIP_DATA === 'undefined') return;
  const data=BALI_TRIP_DATA;
  const VERSION='V9-FOOD-2026-08-30-1';
  const item=(id,date,place,area,meal,style,price,link,priority,maps)=>({id,date,place,area,meal,style,price,link,priority,maps});

  // Curated shortlist: only restaurants that fit the actual route and timing.
  data.foodHighlights=[
    item('FOOD-UBUD-01','17/09','Kailasha Restaurant','Ubud','Pranzo','Pranzo panoramico coerente con la giornata tour','€20-40','https://puriganggaresort.com/dining/kailasha-restaurant/','','Kailasha+Restaurant+Ubud'),
    item('FOOD-UBUD-02','17/09','Rayjin Ubud','Ubud','Cena','Japanese / teppanyaki · cena vivace dopo il tour','€30-60','https://www.rayjinbali.com/','CONSIGLIATO ⭐','Rayjin+Ubud'),
    item('FOOD-UBUD-03','18/09','Kubu at Mandapa','Ubud','Cena · richiesta','Cena anniversario · Private Cocoon richiesto; prenotazione ancora da confermare','€70-110+ pp','https://kubuatmandapa.com/','IN ATTESA ⏳','Kubu+at+Mandapa+Ubud'),
    item('FOOD-UBUD-04','18/09','The Sayan House','Ubud','Cena · backup','Backup romantico con vista, solo se Kubu non viene confermato','€45-90','https://www.thesayanhouse.com/','BACKUP','The+Sayan+House+Ubud'),
    item('FOOD-UBUD-05','19/09','Hujan Locale','Ubud','Cena','Indonesiano contemporaneo · ultima cena a Ubud','€35-70','https://hujanlocale.com/','MUST BOOK 🔥','Hujan+Locale+Ubud'),

    item('FOOD-GILI-01','20/09','GILITIK! Street Food & More','Gili Air','Cena','Casual, street food internazionale · perfetto dopo transfer e check-in','€10-25','https://gilitik.com/','CONSIGLIATO ⭐','Gilitik+Gili+Air'),
    item('FOOD-GILI-02','21/09','Pachamama Organic Cafe','Gili Air','Pranzo','Healthy / brunch · giornata mare e bici','€10-25','','CONSIGLIATO','Pachamama+Gili+Air'),
    item('FOOD-GILI-03','21/09','Mowies Gili Air','Gili Air','Cena','Cena al tramonto sulla costa ovest','€15-35','https://www.mowiesgiliair.com/public/restaurant','TRAMONTO 🌅','Mowies+Gili+Air'),
    item('FOOD-GILI-04','22/09','Life Kitchen Dumpling | Sea View','Gili Air','Pranzo','Dumpling e noodles · ideale dopo lo snorkeling mattutino','€5-15','','CONSIGLIATO ⭐','Life+Kitchen+Dumpling+Gili+Air'),
    item('FOOD-GILI-05','22/09','BAHIA Restaurant & Beachbar','Gili Air','Cena','Beachbar, cena e cocktail · serata easy','€15-35','https://bahiagili.com/menu','CONSIGLIATO ⭐','Bahia+Gili+Air'),
    item('FOOD-GILI-06','23/09','AÇAÍ TIGER Gili Air','Gili Air','Colazione / snack','Açaí e pausa leggera · non usarlo come cena principale','€5-15','','SNACK','Acai+Tiger+Gili+Air'),
    item('FOOD-GILI-07','26/09','Papaya Restaurant & Beach Club','Gili Air','Cena','Ultimo tramonto · scegliere soprattutto per atmosfera e location','€20-45','https://www.papayagili.com/','TRAMONTO 🌅','Papaya+Gili+Air'),

    item('FOOD-SOUTH-01','27/09','Bawang Merah Beachfront Restaurant','Jimbaran','Cena','Seafood sulla spiaggia dopo rientro da Gili','€30-70','https://jimbaranbayrestaurant.com/','ESPERIENZA BALI','Bawang+Merah+Jimbaran'),
    item('FOOD-SOUTH-02','28/09','YUKI Uluwatu','Uluwatu','Pranzo','Japanese moderno · scelta principale prima di Uluwatu Temple/Kecak','€25-55','https://www.yuki-bali.com/uluwatu','CONSIGLIATO ⭐','Yuki+Uluwatu'),
    item('FOOD-SOUTH-03','28/09','Sushimi Uluwatu','Uluwatu','Pranzo · backup','Sushi casual e più rapido/economico se la giornata è stretta','€10-25','https://www.sushimibali.com/','BACKUP','Sushimi+Uluwatu+Bali')
  ];

  const patchDay=(dayNum,patch)=>{const d=data.itinerary?.find(x=>Number(x.dayNum)===Number(dayNum));if(d) Object.assign(d,patch);};
  patchDay(3,{lunch:'Kailasha Restaurant',dinner:'Rayjin Ubud',dinnerLink:'https://www.rayjinbali.com/',notes:'Pickup tour 08:00. Dopo il tour: cena Rayjin a Ubud; evitare di aggiungere altre attività.'});
  patchDay(4,{dinner:'Kubu at Mandapa (in attesa) · The Sayan House backup',dinnerLink:'https://kubuatmandapa.com/',evening:'Cena anniversario: Kubu se confermato; The Sayan House come backup',notes:'Giornata Batur + recupero/spa. Kubu resta richiesta non confermata: non prenotare un secondo ristorante non cancellabile finché non risponde.'});
  patchDay(5,{dinner:'Hujan Locale',dinnerLink:'https://hujanlocale.com/'});
  patchDay(6,{lunch:'Check-in / snack leggero',dinner:'GILITIK! Street Food & More',dinnerLink:'https://gilitik.com/',notes:'Arrivo Gili Air 10:05 e check-in dalle 14:00. Prima sera volutamente casual: GILITIK.'});
  patchDay(7,{lunch:'Pachamama Organic Cafe',dinner:'Mowies Gili Air',dinnerLink:'https://www.mowiesgiliair.com/public/restaurant'});
  patchDay(8,{lunch:'Life Kitchen Dumpling',dinner:'BAHIA Restaurant & Beachbar',dinnerLink:'https://bahiagili.com/menu',notes:'Snorkeling privato 06:30–10:30 circa; Life Kitchen a pranzo, BAHIA la sera.'});
  patchDay(9,{lunch:'Libero / AÇAÍ TIGER come snack',dinner:'Libera',notes:'Giornata volutamente flessibile. AÇAÍ TIGER è snack/colazione, non una cena obbligatoria.'});
  patchDay(10,{lunch:'Pachamama / libero',dinner:'Libera'});
  patchDay(11,{lunch:'Libero',dinner:'Libera',notes:'Giornata cuscinetto: scegliere sul momento senza inseguire prenotazioni.'});
  patchDay(12,{lunch:'Vicino all’alloggio',dinner:'Papaya Restaurant & Beach Club',dinnerLink:'https://www.papayagili.com/',notes:'Ultimo tramonto a Gili Air: Papaya soprattutto per location/atmosfera; prenotare tavolo fronte mare.'});
  patchDay(13,{dinner:'Bawang Merah Beachfront Restaurant',dinnerLink:'https://jimbaranbayrestaurant.com/'});
  patchDay(14,{lunch:'YUKI Uluwatu · Sushimi backup',lunchLink:'https://www.yuki-bali.com/uluwatu',dinner:'Snack/cena in aeroporto',notes:'YUKI è la scelta principale. Sushimi solo backup più rapido/economico. Koral escluso: deviazione a Nusa Dua non coerente con Uluwatu + Kecak + aeroporto.'});

  // One-time migration of the local/cloud food list so existing installs receive the curation.
  try{
    const key='bali_food_curation_version';
    if(localStorage.getItem(key)!==VERSION){
      localStorage.setItem('bali_food_v2',JSON.stringify(data.foodHighlights));
      localStorage.setItem('bali_itinerary_v1',JSON.stringify(data.itinerary));
      localStorage.setItem(key,VERSION);
    }
  }catch(e){console.warn('Food curation migration',e);}

  if(data.meta){data.meta.foodVersion=VERSION;}
})();
