import pg from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../..', '.env') });

const { Pool } = pg;

// ─── 76 curated routes across all 26 countries ───────────────────────────────

interface RouteConfig {
  country: string;
  name: string;
  cities: string[];
  days: number;
  budget: 'budget' | 'moderate' | 'luxury';
  pace: 'relaxed' | 'normal' | 'fast';
  desc: string;
  interests: string[];
  tags: string[];
  groups: string[];
}

const ROUTES: RouteConfig[] = [

  // ── SRI LANKA (LK) ─────────────────────────────────────────────────────────
  { country: 'LK', name: 'Classic Sri Lanka Explorer', cities: ['Colombo','Kandy','Nuwara Eliya','Ella','Galle'], days: 7, budget: 'budget', pace: 'normal',
    desc: 'The ultimate Sri Lanka circuit — vibrant Colombo, sacred Kandy, misty tea country, the backpacker paradise of Ella, and the colonial charm of Galle.',
    interests: ['culture','nature','food','history'], tags: ['classic','first-timer','backpacker'], groups: ['solo','couple','group'] },
  { country: 'LK', name: 'Sri Lanka Southern Coast', cities: ['Negombo','Hikkaduwa','Unawatuna','Mirissa','Tangalle'], days: 5, budget: 'budget', pace: 'relaxed',
    desc: 'Follow Sri Lanka\'s stunning southern coastline. Surf, snorkel, visit ancient temples, and feast on fresh seafood.',
    interests: ['beach','food','culture','adventure'], tags: ['beach','coastal','surf'], groups: ['solo','couple'] },
  { country: 'LK', name: 'Sri Lanka Cultural Triangle', cities: ['Kandy','Sigiriya','Dambulla','Anuradhapura','Trincomalee'], days: 5, budget: 'budget', pace: 'normal',
    desc: 'Ancient kingdoms, rock fortresses, cave temples, and sacred cities. Sri Lanka\'s UNESCO heritage heartland.',
    interests: ['history','culture','nature'], tags: ['heritage','temples','unesco'], groups: ['solo','couple','family'] },

  // ── THAILAND (TH) ──────────────────────────────────────────────────────────
  { country: 'TH', name: 'Thailand Essential', cities: ['Bangkok','Chiang Mai','Phuket'], days: 7, budget: 'moderate', pace: 'normal',
    desc: 'The classic Thailand trio: Bangkok\'s buzzing street food and temples, Chiang Mai\'s culture and nature, Phuket\'s beaches.',
    interests: ['food','culture','beach','nightlife'], tags: ['classic','first-timer','best-of'], groups: ['solo','couple','group','family'] },
  { country: 'TH', name: 'Northern Thailand Adventure', cities: ['Chiang Mai','Chiang Rai','Pai'], days: 5, budget: 'budget', pace: 'relaxed',
    desc: 'Temples, night markets, mountain treks, and the laid-back vibe of Pai in northern Thailand.',
    interests: ['adventure','nature','culture','food'], tags: ['off-the-beaten-path','mountain','backpacker'], groups: ['solo','couple'] },
  { country: 'TH', name: 'Thai Islands Paradise', cities: ['Koh Samui','Koh Tao','Koh Phi Phi','Krabi'], days: 7, budget: 'moderate', pace: 'relaxed',
    desc: 'Island-hop through Thailand\'s best — from Samui to diving in Koh Tao, iconic Phi Phi, and Krabi\'s karst cliffs.',
    interests: ['beach','adventure','diving','nature'], tags: ['island','diving','tropical'], groups: ['solo','couple','group'] },
  { country: 'TH', name: 'Thailand Street Food Trail', cities: ['Bangkok','Ayutthaya','Chiang Mai','Sukhothai'], days: 7, budget: 'budget', pace: 'normal',
    desc: 'Thailand through its stomach — Bangkok\'s Chinatown, Ayutthaya\'s boat noodles, Chiang Mai\'s khao soi, and Sukhothai\'s ancient ruins.',
    interests: ['food','culture','history'], tags: ['food-tour','street-food','authentic'], groups: ['solo','couple','group'] },

  // ── JAPAN (JP) ──────────────────────────────────────────────────────────────
  { country: 'JP', name: 'Japan Golden Route', cities: ['Tokyo','Kyoto','Osaka'], days: 7, budget: 'moderate', pace: 'normal',
    desc: 'The classic Japan experience: Tokyo\'s neon-lit streets, Kyoto\'s serene temples, and Osaka\'s legendary food scene.',
    interests: ['culture','food','history','shopping'], tags: ['classic','first-timer','iconic'], groups: ['solo','couple','family','group'] },
  { country: 'JP', name: 'Japan Beyond Tokyo', cities: ['Tokyo','Kamakura','Hakone','Nikko'], days: 5, budget: 'moderate', pace: 'normal',
    desc: 'Day trips from Tokyo — the Great Buddha of Kamakura, Mt. Fuji views from Hakone, and Nikko\'s ornate shrines.',
    interests: ['culture','nature','history'], tags: ['day-trips','temples','nature'], groups: ['solo','couple','family'] },
  { country: 'JP', name: 'Japan Highlights Extended', cities: ['Tokyo','Kanazawa','Takayama','Kyoto','Hiroshima','Osaka'], days: 14, budget: 'moderate', pace: 'relaxed',
    desc: 'The complete Japan immersion — from Tokyo through the Alps towns, historic Kyoto, Hiroshima\'s peace memorial, and Osaka street food.',
    interests: ['culture','food','history','nature'], tags: ['comprehensive','deep-dive','bucket-list'], groups: ['solo','couple'] },
  { country: 'JP', name: 'Rural Japan Escape', cities: ['Kanazawa','Takayama','Nara','Kobe'], days: 7, budget: 'moderate', pace: 'relaxed',
    desc: 'Beyond the big cities — Kanazawa\'s samurai district, Takayama\'s mountain charm, Nara\'s friendly deer, and Kobe\'s wagyu beef.',
    interests: ['culture','food','nature'], tags: ['off-the-beaten-path','rural','foodie'], groups: ['solo','couple'] },

  // ── VIETNAM (VN) ────────────────────────────────────────────────────────────
  { country: 'VN', name: 'Vietnam North to South', cities: ['Hanoi','Ninh Binh','Hue','Hoi An','Ho Chi Minh City'], days: 10, budget: 'budget', pace: 'normal',
    desc: 'Traverse Vietnam from Hanoi through ancient Hue, artisan Hoi An, to vibrant Ho Chi Minh City.',
    interests: ['food','culture','history','adventure'], tags: ['classic','comprehensive','street-food'], groups: ['solo','couple','group'] },
  { country: 'VN', name: 'Vietnam Beach & Culture', cities: ['Da Nang','Hoi An','Nha Trang','Phu Quoc'], days: 7, budget: 'budget', pace: 'relaxed',
    desc: 'Vietnam\'s coastal gems — from Da Nang\'s marble mountains through lantern-lit Hoi An to tropical Phu Quoc.',
    interests: ['beach','food','culture'], tags: ['coastal','beach','relaxation'], groups: ['solo','couple','family'] },
  { country: 'VN', name: 'Northern Vietnam Explorer', cities: ['Hanoi','Ha Long Bay','Sapa','Ninh Binh'], days: 5, budget: 'budget', pace: 'normal',
    desc: 'Hanoi\'s old quarter, cruising Ha Long Bay, trekking Sapa\'s rice terraces, and the karst landscapes of Ninh Binh.',
    interests: ['nature','adventure','culture','food'], tags: ['adventure','trekking','scenic'], groups: ['solo','couple','group'] },
  { country: 'VN', name: 'Vietnam Street Food Safari', cities: ['Hanoi','Hue','Hoi An','Ho Chi Minh City'], days: 7, budget: 'budget', pace: 'normal',
    desc: 'Eat your way through Vietnam — Hanoi\'s pho, Hue\'s imperial cuisine, Hoi An\'s cao lau, and Saigon\'s street corners.',
    interests: ['food','culture'], tags: ['food-tour','street-food','authentic'], groups: ['solo','couple','group'] },

  // ── INDONESIA (ID) ─────────────────────────────────────────────────────────
  { country: 'ID', name: 'Bali Complete', cities: ['Ubud','Canggu','Seminyak','Sanur','Bali'], days: 7, budget: 'moderate', pace: 'relaxed',
    desc: 'The definitive Bali itinerary — spiritual Ubud, surf-town Canggu, beach-club Seminyak, and relaxed Sanur.',
    interests: ['wellness','beach','culture','food'], tags: ['tropical','wellness','beach'], groups: ['solo','couple'] },
  { country: 'ID', name: 'Java & Bali Adventure', cities: ['Jakarta','Yogyakarta','Bali','Ubud'], days: 7, budget: 'moderate', pace: 'normal',
    desc: 'From Jakarta\'s urban buzz to Yogyakarta\'s ancient temples (Borobudur, Prambanan) and Bali\'s paradise.',
    interests: ['culture','history','nature','adventure'], tags: ['temples','heritage','diverse'], groups: ['solo','couple','group'] },
  { country: 'ID', name: 'Indonesia Island Explorer', cities: ['Bali','Nusa Penida','Lombok','Gili Islands'], days: 7, budget: 'budget', pace: 'relaxed',
    desc: 'Island-hop east of Bali — Nusa Penida\'s cliffs, Lombok\'s quiet beauty, and the Gili Islands\' turquoise waters.',
    interests: ['beach','diving','nature','adventure'], tags: ['island','diving','off-the-beaten-path'], groups: ['solo','couple'] },

  // ── INDIA (IN) ──────────────────────────────────────────────────────────────
  { country: 'IN', name: 'India Golden Triangle', cities: ['Delhi','Agra','Jaipur'], days: 5, budget: 'budget', pace: 'normal',
    desc: 'India\'s most iconic route — Delhi\'s chaos, the Taj Mahal in Agra, and the Pink City of Jaipur.',
    interests: ['culture','history','food','shopping'], tags: ['classic','iconic','first-timer'], groups: ['solo','couple','group','family'] },
  { country: 'IN', name: 'Rajasthan Royal Circuit', cities: ['Jaipur','Jodhpur','Udaipur','Pushkar'], days: 7, budget: 'moderate', pace: 'normal',
    desc: 'Through Rajasthan\'s royal cities — Jaipur\'s palaces, Jodhpur\'s blue city, Udaipur\'s lakes, and Pushkar\'s holy ghats.',
    interests: ['culture','history','food','architecture'], tags: ['royal','palaces','desert'], groups: ['solo','couple','group'] },
  { country: 'IN', name: 'Kerala Backwaters & Beaches', cities: ['Kerala','Goa','Mumbai'], days: 7, budget: 'moderate', pace: 'relaxed',
    desc: 'India\'s tropical west coast — Kerala\'s serene backwaters, Goa\'s beaches and nightlife, Mumbai\'s Bollywood energy.',
    interests: ['beach','nature','food','wellness'], tags: ['coastal','backwaters','tropical'], groups: ['solo','couple'] },
  { country: 'IN', name: 'India Spiritual Journey', cities: ['Delhi','Varanasi','Rajasthan'], days: 7, budget: 'budget', pace: 'relaxed',
    desc: 'India\'s spiritual heart — the Ganges ceremonies in Varanasi, Rajasthan\'s desert temples, and Delhi\'s Sufi shrines.',
    interests: ['spiritual','culture','history'], tags: ['spiritual','meditation','temples'], groups: ['solo','couple'] },

  // ── PORTUGAL (PT) ──────────────────────────────────────────────────────────
  { country: 'PT', name: 'Portugal Coast to Coast', cities: ['Lisbon','Sintra','Porto'], days: 5, budget: 'moderate', pace: 'normal',
    desc: 'Lisbon\'s pastel neighborhoods, Sintra\'s fairytale castles, and Porto\'s port wine cellars.',
    interests: ['culture','food','history','nature'], tags: ['european','wine','coastal'], groups: ['solo','couple','group'] },
  { country: 'PT', name: 'Portugal Extended Explorer', cities: ['Lisbon','Cascais','Sintra','Aveiro','Porto','Madeira'], days: 10, budget: 'moderate', pace: 'relaxed',
    desc: 'From Lisbon\'s fado bars through the Venice of Portugal (Aveiro) to Porto, then fly to Madeira\'s subtropical paradise.',
    interests: ['culture','food','nature','beach'], tags: ['comprehensive','wine','islands'], groups: ['solo','couple'] },
  { country: 'PT', name: 'Algarve Beach Escape', cities: ['Faro','Lagos','Albufeira'], days: 4, budget: 'moderate', pace: 'relaxed',
    desc: 'Portugal\'s sunny southern coast — golden cliffs, hidden grottoes, and some of Europe\'s best beaches.',
    interests: ['beach','food','nature'], tags: ['beach','coastal','sunny'], groups: ['solo','couple','family'] },

  // ── ITALY (IT) ─────────────────────────────────────────────────────────────
  { country: 'IT', name: 'Italy Highlights', cities: ['Rome','Florence','Venice'], days: 7, budget: 'moderate', pace: 'normal',
    desc: 'The classic Italian trilogy — Rome\'s ancient wonders, Florence\'s art treasures, Venice\'s canals.',
    interests: ['culture','food','history','art'], tags: ['classic','european','iconic'], groups: ['solo','couple','family','group'] },
  { country: 'IT', name: 'Amalfi & Southern Italy', cities: ['Naples','Pompeii','Amalfi','Positano'], days: 5, budget: 'moderate', pace: 'relaxed',
    desc: 'Naples\' pizza, Pompeii\'s ruins, and the jaw-dropping Amalfi Coast drive through Positano.',
    interests: ['food','culture','history','beach'], tags: ['coastal','food-tour','scenic'], groups: ['solo','couple'] },
  { country: 'IT', name: 'Tuscany & Northern Italy', cities: ['Milan','Verona','Bologna','Florence','Siena','Cinque Terre'], days: 10, budget: 'moderate', pace: 'normal',
    desc: 'From Milan\'s fashion to Romeo\'s Verona, Bologna\'s food capital, Renaissance Florence, Siena, and the colorful Cinque Terre.',
    interests: ['food','culture','art','nature'], tags: ['comprehensive','foodie','wine'], groups: ['solo','couple','group'] },
  { country: 'IT', name: 'Italy Food Pilgrimage', cities: ['Bologna','Verona','Genoa','Pisa'], days: 5, budget: 'moderate', pace: 'relaxed',
    desc: 'Italy through its kitchens — Bologna\'s ragu, Verona\'s risotto, Genoa\'s pesto, and Tuscan cooking classes.',
    interests: ['food','culture','wine'], tags: ['foodie','culinary','wine'], groups: ['solo','couple','group'] },

  // ── SPAIN (ES) ──────────────────────────────────────────────────────────────
  { country: 'ES', name: 'Spain Coast & Culture', cities: ['Barcelona','Madrid','Seville'], days: 7, budget: 'moderate', pace: 'normal',
    desc: 'Gaudí\'s Barcelona, Madrid\'s museums and tapas, and Seville\'s flamenco passion.',
    interests: ['culture','food','art','nightlife'], tags: ['european','foodie','vibrant'], groups: ['solo','couple','group'] },
  { country: 'ES', name: 'Andalusia Explorer', cities: ['Seville','Cordoba','Granada','Ronda','Malaga'], days: 7, budget: 'moderate', pace: 'normal',
    desc: 'Southern Spain\'s Moorish heritage — Seville\'s Alcázar, Córdoba\'s Mezquita, Granada\'s Alhambra, and Ronda\'s gorge.',
    interests: ['history','culture','food','architecture'], tags: ['historic','moorish','andalusia'], groups: ['solo','couple','group'] },
  { country: 'ES', name: 'Spanish Islands', cities: ['Mallorca','Ibiza'], days: 5, budget: 'moderate', pace: 'relaxed',
    desc: 'Mallorca\'s mountains and coves, then Ibiza — not just nightlife but also beautiful old town and secret beaches.',
    interests: ['beach','nightlife','food','nature'], tags: ['island','party','beach'], groups: ['solo','couple','group'] },

  // ── MOROCCO (MA) ────────────────────────────────────────────────────────────
  { country: 'MA', name: 'Morocco Imperial Cities', cities: ['Marrakech','Fes','Meknes','Rabat'], days: 7, budget: 'moderate', pace: 'normal',
    desc: 'Journey through Morocco\'s imperial cities — maze-like medinas, vibrant souks, and incredible food.',
    interests: ['culture','food','history','shopping'], tags: ['cultural','historic','food-tour'], groups: ['solo','couple','group'] },
  { country: 'MA', name: 'Morocco Desert & Mountains', cities: ['Marrakech','Ouarzazate','Sahara Desert','Chefchaouen'], days: 7, budget: 'budget', pace: 'normal',
    desc: 'From the red city through the Atlas Mountains, camp under Saharan stars, and end in the blue city of Chefchaouen.',
    interests: ['adventure','nature','culture'], tags: ['desert','mountain','adventure'], groups: ['solo','couple','group'] },
  { country: 'MA', name: 'Morocco Coastal Escape', cities: ['Casablanca','Essaouira','Agadir','Tangier'], days: 5, budget: 'budget', pace: 'relaxed',
    desc: 'Morocco\'s Atlantic coast — Casablanca\'s art deco, wind-swept Essaouira, sunny Agadir, and Tangier\'s gateway to Africa.',
    interests: ['beach','culture','food'], tags: ['coastal','relaxation','surf'], groups: ['solo','couple'] },

  // ── EGYPT (EG) ──────────────────────────────────────────────────────────────
  { country: 'EG', name: 'Egypt Pyramids & Beyond', cities: ['Cairo','Giza','Luxor','Aswan'], days: 5, budget: 'moderate', pace: 'normal',
    desc: 'From the Pyramids of Giza to the Valley of the Kings and the Nile temples of Aswan.',
    interests: ['history','culture','adventure'], tags: ['historic','iconic','bucket-list'], groups: ['solo','couple','family','group'] },
  { country: 'EG', name: 'Egypt Red Sea & Sinai', cities: ['Cairo','Sharm El-Sheikh','Dahab','Hurghada'], days: 7, budget: 'moderate', pace: 'relaxed',
    desc: 'Pyramids then paradise — dive the Red Sea in Dahab, relax in Sharm, and snorkel Hurghada\'s coral reefs.',
    interests: ['beach','diving','adventure','history'], tags: ['diving','beach','desert'], groups: ['solo','couple'] },

  // ── FRANCE (FR) ─────────────────────────────────────────────────────────────
  { country: 'FR', name: 'France Essentials', cities: ['Paris','Versailles','Lyon','Nice'], days: 7, budget: 'moderate', pace: 'normal',
    desc: 'Paris icons, Versailles splendor, Lyon\'s gastronomy, and the French Riviera in Nice.',
    interests: ['culture','food','art','history'], tags: ['classic','european','iconic'], groups: ['solo','couple','family','group'] },
  { country: 'FR', name: 'Provence & Riviera', cities: ['Nice','Cannes','Avignon','Marseille'], days: 5, budget: 'moderate', pace: 'relaxed',
    desc: 'Southern France\'s lavender fields, glamorous Cannes, medieval Avignon, and Marseille\'s bouillabaisse.',
    interests: ['food','culture','beach','nature'], tags: ['french-riviera','wine','coastal'], groups: ['solo','couple'] },
  { country: 'FR', name: 'Paris & Loire Valley', cities: ['Paris','Loire Valley','Mont Saint-Michel'], days: 5, budget: 'moderate', pace: 'normal',
    desc: 'Paris romance, Loire Valley châteaux, and the magical Mont Saint-Michel rising from the sea.',
    interests: ['culture','history','food','nature'], tags: ['romantic','castles','historic'], groups: ['solo','couple'] },

  // ── GERMANY (DE) ────────────────────────────────────────────────────────────
  { country: 'DE', name: 'Germany Best Of', cities: ['Berlin','Munich','Hamburg'], days: 7, budget: 'moderate', pace: 'normal',
    desc: 'Berlin\'s edgy culture, Munich\'s beer halls and Alps, Hamburg\'s maritime cool.',
    interests: ['culture','food','history','nightlife'], tags: ['classic','european','diverse'], groups: ['solo','couple','group'] },
  { country: 'DE', name: 'Romantic Road & Bavaria', cities: ['Munich','Neuschwanstein','Rothenburg','Heidelberg','Black Forest'], days: 7, budget: 'moderate', pace: 'normal',
    desc: 'Germany\'s fairy-tale route — Neuschwanstein Castle, medieval Rothenburg, romantic Heidelberg, and the Black Forest.',
    interests: ['history','nature','culture','food'], tags: ['romantic','castles','scenic'], groups: ['solo','couple','family'] },

  // ── GREECE (GR) ─────────────────────────────────────────────────────────────
  { country: 'GR', name: 'Greece Island Hopping', cities: ['Athens','Santorini','Mykonos','Paros'], days: 7, budget: 'moderate', pace: 'relaxed',
    desc: 'Athens\' Acropolis, Santorini\'s sunsets, Mykonos\' nightlife, and Paros\' quiet charm.',
    interests: ['beach','culture','food','nightlife'], tags: ['island','classic','iconic'], groups: ['solo','couple','group'] },
  { country: 'GR', name: 'Greece History & Nature', cities: ['Athens','Meteora','Delphi','Olympia','Nafplio'], days: 7, budget: 'moderate', pace: 'normal',
    desc: 'Mainland Greece — the Acropolis, floating Meteora monasteries, the Oracle at Delphi, ancient Olympia.',
    interests: ['history','culture','nature'], tags: ['historic','mainland','archaeological'], groups: ['solo','couple','family'] },
  { country: 'GR', name: 'Crete Explorer', cities: ['Crete'], days: 5, budget: 'budget', pace: 'relaxed',
    desc: 'Greece\'s largest island — Minoan ruins, mountain gorges, pristine beaches, and the warmest hospitality.',
    interests: ['beach','history','food','nature'], tags: ['island','authentic','off-the-beaten-path'], groups: ['solo','couple','family'] },
  { country: 'GR', name: 'Greece Food & Wine', cities: ['Athens','Thessaloniki','Santorini'], days: 5, budget: 'moderate', pace: 'relaxed',
    desc: 'Greece through its cuisine — Athens\' tavernas, Thessaloniki\'s food markets, and Santorini\'s volcanic wines.',
    interests: ['food','wine','culture'], tags: ['foodie','wine','culinary'], groups: ['solo','couple'] },

  // ── TURKEY (TR) ─────────────────────────────────────────────────────────────
  { country: 'TR', name: 'Turkey Highlights', cities: ['Istanbul','Cappadocia','Antalya'], days: 7, budget: 'moderate', pace: 'normal',
    desc: 'Istanbul\'s mosques and bazaars, Cappadocia\'s balloon rides and cave hotels, Antalya\'s turquoise coast.',
    interests: ['culture','history','adventure','food'], tags: ['classic','iconic','diverse'], groups: ['solo','couple','group','family'] },
  { country: 'TR', name: 'Turkish Riviera & Ruins', cities: ['Antalya','Fethiye','Kas','Bodrum','Ephesus'], days: 7, budget: 'moderate', pace: 'relaxed',
    desc: 'The turquoise coast — Antalya\'s old town, Fethiye\'s blue lagoon, ancient Ephesus, and cosmopolitan Bodrum.',
    interests: ['beach','history','culture','food'], tags: ['coastal','ancient','beach'], groups: ['solo','couple'] },
  { country: 'TR', name: 'Istanbul Deep Dive', cities: ['Istanbul'], days: 4, budget: 'moderate', pace: 'relaxed',
    desc: 'Four days in the city that straddles two continents — bazaars, mosques, Bosphorus cruises, rooftop dinners, and hidden gems.',
    interests: ['culture','food','history','shopping'], tags: ['city-break','deep-dive','foodie'], groups: ['solo','couple'] },

  // ── MALAYSIA (MY) ───────────────────────────────────────────────────────────
  { country: 'MY', name: 'Malaysia City & Nature', cities: ['Kuala Lumpur','Penang','Langkawi'], days: 5, budget: 'budget', pace: 'normal',
    desc: 'KL\'s towering skyline, Penang\'s legendary street food, and Langkawi\'s island paradise.',
    interests: ['food','beach','culture','nature'], tags: ['diverse','food-paradise','tropical'], groups: ['solo','couple','family'] },
  { country: 'MY', name: 'Borneo Wildlife Adventure', cities: ['Kota Kinabalu','Sandakan','Kuching'], days: 7, budget: 'moderate', pace: 'normal',
    desc: 'Malaysian Borneo — climb Mt. Kinabalu, see orangutans in Sandakan, and explore Sarawak\'s rainforests.',
    interests: ['nature','adventure','wildlife'], tags: ['wildlife','rainforest','adventure'], groups: ['solo','couple','family'] },
  { country: 'MY', name: 'Malaysia Heritage Trail', cities: ['Kuala Lumpur','Malacca','George Town','Cameron Highlands'], days: 5, budget: 'budget', pace: 'normal',
    desc: 'KL\'s modernity, Malacca\'s colonial history, George Town\'s street art, and Cameron Highlands\' tea plantations.',
    interests: ['culture','food','history','nature'], tags: ['heritage','street-food','tea'], groups: ['solo','couple','group'] },

  // ── PHILIPPINES (PH) ───────────────────────────────────────────────────────
  { country: 'PH', name: 'Philippines Island Hopping', cities: ['Manila','Cebu','Boracay'], days: 7, budget: 'budget', pace: 'relaxed',
    desc: 'Manila\'s urban energy, Cebu\'s whale sharks, and Boracay\'s white sand perfection.',
    interests: ['beach','adventure','nature','food'], tags: ['island','beach','diving'], groups: ['solo','couple','group'] },
  { country: 'PH', name: 'Palawan Paradise', cities: ['Manila','Palawan','El Nido','Coron'], days: 7, budget: 'budget', pace: 'relaxed',
    desc: 'The Philippines\' crown jewel — Palawan\'s underground river, El Nido\'s lagoons, and Coron\'s shipwreck dives.',
    interests: ['beach','diving','nature','adventure'], tags: ['paradise','diving','lagoon'], groups: ['solo','couple'] },

  // ── NEPAL (NP) ──────────────────────────────────────────────────────────────
  { country: 'NP', name: 'Nepal Himalayan Explorer', cities: ['Kathmandu','Pokhara','Chitwan'], days: 7, budget: 'budget', pace: 'normal',
    desc: 'Ancient temples in Kathmandu, lakeside serenity in Pokhara, and jungle safari in Chitwan.',
    interests: ['adventure','nature','culture','trekking'], tags: ['adventure','mountain','spiritual'], groups: ['solo','couple','group'] },
  { country: 'NP', name: 'Nepal Cultural Heritage', cities: ['Kathmandu','Bhaktapur','Patan','Nagarkot'], days: 4, budget: 'budget', pace: 'relaxed',
    desc: 'Kathmandu Valley\'s three ancient cities — Durbar Squares, living goddess temples, and Himalayan sunrise from Nagarkot.',
    interests: ['culture','history','architecture'], tags: ['heritage','temples','photography'], groups: ['solo','couple','family'] },

  // ── AUSTRALIA (AU) ─────────────────────────────────────────────────────────
  { country: 'AU', name: 'Australia East Coast', cities: ['Sydney','Melbourne','Brisbane','Gold Coast','Cairns'], days: 14, budget: 'moderate', pace: 'normal',
    desc: 'The classic Australian road trip — Sydney\'s harbour, Melbourne\'s laneways, the Gold Coast surf, and the Great Barrier Reef.',
    interests: ['beach','nature','food','adventure'], tags: ['classic','road-trip','coastal'], groups: ['solo','couple','group'] },
  { country: 'AU', name: 'Australia Highlights', cities: ['Sydney','Melbourne','Uluru'], days: 7, budget: 'moderate', pace: 'normal',
    desc: 'Sydney\'s icons, Melbourne\'s culture, and the sacred red rock of Uluru in the Outback.',
    interests: ['culture','nature','food','adventure'], tags: ['iconic','diverse','bucket-list'], groups: ['solo','couple','family'] },

  // ── NEW ZEALAND (NZ) ───────────────────────────────────────────────────────
  { country: 'NZ', name: 'New Zealand South Island', cities: ['Christchurch','Queenstown','Fiordland','Lake Tekapo','Milford Sound'], days: 7, budget: 'moderate', pace: 'normal',
    desc: 'South Island\'s epic scenery — Queenstown adventures, Milford Sound\'s fjords, and stargazing at Lake Tekapo.',
    interests: ['adventure','nature','scenic'], tags: ['adventure','scenic','lord-of-the-rings'], groups: ['solo','couple','group'] },
  { country: 'NZ', name: 'New Zealand Highlights', cities: ['Auckland','Rotorua','Wellington','Queenstown'], days: 7, budget: 'moderate', pace: 'normal',
    desc: 'Both islands — Auckland\'s harbours, Rotorua\'s geothermal wonders, Wellington\'s cool, and Queenstown\'s thrills.',
    interests: ['adventure','nature','culture','food'], tags: ['comprehensive','diverse','scenic'], groups: ['solo','couple','family'] },
  { country: 'NZ', name: 'NZ North Island Explorer', cities: ['Auckland','Bay of Islands','Rotorua','Tongariro','Wellington'], days: 7, budget: 'moderate', pace: 'normal',
    desc: 'North Island road trip — Bay of Islands sailing, Rotorua geysers, Tongariro crossing, and capital Wellington.',
    interests: ['nature','adventure','culture'], tags: ['road-trip','volcanic','scenic'], groups: ['solo','couple','group'] },

  // ── AUSTRIA (AT) ────────────────────────────────────────────────────────────
  { country: 'AT', name: 'Austria Classical Tour', cities: ['Vienna','Salzburg','Innsbruck','Hallstatt'], days: 5, budget: 'moderate', pace: 'normal',
    desc: 'Vienna\'s imperial palaces, Salzburg\'s Mozart charm, Innsbruck\'s alpine setting, and fairytale Hallstatt.',
    interests: ['culture','history','music','nature'], tags: ['classical','alpine','scenic'], groups: ['solo','couple','family'] },
  { country: 'AT', name: 'Austrian Alps Adventure', cities: ['Innsbruck','Kitzbühel','Zillertal','Sölden'], days: 5, budget: 'moderate', pace: 'normal',
    desc: 'Austria\'s Tyrol region — ski resorts, alpine meadows, mountain biking, and traditional Tyrolean villages.',
    interests: ['adventure','nature','skiing','food'], tags: ['alpine','skiing','mountain'], groups: ['solo','couple','group'] },

  // ── SWITZERLAND (CH) ───────────────────────────────────────────────────────
  { country: 'CH', name: 'Switzerland Grand Tour', cities: ['Zurich','Lucerne','Interlaken','Zermatt','Geneva'], days: 7, budget: 'luxury', pace: 'normal',
    desc: 'Swiss perfection — Zurich\'s elegance, Lucerne\'s lake, Interlaken\'s adventures, the Matterhorn, and Geneva\'s chic.',
    interests: ['nature','adventure','food','culture'], tags: ['alpine','luxury','scenic'], groups: ['solo','couple','family'] },
  { country: 'CH', name: 'Swiss Mountain Experience', cities: ['Interlaken','Grindelwald','Jungfrau','Zermatt'], days: 5, budget: 'luxury', pace: 'relaxed',
    desc: 'The Swiss Alps at their finest — Jungfraujoch\'s Top of Europe, Grindelwald\'s valleys, and Zermatt\'s Matterhorn.',
    interests: ['nature','adventure','scenic'], tags: ['mountain','scenic','train'], groups: ['solo','couple'] },

  // ── TAIWAN (TW) ─────────────────────────────────────────────────────────────
  { country: 'TW', name: 'Taiwan Highlights', cities: ['Taipei','Jiufen','Hualien','Taroko Gorge','Kaohsiung'], days: 7, budget: 'budget', pace: 'normal',
    desc: 'Taipei\'s night markets, nostalgic Jiufen, Taroko Gorge\'s marble canyons, and Kaohsiung\'s harbour vibes.',
    interests: ['food','culture','nature','adventure'], tags: ['night-markets','gorge','diverse'], groups: ['solo','couple','group'] },
  { country: 'TW', name: 'Taiwan Scenic Railway', cities: ['Taipei','Hualien','Taitung','Sun Moon Lake','Alishan'], days: 7, budget: 'budget', pace: 'relaxed',
    desc: 'Circle Taiwan by rail — east coast cliffs, Sun Moon Lake\'s calm, and Alishan\'s sunrise above the clouds.',
    interests: ['nature','culture','food','scenic'], tags: ['train','scenic','photography'], groups: ['solo','couple'] },

  // ── SINGAPORE (SG) ─────────────────────────────────────────────────────────
  { country: 'SG', name: 'Singapore City Explorer', cities: ['Singapore','Marina Bay','Chinatown','Sentosa Island'], days: 3, budget: 'moderate', pace: 'normal',
    desc: 'The Lion City in 3 days — Marina Bay\'s skyline, hawker centre feasting, Chinatown heritage, and Sentosa\'s beaches.',
    interests: ['food','culture','shopping','nature'], tags: ['city-break','foodie','modern'], groups: ['solo','couple','family'] },
  { country: 'SG', name: 'Singapore Food & Culture', cities: ['Singapore','Little India','Chinatown','Arab Street','Orchard Road'], days: 4, budget: 'moderate', pace: 'relaxed',
    desc: 'A deep dive into Singapore\'s multicultural neighborhoods — from Little India\'s spices to Chinatown\'s temples and Arab Street\'s textiles.',
    interests: ['food','culture','shopping'], tags: ['foodie','multicultural','heritage'], groups: ['solo','couple'] },

  // ── BANGLADESH (BD) ────────────────────────────────────────────────────────
  { country: 'BD', name: 'Bangladesh Explorer', cities: ['Dhaka','Sylhet','Chittagong','Sundarbans'], days: 7, budget: 'budget', pace: 'normal',
    desc: 'Off-the-beaten-path Bangladesh — Dhaka\'s chaos, Sylhet\'s tea gardens, Chittagong\'s hills, and the Sundarbans mangroves.',
    interests: ['adventure','nature','culture','food'], tags: ['off-the-beaten-path','authentic','nature'], groups: ['solo','couple'] },
  { country: 'BD', name: 'Bangladesh Heritage Trail', cities: ['Dhaka','Rajshahi','Bogra','Srimangal'], days: 5, budget: 'budget', pace: 'normal',
    desc: 'Ancient Buddhist ruins, Rajshahi\'s mango orchards, the Mahasthangarh archaeological site, and Srimangal\'s tea estates.',
    interests: ['history','culture','nature','food'], tags: ['heritage','archaeological','tea'], groups: ['solo','couple'] },

  // ── MYANMAR (MM) ────────────────────────────────────────────────────────────
  { country: 'MM', name: 'Myanmar Golden Temples', cities: ['Yangon','Bagan','Mandalay','Inle Lake'], days: 7, budget: 'budget', pace: 'normal',
    desc: 'Myanmar\'s temple trail — Yangon\'s golden Shwedagon, Bagan\'s 2000 stupas, Mandalay\'s royal past, and Inle Lake\'s floating gardens.',
    interests: ['culture','history','nature','spiritual'], tags: ['temples','spiritual','authentic'], groups: ['solo','couple','group'] },
  { country: 'MM', name: 'Myanmar Off the Beaten Path', cities: ['Yangon','Kalaw','Inle Lake','Hsipaw'], days: 7, budget: 'budget', pace: 'relaxed',
    desc: 'Trek from Kalaw to Inle Lake through Shan State, then explore Hsipaw\'s hill tribes and morning markets.',
    interests: ['trekking','nature','culture','adventure'], tags: ['trekking','authentic','off-the-beaten-path'], groups: ['solo','couple'] },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function slugify(text: string): string {
  return text.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

function distributeCities(cities: string[], days: number): string[] {
  const result: string[] = [];
  const daysPerCity = Math.max(1, Math.floor(days / cities.length));
  for (let i = 0; i < cities.length; i++) {
    const count = i === cities.length - 1 ? days - result.length : daysPerCity;
    for (let j = 0; j < count; j++) result.push(cities[i]);
  }
  return result.slice(0, days);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function generateRoutes() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    console.log(`\n🗺️  Generating ${ROUTES.length} routes from real place data...\n`);

    let created = 0;
    let skipped = 0;

    for (const config of ROUTES) {
      const slug = slugify(config.name);

      // Skip if exists
      const existing = await pool.query(
        'SELECT id FROM route_templates WHERE slug = $1', [slug]
      );
      if (existing.rows.length > 0) {
        console.log(`   ⏭️  ${config.name}`);
        skipped++;
        continue;
      }

      // 1. Create route template
      const rtResult = await pool.query(`
        INSERT INTO route_templates (
          provider_id, name, slug, short_description, description,
          country_code, cities, start_city, end_city,
          duration_days, budget_level, pace, group_types,
          tags, interests, is_published, is_official, is_featured, published_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,true,true,$16,NOW())
        RETURNING id
      `, [
        1, config.name, slug,
        config.desc.substring(0, 200),
        config.desc,
        config.country, config.cities, config.cities[0], config.cities[config.cities.length - 1],
        config.days, config.budget, config.pace, config.groups,
        config.tags, config.interests,
        created < 26, // first 26 routes are featured (one per country)
      ]);
      const routeId = rtResult.rows[0].id;

      // 2. Create version
      const vResult = await pool.query(`
        INSERT INTO route_versions (route_template_id, version_number)
        VALUES ($1, 1) RETURNING id
      `, [routeId]);
      const versionId = vResult.rows[0].id;
      await pool.query(
        'UPDATE route_templates SET current_version_id = $1 WHERE id = $2',
        [versionId, routeId]
      );

      // 3. Build days with REAL places
      const citiesPerDay = distributeCities(config.cities, config.days);
      let totalActivities = 0;

      for (let dayNum = 1; dayNum <= config.days; dayNum++) {
        const dayCity = citiesPerDay[dayNum - 1];

        const dayResult = await pool.query(`
          INSERT INTO route_days (route_version_id, day_number, title, city, overnight_city)
          VALUES ($1, $2, $3, $4, $4) RETURNING id
        `, [versionId, dayNum, `Day ${dayNum}: ${dayCity}`, dayCity]);
        const dayId = dayResult.rows[0].id;

        // Get top-rated, diverse places for this city
        const placesResult = await pool.query(`
          SELECT DISTINCT ON (main_category)
            id, name, main_category, sub_category, latitude, longitude, rating
          FROM places
          WHERE country_code = $1 AND city = $2 AND is_active = true
          ORDER BY main_category, rating DESC NULLS LAST
        `, [config.country, dayCity]);

        let places = placesResult.rows;

        // If not enough diverse categories, get top-rated overall
        if (places.length < 3) {
          const fallback = await pool.query(`
            SELECT id, name, main_category, sub_category, latitude, longitude, rating
            FROM places
            WHERE country_code = $1 AND city = $2 AND is_active = true
            ORDER BY rating DESC NULLS LAST
            LIMIT 6
          `, [config.country, dayCity]);
          places = fallback.rows;
        }

        // If still no places for this city, try fuzzy match
        if (places.length === 0) {
          const fuzzy = await pool.query(`
            SELECT id, name, main_category, sub_category, latitude, longitude, rating
            FROM places
            WHERE country_code = $1 AND city ILIKE $2 AND is_active = true
            ORDER BY rating DESC NULLS LAST
            LIMIT 6
          `, [config.country, `%${dayCity}%`]);
          places = fuzzy.rows;
        }

        // Still nothing? Get any places in the country
        if (places.length === 0) {
          const any = await pool.query(`
            SELECT id, name, main_category, sub_category, latitude, longitude, rating
            FROM places
            WHERE country_code = $1 AND is_active = true
            ORDER BY rating DESC NULLS LAST
            LIMIT 4
          `, [config.country]);
          places = any.rows;
        }

        const activitiesPerDay = Math.min(places.length, 5);
        for (let seq = 0; seq < activitiesPerDay; seq++) {
          const place = places[seq];
          const hour = 8 + (seq * 2);
          const startTime = `${String(hour).padStart(2, '0')}:00`;

          await pool.query(`
            INSERT INTO route_activities (
              route_day_id, place_id, name, category, sequence_order,
              start_time, duration_minutes, place_name, latitude, longitude
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
          `, [
            dayId, place.id, place.name, place.main_category,
            seq + 1, startTime, 90,
            place.name, place.latitude, place.longitude,
          ]);
          totalActivities++;
        }
      }

      console.log(`   ✅ ${config.name} (${config.days}d, ${totalActivities} acts — ${config.cities.join(' → ')})`);
      created++;
    }

    // Update country route_count
    await pool.query(`
      UPDATE countries SET route_count = COALESCE(sub.cnt, 0)
      FROM (
        SELECT country_code, COUNT(*) as cnt
        FROM route_templates WHERE is_published = true
        GROUP BY country_code
      ) sub
      WHERE countries.code = sub.country_code
    `);

    console.log(`\n✅ Done! Created ${created} routes (${skipped} skipped as existing)`);
    console.log(`📊 Total: ${ROUTES.length} route definitions\n`);

  } catch (error) {
    console.error('❌ Route generation failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

generateRoutes();
