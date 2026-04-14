-- ============================================================
-- 003_seed_priority_countries.sql
-- Seed transport networks for priority tourist countries
-- Vietnam, Indonesia, Sri Lanka, Japan, India, Philippines, Malaysia
-- ============================================================

-- ────────────────────────────────────────────────
-- 🇻🇳  VIETNAM  (15 nodes, 21 edges)
-- ────────────────────────────────────────────────

INSERT INTO transport_nodes (name, slug, hierarchy, node_type, country_code, location) VALUES
  ('Hanoi',           'hanoi',            'international_hub', 'city_center', 'VN', ST_SetSRID(ST_MakePoint(105.8342, 21.0278), 4326)),
  ('Ho Chi Minh City','ho-chi-minh-city', 'international_hub', 'city_center', 'VN', ST_SetSRID(ST_MakePoint(106.6297, 10.8231), 4326)),
  ('Da Nang',         'da-nang',          'regional_hub',      'city_center', 'VN', ST_SetSRID(ST_MakePoint(108.2022, 16.0544), 4326)),
  ('Hoi An',          'hoi-an',           'regional_hub',      'city_center', 'VN', ST_SetSRID(ST_MakePoint(108.3380, 15.8801), 4326)),
  ('Hue',             'hue',              'regional_hub',      'city_center', 'VN', ST_SetSRID(ST_MakePoint(107.5905, 16.4637), 4326)),
  ('Nha Trang',       'nha-trang',        'regional_hub',      'city_center', 'VN', ST_SetSRID(ST_MakePoint(109.1967, 12.2388), 4326)),
  ('Da Lat',          'da-lat',           'local_hub',         'city_center', 'VN', ST_SetSRID(ST_MakePoint(108.4583, 11.9404), 4326)),
  ('Sapa',            'sapa',             'local_hub',         'city_center', 'VN', ST_SetSRID(ST_MakePoint(103.8440, 22.3364), 4326)),
  ('Ninh Binh',       'ninh-binh',        'local_hub',         'city_center', 'VN', ST_SetSRID(ST_MakePoint(105.9750, 20.2506), 4326)),
  ('Ha Long Bay',     'ha-long-bay',      'regional_hub',      'city_center', 'VN', ST_SetSRID(ST_MakePoint(107.0480, 20.9101), 4326)),
  ('Phu Quoc',        'phu-quoc',         'regional_hub',      'city_center', 'VN', ST_SetSRID(ST_MakePoint(103.9840, 10.2270), 4326)),
  ('Phong Nha',       'phong-nha',        'micro_destination', 'city_center', 'VN', ST_SetSRID(ST_MakePoint(106.2832, 17.5903), 4326)),
  ('Mui Ne',          'mui-ne',           'local_hub',         'city_center', 'VN', ST_SetSRID(ST_MakePoint(108.2878, 10.9330), 4326)),
  ('Can Tho',         'can-tho',          'local_hub',         'city_center', 'VN', ST_SetSRID(ST_MakePoint(105.7469, 10.0452), 4326)),
  ('Cat Ba Island',   'cat-ba-island',    'micro_destination', 'city_center', 'VN', ST_SetSRID(ST_MakePoint(106.9960, 20.7283), 4326))
ON CONFLICT DO NOTHING;

DO $$
DECLARE
  _hanoi INT; _hcmc INT; _danang INT; _hoian INT; _hue INT;
  _nhatrang INT; _dalat INT; _sapa INT; _ninhbinh INT; _halong INT;
  _phuquoc INT; _phongnha INT; _muine INT; _cantho INT; _catba INT;
BEGIN
  SELECT id INTO _hanoi    FROM transport_nodes WHERE slug='hanoi';
  SELECT id INTO _hcmc     FROM transport_nodes WHERE slug='ho-chi-minh-city';
  SELECT id INTO _danang   FROM transport_nodes WHERE slug='da-nang';
  SELECT id INTO _hoian    FROM transport_nodes WHERE slug='hoi-an';
  SELECT id INTO _hue      FROM transport_nodes WHERE slug='hue';
  SELECT id INTO _nhatrang FROM transport_nodes WHERE slug='nha-trang';
  SELECT id INTO _dalat    FROM transport_nodes WHERE slug='da-lat';
  SELECT id INTO _sapa     FROM transport_nodes WHERE slug='sapa';
  SELECT id INTO _ninhbinh FROM transport_nodes WHERE slug='ninh-binh';
  SELECT id INTO _halong   FROM transport_nodes WHERE slug='ha-long-bay';
  SELECT id INTO _phuquoc  FROM transport_nodes WHERE slug='phu-quoc';
  SELECT id INTO _phongnha FROM transport_nodes WHERE slug='phong-nha';
  SELECT id INTO _muine    FROM transport_nodes WHERE slug='mui-ne';
  SELECT id INTO _cantho   FROM transport_nodes WHERE slug='can-tho';
  SELECT id INTO _catba    FROM transport_nodes WHERE slug='cat-ba-island';

  INSERT INTO transport_edges (source_node_id, target_node_id, transport_type, duration_minutes, typical_cost_usd, cost_currency, is_bidirectional, frequency, tips) VALUES
    (_hanoi, _hcmc,     'flight', 120,  55.00, 'USD', true,  'Every 30 min', 'VietJet & Bamboo cheapest. Book 2 weeks ahead.'),
    (_hanoi, _hcmc,     'train',  1920, 35.00, 'USD', true,  '5 daily',      'Reunification Express. SE1-SE4 are best. Sleeper berth essential.'),
    (_hanoi, _danang,   'flight', 80,   40.00, 'USD', true,  'Hourly',       'Quick 1h15 flight. VietJet Air often $25 promos.'),
    (_hanoi, _danang,   'train',  960,  25.00, 'USD', true,  '5 daily',      'Beautiful coastal scenery. Book soft sleeper 4-berth.'),
    (_hanoi, _sapa,     'bus',    360,  15.00, 'USD', true,  'Night buses daily', 'Night sleeper bus saves hotel. Sapaly Express best rated.'),
    (_hanoi, _sapa,     'train',  480,  20.00, 'USD', true,  '2 daily',      'Express train to Lao Cai then bus 1hr up to Sapa.'),
    (_hanoi, _ninhbinh, 'bus',    120,   5.00, 'USD', true,  'Every 30 min', 'Easy day trip. Giap Bat bus station. ~100km south.'),
    (_hanoi, _halong,   'bus',    240,  12.00, 'USD', true,  'Many daily',   'Tourist bus with hotel pickup. Cruise boats from Tuan Chau.'),
    (_hanoi, _catba,    'bus',    270,  15.00, 'USD', true,  '3 daily',      'Bus+ferry combo ticket. Cheaper than Ha Long cruise.'),
    (_halong, _catba,   'ferry',  45,    8.00, 'USD', true,  '4 daily',      'Fast ferry from Tuan Chau. Buy at dock or book online.'),
    (_danang, _hoian,   'bus',    40,    2.00, 'USD', true,  'Every 15 min', 'Yellow local bus #1 is cheapest. Grab car ~$6.'),
    (_danang, _hue,     'train',  150,   8.00, 'USD', true,  '6 daily',      'Hai Van Pass route is spectacular. Sit on the right side.'),
    (_danang, _hue,     'bus',    180,   6.00, 'USD', true,  'Hourly',       'Motorbike over Hai Van Pass is the iconic route.'),
    (_hue, _phongnha,   'bus',    240,   8.00, 'USD', true,  '2 daily',      'Tourist bus available. Book at hotel.'),
    (_hcmc, _nhatrang,  'flight', 70,   35.00, 'USD', true,  '4 daily',      'Cam Ranh airport. 45min taxi to city center.'),
    (_hcmc, _nhatrang,  'bus',    540,  12.00, 'USD', true,  'Night buses',  'Sleeper bus overnight. The Sinh Tourist is reliable.'),
    (_hcmc, _dalat,     'bus',    420,  10.00, 'USD', true,  'Many daily',   'Winding mountain road. Futa bus best. Bring warm layer.'),
    (_hcmc, _muine,     'bus',    300,   8.00, 'USD', true,  'Many daily',   'Tourist bus with hotel drop. The Sinh Tourist recommended.'),
    (_hcmc, _phuquoc,   'flight', 60,   35.00, 'USD', true,  '6 daily',      'Very cheap flights. VietJet promos often $15-20.'),
    (_hcmc, _cantho,    'bus',    210,   6.00, 'USD', true,  'Every 30 min', 'Mekong Delta gateway. Futa bus from HCMC center.'),
    (_nhatrang, _dalat,  'bus',   240,   7.00, 'USD', true,  '4 daily',      'Beautiful mountain road. Bring warm clothes for Da Lat.');
END $$;


-- ────────────────────────────────────────────────
-- 🇮🇩  INDONESIA  (15 nodes, 19 edges)
-- ────────────────────────────────────────────────

INSERT INTO transport_nodes (name, slug, hierarchy, node_type, country_code, location) VALUES
  ('Jakarta',         'jakarta',          'international_hub', 'city_center', 'ID', ST_SetSRID(ST_MakePoint(106.8456, -6.2088), 4326)),
  ('Bali Denpasar',   'bali-denpasar',    'international_hub', 'city_center', 'ID', ST_SetSRID(ST_MakePoint(115.1889, -8.6500), 4326)),
  ('Ubud',            'ubud',             'regional_hub',      'city_center', 'ID', ST_SetSRID(ST_MakePoint(115.2625, -8.5069), 4326)),
  ('Yogyakarta',      'yogyakarta',       'regional_hub',      'city_center', 'ID', ST_SetSRID(ST_MakePoint(110.3695, -7.7956), 4326)),
  ('Lombok',          'lombok',           'regional_hub',      'city_center', 'ID', ST_SetSRID(ST_MakePoint(116.3249, -8.5834), 4326)),
  ('Gili Islands',    'gili-islands',     'local_hub',         'city_center', 'ID', ST_SetSRID(ST_MakePoint(116.0330, -8.3510), 4326)),
  ('Nusa Penida',     'nusa-penida',      'local_hub',         'city_center', 'ID', ST_SetSRID(ST_MakePoint(115.5430, -8.7275), 4326)),
  ('Komodo',          'komodo',           'local_hub',         'city_center', 'ID', ST_SetSRID(ST_MakePoint(119.4500, -8.5500), 4326)),
  ('Labuan Bajo',     'labuan-bajo',      'local_hub',         'city_center', 'ID', ST_SetSRID(ST_MakePoint(119.8893, -8.4968), 4326)),
  ('Flores',          'flores',           'local_hub',         'city_center', 'ID', ST_SetSRID(ST_MakePoint(121.6570, -8.6573), 4326)),
  ('Sumba',           'sumba',            'micro_destination', 'city_center', 'ID', ST_SetSRID(ST_MakePoint(119.8220, -9.6547), 4326)),
  ('Raja Ampat',      'raja-ampat',       'micro_destination', 'city_center', 'ID', ST_SetSRID(ST_MakePoint(130.5160, -0.2300), 4326)),
  ('Canggu',          'canggu',           'local_hub',         'city_center', 'ID', ST_SetSRID(ST_MakePoint(115.1322, -8.6478), 4326)),
  ('Seminyak',        'seminyak',         'local_hub',         'city_center', 'ID', ST_SetSRID(ST_MakePoint(115.1614, -8.6910), 4326)),
  ('Uluwatu',         'uluwatu',          'local_hub',         'city_center', 'ID', ST_SetSRID(ST_MakePoint(115.0849, -8.8291), 4326))
ON CONFLICT DO NOTHING;

DO $$
DECLARE
  _jakarta INT; _bali INT; _ubud INT; _yogya INT; _lombok INT;
  _gili INT; _nusa INT; _komodo INT; _labuan INT; _flores INT;
  _sumba INT; _raja INT; _canggu INT; _seminyak INT; _uluwatu INT;
BEGIN
  SELECT id INTO _jakarta  FROM transport_nodes WHERE slug='jakarta';
  SELECT id INTO _bali     FROM transport_nodes WHERE slug='bali-denpasar';
  SELECT id INTO _ubud     FROM transport_nodes WHERE slug='ubud';
  SELECT id INTO _yogya    FROM transport_nodes WHERE slug='yogyakarta';
  SELECT id INTO _lombok   FROM transport_nodes WHERE slug='lombok';
  SELECT id INTO _gili     FROM transport_nodes WHERE slug='gili-islands';
  SELECT id INTO _nusa     FROM transport_nodes WHERE slug='nusa-penida';
  SELECT id INTO _komodo   FROM transport_nodes WHERE slug='komodo';
  SELECT id INTO _labuan   FROM transport_nodes WHERE slug='labuan-bajo';
  SELECT id INTO _flores   FROM transport_nodes WHERE slug='flores';
  SELECT id INTO _sumba    FROM transport_nodes WHERE slug='sumba';
  SELECT id INTO _raja     FROM transport_nodes WHERE slug='raja-ampat';
  SELECT id INTO _canggu   FROM transport_nodes WHERE slug='canggu';
  SELECT id INTO _seminyak FROM transport_nodes WHERE slug='seminyak';
  SELECT id INTO _uluwatu  FROM transport_nodes WHERE slug='uluwatu';

  INSERT INTO transport_edges (source_node_id, target_node_id, transport_type, duration_minutes, typical_cost_usd, cost_currency, is_bidirectional, frequency, tips) VALUES
    (_jakarta, _bali,    'flight', 110,  45.00, 'USD', true,  'Every 15 min', 'Lion Air & AirAsia cheapest. Ngurah Rai airport.'),
    (_jakarta, _yogya,   'flight', 70,   35.00, 'USD', true,  '8 daily',      'Quick hop. Can also take 8hr train for scenic route.'),
    (_jakarta, _yogya,   'train',  480,  15.00, 'USD', true,  '4 daily',      'Argo Wilis or Taksaka. Executive class is comfortable.'),
    (_bali, _ubud,       'taxi',   50,    8.00, 'USD', true,  'Always',       'Grab/Gojek from airport. ~35km north. Beautiful drive.'),
    (_bali, _canggu,     'taxi',   45,    7.00, 'USD', true,  'Always',       'Grab works well. 30km from airport.'),
    (_bali, _seminyak,   'taxi',   25,    5.00, 'USD', true,  'Always',       'Closest beach area to airport. Grab or Bluebird taxi.'),
    (_bali, _uluwatu,    'taxi',   40,    7.00, 'USD', true,  'Always',       'Southern tip. Rent a scooter for flexibility.'),
    (_bali, _nusa,       'ferry',  45,   15.00, 'USD', true,  '8 daily',      'Fast boat from Sanur. Angel Billabong snorkeling.'),
    (_ubud, _canggu,     'taxi',   40,    6.00, 'USD', true,  'Always',       'Scooter recommended. Beautiful rice field road.'),
    (_bali, _lombok,     'ferry',  120,   8.00, 'USD', true,  '3 daily',      'Slow ferry from Padang Bai. Fast boat 45min ~$25.'),
    (_bali, _lombok,     'flight', 25,   30.00, 'USD', true,  '5 daily',      'Very short hop. Wings Air from Ngurah Rai.'),
    (_lombok, _gili,     'boat',   30,   12.00, 'USD', true,  '6 daily',      'Fast boat from Bangsal or Teluk Nare harbor.'),
    (_bali, _gili,       'boat',   90,   25.00, 'USD', true,  '4 daily',      'Direct fast boat from Padang Bai or Serangan.'),
    (_bali, _labuan,     'flight', 75,   50.00, 'USD', true,  '3 daily',      'Gateway to Komodo dragons. Book early in peak.'),
    (_labuan, _komodo,   'boat',   180,  35.00, 'USD', false, '2 daily',      'Day trip from Labuan Bajo. Liveaboard better value.'),
    (_labuan, _flores,   'bus',    600,  10.00, 'USD', true,  '2 daily',      'Long scenic drive across Flores island.'),
    (_bali, _raja,       'flight', 300, 150.00, 'USD', true,  '1 daily',      'Via Makassar or Ambon. Remote paradise. Plan ahead.'),
    (_labuan, _sumba,    'flight', 60,   45.00, 'USD', true,  '2 daily',      'Wings Air. Book well ahead. Limited seats.'),
    (_bali, _yogya,      'flight', 75,   40.00, 'USD', true,  '6 daily',      'Direct flights. Borobudur temple is a must.');
END $$;


-- ────────────────────────────────────────────────
-- 🇱🇰  SRI LANKA  (14 nodes, 21 edges)
-- ────────────────────────────────────────────────

INSERT INTO transport_nodes (name, slug, hierarchy, node_type, country_code, location) VALUES
  ('Colombo',         'colombo',          'international_hub', 'city_center', 'LK', ST_SetSRID(ST_MakePoint(79.8612, 6.9271), 4326)),
  ('Kandy',           'kandy',            'regional_hub',      'city_center', 'LK', ST_SetSRID(ST_MakePoint(80.6337, 7.2906), 4326)),
  ('Galle',           'galle',            'regional_hub',      'city_center', 'LK', ST_SetSRID(ST_MakePoint(80.2170, 6.0535), 4326)),
  ('Ella',            'ella',             'local_hub',         'city_center', 'LK', ST_SetSRID(ST_MakePoint(81.0466, 6.8667), 4326)),
  ('Sigiriya',        'sigiriya',         'local_hub',         'city_center', 'LK', ST_SetSRID(ST_MakePoint(80.7597, 7.9570), 4326)),
  ('Nuwara Eliya',    'nuwara-eliya',     'local_hub',         'city_center', 'LK', ST_SetSRID(ST_MakePoint(80.7833, 6.9497), 4326)),
  ('Mirissa',         'mirissa',          'local_hub',         'city_center', 'LK', ST_SetSRID(ST_MakePoint(80.4580, 5.9470), 4326)),
  ('Unawatuna',       'unawatuna',        'local_hub',         'city_center', 'LK', ST_SetSRID(ST_MakePoint(80.2499, 6.0100), 4326)),
  ('Trincomalee',     'trincomalee',      'local_hub',         'city_center', 'LK', ST_SetSRID(ST_MakePoint(81.2152, 8.5874), 4326)),
  ('Jaffna',          'jaffna',           'local_hub',         'city_center', 'LK', ST_SetSRID(ST_MakePoint(80.0074, 9.6615), 4326)),
  ('Arugam Bay',      'arugam-bay',       'micro_destination', 'city_center', 'LK', ST_SetSRID(ST_MakePoint(81.8354, 6.8389), 4326)),
  ('Dambulla',        'dambulla',         'local_hub',         'city_center', 'LK', ST_SetSRID(ST_MakePoint(80.6500, 7.8600), 4326)),
  ('Hikkaduwa',       'hikkaduwa',        'local_hub',         'city_center', 'LK', ST_SetSRID(ST_MakePoint(80.0981, 6.1395), 4326)),
  ('Anuradhapura',    'anuradhapura',     'local_hub',         'city_center', 'LK', ST_SetSRID(ST_MakePoint(80.3847, 8.3114), 4326))
ON CONFLICT DO NOTHING;

DO $$
DECLARE
  _colombo INT; _kandy INT; _galle INT; _ella INT; _sigiriya INT;
  _nuwara INT; _mirissa INT; _unawatuna INT; _trinco INT; _jaffna INT;
  _arugam INT; _dambulla INT; _hikka INT; _anura INT;
BEGIN
  SELECT id INTO _colombo   FROM transport_nodes WHERE slug='colombo';
  SELECT id INTO _kandy     FROM transport_nodes WHERE slug='kandy';
  SELECT id INTO _galle     FROM transport_nodes WHERE slug='galle';
  SELECT id INTO _ella      FROM transport_nodes WHERE slug='ella';
  SELECT id INTO _sigiriya  FROM transport_nodes WHERE slug='sigiriya';
  SELECT id INTO _nuwara    FROM transport_nodes WHERE slug='nuwara-eliya';
  SELECT id INTO _mirissa   FROM transport_nodes WHERE slug='mirissa';
  SELECT id INTO _unawatuna FROM transport_nodes WHERE slug='unawatuna';
  SELECT id INTO _trinco    FROM transport_nodes WHERE slug='trincomalee';
  SELECT id INTO _jaffna    FROM transport_nodes WHERE slug='jaffna';
  SELECT id INTO _arugam    FROM transport_nodes WHERE slug='arugam-bay';
  SELECT id INTO _dambulla  FROM transport_nodes WHERE slug='dambulla';
  SELECT id INTO _hikka     FROM transport_nodes WHERE slug='hikkaduwa';
  SELECT id INTO _anura     FROM transport_nodes WHERE slug='anuradhapura';

  INSERT INTO transport_edges (source_node_id, target_node_id, transport_type, duration_minutes, typical_cost_usd, cost_currency, is_bidirectional, frequency, tips) VALUES
    (_colombo, _kandy,     'train',  180,  3.00, 'USD', true, '8 daily',       'One of worlds best train rides. Book 1st class observation car.'),
    (_colombo, _kandy,     'bus',    180,  3.00, 'USD', true, 'Every 20 min',  'AC intercity bus from Bastian Mawatha station.'),
    (_colombo, _galle,     'train',  150,  2.50, 'USD', true, '6 daily',       'Stunning coastal railway. Sit on left side going south.'),
    (_colombo, _galle,     'bus',    180,  3.00, 'USD', true, 'Every 15 min',  'Expressway bus from Maharagama is fastest.'),
    (_colombo, _jaffna,    'train',  420,  5.00, 'USD', true, '3 daily',       'Post-war rail line. Night train available. Reserve ahead.'),
    (_colombo, _trinco,    'train',  420,  5.00, 'USD', true, '2 daily',       'Long but beautiful ride through dry zone.'),
    (_colombo, _sigiriya,  'bus',    270,  4.00, 'USD', true, '3 daily',       'Bus to Dambulla then tuktuk 45min to Sigiriya.'),
    (_colombo, _anura,     'bus',    240,  4.00, 'USD', true, 'Hourly',        'Direct AC bus. Ancient city UNESCO site.'),
    (_kandy, _ella,        'train',  360,  3.00, 'USD', true, '3 daily',       'THE iconic Sri Lanka train. Book 1st class weeks ahead. Breathtaking.'),
    (_kandy, _nuwara,      'train',  210,  2.00, 'USD', true, '4 daily',       'Tea country route. Beautiful hills and plantations.'),
    (_kandy, _dambulla,    'bus',    90,   1.50, 'USD', true, 'Frequent',      'Easy 1.5hr ride. Golden Temple and cave paintings.'),
    (_kandy, _sigiriya,    'bus',    150,  2.50, 'USD', true, '3 daily',       'Via Dambulla. Lion Rock fortress is unmissable.'),
    (_kandy, _trinco,      'bus',    300,  4.00, 'USD', true, '3 daily',       'Scenic jungle road to east coast.'),
    (_galle, _mirissa,     'bus',    45,   1.00, 'USD', true, 'Frequent',      'Quick coastal hop. Whale watching Dec-Apr.'),
    (_galle, _unawatuna,   'tuktuk', 15,   2.00, 'USD', true, 'Always',       'Just 6km south. Beautiful beach.'),
    (_galle, _hikka,       'train',  30,   0.50, 'USD', true, '6 daily',       'One stop north. Coral reefs and surf.'),
    (_mirissa, _unawatuna, 'tuktuk', 30,   3.00, 'USD', true, 'Always',       'Short coastal ride.'),
    (_ella, _nuwara,       'train',  120,  1.50, 'USD', true, '3 daily',       'Continuation of Kandy-Ella line. Just as beautiful.'),
    (_ella, _arugam,       'bus',    240,  4.00, 'USD', true, '2 daily',       'Surf season Apr-Oct. Winding mountain-to-coast road.'),
    (_dambulla, _sigiriya, 'tuktuk', 45,   3.00, 'USD', true, 'Always',       'Short 20km ride. Negotiate price before.'),
    (_dambulla, _anura,    'bus',    120,  2.00, 'USD', true, 'Frequent',      'Cultural triangle route. Easy day trip.');
END $$;


-- ────────────────────────────────────────────────
-- 🇯🇵  JAPAN  (16 nodes, 21 edges)
-- ────────────────────────────────────────────────

INSERT INTO transport_nodes (name, slug, hierarchy, node_type, country_code, location) VALUES
  ('Tokyo',           'tokyo',            'international_hub', 'city_center', 'JP', ST_SetSRID(ST_MakePoint(139.6917, 35.6895), 4326)),
  ('Kyoto',           'kyoto',            'international_hub', 'city_center', 'JP', ST_SetSRID(ST_MakePoint(135.7681, 35.0116), 4326)),
  ('Osaka',           'osaka',            'international_hub', 'city_center', 'JP', ST_SetSRID(ST_MakePoint(135.5023, 34.6937), 4326)),
  ('Hiroshima',       'hiroshima',        'regional_hub',      'city_center', 'JP', ST_SetSRID(ST_MakePoint(132.4596, 34.3853), 4326)),
  ('Nara',            'nara',             'local_hub',         'city_center', 'JP', ST_SetSRID(ST_MakePoint(135.8048, 34.6851), 4326)),
  ('Hakone',          'hakone',           'local_hub',         'city_center', 'JP', ST_SetSRID(ST_MakePoint(139.0700, 35.2326), 4326)),
  ('Nikko',           'nikko',            'local_hub',         'city_center', 'JP', ST_SetSRID(ST_MakePoint(139.6168, 36.7500), 4326)),
  ('Kanazawa',        'kanazawa',         'local_hub',         'city_center', 'JP', ST_SetSRID(ST_MakePoint(136.6562, 36.5613), 4326)),
  ('Takayama',        'takayama',         'local_hub',         'city_center', 'JP', ST_SetSRID(ST_MakePoint(137.2529, 36.1461), 4326)),
  ('Miyajima',        'miyajima',         'micro_destination', 'city_center', 'JP', ST_SetSRID(ST_MakePoint(132.3190, 34.2961), 4326)),
  ('Kobe',            'kobe',             'regional_hub',      'city_center', 'JP', ST_SetSRID(ST_MakePoint(135.1955, 34.6901), 4326)),
  ('Fukuoka',         'fukuoka',          'regional_hub',      'city_center', 'JP', ST_SetSRID(ST_MakePoint(130.4017, 33.5904), 4326)),
  ('Sapporo',         'sapporo',          'regional_hub',      'city_center', 'JP', ST_SetSRID(ST_MakePoint(141.3545, 43.0618), 4326)),
  ('Okinawa',         'okinawa',          'regional_hub',      'city_center', 'JP', ST_SetSRID(ST_MakePoint(127.6810, 26.3344), 4326)),
  ('Kamakura',        'kamakura',         'local_hub',         'city_center', 'JP', ST_SetSRID(ST_MakePoint(139.5466, 35.3192), 4326)),
  ('Mt Fuji',         'mt-fuji',          'local_hub',         'city_center', 'JP', ST_SetSRID(ST_MakePoint(138.7274, 35.3606), 4326))
ON CONFLICT DO NOTHING;

DO $$
DECLARE
  _tokyo INT; _kyoto INT; _osaka INT; _hiroshima INT; _nara INT;
  _hakone INT; _nikko INT; _kanazawa INT; _takayama INT; _miyajima INT;
  _kobe INT; _fukuoka INT; _sapporo INT; _okinawa INT; _kamakura INT;
  _fuji INT;
BEGIN
  SELECT id INTO _tokyo     FROM transport_nodes WHERE slug='tokyo';
  SELECT id INTO _kyoto     FROM transport_nodes WHERE slug='kyoto';
  SELECT id INTO _osaka     FROM transport_nodes WHERE slug='osaka';
  SELECT id INTO _hiroshima FROM transport_nodes WHERE slug='hiroshima';
  SELECT id INTO _nara      FROM transport_nodes WHERE slug='nara';
  SELECT id INTO _hakone    FROM transport_nodes WHERE slug='hakone';
  SELECT id INTO _nikko     FROM transport_nodes WHERE slug='nikko';
  SELECT id INTO _kanazawa  FROM transport_nodes WHERE slug='kanazawa';
  SELECT id INTO _takayama  FROM transport_nodes WHERE slug='takayama';
  SELECT id INTO _miyajima  FROM transport_nodes WHERE slug='miyajima';
  SELECT id INTO _kobe      FROM transport_nodes WHERE slug='kobe';
  SELECT id INTO _fukuoka   FROM transport_nodes WHERE slug='fukuoka';
  SELECT id INTO _sapporo   FROM transport_nodes WHERE slug='sapporo';
  SELECT id INTO _okinawa   FROM transport_nodes WHERE slug='okinawa';
  SELECT id INTO _kamakura  FROM transport_nodes WHERE slug='kamakura';
  SELECT id INTO _fuji      FROM transport_nodes WHERE slug='mt-fuji';

  INSERT INTO transport_edges (source_node_id, target_node_id, transport_type, duration_minutes, typical_cost_usd, cost_currency, is_bidirectional, frequency, tips) VALUES
    (_tokyo, _kyoto,       'train',  135,  95.00, 'USD', true, 'Every 10 min', 'Shinkansen Nozomi. JR Pass covers Hikari (160min). Window seat right for Fuji.'),
    (_tokyo, _osaka,       'train',  150,  95.00, 'USD', true, 'Every 10 min', 'Shinkansen Nozomi 2h30. JR Pass covers Hikari (3h). Huge food city.'),
    (_tokyo, _hakone,      'train',  85,   15.00, 'USD', true, '4 per hour',   'Romancecar from Shinjuku is scenic. Hakone Free Pass great value.'),
    (_tokyo, _nikko,       'train',  120,  20.00, 'USD', true, 'Hourly',       'Tobu Railway from Asakusa. UNESCO shrines and waterfalls.'),
    (_tokyo, _kamakura,    'train',  55,    8.00, 'USD', true, 'Every 10 min', 'JR Yokosuka Line. Great Buddha & ocean. Perfect day trip.'),
    (_tokyo, _fuji,        'bus',    150,  18.00, 'USD', true, '6 daily',      'Highway bus from Shinjuku. Lake Kawaguchiko area.'),
    (_tokyo, _sapporo,     'flight', 95,   80.00, 'USD', true, '20+ daily',    'Peach, Jetstar cheap. Or 8hr Shinkansen + Hokkaido train.'),
    (_tokyo, _okinawa,     'flight', 150,  70.00, 'USD', true, '15 daily',     'Peach and Jetstar have budget fares. Tropical Japan.'),
    (_tokyo, _fukuoka,     'flight', 110,  65.00, 'USD', true, '12 daily',     'Budget airlines cheap. Or 5hr Shinkansen with JR Pass.'),
    (_kyoto, _osaka,       'train',  15,    4.00, 'USD', true, 'Every 5 min',  'JR Special Rapid 15min. So close they are basically one metro.'),
    (_kyoto, _nara,        'train',  45,    5.00, 'USD', true, 'Every 10 min', 'JR Miyako or Kintetsu. Deer park and huge Buddha.'),
    (_osaka, _nara,        'train',  35,    4.00, 'USD', true, 'Every 10 min', 'Kintetsu Railway fastest. Easy half-day trip.'),
    (_osaka, _kobe,        'train',  20,    3.00, 'USD', true, 'Every 5 min',  'JR Rapid 20min. Kobe beef and harbor views.'),
    (_kyoto, _kanazawa,    'train',  130,  50.00, 'USD', true, '4 daily',      'Thunderbird express. Beautiful coast route. JR Pass covered.'),
    (_kyoto, _hiroshima,   'train',  100,  75.00, 'USD', true, 'Every 15 min', 'Shinkansen Nozomi 1h40. Must visit Peace Memorial.'),
    (_hiroshima, _miyajima,'ferry',  15,    2.00, 'USD', true, 'Every 15 min', 'JR Ferry from Miyajimaguchi. Free with JR Pass. Floating torii gate.'),
    (_hiroshima, _fukuoka, 'train',  60,   55.00, 'USD', true, 'Every 15 min', 'Shinkansen 1 hour. Quick hop to Hakata ramen city.'),
    (_kanazawa, _takayama, 'bus',    135,  22.00, 'USD', true, '4 daily',      'Nohi bus through mountains. Book ahead in autumn.'),
    (_takayama, _fuji,     'bus',    210,  28.00, 'USD', true, '2 daily',      'Scenic alpine route. Change at Matsumoto sometimes.'),
    (_fuji, _hakone,       'bus',    90,   12.00, 'USD', true, '3 daily',      'Two iconic day trips can be combined into one loop.'),
    (_tokyo, _kanazawa,    'train',  150,  85.00, 'USD', true, '3 daily',      'Hokuriku Shinkansen direct. JR Pass covered. Kenroku-en garden.');
END $$;


-- ────────────────────────────────────────────────
-- 🇮🇳  INDIA  (16 nodes, 22 edges)
-- ────────────────────────────────────────────────

INSERT INTO transport_nodes (name, slug, hierarchy, node_type, country_code, location) VALUES
  ('Delhi',           'delhi',            'international_hub', 'city_center', 'IN', ST_SetSRID(ST_MakePoint(77.2090, 28.6139), 4326)),
  ('Mumbai',          'mumbai',           'international_hub', 'city_center', 'IN', ST_SetSRID(ST_MakePoint(72.8777, 19.0760), 4326)),
  ('Jaipur',          'jaipur',           'regional_hub',      'city_center', 'IN', ST_SetSRID(ST_MakePoint(75.7873, 26.9124), 4326)),
  ('Agra',            'agra',             'regional_hub',      'city_center', 'IN', ST_SetSRID(ST_MakePoint(78.0081, 27.1767), 4326)),
  ('Varanasi',        'varanasi',         'regional_hub',      'city_center', 'IN', ST_SetSRID(ST_MakePoint(82.9913, 25.3176), 4326)),
  ('Goa',             'goa',              'regional_hub',      'city_center', 'IN', ST_SetSRID(ST_MakePoint(73.8278, 15.4909), 4326)),
  ('Udaipur',         'udaipur',          'local_hub',         'city_center', 'IN', ST_SetSRID(ST_MakePoint(73.7125, 24.5854), 4326)),
  ('Jodhpur',         'jodhpur',          'local_hub',         'city_center', 'IN', ST_SetSRID(ST_MakePoint(73.0243, 26.2389), 4326)),
  ('Rishikesh',       'rishikesh',        'local_hub',         'city_center', 'IN', ST_SetSRID(ST_MakePoint(78.2676, 30.0869), 4326)),
  ('Hampi',           'hampi',            'micro_destination', 'city_center', 'IN', ST_SetSRID(ST_MakePoint(76.4600, 15.3350), 4326)),
  ('Kerala Kochi',    'kerala-kochi',     'regional_hub',      'city_center', 'IN', ST_SetSRID(ST_MakePoint(76.2673, 9.9312), 4326)),
  ('Bangalore',       'bangalore',        'regional_hub',      'city_center', 'IN', ST_SetSRID(ST_MakePoint(77.5946, 12.9716), 4326)),
  ('Kolkata',         'kolkata',          'regional_hub',      'city_center', 'IN', ST_SetSRID(ST_MakePoint(88.3639, 22.5726), 4326)),
  ('Jaisalmer',       'jaisalmer',        'micro_destination', 'city_center', 'IN', ST_SetSRID(ST_MakePoint(70.9083, 26.9157), 4326)),
  ('Pushkar',         'pushkar',          'micro_destination', 'city_center', 'IN', ST_SetSRID(ST_MakePoint(74.5513, 26.4899), 4326)),
  ('Amritsar',        'amritsar',         'local_hub',         'city_center', 'IN', ST_SetSRID(ST_MakePoint(74.8723, 31.6340), 4326))
ON CONFLICT DO NOTHING;

DO $$
DECLARE
  _delhi INT; _mumbai INT; _jaipur INT; _agra INT; _varanasi INT;
  _goa INT; _udaipur INT; _jodhpur INT; _rishikesh INT; _hampi INT;
  _kochi INT; _bangalore INT; _kolkata INT; _jaisalmer INT; _pushkar INT;
  _amritsar INT;
BEGIN
  SELECT id INTO _delhi     FROM transport_nodes WHERE slug='delhi';
  SELECT id INTO _mumbai    FROM transport_nodes WHERE slug='mumbai';
  SELECT id INTO _jaipur    FROM transport_nodes WHERE slug='jaipur';
  SELECT id INTO _agra      FROM transport_nodes WHERE slug='agra';
  SELECT id INTO _varanasi  FROM transport_nodes WHERE slug='varanasi';
  SELECT id INTO _goa       FROM transport_nodes WHERE slug='goa';
  SELECT id INTO _udaipur   FROM transport_nodes WHERE slug='udaipur';
  SELECT id INTO _jodhpur   FROM transport_nodes WHERE slug='jodhpur';
  SELECT id INTO _rishikesh FROM transport_nodes WHERE slug='rishikesh';
  SELECT id INTO _hampi     FROM transport_nodes WHERE slug='hampi';
  SELECT id INTO _kochi     FROM transport_nodes WHERE slug='kerala-kochi';
  SELECT id INTO _bangalore FROM transport_nodes WHERE slug='bangalore';
  SELECT id INTO _kolkata   FROM transport_nodes WHERE slug='kolkata';
  SELECT id INTO _jaisalmer FROM transport_nodes WHERE slug='jaisalmer';
  SELECT id INTO _pushkar   FROM transport_nodes WHERE slug='pushkar';
  SELECT id INTO _amritsar  FROM transport_nodes WHERE slug='amritsar';

  INSERT INTO transport_edges (source_node_id, target_node_id, transport_type, duration_minutes, typical_cost_usd, cost_currency, is_bidirectional, frequency, tips) VALUES
    (_delhi, _agra,        'train',  120,   8.00, 'USD', true, '10+ daily',    'Gatimaan Express fastest (100min). Book on IRCTC. Taj at sunrise.'),
    (_delhi, _jaipur,      'train',  270,   8.00, 'USD', true, '8 daily',      'Ajmer Shatabdi best. Sleeper also available for night trains.'),
    (_delhi, _jaipur,      'bus',    330,   6.00, 'USD', true, 'Hourly',       'Volvo RSRTC bus every 30min from ISBT Kashmere Gate.'),
    (_agra, _jaipur,       'train',  240,   6.00, 'USD', true, '5 daily',      'Completes the Golden Triangle. Book ahead on IRCTC.'),
    (_agra, _jaipur,       'bus',    300,   5.00, 'USD', true, '4 daily',      'Road can be rough. Train preferred.'),
    (_delhi, _varanasi,    'flight', 90,   45.00, 'USD', true, '8 daily',      'IndiGo cheapest. Or iconic 12hr Shatabdi/Rajdhani train.'),
    (_delhi, _varanasi,    'train',  720,  12.00, 'USD', true, '5 daily',      'Overnight sleeper. Book AC 3-tier. Arrive for Ganga sunrise.'),
    (_delhi, _rishikesh,   'bus',    360,   8.00, 'USD', true, 'Many daily',   'Volvo from ISBT. Yoga capital of the world. Ganga rafting.'),
    (_delhi, _amritsar,    'train',  360,  10.00, 'USD', true, '4 daily',      'Shatabdi Express fastest. Golden Temple is free to visit.'),
    (_delhi, _mumbai,      'flight', 120,  50.00, 'USD', true, 'Every 15 min', 'India busiest route. IndiGo, Go First cheapest. Book 2 weeks ahead.'),
    (_delhi, _kolkata,     'flight', 150,  55.00, 'USD', true, '10 daily',     'Rajdhani Express is iconic but takes 17hr.'),
    (_jaipur, _jodhpur,    'train',  330,   6.00, 'USD', true, '4 daily',      'Blue City. Mehrangarh Fort is incredible.'),
    (_jaipur, _udaipur,    'train',  420,   7.00, 'USD', true, '3 daily',      'City of Lakes. Most romantic city in India.'),
    (_jaipur, _pushkar,    'bus',    180,   3.00, 'USD', true, 'Frequent',     'Via Ajmer. Holy lake town. Camel fair in November.'),
    (_jodhpur, _jaisalmer, 'train',  330,   5.00, 'USD', true, '3 daily',      'Golden City in Thar Desert. Camel safari from here.'),
    (_jodhpur, _udaipur,   'bus',    360,   6.00, 'USD', true, '5 daily',      'Scenic drive through Aravalli hills.'),
    (_mumbai, _goa,        'train',  600,  10.00, 'USD', true, '4 daily',      'Konkan Railway is stunning coastal route. Book window seat.'),
    (_mumbai, _goa,        'flight', 70,   35.00, 'USD', true, '6 daily',      'IndiGo and GoAir cheapest. Dabolim or new Mopa airport.'),
    (_goa, _hampi,         'bus',    420,   8.00, 'USD', true, '2 daily',      'Overnight sleeper bus. UNESCO ruins are incredible.'),
    (_bangalore, _hampi,   'bus',    420,   8.00, 'USD', true, '3 daily',      'Overnight KSRTC bus. Night bus saves hotel.'),
    (_bangalore, _kochi,   'train',  660,  10.00, 'USD', true, '3 daily',      'Through Western Ghats. Beautiful. Or 75min flight.'),
    (_bangalore, _goa,     'flight', 60,   30.00, 'USD', true, '5 daily',      'Quick hop. IndiGo cheap if booked early.');
END $$;


-- ────────────────────────────────────────────────
-- 🇵🇭  PHILIPPINES  (13 nodes, 15 edges)
-- ────────────────────────────────────────────────

INSERT INTO transport_nodes (name, slug, hierarchy, node_type, country_code, location) VALUES
  ('Manila',           'manila',           'international_hub', 'city_center', 'PH', ST_SetSRID(ST_MakePoint(120.9842, 14.5995), 4326)),
  ('Cebu',             'cebu',             'international_hub', 'city_center', 'PH', ST_SetSRID(ST_MakePoint(123.8854, 10.3157), 4326)),
  ('El Nido',          'el-nido',          'regional_hub',      'city_center', 'PH', ST_SetSRID(ST_MakePoint(119.3886, 11.1784), 4326)),
  ('Puerto Princesa',  'puerto-princesa',  'regional_hub',      'city_center', 'PH', ST_SetSRID(ST_MakePoint(118.7356, 9.7489), 4326)),
  ('Coron',            'coron',            'local_hub',         'city_center', 'PH', ST_SetSRID(ST_MakePoint(120.2043, 11.9986), 4326)),
  ('Boracay',          'boracay',          'regional_hub',      'city_center', 'PH', ST_SetSRID(ST_MakePoint(121.9247, 11.9674), 4326)),
  ('Siargao',          'siargao',          'local_hub',         'city_center', 'PH', ST_SetSRID(ST_MakePoint(126.0690, 9.8481), 4326)),
  ('Bohol',            'bohol',            'regional_hub',      'city_center', 'PH', ST_SetSRID(ST_MakePoint(124.0057, 9.8500), 4326)),
  ('Moalboal',         'moalboal',         'local_hub',         'city_center', 'PH', ST_SetSRID(ST_MakePoint(123.3982, 9.9466), 4326)),
  ('Dumaguete',        'dumaguete',        'local_hub',         'city_center', 'PH', ST_SetSRID(ST_MakePoint(123.3068, 9.3068), 4326)),
  ('Siquijor',         'siquijor',         'micro_destination', 'city_center', 'PH', ST_SetSRID(ST_MakePoint(123.5157, 9.2022), 4326)),
  ('Banaue',           'banaue',           'micro_destination', 'city_center', 'PH', ST_SetSRID(ST_MakePoint(121.0597, 16.9203), 4326)),
  ('Sagada',           'sagada',           'micro_destination', 'city_center', 'PH', ST_SetSRID(ST_MakePoint(120.9022, 17.0847), 4326))
ON CONFLICT DO NOTHING;

DO $$
DECLARE
  _manila INT; _cebu INT; _elnido INT; _pp INT; _coron INT;
  _boracay INT; _siargao INT; _bohol INT; _moalboal INT;
  _dumaguete INT; _siquijor INT; _banaue INT; _sagada INT;
BEGIN
  SELECT id INTO _manila    FROM transport_nodes WHERE slug='manila';
  SELECT id INTO _cebu      FROM transport_nodes WHERE slug='cebu';
  SELECT id INTO _elnido    FROM transport_nodes WHERE slug='el-nido';
  SELECT id INTO _pp        FROM transport_nodes WHERE slug='puerto-princesa';
  SELECT id INTO _coron     FROM transport_nodes WHERE slug='coron';
  SELECT id INTO _boracay   FROM transport_nodes WHERE slug='boracay';
  SELECT id INTO _siargao   FROM transport_nodes WHERE slug='siargao';
  SELECT id INTO _bohol     FROM transport_nodes WHERE slug='bohol';
  SELECT id INTO _moalboal  FROM transport_nodes WHERE slug='moalboal';
  SELECT id INTO _dumaguete FROM transport_nodes WHERE slug='dumaguete';
  SELECT id INTO _siquijor  FROM transport_nodes WHERE slug='siquijor';
  SELECT id INTO _banaue    FROM transport_nodes WHERE slug='banaue';
  SELECT id INTO _sagada    FROM transport_nodes WHERE slug='sagada';

  INSERT INTO transport_edges (source_node_id, target_node_id, transport_type, duration_minutes, typical_cost_usd, cost_currency, is_bidirectional, frequency, tips) VALUES
    (_manila, _cebu,       'flight',  80,   35.00, 'USD', true, '20+ daily',   'Cebu Pacific cheapest. Book 2 weeks ahead for promos.'),
    (_manila, _pp,         'flight',  75,   40.00, 'USD', true, '6 daily',     'Gateway to Palawan underground river and El Nido.'),
    (_manila, _coron,      'flight',  60,   50.00, 'USD', true, '3 daily',     'Direct to Busuanga airport. Book early — limited seats.'),
    (_manila, _boracay,    'flight',  60,   40.00, 'USD', true, '8 daily',     'Fly to Caticlan (closer) not Kalibo. Boat to island.'),
    (_manila, _siargao,    'flight',  120,  55.00, 'USD', true, '3 daily',     'Cebu Pacific direct. Surfing paradise. Cloud 9 wave.'),
    (_manila, _banaue,     'bus',     540,  12.00, 'USD', true, '3 daily',     'Night bus from Sampaloc. Rice terraces at dawn. Amazing.'),
    (_pp, _elnido,         'minivan', 360,  12.00, 'USD', true, '5 daily',     'Long but scenic drive. Book AC van. Stop at Nacpan Beach.'),
    (_elnido, _coron,      'ferry',   210,  25.00, 'USD', true, '1 daily',     'Island hopping route! FastCat or Montenegro. Can be rough seas.'),
    (_cebu, _bohol,        'ferry',   120,  10.00, 'USD', true, '6 daily',     'OceanJet or Lite Ferry from Pier 1. Chocolate Hills.'),
    (_cebu, _moalboal,     'bus',     180,   3.00, 'USD', true, '4 daily',     'Sardine run + turtle snorkeling. Must visit in Cebu.'),
    (_cebu, _dumaguete,    'ferry',   300,  12.00, 'USD', true, '3 daily',     'Ceres Liner bus+ferry combo. Or fly.'),
    (_cebu, _siargao,      'flight',  60,   40.00, 'USD', true, '2 daily',     'Cebu Pacific. Easier than Manila connection sometimes.'),
    (_dumaguete, _siquijor,'ferry',   60,    5.00, 'USD', true, '4 daily',     'Mystical island. Waterfalls and healing folk traditions.'),
    (_bohol, _moalboal,    'ferry',   180,   8.00, 'USD', true, '2 daily',     'Via Cebu connection or direct bangka boat.'),
    (_banaue, _sagada,     'bus',     120,   3.00, 'USD', true, '3 daily',     'Mountain roads. Hanging coffins and cave exploration.');
END $$;


-- ────────────────────────────────────────────────
-- 🇲🇾  MALAYSIA  (10 nodes, 14 edges)
-- ────────────────────────────────────────────────

INSERT INTO transport_nodes (name, slug, hierarchy, node_type, country_code, location) VALUES
  ('Kuala Lumpur',       'kuala-lumpur',       'international_hub', 'city_center', 'MY', ST_SetSRID(ST_MakePoint(101.6869, 3.1390), 4326)),
  ('Penang',             'penang',             'regional_hub',      'city_center', 'MY', ST_SetSRID(ST_MakePoint(100.3288, 5.4141), 4326)),
  ('Langkawi',           'langkawi',           'regional_hub',      'city_center', 'MY', ST_SetSRID(ST_MakePoint(99.8530, 6.3500), 4326)),
  ('Melaka',             'melaka',             'local_hub',         'city_center', 'MY', ST_SetSRID(ST_MakePoint(102.2501, 2.1896), 4326)),
  ('Cameron Highlands',  'cameron-highlands',  'local_hub',         'city_center', 'MY', ST_SetSRID(ST_MakePoint(101.3838, 4.4718), 4326)),
  ('Kota Kinabalu',      'kota-kinabalu',      'regional_hub',      'city_center', 'MY', ST_SetSRID(ST_MakePoint(116.0735, 5.9804), 4326)),
  ('Perhentian Islands', 'perhentian-islands', 'local_hub',         'city_center', 'MY', ST_SetSRID(ST_MakePoint(102.7489, 5.9250), 4326)),
  ('Ipoh',               'ipoh',               'local_hub',         'city_center', 'MY', ST_SetSRID(ST_MakePoint(101.0829, 4.5975), 4326)),
  ('Kuching',            'kuching',            'regional_hub',      'city_center', 'MY', ST_SetSRID(ST_MakePoint(110.3441, 1.5533), 4326)),
  ('Tioman Island',      'tioman-island',      'micro_destination', 'city_center', 'MY', ST_SetSRID(ST_MakePoint(104.1700, 2.8166), 4326))
ON CONFLICT DO NOTHING;

DO $$
DECLARE
  _kl INT; _penang INT; _langkawi INT; _melaka INT; _cameron INT;
  _kk INT; _perhentian INT; _ipoh INT; _kuching INT; _tioman INT;
BEGIN
  SELECT id INTO _kl         FROM transport_nodes WHERE slug='kuala-lumpur';
  SELECT id INTO _penang     FROM transport_nodes WHERE slug='penang';
  SELECT id INTO _langkawi   FROM transport_nodes WHERE slug='langkawi';
  SELECT id INTO _melaka     FROM transport_nodes WHERE slug='melaka';
  SELECT id INTO _cameron    FROM transport_nodes WHERE slug='cameron-highlands';
  SELECT id INTO _kk         FROM transport_nodes WHERE slug='kota-kinabalu';
  SELECT id INTO _perhentian FROM transport_nodes WHERE slug='perhentian-islands';
  SELECT id INTO _ipoh       FROM transport_nodes WHERE slug='ipoh';
  SELECT id INTO _kuching    FROM transport_nodes WHERE slug='kuching';
  SELECT id INTO _tioman     FROM transport_nodes WHERE slug='tioman-island';

  INSERT INTO transport_edges (source_node_id, target_node_id, transport_type, duration_minutes, typical_cost_usd, cost_currency, is_bidirectional, frequency, tips) VALUES
    (_kl, _penang,         'flight', 60,   25.00, 'USD', true, '10 daily',     'AirAsia cheapest. Or scenic 4hr train ride.'),
    (_kl, _penang,         'train',  240,  15.00, 'USD', true, '4 daily',      'ETS high-speed train. Book on KTMB website. Scenic.'),
    (_kl, _langkawi,       'flight', 70,   30.00, 'USD', true, '5 daily',      'AirAsia direct. Duty-free island paradise.'),
    (_kl, _melaka,         'bus',    120,   5.00, 'USD', true, 'Every 30 min', 'From TBS station. UNESCO heritage city. Amazing food.'),
    (_kl, _cameron,        'bus',    240,   8.00, 'USD', true, '4 daily',      'Tea plantations and cool weather. Bring a jacket.'),
    (_kl, _ipoh,           'train',  150,  10.00, 'USD', true, '6 daily',      'ETS train. Food capital of Malaysia. White coffee origin.'),
    (_kl, _kk,             'flight', 150,  40.00, 'USD', true, '8 daily',      'AirAsia cheapest. Mt Kinabalu and Borneo rainforest.'),
    (_kl, _kuching,        'flight', 110,  35.00, 'USD', true, '6 daily',      'AirAsia. Sarawak capital. Orangutan sanctuaries.'),
    (_kl, _tioman,         'bus',    300,  15.00, 'USD', true, '2 daily',      'Bus to Mersing then ferry. Best diving Mar-Oct.'),
    (_penang, _langkawi,   'ferry',  180,  15.00, 'USD', true, '2 daily',      'Ferry from Swettenham Pier. Scenic but can be rough.'),
    (_penang, _cameron,    'bus',    240,   8.00, 'USD', true, '3 daily',      'Via Ipoh. Winding mountain roads.'),
    (_ipoh, _cameron,      'bus',    90,    4.00, 'USD', true, '4 daily',      'Closest city to Cameron. Only 1.5hr up the mountains.'),
    (_kl, _perhentian,     'bus',    480,  20.00, 'USD', true, '2 daily',      'Bus to Kuala Besut jetty then speedboat 45min. Crystal water.'),
    (_kk, _kuching,        'flight', 110,  30.00, 'USD', true, '4 daily',      'AirAsia between Borneo cities. No road connection.');
END $$;


-- ════════════════════════════════════════════════
-- Verify the seed
-- ════════════════════════════════════════════════

SELECT '=== NODES PER COUNTRY ===' as info;
SELECT country_code, COUNT(*) as nodes FROM transport_nodes GROUP BY country_code ORDER BY nodes DESC;

SELECT '=== EDGES PER COUNTRY ===' as info;
SELECT
  sn.country_code,
  COUNT(*) as edges
FROM transport_edges e
JOIN transport_nodes sn ON e.source_node_id = sn.id
GROUP BY sn.country_code
ORDER BY edges DESC;

SELECT '=== TOTALS ===' as info;
SELECT
  (SELECT COUNT(*) FROM transport_nodes) as total_nodes,
  (SELECT COUNT(*) FROM transport_edges) as total_edges;
