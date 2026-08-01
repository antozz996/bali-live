// Bali 2026 - Master Data with Itemized Pending Payments Tracker
const BALI_TRIP_DATA = {
  meta: {
    title: "BALI 2026 - CONTROL CENTER",
    dates: "15 - 29 Settembre 2026",
    travelers: 2,
    departureDate: "2026-09-15T22:10:00+02:00",
    budgetMax: 5628.86,
    budgetMin: 4885.86,
    budgetPaid: 2244.36,
    exchangeRateEURtoIDR: 17500
  },

  budgetItems: [
    { id: "ITEM-01", cat: "Voli", desc: "Volo Emirates FCO-DPS A/R (2 persone, 25kg)", amount: 1929.36, paidDefault: true, defaultStatus: "Pagato" },
    { id: "ITEM-02", cat: "Assicurazione", desc: "Assicurazione Viaggio Copertura Medica/Annullamento", amount: 88.00, paidDefault: true, defaultStatus: "Pagato" },
    { id: "ITEM-03", cat: "Trasporti", desc: "Treno Napoli-Roma FCO A/R", amount: 117.00, paidDefault: true, defaultStatus: "Pagato" },
    { id: "ITEM-04", cat: "Escursioni", desc: "Snorkeling Privato Gili Meno + Tartarughe", amount: 110.00, paidDefault: true, defaultStatus: "Pagato" },
    { id: "ITEM-05", cat: "Alloggi", desc: "Temuku Ubud Villas (4 notti)", amount: 224.00, paidDefault: false, defaultStatus: "Da saldare" },
    { id: "ITEM-06", cat: "Alloggi", desc: "Coral Drift Resort Gili Air (7 notti)", amount: 677.00, paidDefault: false, defaultStatus: "Da saldare" },
    { id: "ITEM-07", cat: "Alloggi", desc: "Paranyogan Homestay Jimbaran (2 notti)", amount: 45.00, paidDefault: false, defaultStatus: "Da saldare" },
    { id: "ITEM-08", cat: "Trasporti", desc: "Fast Boat Padang Bai → Gili Air A/R", amount: 146.00, paidDefault: false, defaultStatus: "Da saldare" },
    { id: "ITEM-09", cat: "Trasporti", desc: "Driver Privati (Ubud, Serangan, Sud)", amount: 120.00, paidDefault: false, defaultStatus: "Da saldare" },
    { id: "ITEM-10", cat: "Escursioni", desc: "Tour Privato Ubud (Terrazze & Cascate)", amount: 78.00, paidDefault: false, defaultStatus: "Da saldare" },
    { id: "ITEM-11", cat: "Escursioni", desc: "Monte Batur Jeep 4x4 all'alba", amount: 108.00, paidDefault: false, defaultStatus: "Da saldare" },
    { id: "ITEM-12", cat: "Escursioni", desc: "Pacchetto ATV + Rafting + Monkey Forest", amount: 190.00, paidDefault: false, defaultStatus: "Da saldare" },
    { id: "ITEM-13", cat: "Escursioni", desc: "Immersione introduttiva con bombola", amount: 130.00, paidDefault: false, defaultStatus: "Da saldare" },
    { id: "ITEM-14", cat: "Documenti", desc: "e-VOA Indonesia per 2 persone", amount: 48.00, paidDefault: false, defaultStatus: "Da saldare" },
    { id: "ITEM-15", cat: "Documenti", desc: "Bali Tourist Levy per 2 persone", amount: 14.50, paidDefault: false, defaultStatus: "Da saldare" },
    { id: "ITEM-16", cat: "Connettività", desc: "eSIM / SIM locale per 2", amount: 30.00, paidDefault: false, defaultStatus: "Da saldare" },
    { id: "ITEM-17", cat: "Cibo & Ristoranti", desc: "Fondo Stima Pranzi, Cene & Drink", amount: 900.00, paidDefault: false, defaultStatus: "Da saldare" }
  ],

  survivalGuide: [
    {
      category: "🏛️ Templi & Cultura Balinese",
      tips: [
        "Indossare sempre il Sarong e la fascia in vita prima di entrare in qualsiasi tempio (Tirta Empul, Uluwatu).",
        "Non calpestare le Canang Sari (piccole offerte di fiori in cestini di foglia di palma sul marciapiede).",
        "Usare sempre la mano destra (o entrambe) per dare o ricevere denaro e oggetti."
      ]
    },
    {
      category: "🚖 Spostamenti, Taxi & App",
      tips: [
        "Scarica l'app Grab e Gojek per taxi e scooter a prezzi chiari. Ad Ubud e all'aeroporto ci sono zone 'No Grab' dove usufruire dei taxi autorizzati Bluebird.",
        "A Gili Air non esistono motori: ci si sposta solo a piedi, in bicicletta o con i Cikarang (carretti a cavallo per bagagli pesanti)."
      ]
    },
    {
      category: "💱 Cambio Valuta & Bancomat",
      tips: [
        "Usare solo cambiavalute autorizzati con logo 'Authorized Money Changer' (es. PT Central Kuta). Evitare i chioschetti nei vicoli con tassi troppo alti per evitare truffe sulle banconote.",
        "Per i prelievi con Revolut, usare gli ATM delle banche principali: BCA, Mandiri o BNI."
      ]
    },
    {
      category: "🩺 Salute & 'Bali Belly'",
      tips: [
        "Bere SOLO acqua in bottiglia sigillata o purificata. Evitare acqua del rubinetto anche per lavarsi i denti.",
        "Il ghiaccio nei ristoranti con licenza è sicuro ('Es Kristal' controllato dal governo).",
        "Iniziare fermenti lattici 3 giorni prima di partire e tenerli a portata di mano."
      ]
    }
  ],

  photoSpots: [
    { place: "Terrazze di riso Tegalalang", bestTime: "07:00 - 08:30 (Mattina presto)", tip: "Luce dorata tra le palme e zero folla." },
    { place: "Statua Sottomarina 'The Nest' (Gili Meno)", bestTime: "08:00 - 09:30", tip: "Barca privata presto prima dell'arrivo dei tour di gruppo." },
    { place: "Tramonto a Mowies & Papaya (Gili Air)", bestTime: "17:15 - 18:30", tip: "Prenotare il tavolo fronte mare al tramonto per la vista vulcano Gunung Agung." },
    { place: "Tempio di Uluwatu & Scogliera", bestTime: "17:00 - 18:00", tip: "Attenzione alle scimmie: togliere occhiali e cappelli!" }
  ],

  driversAndTransfers: [
    { role: "Driver Privato Ubud & Tour", name: "Driver Ubud — da configurare", phone: "", waText: "Ciao! Vorrei confermare un tour privato a Ubud dal 16 al 20 settembre 2026." },
    { role: "Fast Boat Padang Bai → Gili Air", name: "Operatore Fast Boat — da configurare", phone: "", waText: "Hello! I would like to confirm the fast boat from Padang Bai to Gili Air on 20 September 2026." },
    { role: "Driver Sud Bali & Aeroporto DPS", name: "Driver Bali Sud — da configurare", phone: "", waText: "Hello! We need a pickup in Serangan on 27 September 2026 heading to Jimbaran." }
  ],

  emergencyContacts: [
    { label: "Emergenza generale Indonesia", phone: "112" },
    { label: "Ambulanza", phone: "119" },
    { label: "Polizia", phone: "110" },
    { label: "Ambasciata Italiana — emergenze", phone: "+62 815 1811 344" },
    { label: "Unità di Crisi Farnesina (24/7)", phone: "+39 06 36225" },
    { label: "Ambasciata Italiana — ufficio consolare", phone: "+62 21 3193 7445" },
    { label: "Assicurazione viaggio (configurare)", phone: "Numero da inserire" }
  ],

  accommodations: [
    {
      id: "UB-01",
      area: "Ubud",
      name: "Temuku Ubud Villas",
      checkIn: "16/09/2026",
      checkOut: "20/09/2026",
      nights: 4,
      totalPriceEUR: 224,
      nightlyPriceEUR: 56,
      freeCancellation: true,
      status: "Prenotato",
      rating: "9.0",
      address: "Jl. Raya Kedewatan, Kedewatan, Kecamatan Ubud, Kabupaten Gianyar, Bali 80571",
      location: "Kedewatan/Campuhan; piscina privata; spa; navetta centro; taxi aeroporto promo",
      notes: "Prezzo mobile/Genius visto su Booking.",
      bookingCode: "",
      link: "https://www.booking.com/hotel/id/temuku-villas-ubud.html"
    },
    {
      id: "GI-01",
      area: "Gili Air",
      name: "Coral Drift Resort & Villas Gili Air",
      checkIn: "20/09/2026",
      checkOut: "27/09/2026",
      nights: 7,
      totalPriceEUR: 677,
      nightlyPriceEUR: 96.71,
      freeCancellation: true,
      status: "Prenotato",
      rating: "9.0",
      address: "Gili Air, Gili Indah, Pemenang, North Lombok Regency, West Nusa Tenggara 83352",
      location: "Preferenza: romantico, piscina e buona posizione fronte mare",
      notes: "Contatto WhatsApp del resort per il check-in.",
      bookingCode: "",
      link: "https://www.google.com/maps/search/?api=1&query=Coral+Drift+Resort+Gili+Air"
    },
    {
      id: "UL-01",
      area: "Jimbaran/Uluwatu",
      name: "Paranyogan Homestay",
      checkIn: "27/09/2026",
      checkOut: "29/09/2026",
      nights: 2,
      totalPriceEUR: 45,
      nightlyPriceEUR: 22.50,
      freeCancellation: true,
      status: "Prenotato",
      rating: "9.2",
      address: "Jalan Pantai Balangan No. 11, Kabupaten Badung, Bali 80361",
      location: "Base finale comoda per aeroporto DPS e Tempio Uluwatu",
      notes: "Richiedere late checkout/day-use e doccia finale prima del volo.",
      bookingCode: "",
      link: "https://www.google.com/maps/search/?api=1&query=Paranyogan+Homestay+Jimbaran"
    }
  ],

  itinerary: [
    {
      dayNum: 1,
      date: "15/09/2026",
      dayName: "Martedì",
      phase: "Partenza",
      location: "In volo",
      regionGroup: "Voli",
      intensity: "Media",
      morning: "Napoli → Roma Fiumicino",
      afternoon: "FCO e check-in bagagli (Treno/Auto)",
      evening: "Volo Emirates EK096 ore 22:10 (FCO → DXB)",
      transport: "Treno/auto + Aereo",
      requiredBookings: "Trasporto Napoli-FCO già pagato",
      lunch: "-",
      dinner: "In volo",
      notes: "Controllare bagaglio da stiva 25kg max per persona."
    },
    {
      dayNum: 2,
      date: "16/09/2026",
      dayName: "Mercoledì",
      phase: "Arrivo",
      location: "Ubud",
      regionGroup: "Ubud",
      intensity: "Bassa",
      morning: "Volo Dubai → Bali",
      afternoon: "In volo per DPS (Emirates EK398)",
      evening: "Arrivo DPS 22:25; Transfer privato e late check-in a Temuku Ubud Villas",
      transport: "Aereo + Driver privato",
      requiredBookings: "Transfer aeroporto DPS → Ubud",
      lunch: "In volo",
      dinner: "Snack all'arrivo",
      notes: "Nessuna attività programmata. Avvisare la villa per l'arrivo a tarda notte."
    },
    {
      dayNum: 3,
      date: "17/09/2026",
      dayName: "Giovedì",
      phase: "Ubud 1",
      location: "Ubud",
      regionGroup: "Ubud",
      intensity: "Alta",
      morning: "Tour privato di Ubud: Terrazze di riso Tegalalang, Tempio Tirta Empul e cascate",
      afternoon: "Rientro, relax in piscina privata o passeggiata in centro",
      evening: "Cena e riposo a Murni's Warung",
      transport: "Driver privato con navetta",
      requiredBookings: "Tour Ubud + pickup",
      lunch: "Kailasha Restaurant (Ubud)",
      dinner: "Murni's Warung (Ubud)",
      lunchLink: "https://puriganggaresort.com/dining/kailasha-restaurant/",
      dinnerLink: "https://www.murnis.com/murnis_wp/wp-content/uploads/2016/06/Murnis-Warung-A-La-Carte-Menu-22-April-2024.pdf",
      notes: "Tour epico delle attrazioni simbolo di Ubud. Portare sarong per Tirta Empul."
    },
    {
      dayNum: 4,
      date: "18/09/2026",
      dayName: "Venerdì",
      phase: "Ubud 2",
      location: "Ubud",
      regionGroup: "Ubud",
      intensity: "Alta",
      morning: "Monte Batur in Jeep 4x4 all'alba (senza trekking a piedi) + Sorgenti Termali",
      afternoon: "Piscina, sonno e massaggio rigenerante",
      evening: "Cena romantica con vista tramonto sulla valle a The Sayan House",
      transport: "Tour con pickup 4x4",
      requiredBookings: "Jeep Batur 4x4 + Massaggio",
      lunch: "Pranzo leggero in villa",
      dinner: "The Sayan House",
      dinnerLink: "https://www.thesayanhouse.com/",
      notes: "Sveglia prima dell'alba per la Jeep! Non aggiungere altre escursioni gravose."
    },
    {
      dayNum: 5,
      date: "19/09/2026",
      dayName: "Sabato",
      phase: "Ubud 3",
      location: "Ubud",
      regionGroup: "Ubud",
      intensity: "Alta",
      morning: "Pacchetto completo: Tour in ATV (Quad) + Rafting sul fiume Ayung + Monkey Forest",
      afternoon: "Rientro, doccia e preparazione valigie per il trasferimento",
      evening: "Cena indonesiana moderna da Hujan Locale",
      transport: "Driver privato compreso nel pacchetto",
      requiredBookings: "Pacchetto ATV + Rafting + Monkey Forest",
      lunch: "Incluso nel tour rafting",
      dinner: "Hujan Locale",
      dinnerLink: "https://hujanlocale.com/",
      notes: "Preparare le valigie alla sera prima di partire per Gili Air il giorno dopo!"
    },
    {
      dayNum: 6,
      date: "20/09/2026",
      dayName: "Domenica",
      phase: "Trasferimento",
      location: "Gili Air",
      regionGroup: "Gili Air",
      intensity: "Media",
      morning: "Driver Ubud → Porto di Padang Bai (partenza 06:30); Fast boat per Gili Air (08:30)",
      afternoon: "Arrivo a Gili Air 10:50, check-in al Coral Drift Resort e primo bagno in mare",
      evening: "Tramonto in spiaggia e cena barbecue da Papaya",
      transport: "Driver + Fast Boat",
      requiredBookings: "Fast Boat Padang Bai → Gili Air + Taxi",
      lunch: "Ruby's Café",
      dinner: "Papaya (Beachfront BBQ)",
      lunchLink: "https://visitgiliislands.com/islands/air/directory/restaurants/rubys-cafe",
      dinnerLink: "https://www.papayagili.com/",
      notes: "Arrivare a Padang Bai almeno 60 min prima della partenza della barca."
    },
    {
      dayNum: 7,
      date: "21/09/2026",
      dayName: "Lunedì",
      phase: "Gili 1",
      location: "Gili Air",
      regionGroup: "Gili Air",
      intensity: "Bassa",
      morning: "Nuotata con le tartarughe all'alba a pochi metri dalla riva",
      afternoon: "Noleggio bici, giro panoramico dell'isola e mare cristallino",
      evening: "Cocktail al tramonto a Mowies",
      transport: "A piedi / Bici",
      requiredBookings: "Noleggio bici standard",
      lunch: "Pachamama Organic Café",
      dinner: "Mowies Gili Air",
      lunchLink: "https://lomboq.com/biz/restaurant/pachamama-gili-air",
      dinnerLink: "https://www.mowiesgiliair.com/public/restaurant",
      notes: "Isola senza motori: ci si sposta solo a piedi o in bicicletta."
    },
    {
      dayNum: 8,
      date: "22/09/2026",
      dayName: "Martedì",
      phase: "Gili 2",
      location: "Gili Air",
      regionGroup: "Gili Air",
      intensity: "Media",
      morning: "Snorkeling privato in barca verso Gili Meno, statue sottomarine Nest e tartarughe",
      afternoon: "Relax sulla spiaggia o al resort",
      evening: "Cena tranquilla da Bella Ciao",
      transport: "Barca privata",
      requiredBookings: "Barca privata snorkeling (PRENOTATO ✅)",
      lunch: "Ruby's Café",
      dinner: "Bella Ciao",
      dinnerLink: "https://www.bellaciaogiliair.com/menu/",
      notes: "Barca privata prenotata! Salvare il voucher e il contatto del marinaio."
    },
    {
      dayNum: 9,
      date: "23/09/2026",
      dayName: "Mercoledì",
      phase: "Gili 3",
      location: "Gili Air",
      regionGroup: "Gili Air",
      intensity: "Bassa",
      morning: "Mattinata di totale libertà e mare",
      afternoon: "Relax, lettino e noci di cocco fresche",
      evening: "Uscita serale per avvistare il plancton bioluminescente (opzionale, con luna favorevole)",
      transport: "A piedi / Bici",
      requiredBookings: "Tour plancton solo se confermato sul posto",
      lunch: "Warung Sunny",
      dinner: "Libera / Mowies",
      lunchLink: "https://visitgiliislands.com/islands/air/directory/restaurants/warung-sunny",
      notes: "Serata flessibile: valutare le condizioni meteo per la bioluminescenza."
    },
    {
      dayNum: 10,
      date: "24/09/2026",
      dayName: "Giovedì",
      phase: "Gili 4",
      location: "Gili Air",
      regionGroup: "Gili Air",
      intensity: "Media",
      morning: "Esperienza di immersione introduttiva con bombola (Discover Scuba Diving)",
      afternoon: "Riposo e relax post-immersione",
      evening: "Cena con serata musicale/fire show da Bahia",
      transport: "A piedi / Bici",
      requiredBookings: "Blue Marlin Diving + Questionario Medico",
      lunch: "Pachamama Café",
      dinner: "Bahia Restaurant",
      dinnerLink: "https://bahiagili.com/menu",
      notes: "Compilare prima il questionario medico per la subacquea."
    },
    {
      dayNum: 11,
      date: "25/09/2026",
      dayName: "Venerdì",
      phase: "Gili 5",
      location: "Gili Air",
      regionGroup: "Gili Air",
      intensity: "Bassa",
      morning: "Seconda immersione oppure trattamento Spa / Massaggi balinesi",
      afternoon: "Spiaggia, sole e kayak/paddleboard",
      evening: "Cena informale in warung locale",
      transport: "A piedi / Bici",
      requiredBookings: "Nessuna stringente",
      lunch: "Mowies",
      dinner: "Ruby's Café / Warung Sunny",
      notes: "Giornata cuscinetto per godersi l'isola al 100%."
    },
    {
      dayNum: 12,
      date: "26/09/2026",
      dayName: "Sabato",
      phase: "Gili 6",
      location: "Gili Air",
      regionGroup: "Gili Air",
      intensity: "Bassa",
      morning: "Ultimo snorkeling matutino fronte spiaggia",
      afternoon: "Ultimi bagni e preparazione bagagli per il rientro a Bali",
      evening: "Ultimo tramonto da favola a Gili Air con cena speciale da Papaya",
      transport: "A piedi / Bici",
      requiredBookings: "Tavolo fronte mare da Papaya",
      lunch: "Pranzo leggero vicino all'alloggio",
      dinner: "Papaya",
      dinnerLink: "https://www.papayagili.com/",
      notes: "Prenotare il tavolo per il tramonto con anticipo."
    },
    {
      dayNum: 13,
      date: "27/09/2026",
      dayName: "Domenica",
      phase: "Rientro Bali",
      location: "Jimbaran / Uluwatu",
      regionGroup: "Uluwatu",
      intensity: "Media",
      morning: "Fast boat mattutina Gili Air → Serangan (Bali) ore 11:00",
      afternoon: "Driver dal Porto di Serangan verso il sud di Bali; Check-in Paranyogan Homestay",
      evening: "Famosissima cena a base di pesce fresco alla griglia sulla spiaggia di Jimbaran Bay",
      transport: "Fast Boat + Driver privato",
      requiredBookings: "Fast Boat Serangan + Driver sud",
      lunch: "Packed lunch preparato dal resort",
      dinner: "Bawang Merah Beachfront Restaurant",
      dinnerLink: "https://jimbaranbayrestaurant.com/",
      notes: "Attenzione: Rientro fissato su Serangan, avvisare il driver per il pickup lì e non a Padang Bai!"
    },
    {
      dayNum: 14,
      date: "28/09/2026",
      dayName: "Lunedì",
      phase: "Finale",
      location: "Uluwatu / Aeroporto",
      regionGroup: "Uluwatu",
      intensity: "Media",
      morning: "Spiagge di Uluwatu (Padang Padang / Suluban) o rilassante Beach Club",
      afternoon: "Late checkout/Doccia finale; Visita al Tempio di Uluwatu sul promontorio",
      evening: "Spettacolo della Danza Kecak al tramonto; Transfer in aeroporto DPS entro le 19:15!",
      transport: "Driver a disposizione per tutta la giornata",
      requiredBookings: "Day-use doccia + Biglietti Kecak + Driver DPS",
      lunch: "Mana Uluwatu",
      dinner: "Cena e snack in aeroporto",
      lunchLink: "https://uluwatusurfvillas.com/restaurant/",
      notes: "🚨 PIANO B: Se il traffico o il programma accumula ritardo, saltare la Danza Kecak e andare diretti in aeroporto!"
    },
    {
      dayNum: 15,
      date: "29/09/2026",
      dayName: "Martedì",
      phase: "Rientro a casa",
      location: "In volo / Italia",
      regionGroup: "Voli",
      intensity: "Media",
      morning: "Volo Emirates EK399 Bali DPS (00:35) → Dubai DXB → Roma FCO (13:25)",
      afternoon: "Arrivo a Roma Fiumicino e Treno per Napoli Centrale",
      evening: "Rientro a casa con ricordi indimenticabili di Bali 🌺",
      transport: "Aereo + Treno",
      requiredBookings: "Treno FCO → Napoli già pagato",
      lunch: "In volo",
      dinner: "A casa",
      notes: "Inserire numero di posto e orario definitivo del treno FCO-Napoli."
    }
  ],

  budgetCategories: [
    { name: "Voli", min: 1929.36, max: 1929.36, paid: 1929.36, status: "Pagato", icon: "fa-plane" },
    { name: "Alloggi", min: 946.00, max: 946.00, paid: 0, status: "Prenotato", icon: "fa-hotel" },
    { name: "Escursioni", min: 661.00, max: 686.00, paid: 110.00, status: "Parziale", icon: "fa-compass" },
    { name: "Trasporti", min: 379.00, max: 517.00, paid: 117.00, status: "Parziale", icon: "fa-car" },
    { name: "Cibo & Ristoranti", min: 700.00, max: 1100.00, paid: 0, status: "Da gestire", icon: "fa-utensils" },
    { name: "Documenti & e-VOA", min: 62.50, max: 62.50, paid: 0, status: "Da acquistare", icon: "fa-passport" },
    { name: "Assicurazione Viaggio", min: 88.00, max: 88.00, paid: 88.00, status: "Pagato", icon: "fa-shield-halved" },
    { name: "Connettività (eSIM)", min: 20.00, max: 40.00, paid: 0, status: "Da acquistare", icon: "fa-wifi" },
    { name: "Benessere / Spa", min: 30.00, max: 100.00, paid: 0, status: "Da gestire", icon: "fa-spa" },
    { name: "Extra & Mance", min: 70.00, max: 160.00, paid: 0, status: "Da gestire", icon: "fa-bag-shopping" }
  ],

  foodHighlights: [
    { id: "FOOD-01", date: "17/09", place: "Kailasha Restaurant", area: "Ubud", meal: "Pranzo", style: "Balinese vista risaie", price: "€20-40", link: "https://puriganggaresort.com/dining/kailasha-restaurant/", maps: "Kailasha+Restaurant+Ubud" },
    { id: "FOOD-02", date: "17/09", place: "Murni's Warung", area: "Ubud", meal: "Cena", style: "Storico su fiume Campuhan", price: "€20-40", link: "https://www.murnis.com/murnis_wp/wp-content/uploads/2016/06/Murnis-Warung-A-La-Carte-Menu-22-April-2024.pdf", maps: "Murnis+Warung+Ubud" },
    { id: "FOOD-03", date: "18/09", place: "The Sayan House", area: "Ubud", meal: "Cena", style: "Cena Romantica Fusion vista valle", price: "€45-90", link: "https://www.thesayanhouse.com/", priority: "MUST BOOK 🔥", maps: "The+Sayan+House+Ubud" },
    { id: "FOOD-04", date: "19/09", place: "Hujan Locale", area: "Ubud", meal: "Cena", style: "Cucina indonesiana gourmet", price: "€45-90", link: "https://hujanlocale.com/", priority: "MUST BOOK 🔥", maps: "Hujan+Locale+Ubud" },
    { id: "FOOD-05", date: "20/09", place: "Papaya Gili", area: "Gili Air", meal: "Cena", style: "BBQ Pesce e tramonto beach", price: "€20-40", link: "https://www.papayagili.com/", priority: "MUST BOOK 🔥", maps: "Papaya+Gili+Air" },
    { id: "FOOD-06", date: "21/09", place: "Pachamama", area: "Gili Air", meal: "Pranzo", style: "Bowl organiche & healthy", price: "€20-40", link: "https://lomboq.com/biz/restaurant/pachamama-gili-air", maps: "Pachamama+Gili+Air" },
    { id: "FOOD-07", date: "21/09", place: "Mowies", area: "Gili Air", meal: "Cena", style: "Cocktails e tramonto iconico", price: "€20-40", link: "https://www.mowiesgiliair.com/public/restaurant", priority: "MUST BOOK 🔥", maps: "Mowies+Gili+Air" },
    { id: "FOOD-08", date: "22/09", place: "Bella Ciao", area: "Gili Air", meal: "Cena", style: "Atmosfera rilassata italiana/local", price: "€20-40", link: "https://www.bellaciaogiliair.com/menu/", maps: "Bella+Ciao+Gili+Air" },
    { id: "FOOD-09", date: "23/09", place: "Warung Sunny", area: "Gili Air", meal: "Pranzo", style: "Cucina locale autentica ed economica", price: "€10-20", link: "https://visitgiliislands.com/islands/air/directory/restaurants/warung-sunny", maps: "Warung+Sunny+Gili+Air" },
    { id: "FOOD-10", date: "24/09", place: "Bahia", area: "Gili Air", meal: "Cena", style: "Grigliata & Music / Fire Show", price: "€20-40", link: "https://bahiagili.com/menu", maps: "Bahia+Gili+Air" },
    { id: "FOOD-11", date: "27/09", place: "Bawang Merah", area: "Jimbaran", meal: "Cena", style: "Pesce alla griglia con piedi nella sabbia", price: "€45-90", link: "https://jimbaranbayrestaurant.com/", priority: "MUST BOOK 🔥", maps: "Bawang+Merah+Jimbaran" },
    { id: "FOOD-12", date: "28/09", place: "Mana Uluwatu", area: "Uluwatu", meal: "Pranzo", style: "Vista oceano spettacolare dalle scogliere", price: "€45-90", link: "https://uluwatusurfvillas.com/restaurant/", maps: "Mana+Uluwatu" }
  ],

  excursions: [
    { id: "EX-01", dayNum: 3, name: "Tour privato Ubud: risaie, Tirta Empul e cascate", region: "Ubud", time: "Mattina", status: "Da confermare", priceEUR: 78, budgetItemId: "ITEM-10", notes: "Confermare pickup e sarong incluso.", link: "" },
    { id: "EX-02", dayNum: 4, name: "Monte Batur in Jeep 4x4 e sorgenti termali", region: "Ubud", time: "Alba", status: "Da prenotare", priceEUR: 108, budgetItemId: "ITEM-11", notes: "Verificare orario pickup e colazione.", link: "" },
    { id: "EX-03", dayNum: 5, name: "ATV, rafting Ayung e Monkey Forest", region: "Ubud", time: "Intera giornata", status: "Da prenotare", priceEUR: 190, budgetItemId: "ITEM-12", notes: "Controllare copertura assicurativa delle attività.", link: "" },
    { id: "EX-04", dayNum: 8, name: "Snorkeling privato Gili Meno e The Nest", region: "Gili Air", time: "08:00", status: "Prenotata", priceEUR: 110, budgetItemId: "ITEM-04", notes: "Voucher e contatto del marinaio offline.", link: "" },
    { id: "EX-05", dayNum: 10, name: "Discover Scuba Diving", region: "Gili Air", time: "Mattina", status: "Da prenotare", priceEUR: 130, budgetItemId: "ITEM-13", notes: "Compilare il questionario medico prima dell’attività.", link: "" },
    { id: "EX-06", dayNum: 14, name: "Tempio di Uluwatu e Danza Kecak", region: "Uluwatu", time: "Tramonto", status: "Da prenotare", priceEUR: 0, budgetItemId: "", notes: "Saltare in caso di ritardo per non rischiare il volo.", link: "" }
  ],

  checklist: [
    { area: "DOCUMENTI", item: "Passaporti validi oltre 6 mesi (almeno 2 pagine libere)", timing: "Subito", status: "Da verificare", detail: "Verificare scadenze di entrambi i passaporti" },
    { area: "DOCUMENTI", item: "Copie offline di passaporti e biglietti di uscita", timing: "Prima di partire", status: "Da verificare", detail: "Salvare PDF e foto su entrambi i telefoni + iCloud/Drive" },
    { area: "DOCUMENTI", item: "e-VOA Indonesia per 2 persone (IDR 500.000 / pers)", timing: "Dal 10 Set 2026", status: "Da acquistare", link: "https://evisa.imigrasi.go.id/", detail: "Salvare la ricevuta e il file PDF con QR code" },
    { area: "DOCUMENTI", item: "Bali Tourist Levy per 2 persone (IDR 150.000 / pers)", timing: "Dal 10 Set 2026", status: "Da acquistare", link: "https://lovebali.baliprov.go.id/", detail: "Tassa di soggiorno obbligatoria da pagare prima" },
    { area: "DOCUMENTI", item: "All Indonesia Arrival Card (Modulo doganale online)", timing: "Dal 13 Set 2026", status: "Da compilare", link: "https://allindonesia.imigrasi.go.id/", detail: "Gratuita; compilabile max 3 giorni prima del volo" },
    { area: "DOCUMENTI", item: "Polizza Assicurativa Sanitari & Annullamento", timing: "Fatto ✅", status: "Pagato", detail: "Polizza per la coppia salvata offline + numeri di emergenza" },
    { area: "HEALTH & SAFETY", item: "Farmaci personali + Mini Farmacia da viaggio", timing: "In valigia", status: "Da verificare", detail: "Antidolorifici, Fermenti lattici, Immodium, Cerotti, Disinfettante" },
    { area: "HEALTH & SAFETY", item: "Repellente zanzare rigido (DEET) + Crema Solare 50+", timing: "In valigia", status: "Da verificare", detail: "Crema solare reef-friendly per proteggere i coralli" },
    { area: "HEALTH & SAFETY", item: "Sali reidratanti e rimedio per il mal di mare", timing: "Nel bagaglio a mano", status: "Da verificare", detail: "Essenziali per il viaggio in Fast boat per le Gili!" },
    { area: "VALIGIA", item: "Scarpette da scoglio / acqua per Rafting & Snorkeling", timing: "In valigia", status: "Da verificare", detail: "Proteggono dai coralli morti e durante l'ATV/Rafting" },
    { area: "VALIGIA", item: "Dry Bag (Sacca impermeabile) + Cover cellulare subacquea", timing: "In valigia", status: "Da verificare", detail: "Per proteggere passaporti, fotocamere e telefoni in barca" },
    { area: "VALIGIA", item: "Powerbank potente (20.000 mAh) e cavi doppi", timing: "Nel bagaglio a mano", status: "Da verificare", detail: "DA PORTARE NEL BAGAGLIO A MANO (vietato in stiva!)" },
    { area: "FINALE", item: "Richiedere Late Checkout / Day-use con doccia il 28 Set", timing: "Prima di partire", status: "Da richiedere", detail: "Presso Paranyogan Homestay per potersi lavare prima del volo serale" },
    { area: "BACKUP", item: "Contanti (Rupie + Euro) + Due Carte di Credito/Debito su circuiti diversi", timing: "Prima di partire", status: "Da verificare", detail: "Informare la banca del viaggio in Indonesia per evitare blocchi anti-frode!" }
  ],

  contingencies: [
    {
      title: "🌊 Fast Boat Annullata o Mare Mosso",
      trigger: "L'operatore cancella la corsa per onde alte",
      action: "Richiedere la prima corsa del giorno dopo o volare a Lombok per poi prendere barca locale rientrando a Bali via Serangan. Mantenere flessibile la notte del 27."
    },
    {
      title: "⚓ Porto di Arrivo Modificato",
      trigger: "La barca attracca a Padang Bai invece di Serangan",
      action: "Avvisare immediatamente via WhatsApp il driver privato inviando la nuova posizione live di Google Maps."
    },
    {
      title: "⏰ Ritardo verso Uluwatu & Tempio",
      trigger: "Superate le 17:00 nel traffico verso il sud",
      action: "Saltare il centro o la spiaggia e andare direttamente al Tempio o al ristorante prenotato (Bawang Merah)."
    },
    {
      title: "🚨 Rischio Volo di Rientro per Spettacolo Kecak",
      trigger: "Programma in ritardo di oltre 30-45 minuti",
      action: "Piano B UFFICIALE: Saltare la Danza Kecak. Il driver deve effettuare il pickup a Uluwatu NON OLTRE le 19:15 per l'aeroporto DPS."
    },
    {
      title: "📵 Nessun Segnale Internet o Batteria Scarica",
      trigger: "Impossibile caricare voucher o carte di imbarco",
      action: "Tutti i file, QR code, e-VOA e codici prenotazione sono salvati nella cartella offline / Preferiti di entrambi i telefoni."
    }
  ]
};
