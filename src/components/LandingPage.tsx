import React, { useEffect, useState } from 'react';
import {
  Accessibility,
  ArrowRight,
  ArrowUpRight,
  Briefcase,
  CalendarDays,
  Check,
  ChevronDown,
  Clock,
  Loader2,
  MapPin,
  MoonStar,
  Plug,
  Snowflake,
  Train,
  UtensilsCrossed,
} from 'lucide-react';
import AuthHoverCard from './AuthHoverCard.tsx';
import type { AuthMode } from './AuthHoverCard.tsx';
import { apiFetch } from '../lib/api.ts';

interface LandingPageProps {
  lang: 'en' | 'bm';
  onAuth: (mode: AuthMode) => void;
  onGuest: () => Promise<void>;
}

interface Station {
  id: number;
  name: string;
  state: string;
}

/** Used until the public Stations endpoint answers (or when the API is asleep). */
const FALLBACK_STATIONS: Station[] = [
  { id: 1, name: 'Padang Besar', state: 'Perlis' },
  { id: 4, name: 'Alor Setar', state: 'Kedah' },
  { id: 5, name: 'Sungai Petani', state: 'Kedah' },
  { id: 6, name: 'Butterworth', state: 'Penang' },
  { id: 12, name: 'Taiping', state: 'Perak' },
  { id: 14, name: 'Ipoh', state: 'Perak' },
  { id: 20, name: 'Tanjung Malim', state: 'Perak' },
  { id: 26, name: 'KL Sentral', state: 'Kuala Lumpur' },
  { id: 29, name: 'Seremban', state: 'Negeri Sembilan' },
  { id: 31, name: 'Gemas', state: 'Negeri Sembilan' },
  { id: 36, name: 'JB Sentral', state: 'Johor' },
];

const CREDITS = [
  {
    title: 'Class 93 ETS 204 at Ipoh Railway Station',
    author: 'philip.mallis',
    license: 'CC BY-SA 2.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/2.0/',
    source:
      'https://commons.wikimedia.org/wiki/File:20240502_Class_93_ETS_204_train_at_Ipoh_Railway_Station,_Malaysia.jpg',
  },
  {
    title: 'Class 93 ETS 204 at Butterworth Railway Station',
    author: 'philip.mallis',
    license: 'CC BY-SA 2.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/2.0/',
    source:
      'https://commons.wikimedia.org/wiki/File:Class_93_ETS_204_train_at_Butterworth_Railway_Station,_Penang,_Malaysia.jpg',
  },
  {
    title: 'Class 94 ETS 306 at KL Sentral platform',
    author: '*angys*',
    license: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
    source: 'https://commons.wikimedia.org/wiki/File:Class_94_ETS_306_at_KL_Sentral_platform_(260705).jpg',
  },
  {
    title: 'KTM ETS Class 93 interior',
    author: 'Cmglee',
    license: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
    source: 'https://commons.wikimedia.org/wiki/File:Cmglee_KTM_ETS_Class_93_interior.jpg',
  },
  {
    title: 'KTM ETS Class 93 at Butterworth',
    author: '*angys*',
    license: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
    source: 'https://commons.wikimedia.org/wiki/File:KTM_ETS_Class_93_Butterworth_(230926).jpg',
  },
  {
    title: 'KTM ETS Kuala Lumpur',
    author: 'A2613',
    license: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
    source: 'https://commons.wikimedia.org/wiki/File:KTM_ETS_Kuala_Lumpur.jpg',
  },
];

const FACILITY_ICONS = {
  power: Plug,
  prayer: MoonStar,
  buffet: UtensilsCrossed,
  luggage: Briefcase,
  accessible: Accessibility,
  air: Snowflake,
} as const;

type FacilityKey = keyof typeof FACILITY_ICONS;

const CLASS_TONE = {
  platinum: 'bg-brand-700',
  gold: 'bg-gold-400',
  silver: 'bg-slate-400',
} as const;

const BAND_DOTS = ['bg-brand-300', 'bg-brand-500', 'bg-gold-400', 'bg-red-500'] as const;

const COPY = {
  en: {
    utilityLeft: 'KTM ETS · Electric Train Service',
    utilityRight: 'Independent student project',
    nav: {
      about: 'About ETS',
      network: 'The corridor',
      classes: 'Classes',
      onboard: 'On board',
      predict: 'How it works',
      faq: 'FAQ',
    },
    signIn: 'Sign In',
    register: 'Register',
    hero: {
      kicker: 'Malaysia’s Electric Train Service',
      title: 'Know the crowd before you board.',
      body: 'ETS Rider Predict turns historical ridership and public-holiday data into a clear forecast for your route, date and departure time — so you can pick a quieter coach, a calmer hour, or a different day.',
      primary: 'Sign in to predict',
      secondary: 'Continue as guest',
      registerLink: 'New here? Create an account',
      credit: 'Photo: philip.mallis · CC BY-SA 2.0',
      stats: [
        ['36', 'ETS stations in the system'],
        ['3', 'service classes covered'],
        ['1 min', 'to a demand forecast'],
      ],
    },
    planner: {
      eyebrow: 'Journey planner',
      title: 'Where are you travelling?',
      from: 'From',
      to: 'To',
      date: 'Travel date',
      time: 'Departure time',
      cta: 'Get the forecast',
      note: 'Sign in or continue as guest to run a prediction. Nothing is booked or charged.',
      err: 'Choose a departure and destination station.',
      same: 'The departure and destination cannot be the same station.',
      guestError: 'Could not start a guest session. Please try again.',
      stationsNote: 'Stations load from the system’s own database.',
    },
    network: {
      eyebrow: 'The corridor',
      title: 'One line, thirty-six stations',
      body: 'From Padang Besar at the Thai border to JB Sentral in the south, the ETS corridor runs down the west coast of Peninsular Malaysia. These are the major stops.',
      footnote: 'Station list loaded from the system’s Stations table. Major stops are shown here.',
    },
    about: {
      eyebrow: 'About ETS',
      title: 'What the Electric Train Service is',
      p1: 'The Electric Train Service (ETS) is KTMB’s intercity electric train, running on the double-tracked west coast line. It connects the northern border at Padang Besar with Kuala Lumpur and continues south to Johor Bahru, calling at state capitals and smaller towns along the way.',
      p2: 'Three service tiers share the line — Platinum, Gold and Silver — differing mainly in how many stations they call at and how long the journey takes. This site is an independent student project: it does not sell tickets and is not affiliated with KTMB.',
      facts: [
        ['2010', 'Electric intercity service begins'],
        ['140 km/h', 'Typical line speed'],
        ['Padang Besar – JB Sentral', 'The corridor covered'],
      ],
      alt: 'An ETS train waiting at Butterworth railway station',
    },
    classes: {
      eyebrow: 'Service classes',
      title: 'Three ways to ride the ETS',
      items: [
        {
          name: 'Platinum',
          tone: 'platinum' as const,
          summary: 'Fewest stops and the fastest end-to-end journeys on the corridor.',
          points: ['Limited station calls', 'Best for Padang Besar–KL or KL–JB', 'Reserved seating'],
        },
        {
          name: 'Gold',
          tone: 'gold' as const,
          summary: 'The middle ground: more stops than Platinum, quicker than Silver.',
          points: ['Moderate number of stops', 'Good for major city pairs', 'Reserved seating'],
        },
        {
          name: 'Silver',
          tone: 'silver' as const,
          summary: 'Most stops; built for shorter hops between neighbouring towns.',
          points: ['Calls at most stations', 'Lowest fare tier', 'Short-distance travel'],
        },
      ],
      note: 'This is a summary for context only. Schedules and fares are set by KTMB — check ktmb.com.my before travelling.',
    },
    onboard: {
      eyebrow: 'On board',
      title: 'Inside the train',
      intro: 'This is the typical fit-out of an ETS Class 93 set. Facilities can vary by service — confirm with KTMB before you travel.',
      alt: 'Interior of an ETS Class 93 coach with rows of seats',
      items: [
        { icon: 'power' as FacilityKey, title: 'Power sockets', desc: 'Charge phones and laptops at your seat.' },
        { icon: 'prayer' as FacilityKey, title: 'Prayer room', desc: 'A small surau is available on the train.' },
        { icon: 'buffet' as FacilityKey, title: 'Buffet car', desc: 'Light meals, snacks and drinks on longer runs.' },
        { icon: 'luggage' as FacilityKey, title: 'Luggage space', desc: 'Overhead racks and end-of-coach storage.' },
        { icon: 'accessible' as FacilityKey, title: 'Accessible seating', desc: 'Priority seats and wheelchair space.' },
        { icon: 'air' as FacilityKey, title: 'Air-conditioned', desc: 'Cooled coaches in every service class.' },
      ],
    },
    predict: {
      eyebrow: 'How it works',
      title: 'A forecast you can plan around',
      body: 'The system trains a Random Forest model on historical ETS ridership, then adjusts for the day of the week, the hour, weekends and public holidays.',
      steps: [
        ['Choose your journey', 'Origin, destination, travel date and departure time.'],
        [
          'The model reads the calendar',
          'Holidays come from the system’s Holidays table; weekends are flagged automatically.',
        ],
        [
          'You get a number and a band',
          'Predicted passengers, a Low–Very High band, and the spread across the model’s trees as a confidence signal.',
        ],
      ],
      tableTitle: 'Demand bands',
      bands: [
        ['Low', '50 passengers or fewer'],
        ['Medium', '51–100 passengers'],
        ['High', '101–250 passengers'],
        ['Very High', 'More than 250'],
      ],
      caption: 'A forecast, not a ticket count. Actual boardings can differ.',
      alt: 'An ETS train at Kuala Lumpur station',
    },
    routes: {
      eyebrow: 'Popular journeys',
      title: 'Start with a corridor people actually travel',
      action: 'Predict this route',
      items: [
        ['KL Sentral', 'Ipoh'],
        ['KL Sentral', 'Butterworth'],
        ['Ipoh', 'Padang Besar'],
        ['KL Sentral', 'JB Sentral'],
      ],
    },
    faq: {
      eyebrow: 'Questions',
      title: 'Before you sign in',
      items: [
        {
          q: 'Is this the official KTMB website?',
          a: 'No. ETS Rider Predict is a final-year student project and is not affiliated with Keretapi Tanah Melayu Berhad. Buy tickets and check live schedules on ktmb.com.my.',
        },
        {
          q: 'Do I need an account?',
          a: 'You can continue as a guest to run predictions and view public holidays. An account adds saved trips, search history and feedback.',
        },
        {
          q: 'Where do the numbers come from?',
          a: 'A Random Forest model trained on historical ridership, using calendar features such as day of week, hour, weekend and public holiday.',
        },
        {
          q: 'Does it sell tickets?',
          a: 'No. It forecasts crowding only, and no payment details are collected.',
        },
        {
          q: 'Can I use it on my phone?',
          a: 'Yes. The app is installable as a PWA — use “Install app” on the dashboard or your browser’s Add to Home Screen.',
        },
      ],
    },
    footer: {
      blurb: 'An independent final-year project that forecasts ETS ridership so passengers can plan around the crowd.',
      explore: 'Explore',
      account: 'Account',
      credits: 'Photo credits',
      creditNote: 'Photographs are used under Creative Commons licences. Select a credit to open the original file and licence.',
      disclaimer:
        'Not affiliated with Keretapi Tanah Melayu Berhad (KTMB). For tickets, schedules and fares visit ktmb.com.my.',
      rights: '© 2026 ETS Rider Predict System · Student project',
      backToTop: 'Back to top',
    },
    langLabel: 'Language',
    skip: 'Skip to content',
  },
  bm: {
    utilityLeft: 'KTM ETS · Perkhidmatan Kereta Api Elektrik',
    utilityRight: 'Projek pelajar bebas',
    nav: {
      about: 'Tentang ETS',
      network: 'Koridor',
      classes: 'Kelas',
      onboard: 'Di dalam tren',
      predict: 'Cara ia berfungsi',
      faq: 'Soalan lazim',
    },
    signIn: 'Log Masuk',
    register: 'Daftar',
    hero: {
      kicker: 'Perkhidmatan Kereta Api Elektrik Malaysia',
      title: 'Ketahui kesesakan sebelum anda menaiki.',
      body: 'ETS Rider Predict menukar data ridership sejarah dan cuti umum kepada ramalan yang jelas untuk laluan, tarikh dan waktu berlepas anda — supaya anda boleh memilih gerabak yang lebih lapang, waktu yang lebih tenang, atau hari lain.',
      primary: 'Log masuk untuk ramalan',
      secondary: 'Teruskan sebagai tetamu',
      registerLink: 'Baharu di sini? Cipta akaun',
      credit: 'Foto: philip.mallis · CC BY-SA 2.0',
      stats: [
        ['36', 'stesen ETS dalam sistem'],
        ['3', 'kelas perkhidmatan'],
        ['1 min', 'untuk satu ramalan'],
      ],
    },
    planner: {
      eyebrow: 'Perancang perjalanan',
      title: 'Ke mana anda ingin pergi?',
      from: 'Dari',
      to: 'Ke',
      date: 'Tarikh perjalanan',
      time: 'Waktu berlepas',
      cta: 'Dapatkan ramalan',
      note: 'Log masuk atau teruskan sebagai tetamu untuk menjalankan ramalan. Tiada tempahan atau bayaran dibuat.',
      err: 'Pilih stesen berlepas dan destinasi.',
      same: 'Stesen asal dan destinasi tidak boleh sama.',
      guestError: 'Tidak dapat memulakan sesi tetamu. Sila cuba lagi.',
      stationsNote: 'Senarai stesen dimuatkan daripada pangkalan data sistem.',
    },
    network: {
      eyebrow: 'Koridor',
      title: 'Satu landasan, tiga puluh enam stesen',
      body: 'Dari Padang Besar di sempadan Thailand hingga JB Sentral di selatan, koridor ETS menyusuri pantai barat Semenanjung Malaysia. Ini perhentian utamanya.',
      footnote: 'Senarai stesen dimuatkan daripada jadual Stations sistem. Hanya perhentian utama dipaparkan di sini.',
    },
    about: {
      eyebrow: 'Tentang ETS',
      title: 'Apakah Perkhidmatan Kereta Api Elektrik',
      p1: 'Electric Train Service (ETS) ialah perkhidmatan tren elektrik antara bandar KTMB di landasan berkembar pantai barat. Ia menghubungkan sempadan utara di Padang Besar dengan Kuala Lumpur dan terus ke Johor Bahru, singgah di ibu negeri dan pekan kecil sepanjang laluan.',
      p2: 'Tiga tahap perkhidmatan berkongsi landasan — Platinum, Gold dan Silver — berbeza terutamanya pada bilangan perhentian dan tempoh perjalanan. Laman ini projek pelajar yang bebas: ia tidak menjual tiket dan tidak bergabung dengan KTMB.',
      facts: [
        ['2010', 'Perkhidmatan elektrik antara bandar bermula'],
        ['140 km/j', 'Kelajuan biasa di landasan'],
        ['Padang Besar – JB Sentral', 'Koridor yang diliputi'],
      ],
      alt: 'Tren ETS menunggu di stesen kereta api Butterworth',
    },
    classes: {
      eyebrow: 'Kelas perkhidmatan',
      title: 'Tiga cara untuk menaiki ETS',
      items: [
        {
          name: 'Platinum',
          tone: 'platinum' as const,
          summary: 'Perhentian paling sedikit dan perjalanan terpantas hujung ke hujung.',
          points: ['Perhentian terhad', 'Terbaik untuk Padang Besar–KL atau KL–JB', 'Tempat duduk ditempah'],
        },
        {
          name: 'Gold',
          tone: 'gold' as const,
          summary: 'Jalan tengah: lebih banyak perhentian daripada Platinum, lebih pantas daripada Silver.',
          points: ['Perhentian sederhana', 'Sesuai untuk bandar utama', 'Tempat duduk ditempah'],
        },
        {
          name: 'Silver',
          tone: 'silver' as const,
          summary: 'Perhentian paling banyak; untuk perjalanan pendek antara pekan berdekatan.',
          points: ['Berhenti di kebanyakan stesen', 'Kos paling rendah', 'Untuk jarak dekat'],
        },
      ],
      note: 'Ringkasan ini untuk konteks sahaja. Jadual dan tambang ditetapkan oleh KTMB — semak ktmb.com.my sebelum berlepas.',
    },
    onboard: {
      eyebrow: 'Di dalam tren',
      title: 'Di dalam gerabak',
      intro: 'Ini susun atur biasa ETS Kelas 93. Kemudahan boleh berbeza mengikut perkhidmatan — sahkan dengan KTMB sebelum berlepas.',
      alt: 'Bahagian dalam gerabak ETS Kelas 93 dengan barisan tempat duduk',
      items: [
        { icon: 'power' as FacilityKey, title: 'Soket kuasa', desc: 'Cas telefon dan komputer riba di tempat duduk.' },
        { icon: 'prayer' as FacilityKey, title: 'Ruang solat', desc: 'Surau kecil tersedia di dalam tren.' },
        { icon: 'buffet' as FacilityKey, title: 'Gerabak bufet', desc: 'Makanan ringan, snek dan minuman untuk perjalanan jauh.' },
        { icon: 'luggage' as FacilityKey, title: 'Ruang bagasi', desc: 'Rak di atas kepala dan ruang di hujung gerabak.' },
        { icon: 'accessible' as FacilityKey, title: 'Tempat duduk mudah akses', desc: 'Tempat duduk keutamaan dan ruang kerusi roda.' },
        { icon: 'air' as FacilityKey, title: 'Berhawa dingin', desc: 'Gerabak sejuk dalam setiap kelas perkhidmatan.' },
      ],
    },
    predict: {
      eyebrow: 'Cara ia berfungsi',
      title: 'Ramalan yang boleh anda rancang',
      body: 'Sistem melatih model Random Forest menggunakan data ridership ETS sejarah, kemudian menyesuaikan mengikut hari dalam minggu, jam, hujung minggu dan cuti umum.',
      steps: [
        ['Pilih perjalanan anda', 'Stesen asal, destinasi, tarikh dan waktu berlepas.'],
        [
          'Model membaca kalendar',
          'Cuti umum diambil daripada jadual Holidays sistem; hujung minggu ditanda secara automatik.',
        ],
        [
          'Anda dapat nombor dan tahap',
          'Bilangan penumpang dijangka, tahap Rendah–Sangat Tinggi, dan sebaran antara pokok model sebagai isyarat keyakinan.',
        ],
      ],
      tableTitle: 'Tahap permintaan',
      bands: [
        ['Rendah', '50 penumpang atau kurang'],
        ['Sederhana', '51–100 penumpang'],
        ['Tinggi', '101–250 penumpang'],
        ['Sangat Tinggi', 'Lebih daripada 250'],
      ],
      caption: 'Ini ramalan, bukan kiraan tiket sebenar. Jumlah sebenar boleh berbeza.',
      alt: 'Tren ETS di stesen Kuala Lumpur',
    },
    routes: {
      eyebrow: 'Perjalanan popular',
      title: 'Mula dengan laluan yang biasa ditempuh',
      action: 'Ramal laluan ini',
      items: [
        ['KL Sentral', 'Ipoh'],
        ['KL Sentral', 'Butterworth'],
        ['Ipoh', 'Padang Besar'],
        ['KL Sentral', 'JB Sentral'],
      ],
    },
    faq: {
      eyebrow: 'Soalan',
      title: 'Sebelum anda log masuk',
      items: [
        {
          q: 'Adakah ini laman rasmi KTMB?',
          a: 'Bukan. ETS Rider Predict ialah projek tahun akhir pelajar dan tidak bergabung dengan Keretapi Tanah Melayu Berhad. Beli tiket dan semak jadual langsung di ktmb.com.my.',
        },
        {
          q: 'Perlukah saya mempunyai akaun?',
          a: 'Anda boleh teruskan sebagai tetamu untuk membuat ramalan dan melihat cuti umum. Akaun menambah perjalanan disimpan, sejarah carian dan maklum balas.',
        },
        {
          q: 'Dari mana datangnya nombor tersebut?',
          a: 'Model Random Forest yang dilatih dengan data ridership sejarah, menggunakan ciri kalendar seperti hari dalam minggu, jam, hujung minggu dan cuti umum.',
        },
        {
          q: 'Adakah ia menjual tiket?',
          a: 'Tidak. Ia hanya meramal kesesakan, dan tiada butiran pembayaran dikumpul.',
        },
        {
          q: 'Bolehkah saya menggunakannya di telefon?',
          a: 'Boleh. Aplikasi ini boleh dipasang sebagai PWA — guna “Pasang aplikasi” di papan pemuka atau “Tambah ke Skrin Utama” dalam pelayar anda.',
        },
      ],
    },
    footer: {
      blurb: 'Projek tahun akhir bebas yang meramal ridership ETS supaya penumpang boleh merancang mengelak kesesakan.',
      explore: 'Jelajah',
      account: 'Akaun',
      credits: 'Kredit foto',
      creditNote: 'Foto digunakan di bawah lesen Creative Commons. Pilih kredit untuk membuka fail asal dan lesen.',
      disclaimer:
        'Tidak bergabung dengan Keretapi Tanah Melayu Berhad (KTMB). Untuk tiket, jadual dan tambang, lawati ktmb.com.my.',
      rights: '© 2026 ETS Rider Predict System · Projek pelajar',
      backToTop: 'Kembali ke atas',
    },
    langLabel: 'Bahasa',
    skip: 'Langkau ke kandungan',
  },
} as const;

function todayIso(): string {
  const now = new Date();
  const month = `${now.getMonth() + 1}`.padStart(2, '0');
  const day = `${now.getDate()}`.padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

export default function LandingPage({ lang, onAuth, onGuest }: LandingPageProps) {
  const c = COPY[lang];
  const [stations, setStations] = useState<Station[]>(FALLBACK_STATIONS);
  const [origin, setOrigin] = useState('KL Sentral');
  const [destination, setDestination] = useState('Ipoh');
  const [travelDate, setTravelDate] = useState(todayIso);
  const [travelTime, setTravelTime] = useState('08:00');
  const [journeyError, setJourneyError] = useState<string | null>(null);
  const [guestBusy, setGuestBusy] = useState(false);
  const [guestError, setGuestError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const loadStations = async () => {
      try {
        const res = await apiFetch('/api/stations');
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && Array.isArray(data) && data.length > 0) {
          setStations(
            data
              .filter((s: any) => s && typeof s.name === 'string')
              .map((s: any, index: number) => ({
                id: typeof s.id === 'number' ? s.id : index + 1,
                name: s.name,
                state: typeof s.state === 'string' ? s.state : '',
              }))
          );
        }
      } catch {
        // The public API may be unreachable (for example on a static preview
        // host). The curated fallback keeps the page useful without it.
      }
    };
    loadStations();
    return () => {
      cancelled = true;
    };
  }, []);

  const switchLanguage = (target: 'en' | 'bm') => {
    if (target === lang) return;
    window.location.href = target === 'bm' ? '/bm' : '/';
  };

  const startGuest = async () => {
    if (guestBusy) return;
    setGuestError(null);
    setGuestBusy(true);
    try {
      await onGuest();
    } catch (error: any) {
      setGuestError(error?.message || c.planner.guestError);
    } finally {
      setGuestBusy(false);
    }
  };

  const submitJourney = (event: React.FormEvent) => {
    event.preventDefault();
    if (!origin || !destination) {
      setJourneyError(c.planner.err);
      return;
    }
    if (origin === destination) {
      setJourneyError(c.planner.same);
      return;
    }
    setJourneyError(null);
    onAuth('signin');
  };

  const selectRoute = (from: string, to: string) => {
    setOrigin(from);
    setDestination(to);
    setJourneyError(null);
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    document.getElementById('plan')?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' });
  };

  const navLink = 'text-[12px] font-bold text-[#334155] transition hover:text-brand-700';
  const eyebrow = 'flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.22em] text-brand-600';
  const eyebrowLight = 'flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.22em] text-gold-300';

  return (
    <div className="min-h-screen bg-white font-sans text-[#1e293b]" id="landing-page">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-sm focus:bg-brand-800 focus:px-4 focus:py-2 focus:text-xs focus:font-bold focus:text-white"
      >
        {c.skip}
      </a>

      <header className="sticky top-0 z-40">
        {/* Utility strip */}
        <div className="bg-brand-950 text-white/70">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] md:px-8">
            <span className="truncate text-white/60">{c.utilityLeft}</span>
            <div className="flex shrink-0 items-center gap-3">
              <span className="hidden text-white/40 sm:inline">{c.utilityRight}</span>
              <div className="flex items-center gap-1" aria-label={c.langLabel}>
                <button
                  type="button"
                  onClick={() => switchLanguage('en')}
                  aria-pressed={lang === 'en'}
                  className={`cursor-pointer rounded-sm px-1.5 py-0.5 transition ${
                    lang === 'en' ? 'bg-white/15 text-white' : 'text-white/55 hover:text-white'
                  }`}
                >
                  EN
                </button>
                <span className="text-white/25">|</span>
                <button
                  type="button"
                  onClick={() => switchLanguage('bm')}
                  aria-pressed={lang === 'bm'}
                  className={`cursor-pointer rounded-sm px-1.5 py-0.5 transition ${
                    lang === 'bm' ? 'bg-white/15 text-white' : 'text-white/55 hover:text-white'
                  }`}
                >
                  BM
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Main navigation */}
        <div className="border-b border-[#e2e8f0] bg-white/95 backdrop-blur">
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 md:px-8">
            <a href="#top" className="flex min-w-0 items-center gap-2.5" aria-label="ETS Rider Predict System">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[4px] bg-brand-700 text-white">
                <Train className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="min-w-0 leading-none">
                <span className="block text-[13px] font-extrabold tracking-[0.16em] text-brand-950">ETS RIDER</span>
                <span className="mt-1 block text-[8.5px] font-bold uppercase tracking-[0.28em] text-[#7c8b9d]">
                  Predict System
                </span>
              </span>
            </a>

            <nav className="hidden items-center gap-7 lg:flex" aria-label="Sections">
              <a className={navLink} href="#about">{c.nav.about}</a>
              <a className={navLink} href="#network">{c.nav.network}</a>
              <a className={navLink} href="#classes">{c.nav.classes}</a>
              <a className={navLink} href="#onboard">{c.nav.onboard}</a>
              <a className={navLink} href="#predict">{c.nav.predict}</a>
              <a className={navLink} href="#faq">{c.nav.faq}</a>
            </nav>

            <div className="flex shrink-0 items-center gap-2">
              <AuthHoverCard
                mode="signin"
                lang={lang}
                onSelect={() => onAuth('signin')}
                className="cursor-pointer rounded-sm border border-[#dbe4ee] bg-white px-3 py-2 text-[11.5px] font-bold text-brand-800 transition hover:border-brand-200 hover:bg-brand-50"
              >
                {c.signIn}
              </AuthHoverCard>
              <AuthHoverCard
                mode="register"
                lang={lang}
                onSelect={() => onAuth('register')}
                className="cursor-pointer rounded-sm bg-gold-400 px-3 py-2 text-[11.5px] font-bold text-brand-950 transition hover:bg-gold-300"
              >
                {c.register}
              </AuthHoverCard>
            </div>
          </div>
          <div className="h-[2px] w-full bg-gold-400" />
        </div>
      </header>

      <main id="main">
        {/* Hero */}
        <section id="top" className="relative isolate overflow-hidden bg-brand-950">
          <img
            src="/images/ets/hero-ets-ipoh.jpg"
            alt={lang === 'bm' ? 'Tren ETS Kelas 93 di stesen kereta api Ipoh' : 'An ETS Class 93 train at Ipoh railway station'}
            width={1920}
            height={1080}
            fetchPriority="high"
            decoding="async"
            className="absolute inset-0 -z-10 h-full w-full object-cover object-center"
          />
          <div className="absolute inset-0 -z-10 bg-gradient-to-r from-brand-950/95 via-brand-950/75 to-brand-950/20" />
          <div className="absolute inset-0 -z-10 bg-gradient-to-t from-brand-950/90 via-transparent to-brand-950/30" />

          <div className="mx-auto max-w-7xl px-4 pb-16 pt-16 md:px-8 md:pb-24 md:pt-24">
            <div className="max-w-2xl">
              <p className={eyebrowLight}>
                <span className="h-px w-7 bg-gold-400" aria-hidden="true" />
                {c.hero.kicker}
              </p>
              <h1 className="mt-5 font-display text-[2rem] font-extrabold leading-[1.08] tracking-tight text-white sm:text-[2.6rem] lg:text-[3.1rem]">
                {c.hero.title}
              </h1>
              <p className="mt-5 max-w-xl text-[13px] leading-relaxed text-white/75 md:text-sm">{c.hero.body}</p>

              <div className="mt-8 flex flex-col gap-2.5 sm:flex-row sm:items-center">
                <button
                  type="button"
                  onClick={() => onAuth('signin')}
                  className="flex cursor-pointer items-center justify-center gap-2 rounded-sm bg-gold-400 px-5 py-3 text-[12.5px] font-extrabold text-brand-950 transition hover:bg-gold-300"
                >
                  {c.hero.primary}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={startGuest}
                  disabled={guestBusy}
                  className="flex cursor-pointer items-center justify-center gap-2 rounded-sm border border-white/35 bg-brand-950/30 px-5 py-3 text-[12.5px] font-bold text-white transition hover:border-white/60 hover:bg-white/10 disabled:cursor-wait disabled:opacity-70"
                >
                  {guestBusy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
                  {c.hero.secondary}
                </button>
                <button
                  type="button"
                  onClick={() => onAuth('register')}
                  className="cursor-pointer px-1 py-2 text-left text-[11.5px] font-bold text-white/70 underline decoration-white/30 underline-offset-4 transition hover:text-white"
                >
                  {c.hero.registerLink}
                </button>
              </div>

              {guestError && (
                <p
                  role="alert"
                  className="mt-4 max-w-xl rounded-sm border border-red-300/40 bg-red-950/60 px-3 py-2 text-[11.5px] font-medium text-red-100"
                >
                  {guestError}
                </p>
              )}

              <dl className="mt-12 grid max-w-lg grid-cols-3 gap-4 border-t border-white/15 pt-5">
                {c.hero.stats.map(([value, label]) => (
                  <div key={label}>
                    <dt className="sr-only">{label}</dt>
                    <dd>
                      <span className="block font-display text-xl font-extrabold text-gold-300 md:text-2xl">{value}</span>
                      <span className="mt-1 block text-[9.5px] font-bold uppercase leading-tight tracking-[0.12em] text-white/55">
                        {label}
                      </span>
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>

          <p className="absolute bottom-2 right-3 text-[9px] font-medium text-white/45 md:right-6">{c.hero.credit}</p>
        </section>

        {/* Journey planner */}
        <section id="plan" className="relative z-10 -mt-8 scroll-mt-28 px-4 md:px-8">
          <form
            onSubmit={submitJourney}
            className="mx-auto max-w-6xl rounded-md border border-[#dbe4ee] bg-white p-4 shadow-[0_16px_36px_-20px_rgba(15,31,56,0.35)] md:p-5"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.2em] text-brand-600">
                <span className="h-px w-5 bg-gold-400" aria-hidden="true" />
                {c.planner.eyebrow}
              </p>
              <p className="text-[10.5px] font-medium text-[#7c8b9d]">{c.planner.stationsNote}</p>
            </div>
            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-[1.1fr_1.1fr_0.9fr_0.8fr_auto] md:items-end">
              <label className="block">
                <span className="mb-1 flex items-center gap-1 text-[9.5px] font-extrabold uppercase tracking-[0.16em] text-[#5b6b7f]">
                  <MapPin className="h-3 w-3" aria-hidden="true" />
                  {c.planner.from}
                </span>
                <select
                  value={origin}
                  onChange={(event) => setOrigin(event.target.value)}
                  className="h-10 w-full rounded-sm border border-[#dbe4ee] bg-white px-2.5 text-[12.5px] font-semibold text-[#1e293b] outline-none transition focus:border-brand-500"
                >
                  {stations.map((station) => (
                    <option key={station.id} value={station.name}>
                      {station.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-1 flex items-center gap-1 text-[9.5px] font-extrabold uppercase tracking-[0.16em] text-[#5b6b7f]">
                  <MapPin className="h-3 w-3" aria-hidden="true" />
                  {c.planner.to}
                </span>
                <select
                  value={destination}
                  onChange={(event) => setDestination(event.target.value)}
                  className="h-10 w-full rounded-sm border border-[#dbe4ee] bg-white px-2.5 text-[12.5px] font-semibold text-[#1e293b] outline-none transition focus:border-brand-500"
                >
                  {stations.map((station) => (
                    <option key={station.id} value={station.name}>
                      {station.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-1 flex items-center gap-1 text-[9.5px] font-extrabold uppercase tracking-[0.16em] text-[#5b6b7f]">
                  <CalendarDays className="h-3 w-3" aria-hidden="true" />
                  {c.planner.date}
                </span>
                <input
                  type="date"
                  value={travelDate}
                  onChange={(event) => setTravelDate(event.target.value)}
                  className="h-10 w-full rounded-sm border border-[#dbe4ee] bg-white px-2.5 text-[12.5px] font-semibold text-[#1e293b] outline-none transition focus:border-brand-500"
                />
              </label>

              <label className="block">
                <span className="mb-1 flex items-center gap-1 text-[9.5px] font-extrabold uppercase tracking-[0.16em] text-[#5b6b7f]">
                  <Clock className="h-3 w-3" aria-hidden="true" />
                  {c.planner.time}
                </span>
                <input
                  type="time"
                  value={travelTime}
                  onChange={(event) => setTravelTime(event.target.value)}
                  className="h-10 w-full rounded-sm border border-[#dbe4ee] bg-white px-2.5 text-[12.5px] font-semibold text-[#1e293b] outline-none transition focus:border-brand-500"
                />
              </label>

              <button
                type="submit"
                className="flex h-10 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-sm bg-brand-700 px-5 text-[12px] font-bold text-white transition hover:bg-brand-800"
              >
                {c.planner.cta}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            {journeyError ? (
              <p role="alert" className="mt-2 text-[11.5px] font-semibold text-red-600">
                {journeyError}
              </p>
            ) : (
              <p className="mt-2 text-[10.5px] font-medium text-[#7c8b9d]">{c.planner.note}</p>
            )}
          </form>
        </section>

        {/* Corridor */}
        <section id="network" className="scroll-mt-28">
          <div className="mx-auto max-w-7xl px-4 py-16 md:px-8 md:py-20">
            <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-end">
              <div>
                <p className={eyebrow}>
                  <span className="h-px w-6 bg-gold-400" aria-hidden="true" />
                  {c.network.eyebrow}
                </p>
                <h2 className="mt-4 font-display text-2xl font-extrabold tracking-tight text-brand-950 md:text-3xl">
                  {c.network.title}
                </h2>
              </div>
              <p className="text-[13px] leading-relaxed text-[#5b6b7f]">{c.network.body}</p>
            </div>

            {/* Desktop line map */}
            <div className="mt-12 hidden lg:block" aria-hidden="true">
              <div className="relative">
                <div className="absolute left-0 right-0 top-[7px] h-[3px] bg-[#e2e8f0]" />
                <div className="absolute left-0 top-[7px] h-[3px] w-full bg-gradient-to-r from-brand-800 via-brand-500 to-gold-400" />
                <div className="relative grid grid-cols-11 gap-1">
                  {FALLBACK_STATIONS.map((station, index) => (
                    <div key={station.name} className="flex flex-col items-start">
                      <span
                        className={`mb-3 flex h-[17px] w-[17px] items-center justify-center rounded-full border-[3px] border-white ${
                          index === 0 || index === FALLBACK_STATIONS.length - 1
                            ? 'bg-gold-400 ring-1 ring-gold-500'
                            : 'bg-brand-700 ring-1 ring-brand-200'
                        }`}
                      />
                      <span className="pr-2 text-[10.5px] font-bold leading-tight text-brand-950">{station.name}</span>
                      <span className="mt-1 pr-2 text-[9px] font-semibold uppercase tracking-[0.08em] text-[#94a3b8]">
                        {station.state}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Mobile line map */}
            <ol className="mt-10 space-y-0 border-l-2 border-[#dbe4ee] pl-5 lg:hidden">
              {FALLBACK_STATIONS.map((station, index) => (
                <li key={station.name} className="relative pb-5 last:pb-0">
                  <span
                    className={`absolute -left-[27px] top-0.5 h-3.5 w-3.5 rounded-full border-2 border-white ${
                      index === 0 || index === FALLBACK_STATIONS.length - 1 ? 'bg-gold-400' : 'bg-brand-600'
                    }`}
                  />
                  <p className="text-[12.5px] font-bold text-brand-950">{station.name}</p>
                  <p className="text-[9.5px] font-semibold uppercase tracking-[0.08em] text-[#94a3b8]">{station.state}</p>
                </li>
              ))}
            </ol>

            <p className="mt-6 text-[10.5px] font-medium text-[#7c8b9d]">{c.network.footnote}</p>
          </div>
        </section>

        {/* About */}
        <section id="about" className="scroll-mt-28 border-y border-[#e2e8f0] bg-[#f6f8fa]">
          <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 md:px-8 md:py-20 lg:grid-cols-2 lg:items-center">
            <div className="order-2 lg:order-1">
              <p className={eyebrow}>
                <span className="h-px w-6 bg-gold-400" aria-hidden="true" />
                {c.about.eyebrow}
              </p>
              <h2 className="mt-4 font-display text-2xl font-extrabold tracking-tight text-brand-950 md:text-3xl">
                {c.about.title}
              </h2>
              <p className="mt-4 text-[13px] leading-relaxed text-[#5b6b7f]">{c.about.p1}</p>
              <p className="mt-3 text-[13px] leading-relaxed text-[#5b6b7f]">{c.about.p2}</p>

              <dl className="mt-7 grid gap-4 sm:grid-cols-3">
                {c.about.facts.map(([value, label]) => (
                  <div key={label} className="border-l border-[#dbe4ee] pl-3">
                    <dt className="font-display text-sm font-extrabold leading-tight text-brand-800">{value}</dt>
                    <dd className="mt-1 text-[10px] font-semibold uppercase leading-tight tracking-[0.08em] text-[#94a3b8]">
                      {label}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>

            <figure className="order-1 lg:order-2">
              <div className="overflow-hidden rounded-md border border-[#dbe4ee] bg-white p-1.5">
                <img
                  src="/images/ets/ets-butterworth.jpg"
                  alt={c.about.alt}
                  width={1200}
                  height={800}
                  loading="lazy"
                  decoding="async"
                  className="h-[260px] w-full rounded-sm object-cover md:h-[340px]"
                />
              </div>
              <figcaption className="mt-2 text-[9.5px] font-medium text-[#94a3b8]">
                Butterworth, Penang · photo by philip.mallis · CC BY-SA 2.0
              </figcaption>
            </figure>
          </div>
        </section>

        {/* Classes */}
        <section id="classes" className="scroll-mt-28">
          <div className="mx-auto max-w-7xl px-4 py-16 md:px-8 md:py-20">
            <p className={eyebrow}>
              <span className="h-px w-6 bg-gold-400" aria-hidden="true" />
              {c.classes.eyebrow}
            </p>
            <h2 className="mt-4 font-display text-2xl font-extrabold tracking-tight text-brand-950 md:text-3xl">
              {c.classes.title}
            </h2>

            <figure className="mt-7">
              <div className="overflow-hidden rounded-md border border-[#dbe4ee]">
                <img
                  src="/images/ets/ets-kl-sentral.jpg"
                  alt={lang === 'bm' ? 'Tren ETS di platform KL Sentral' : 'An ETS train at a KL Sentral platform'}
                  width={1200}
                  height={800}
                  loading="lazy"
                  decoding="async"
                  className="h-[170px] w-full object-cover object-center md:h-[210px]"
                />
              </div>
              <figcaption className="mt-2 text-[9.5px] font-medium text-[#94a3b8]">
                KL Sentral · photo by *angys* · CC BY-SA 4.0
              </figcaption>
            </figure>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {c.classes.items.map((item) => (
                <article key={item.name} className="overflow-hidden rounded-md border border-[#dbe4ee] bg-white">
                  <div className={`h-[3px] w-full ${CLASS_TONE[item.tone]}`} />
                  <div className="p-5">
                    <div className="flex items-baseline justify-between gap-2">
                      <h3 className="font-display text-lg font-extrabold tracking-tight text-brand-950">{item.name}</h3>
                      <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.16em] text-[#94a3b8]">
                        ETS
                      </span>
                    </div>
                    <p className="mt-2 min-h-[3.5rem] text-[12px] leading-relaxed text-[#5b6b7f]">{item.summary}</p>
                    <ul className="mt-4 space-y-2 border-t border-[#eef1f5] pt-4">
                      {item.points.map((point) => (
                        <li key={point} className="flex items-start gap-2 text-[11.5px] font-medium text-[#334155]">
                          <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-600" aria-hidden="true" />
                          {point}
                        </li>
                      ))}
                    </ul>
                  </div>
                </article>
              ))}
            </div>
            <p className="mt-5 max-w-3xl text-[10.5px] leading-relaxed text-[#7c8b9d]">{c.classes.note}</p>
          </div>
        </section>

        {/* On board */}
        <section id="onboard" className="scroll-mt-28 bg-brand-950">
          <div className="mx-auto max-w-7xl px-4 py-16 md:px-8 md:py-20">
            <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
              <figure className="order-2 lg:order-1">
                <div className="overflow-hidden rounded-md border border-white/15 bg-white/5 p-1.5">
                  <img
                    src="/images/ets/ets-interior.jpg"
                    alt={c.onboard.alt}
                    width={1200}
                    height={800}
                    loading="lazy"
                    decoding="async"
                    className="h-[260px] w-full rounded-sm object-cover md:h-[360px]"
                  />
                </div>
                <figcaption className="mt-2 text-[9.5px] font-medium text-white/40">
                  ETS Class 93 interior · photo by Cmglee · CC BY-SA 4.0
                </figcaption>
              </figure>

              <div className="order-1 lg:order-2">
                <p className={eyebrowLight}>
                  <span className="h-px w-6 bg-gold-400" aria-hidden="true" />
                  {c.onboard.eyebrow}
                </p>
                <h2 className="mt-4 font-display text-2xl font-extrabold tracking-tight text-white md:text-3xl">
                  {c.onboard.title}
                </h2>
                <p className="mt-3 max-w-lg text-[12.5px] leading-relaxed text-white/60">{c.onboard.intro}</p>

                <div className="mt-7 grid gap-x-6 gap-y-5 sm:grid-cols-2">
                  {c.onboard.items.map((item) => {
                    const Icon = FACILITY_ICONS[item.icon];
                    return (
                      <div key={item.title} className="flex gap-3">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm border border-white/15 bg-white/5 text-gold-300">
                          <Icon className="h-4 w-4" aria-hidden="true" />
                        </span>
                        <div>
                          <h3 className="text-[12px] font-bold text-white">{item.title}</h3>
                          <p className="mt-0.5 text-[11px] leading-relaxed text-white/55">{item.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Prediction */}
        <section id="predict" className="scroll-mt-28">
          <div className="mx-auto max-w-7xl px-4 py-16 md:px-8 md:py-20">
            <div className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
              <div>
                <p className={eyebrow}>
                  <span className="h-px w-6 bg-gold-400" aria-hidden="true" />
                  {c.predict.eyebrow}
                </p>
                <h2 className="mt-4 font-display text-2xl font-extrabold tracking-tight text-brand-950 md:text-3xl">
                  {c.predict.title}
                </h2>
                <p className="mt-3 max-w-2xl text-[13px] leading-relaxed text-[#5b6b7f]">{c.predict.body}</p>

                <ol className="mt-8 space-y-5">
                  {c.predict.steps.map(([title, desc], index) => (
                    <li key={title} className="flex gap-4">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-brand-200 bg-brand-50 font-mono text-[11px] font-bold text-brand-700">
                        {index + 1}
                      </span>
                      <div>
                        <h3 className="text-[12.5px] font-bold text-brand-950">{title}</h3>
                        <p className="mt-0.5 max-w-xl text-[11.5px] leading-relaxed text-[#5b6b7f]">{desc}</p>
                      </div>
                    </li>
                  ))}
                </ol>

                <div className="mt-9 max-w-md border border-[#dbe4ee]">
                  <div className="border-b border-[#dbe4ee] bg-[#f6f8fa] px-4 py-2.5">
                    <p className="text-[9.5px] font-extrabold uppercase tracking-[0.18em] text-brand-700">
                      {c.predict.tableTitle}
                    </p>
                  </div>
                  <table className="w-full text-left">
                    <tbody>
                      {c.predict.bands.map(([band, range], index) => (
                        <tr key={band} className="border-b border-[#eef1f5] last:border-0">
                          <td className="px-4 py-2.5">
                            <span className="flex items-center gap-2 text-[11.5px] font-bold text-[#1e293b]">
                              <span className={`h-2 w-2 rounded-full ${BAND_DOTS[index]}`} aria-hidden="true" />
                              {band}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono text-[11px] text-[#5b6b7f]">{range}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="mt-3 max-w-md text-[10px] font-medium text-[#7c8b9d]">{c.predict.caption}</p>
              </div>

              <figure className="lg:pl-6">
                <div className="border-l-2 border-gold-400 pl-3">
                  <img
                    src="/images/ets/ets-kuala-lumpur.jpg"
                    alt={c.predict.alt}
                    width={800}
                    height={1000}
                    loading="lazy"
                    decoding="async"
                    className="h-[380px] w-full rounded-sm object-cover md:h-[520px]"
                  />
                  <figcaption className="mt-2 text-[9.5px] font-medium text-[#94a3b8]">
                    Kuala Lumpur · photo by A2613 · CC BY-SA 4.0
                  </figcaption>
                </div>
              </figure>
            </div>
          </div>
        </section>

        {/* Popular routes */}
        <section className="relative isolate overflow-hidden bg-brand-950">
          <img
            src="/images/ets/ets-class93-butterworth.jpg"
            alt=""
            aria-hidden="true"
            width={1600}
            height={700}
            loading="lazy"
            decoding="async"
            className="absolute inset-0 -z-10 h-full w-full object-cover"
          />
          <div className="absolute inset-0 -z-10 bg-brand-950/88" />
          <div className="mx-auto max-w-7xl px-4 py-16 md:px-8 md:py-20">
            <p className={eyebrowLight}>
              <span className="h-px w-6 bg-gold-400" aria-hidden="true" />
              {c.routes.eyebrow}
            </p>
            <h2 className="mt-4 max-w-2xl font-display text-2xl font-extrabold tracking-tight text-white md:text-3xl">
              {c.routes.title}
            </h2>

            <div className="mt-8 grid gap-3 md:grid-cols-2">
              {c.routes.items.map(([from, to]) => (
                <button
                  key={`${from}-${to}`}
                  type="button"
                  onClick={() => selectRoute(from, to)}
                  className="group flex cursor-pointer items-center justify-between gap-4 rounded-sm border border-white/10 bg-white px-4 py-3.5 text-left transition hover:border-gold-300"
                >
                  <span className="flex min-w-0 items-center gap-2.5">
                    <Train className="h-4 w-4 shrink-0 text-brand-600" aria-hidden="true" />
                    <span className="truncate text-[12.5px] font-bold text-brand-950">
                      {from}
                      <span className="mx-1.5 text-[#94a3b8]">→</span>
                      {to}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-1 text-[10.5px] font-bold text-brand-700 transition group-hover:text-brand-900">
                    {c.routes.action}
                    <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </span>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="scroll-mt-28">
          <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 md:px-8 md:py-20 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <p className={eyebrow}>
                <span className="h-px w-6 bg-gold-400" aria-hidden="true" />
                {c.faq.eyebrow}
              </p>
              <h2 className="mt-4 font-display text-2xl font-extrabold tracking-tight text-brand-950 md:text-3xl">
                {c.faq.title}
              </h2>
              <p className="mt-4 max-w-sm text-[12.5px] leading-relaxed text-[#5b6b7f]">{c.footer.disclaimer}</p>
            </div>

            <div className="border-t border-[#e2e8f0]">
              {c.faq.items.map((item) => (
                <details key={item.q} className="group border-b border-[#e2e8f0] py-4">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[12.5px] font-bold text-brand-950 [&::-webkit-details-marker]:hidden">
                    {item.q}
                    <ChevronDown
                      className="h-4 w-4 shrink-0 text-brand-500 transition group-open:rotate-180"
                      aria-hidden="true"
                    />
                  </summary>
                  <p className="mt-2 max-w-2xl pr-6 text-[12px] leading-relaxed text-[#5b6b7f]">{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t-[3px] border-gold-400 bg-brand-950 text-white">
        <div className="mx-auto max-w-7xl px-4 py-12 md:px-8">
          <div className="grid gap-10 md:grid-cols-[1.4fr_0.8fr_0.8fr_1.4fr]">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-[4px] bg-white/10 text-gold-300">
                  <Train className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="leading-none">
                  <span className="block text-[13px] font-extrabold tracking-[0.16em] text-white">ETS RIDER</span>
                  <span className="mt-1 block text-[8.5px] font-bold uppercase tracking-[0.28em] text-white/40">
                    Predict System
                  </span>
                </span>
              </div>
              <p className="mt-4 max-w-xs text-[11.5px] leading-relaxed text-white/55">{c.footer.blurb}</p>
              <a
                href="https://www.ktmb.com.my"
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex items-center gap-1 text-[11px] font-bold text-gold-300 hover:text-gold-200"
              >
                ktmb.com.my
                <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
              </a>
            </div>

            <div>
              <h3 className="text-[9.5px] font-extrabold uppercase tracking-[0.2em] text-gold-300">{c.footer.explore}</h3>
              <ul className="mt-3 space-y-2 text-[11.5px] font-medium text-white/60">
                <li><a className="hover:text-white" href="#about">{c.nav.about}</a></li>
                <li><a className="hover:text-white" href="#network">{c.nav.network}</a></li>
                <li><a className="hover:text-white" href="#classes">{c.nav.classes}</a></li>
                <li><a className="hover:text-white" href="#predict">{c.nav.predict}</a></li>
                <li><a className="hover:text-white" href="#faq">{c.nav.faq}</a></li>
              </ul>
            </div>

            <div>
              <h3 className="text-[9.5px] font-extrabold uppercase tracking-[0.2em] text-gold-300">{c.footer.account}</h3>
              <ul className="mt-3 space-y-2 text-[11.5px] font-medium text-white/60">
                <li>
                  <button type="button" className="cursor-pointer hover:text-white" onClick={() => onAuth('signin')}>
                    {c.signIn}
                  </button>
                </li>
                <li>
                  <button type="button" className="cursor-pointer hover:text-white" onClick={() => onAuth('register')}>
                    {c.register}
                  </button>
                </li>
                <li>
                  <button type="button" className="cursor-pointer hover:text-white" onClick={startGuest} disabled={guestBusy}>
                    {c.hero.secondary}
                  </button>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-[9.5px] font-extrabold uppercase tracking-[0.2em] text-gold-300">{c.footer.credits}</h3>
              <p className="mt-3 text-[10px] leading-relaxed text-white/40">{c.footer.creditNote}</p>
              <ul className="mt-3 space-y-1.5">
                {CREDITS.map((credit) => (
                  <li key={credit.title} className="text-[10px] leading-snug text-white/55">
                    <a
                      href={credit.source}
                      target="_blank"
                      rel="noreferrer"
                      className="hover:text-white hover:underline"
                    >
                      {credit.title}
                    </a>{' '}
                    — {credit.author},{' '}
                    <a
                      href={credit.licenseUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="hover:text-white hover:underline"
                    >
                      {credit.license}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-10 flex flex-col gap-3 border-t border-white/10 pt-5 text-[10px] text-white/40 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-3xl leading-relaxed">{c.footer.disclaimer}</p>
            <div className="flex shrink-0 items-center gap-3">
              <span>{c.footer.rights}</span>
              <a href="#top" className="font-bold text-white/60 hover:text-white">
                {c.footer.backToTop}
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
